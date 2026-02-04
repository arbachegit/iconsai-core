"""
Chat Router API endpoint.
POST /functions/v1/chat-router

Proxy for OpenAI/Perplexity/Gemini chat completions.
Compatible with existing Supabase Edge Function interface.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..services.openai_chat import ChatMessage, OpenAIChatService

logger = logging.getLogger(__name__)

router = APIRouter()


class MessageModel(BaseModel):
    """Chat message model."""
    role: str = Field(..., description="Message role: user, assistant, or system")
    content: str = Field(..., description="Message content")
    type: Optional[str] = Field(None, description="Message type (e.g., file-data)")
    fileData: Optional[Dict[str, Any]] = Field(None, description="File data if type is file-data")


class ChatRouterRequest(BaseModel):
    """Request body for chat-router endpoint."""
    # PWA mode fields
    message: Optional[str] = Field(None, description="User message (PWA mode)")
    agentSlug: Optional[str] = Field(None, description="Agent/module slug")
    deviceId: Optional[str] = Field(None, description="Device identifier")
    pwaMode: Optional[bool] = Field(False, description="PWA mode flag")

    # Standard mode fields
    messages: Optional[List[MessageModel]] = Field(None, description="Conversation history")
    chatType: Optional[str] = Field("general", description="Chat type/module")
    region: Optional[str] = Field(None, description="User region")
    sessionId: Optional[str] = Field(None, description="Session identifier")


class ChatRouterResponse(BaseModel):
    """Response from chat-router endpoint."""
    response: str
    sessionId: Optional[str] = None
    contextCode: Optional[str] = None
    source: Optional[str] = None
    phoneticMap: Optional[Dict[str, str]] = None
    taxonomyTags: Optional[List[Dict[str, Any]]] = None
    dataReliability: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    response: Optional[str] = None


@router.post(
    "/functions/v1/chat-router",
    response_model=ChatRouterResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        403: {"model": ErrorResponse, "description": "Access denied"},
        429: {"model": ErrorResponse, "description": "Rate limit"},
        500: {"model": ErrorResponse, "description": "Server error"},
    },
    summary="Process chat message",
    description="""
    Route chat messages to appropriate AI provider.

    Supports two modes:
    1. PWA Mode: Single message with agentSlug (simpler)
    2. Standard Mode: Full conversation history with streaming

    Provider order: Perplexity -> OpenAI -> Gemini
    """
)
async def chat_router(request: ChatRouterRequest, http_request: Request):
    """
    Process chat message through AI provider chain.

    Maintains compatibility with existing Supabase Edge Function interface.
    """
    logger.info(
        f"[chat-router] Request: pwaMode={request.pwaMode}, "
        f"agentSlug={request.agentSlug}, chatType={request.chatType}"
    )

    try:
        chat_service = OpenAIChatService()

        # PWA Mode: Simple single message
        if request.pwaMode:
            if not request.message:
                raise HTTPException(
                    status_code=400,
                    detail={"error": "Message required", "response": "Message required"}
                )

            # Determine module
            module_slug = request.agentSlug or request.chatType or "general"

            # For now, we don't load history from database
            # This would need Supabase integration for full compatibility
            history = []

            result = await chat_service.chat(
                message=request.message,
                module_slug=module_slug,
                history=[ChatMessage(**m.model_dump()) for m in history] if history else None,
                session_id=request.sessionId
            )

            return {
                "response": result.response,
                "sessionId": result.session_id,
                "contextCode": result.context_code or module_slug,
                "source": result.source,
                "phoneticMap": result.phonetic_map,
                "taxonomyTags": [],
                "dataReliability": {
                    "hasRealtimeAccess": result.source == "perplexity",
                    "staleIndicators": [],
                    "disclaimer": None,
                },
            }

        # Standard Mode: Full conversation with potential streaming
        if not request.messages or not isinstance(request.messages, list):
            raise HTTPException(
                status_code=400,
                detail={"error": "Messages must be an array"}
            )

        if len(request.messages) > 50:
            raise HTTPException(
                status_code=400,
                detail={"error": "Too many messages"}
            )

        # Validate messages
        for msg in request.messages:
            if msg.type == "file-data":
                continue
            if not msg.content or len(msg.content) > 10000:
                raise HTTPException(
                    status_code=400,
                    detail={"error": "Invalid or too long message"}
                )

        # Get last user message
        last_user_message = None
        for msg in reversed(request.messages):
            if msg.role == "user":
                last_user_message = msg.content
                break

        if not last_user_message:
            raise HTTPException(
                status_code=400,
                detail={"error": "No user message found"}
            )

        # Convert to ChatMessage format
        history = [
            ChatMessage(role=m.role, content=m.content)
            for m in request.messages[:-1]  # Exclude last message
            if m.type != "file-data"
        ]

        module_slug = request.chatType or "general"

        result = await chat_service.chat(
            message=last_user_message,
            module_slug=module_slug,
            history=history,
            session_id=request.sessionId
        )

        return {
            "response": result.response,
            "sessionId": result.session_id,
            "contextCode": result.context_code or module_slug,
            "source": result.source,
            "phoneticMap": result.phonetic_map,
            "taxonomyTags": [],
            "dataReliability": {
                "hasRealtimeAccess": result.source == "perplexity",
                "staleIndicators": [],
                "disclaimer": None,
            },
        }

    except HTTPException:
        raise

    except ValueError as e:
        logger.warning(f"[chat-router] ValueError: {e}")
        raise HTTPException(
            status_code=400,
            detail={"error": str(e), "response": str(e)}
        )

    except Exception as e:
        logger.error(f"[chat-router] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "Erro interno no servidor"}
        )


# Streaming endpoint for standard mode
@router.post(
    "/functions/v1/chat-router/stream",
    summary="Stream chat response",
    description="Stream chat completion response (SSE format)"
)
async def chat_router_stream(request: ChatRouterRequest):
    """
    Stream chat completion response.

    Returns Server-Sent Events format for real-time streaming.
    """
    if not request.messages:
        raise HTTPException(
            status_code=400,
            detail={"error": "Messages required for streaming"}
        )

    chat_service = OpenAIChatService()

    # Build messages for streaming
    messages = [
        {"role": m.role, "content": m.content}
        for m in request.messages
        if m.type != "file-data"
    ]

    async def generate():
        async for chunk in chat_service.stream_chat(messages):
            yield chunk + "\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
