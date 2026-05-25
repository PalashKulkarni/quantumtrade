"""
Chat router — streams mock AI responses with realistic token-by-token delivery.
No Anthropic API required.
"""
import json
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_session
from backend.app.middleware.auth import require_auth
from backend.app.models import ChatConversation, ChatMessageRecord, User
from backend.app.services.mock_ai import stream_mock_response

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context: dict[str, Any] = {}


async def _get_or_create_conversation(user: User, db: AsyncSession) -> ChatConversation:
    result = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.user_id == user.id)
        .order_by(ChatConversation.created_at.desc())
        .limit(1)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        conv = ChatConversation(user_id=user.id, title="Trading session")
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
    return conv


async def _load_history(conv: ChatConversation, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(ChatMessageRecord)
        .where(ChatMessageRecord.conversation_id == conv.id)
        .order_by(ChatMessageRecord.created_at.asc())
        .limit(20)
    )
    records = result.scalars().all()
    return [
        {"role": r.role, "content": r.content}
        for r in records
        if r.role in ("user", "assistant")
    ]


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    """SSE streaming chat — mock AI with realistic token-by-token delivery."""
    conv = await _get_or_create_conversation(current_user, db)
    history = await _load_history(conv, db)

    # Persist user message immediately
    db.add(ChatMessageRecord(
        conversation_id=conv.id, role="user", content=request.message
    ))
    await db.commit()

    async def event_generator():
        full_response = ""
        tool_calls_seen: list[str] = []

        async for chunk in stream_mock_response(request.message, history, request.context):
            data = json.loads(chunk)
            if data["type"] == "delta":
                full_response += data.get("text", "")
            elif data["type"] == "tool_call":
                tool_calls_seen.append(data.get("name", ""))
            yield f"data: {chunk}\n\n"

        # Persist complete assistant response
        db.add(ChatMessageRecord(
            conversation_id=conv.id,
            role="assistant",
            content=full_response,
            tool_calls=json.dumps(tool_calls_seen) if tool_calls_seen else None,
        ))
        await db.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/chat/history")
async def get_history(
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    conv = await _get_or_create_conversation(current_user, db)
    result = await db.execute(
        select(ChatMessageRecord)
        .where(ChatMessageRecord.conversation_id == conv.id)
        .order_by(ChatMessageRecord.created_at.asc())
        .limit(40)
    )
    records = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "role": r.role,
            "content": r.content,
            "tool_calls": json.loads(r.tool_calls) if r.tool_calls else [],
            "created_at": r.created_at.isoformat(),
        }
        for r in records
    ]


@router.delete("/chat/history")
async def clear_history(
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    conv = await _get_or_create_conversation(current_user, db)
    records = await db.execute(
        select(ChatMessageRecord).where(ChatMessageRecord.conversation_id == conv.id)
    )
    for r in records.scalars().all():
        await db.delete(r)
    await db.commit()
    return {"status": "cleared"}
