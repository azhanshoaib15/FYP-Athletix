"""
AI Trainer Chat Routes: /api/v1/chat/
Stub endpoints ready for RAG/LLM integration in Phase 3.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import ChatSession, ChatMessage, MessageRoleEnum
from app.schemas.schemas import ChatMessageCreate, ChatSessionOut, ChatMessageOut

router = APIRouter(prefix="/chat", tags=["AI Trainer"])


@router.post("/sessions", response_model=ChatSessionOut, status_code=201)
async def new_chat_session(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a new conversation with the AI Trainer."""
    session = ChatSession(user_id=current_user.id, title="New Conversation")
    db.add(session)
    await db.flush()
    return session


@router.get("/sessions", response_model=list[ChatSessionOut])
async def list_chat_sessions(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .options(selectinload(ChatSession.messages))
        .order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageOut, status_code=201)
async def send_message(
    session_id: int,
    data: ChatMessageCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to the AI Trainer.
    Currently returns a stub response.
    Phase 3 will replace the stub with RAG + fine-tuned LLM.
    """
    # Verify session ownership
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role=MessageRoleEnum.USER,
        content=data.content,
    )
    db.add(user_msg)

    # ── Phase 3: Replace this stub with RAG pipeline call ──────────────────
    # from app.services.rag_service import generate_response
    # ai_response, sources = await generate_response(data.content, session_id, current_user)
    stub_response = (
        "🏋️ AI Trainer is being set up! This endpoint will be powered by a "
        "RAG-based LLM fine-tuned on fitness data in Phase 3. "
        f"You asked: '{data.content}'"
    )
    sources = []
    # ──────────────────────────────────────────────────────────────────────

    ai_msg = ChatMessage(
        session_id=session_id,
        role=MessageRoleEnum.ASSISTANT,
        content=stub_response,
        retrieved_sources=sources,
    )
    db.add(ai_msg)
    await db.flush()

    # Update session title from first message
    if not session.title or session.title == "New Conversation":
        session.title = data.content[:80]

    return ai_msg
