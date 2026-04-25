"""
Auth Routes: /api/v1/auth/
"""
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
    """Send OTP via SMTP. Returns True on success, False on failure."""
    try:
        smtp_user = getattr(settings, "SMTP_USER", "")
        smtp_pass = getattr(settings, "SMTP_PASS", "")
        smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(getattr(settings, "SMTP_PORT", 587))
        smtp_from = getattr(settings, "SMTP_FROM", smtp_user)

        if not smtp_user or not smtp_pass:
            logger.warning("SMTP not configured — OTP will be returned in dev mode")
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Athletix — Your Verification Code"
        msg["From"]    = smtp_from
        msg["To"]      = to_email

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

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, to_email, msg.as_string())

        logger.info(f"OTP email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"SMTP error sending OTP to {to_email}: {e}")
        return False

# ── Existing routes ───────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new Athletix user."""
    if await get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    user = await create_user(db, data)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login and receive JWT access + refresh tokens."""
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

@router.post("/send-otp", status_code=200)
async def send_otp(request: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate a 6-digit OTP and send to user email.
    If SMTP is not configured, returns OTP in response (dev mode).
    """
    email = request.email.lower().strip()

    # Check user exists
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")

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

    # Check code match
    if stored["code"] != entered:
        raise HTTPException(
            status_code=400,
            detail="Invalid code. Please check and try again."
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