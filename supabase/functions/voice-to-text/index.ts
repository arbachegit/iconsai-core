// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // CORREÇÃO: Receber mimeType do body (crítico para iOS)
    const { audio, mimeType: providedMimeType } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Strip data URL prefix if present
    let base64Data = audio;
    // Priorizar mimeType enviado pelo frontend (detectado pelo MediaRecorder)
    let mimeType = providedMimeType || 'audio/webm';
    
    if (audio.includes(',')) {
      const parts = audio.split(',');
      base64Data = parts[1] || '';
      // Extract mime type from data URL (fallback)
      const mimeMatch = parts[0].match(/data:([^;]+)/);
      if (mimeMatch && !providedMimeType) {
        mimeType = mimeMatch[1];
      }
    }
    
    console.log('[VOICE-TO-TEXT] Received mimeType from frontend:', providedMimeType);
    
    // Validate base64 data is not empty
    if (!base64Data || base64Data.length < 100) {
      throw new Error('Audio data is empty or too short. Please record for longer.');
    }
    
    console.log('[VOICE-TO-TEXT] Audio mime type:', mimeType);
    console.log('[VOICE-TO-TEXT] Base64 data length:', base64Data.length);

    // Decode base64 directly (Deno handles large strings well)
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('[VOICE-TO-TEXT] Decoded audio bytes:', bytes.length);
    
    if (bytes.length < 1000) {
      throw new Error('Audio file too small. Please record for longer.');
    }
    
    // Determine file extension based on mime type
    let extension = 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      extension = 'mp4';
    } else if (mimeType.includes('wav')) {
      extension = 'wav';
    } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      extension = 'mp3';
    } else if (mimeType.includes('ogg')) {
      extension = 'ogg';
    }
    
    // Prepare form data
    const formData = new FormData();
    const blob = new Blob([bytes], { type: mimeType });
    formData.append('file', blob, `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    console.log('[VOICE-TO-TEXT] Sending audio to OpenAI Whisper API, file:', `audio.${extension}`);

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VOICE-TO-TEXT] OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('[VOICE-TO-TEXT] Transcription successful:', result.text?.substring(0, 50) + '...');

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[VOICE-TO-TEXT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
