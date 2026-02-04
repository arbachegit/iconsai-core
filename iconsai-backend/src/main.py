"""
IconsAI Backend - FastAPI Application

This backend replaces Supabase Edge Functions with a Python FastAPI server.
It maintains 100% API compatibility with the existing frontend.

Endpoints:
- POST /functions/v1/voice-to-text     -> Speech-to-text with Whisper
- POST /functions/v1/text-to-speech-karaoke -> TTS with native timestamps
- POST /functions/v1/chat-router       -> Chat completion proxy

Change VITE_SUPABASE_URL to point to this server to switch.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .api import voice_to_text_router, text_to_speech_router, chat_router, realtime_voice_router, admin_users_router
from .core.sync_coordinator import get_sync_coordinator
from .core.session_manager import get_session_manager

# Configure logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("=" * 50)
    logger.info("IconsAI Backend Starting...")
    logger.info(f"TTS Provider: {settings.tts_provider}")
    logger.info(f"ElevenLabs configured: {settings.has_elevenlabs()}")
    logger.info(f"OpenAI configured: {settings.has_openai()}")
    logger.info(f"Perplexity configured: {settings.has_perplexity()}")
    logger.info(f"Gemini configured: {settings.has_gemini()}")
    logger.info(f"CORS Origins: {settings.cors_origins_list}")
    logger.info("=" * 50)

    yield

    # Shutdown
    logger.info("IconsAI Backend Shutting down...")


# Create FastAPI application
app = FastAPI(
    title="IconsAI Backend",
    description="Backend for IconsAI Voice Assistant - replaces Supabase Edge Functions",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "authorization",
        "x-client-info",
        "apikey",
        "content-type",
        "x-supabase-client-platform",
    ],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "tts_provider": settings.tts_provider,
        "services": {
            "elevenlabs": settings.has_elevenlabs(),
            "openai": settings.has_openai(),
            "perplexity": settings.has_perplexity(),
            "gemini": settings.has_gemini(),
        }
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "IconsAI Backend",
        "version": "1.2.0",
        "endpoints": {
            "voice_to_text": "POST /functions/v1/voice-to-text",
            "text_to_speech_karaoke": "POST /functions/v1/text-to-speech-karaoke",
            "text_to_speech": "POST /functions/v1/text-to-speech",
            "chat_router": "POST /functions/v1/chat-router",
            "realtime_stt": "WS /functions/v1/realtime-stt (WebSocket)",
            "realtime_stt_info": "POST /functions/v1/realtime-stt/info",
            "admin_users": "POST/GET/PUT/DELETE /functions/v1/admin/users",
            "health": "GET /health",
        },
        "docs": "/docs",
    }


# Sync endpoint for clock synchronization
@app.post("/functions/v1/sync")
async def clock_sync(request: Request):
    """
    Clock synchronization endpoint for latency compensation.

    Used by the frontend to sync client/server clocks for karaoke timing.
    """
    data = await request.json()

    coordinator = get_sync_coordinator()
    result = coordinator.process_clock_sync(
        session_id=data.get("sessionId", "default"),
        client_send_time=data.get("clientSendTime", 0),
        client_recv_time=data.get("clientRecvTime"),
    )

    return result


# Include routers
app.include_router(voice_to_text_router, tags=["Voice"])
app.include_router(text_to_speech_router, tags=["Voice"])
app.include_router(chat_router, tags=["Chat"])
app.include_router(realtime_voice_router, tags=["Realtime Voice"])
app.include_router(admin_users_router, tags=["Admin"])


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


def main():
    """Run the application with uvicorn."""
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
