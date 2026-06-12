"""
Auth Routes: /api/v1/auth/
"""
import os
import random
import string
import smtplib
import logging
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES_SECS
)
from app.core.config import settings
from app.schemas.user_schemas import UserRegister, UserLogin, TokenResponse, RefreshTokenRequest, UserOut
from app.services.user_service import (
    create_user, get_user_by_email, get_user_by_username, update_last_login
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# ── In-memory OTP store ───────────────────────────────────────────────────────
# { email: { "code": "123456", "expires": datetime } }
_otp_store: dict = {}

# ── Rate limiting stores ──────────────────────────────────────────────────────
# OTP send rate limit: max 3 per 10 minutes per email
_otp_send_log: dict = {}   # { email: [datetime, ...] }
# Verify attempt limit: max 5 attempts per OTP
_otp_attempts: dict = {}   # { email: int }
# Login rate limit: max 10 attempts per 5 min per email
_login_attempts: dict = {}  # { email: [datetime, ...] }

# ── Pydantic models for OTP ───────────────────────────────────────────────────

class OTPRequest(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    otp: str

# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def _send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP via Resend API (HTTPS - works on Railway free tier)."""
    import urllib.request
    import json as _json
    try:
        api_key = os.environ.get("RESEND_API_KEY", "").strip()
        if not api_key:
            logger.warning("RESEND_API_KEY not set — falling back to dev mode")
            return False

        html_body = f"""
        <html>
        <body style="font-family:Arial,sans-serif;background:#0a0a0a;padding:40px;margin:0;">
          <div style="max-width:420px;margin:0 auto;background:#1a0505;border-radius:16px;
                      padding:32px;border:1px solid #8B2F3F;">
            <h1 style="color:#ffffff;font-size:26px;margin:0 0 4px 0;">Athletix</h1>
            <p style="color:#888;font-size:13px;margin:0 0 24px 0;">AI-Powered Fitness App</p>
            <hr style="border:none;border-top:1px solid #2a0a0a;margin:0 0 24px 0;"/>
            <p style="color:#ffffff;font-size:15px;margin:0 0 16px 0;">
              Your email verification code is:
            </p>
            <div style="background:#8B2F3F;border-radius:12px;padding:24px;
                        text-align:center;margin:0 0 20px 0;">
              <span style="color:#ffffff;font-size:40px;font-weight:bold;
                           letter-spacing:14px;">{otp}</span>
            </div>
            <p style="color:#aaa;font-size:13px;margin:0 0 8px 0;">
              This code expires in <strong>10 minutes</strong>.
            </p>
            <p style="color:#555;font-size:12px;margin:0;">
              If you did not create an Athletix account, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
        """

        payload = _json.dumps({
            "from": "Athletix <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Athletix - Your Verification Code",
            "html": html_body,
        }).encode()

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = _json.loads(resp.read())
            logger.info(f"Resend email sent to {to_email}: {result}")
            return True

    except Exception as e:
        logger.error(f"Resend error for {to_email}: {type(e).__name__}: {e}")
        return False

# ── Existing routes ───────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new Athletix user."""
    import re as _re

    # Validate email format
    email_clean = data.email.strip().lower()
    if not _re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email_clean):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Validate username: 3-30 chars, alphanumeric + underscores only
    username_clean = data.username.strip()
    if not _re.match(r"^[a-zA-Z0-9_]{3,30}$", username_clean):
        raise HTTPException(status_code=400, detail="Username must be 3-30 characters, letters/numbers/underscores only")

    # Validate password strength: min 8 chars
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    if await get_user_by_email(db, email_clean):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await get_user_by_username(db, username_clean):
        raise HTTPException(status_code=400, detail="Username already taken")
    user = await create_user(db, data)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login and receive JWT access + refresh tokens."""
    # Rate limit: max 10 login attempts per 5 minutes
    email_key = data.email.lower().strip()
    now = datetime.utcnow()
    attempts = _login_attempts.get(email_key, [])
    attempts = [t for t in attempts if (now - t).seconds < 300]
    if len(attempts) >= 10:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please wait 5 minutes.")
    attempts.append(now)
    _login_attempts[email_key] = attempts

    user = await get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    await update_last_login(db, user)
    token_data = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    from app.services.user_service import get_user_by_id
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await get_user_by_id(db, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    token_data = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

@router.get("/me", response_model=UserOut)
async def get_me(current_user=Depends(get_current_user)):
    """Get the currently authenticated user."""
    return current_user

# ── OTP routes ────────────────────────────────────────────────────────────────

@router.get("/debug-smtp", status_code=200)
async def debug_smtp():
    """Temporary debug endpoint to check SMTP env vars."""
    import os
    smtp_user = os.environ.get("SMTP_USER", "NOT_SET")
    smtp_pass = os.environ.get("SMTP_PASS", "NOT_SET")
    smtp_from = os.environ.get("SMTP_FROM", "NOT_SET")
    return {
        "SMTP_USER": smtp_user[:5] + "***" if smtp_user != "NOT_SET" else "NOT_SET",
        "SMTP_PASS": "SET(" + str(len(smtp_pass)) + "chars)" if smtp_pass != "NOT_SET" else "NOT_SET",
        "SMTP_FROM": smtp_from[:5] + "***" if smtp_from != "NOT_SET" else "NOT_SET",
    }


@router.post("/send-otp", status_code=200)
async def send_otp(request: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate a 6-digit OTP and send to user email.
    If SMTP is not configured, returns OTP in response (dev mode).
    """
    email = request.email.lower().strip()

    # Rate limit: max 3 OTP requests per 10 minutes
    now = datetime.utcnow()
    send_log = _otp_send_log.get(email, [])
    send_log = [t for t in send_log if (now - t).seconds < 600]
    if len(send_log) >= 3:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please wait 10 minutes.")
    send_log.append(now)
    _otp_send_log[email] = send_log

    # Check user exists
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")

    # Reset attempt counter on new OTP
    _otp_attempts[email] = 0

    # Generate OTP and store with 10-minute expiry
    code = _generate_otp()
    _otp_store[email] = {
        "code":    code,
        "expires": datetime.utcnow() + timedelta(minutes=10),
    }
    logger.info(f"OTP generated for {email}")

    # Try to send email
    sent = _send_otp_email(email, code)

    if sent:
        return {"message": f"Verification code sent to {email}"}
    else:
        # Dev mode — SMTP not configured, return code directly
        # Remove this in production once SMTP is set up
        logger.warning(f"Dev mode: OTP for {email} = {code}")
        return {
            "message": "Verification code generated (dev mode — SMTP not configured)",
            "dev_otp": code,
        }


@router.post("/verify-otp", status_code=200)
async def verify_otp(request: OTPVerify, db: AsyncSession = Depends(get_db)):
    """
    Validate the 6-digit OTP entered by user.
    Marks the user as verified on success.
    """
    email = request.email.lower().strip()
    entered = request.otp.strip()

    # Check OTP exists
    stored = _otp_store.get(email)
    if not stored:
        raise HTTPException(
            status_code=400,
            detail="No verification code found for this email. Please request a new one."
        )

    # Check expiry
    if datetime.utcnow() > stored["expires"]:
        del _otp_store[email]
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired. Please request a new one."
        )

    # Brute force protection: max 5 attempts per OTP
    attempts = _otp_attempts.get(email, 0)
    if attempts >= 5:
        del _otp_store[email]
        _otp_attempts.pop(email, None)
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. Please request a new code."
        )

    # Check code match
    if stored["code"] != entered:
        _otp_attempts[email] = attempts + 1
        remaining = 5 - _otp_attempts[email]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid code. {remaining} attempts remaining."
        )

    # Mark user as verified in DB
    user = await get_user_by_email(db, email)
    if user and hasattr(user, "is_verified"):
        try:
            user.is_verified = True
            await db.commit()
        except Exception:
            await db.rollback()

    # Clear used OTP
    del _otp_store[email]
    logger.info(f"Email verified for {email}")

    return {"message": "Email verified successfully"}