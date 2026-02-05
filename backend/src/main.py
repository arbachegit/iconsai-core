"""
FastAPI application - Voice Sync Engine Backend
Mimics Supabase Edge Functions endpoints for seamless frontend integration
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import get_settings
from src.api import voice_to_text, text_to_speech, chat_router
from src.api import intelligence


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    settings = get_settings()
    print(f"Starting Voice Sync Engine on port {settings.port}")
    print(f"TTS Provider: {settings.tts_provider}")
    yield
    print("Shutting down Voice Sync Engine")


app = FastAPI(
    title="Iconsai Voice Sync Engine",
    description="Backend for voice processing with karaoke timestamps",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - mimicking Supabase Edge Functions paths
app.include_router(
    voice_to_text.router,
    prefix="/functions/v1",
    tags=["Voice to Text"]
)
app.include_router(
    text_to_speech.router,
    prefix="/functions/v1",
    tags=["Text to Speech"]
)
app.include_router(
    chat_router.router,
    prefix="/functions/v1",
    tags=["Chat Router"]
)

# Intelligence API
app.include_router(
    intelligence.router,
    prefix="/api/intelligence",
    tags=["Intelligence"]
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Iconsai Voice Sync Engine",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    settings = get_settings()
    return {
        "status": "healthy",
        "tts_provider": settings.tts_provider,
        "elevenlabs_configured": bool(settings.elevenlabs_api_key),
        "openai_configured": bool(settings.openai_api_key)
    }


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
