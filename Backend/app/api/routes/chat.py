"""
AI Trainer Chat Routes: /api/v1/chat/
Integrated with RAG chatbot container at http://localhost:8001
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import httpx

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import ChatSession, ChatMessage, MessageRoleEnum
from app.schemas.schemas import ChatMessageCreate, ChatSessionOut, ChatMessageOut

router = APIRouter(prefix="/chat", tags=["AI Trainer"])

RAG_URL = "http://localhost:8001/chat"


@router.post("/sessions", response_model=ChatSessionOut, status_code=201)
async def new_chat_session(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = ChatSession(user_id=current_user.id, title="New Conversation")
    db.add(session)
    await db.commit()
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session.id)
        .options(selectinload(ChatSession.messages))
    )
    return result.scalar_one()


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
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    user_msg = ChatMessage(
        session_id=session_id,
        role=MessageRoleEnum.USER,
        content=data.content,
    )
    db.add(user_msg)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            rag_response = await client.post(RAG_URL, json={"message": data.content})
            rag_response.raise_for_status()
            ai_text = rag_response.json().get("response", "Sorry, I could not generate a response.")
    except Exception:
        ai_text = "AI Trainer is temporarily unavailable. Please try again shortly."

    ai_msg = ChatMessage(
        session_id=session_id,
        role=MessageRoleEnum.ASSISTANT,
        content=ai_text,
        retrieved_sources=[],
    )
    db.add(ai_msg)

    if not session.title or session.title == "New Conversation":
        session.title = data.content[:80]

    await db.commit()
    await db.refresh(ai_msg)
    return ai_msg
