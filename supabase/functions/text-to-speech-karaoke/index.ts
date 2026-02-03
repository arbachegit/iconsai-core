// ============================================
// VERSAO: 1.0.0 | DEPLOY: 2026-02-03
// TTS Karaoke: Gera áudio + word timestamps
// Fluxo:
// 1. Gerar áudio TTS (OpenAI gpt-4o-mini-tts)
// 2. Transcrever o áudio gerado com Whisper + word timestamps
// 3. Retornar áudio + timestamps sincronizados
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// OpenAI TTS voices disponíveis
const OPENAI_VOICES = [
  "alloy", "ash", "ballad", "coral", "echo",
  "fable", "onyx", "nova", "sage", "shimmer",
  "verse", "marin", "cedar"
];

serve(async (req) => {
  const origin = req.headers.get("origin");
  const dynamicCorsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: dynamicCorsHeaders });
  }

  try {
    const body = await req.json();
    const {
      text,
      voice = "nova",
      chatType = "home",
      speed = 1.0,
    } = body;

    console.log('[TTS-KARAOKE] ========== NOVA REQUISIÇÃO ==========');
    console.log('[TTS-KARAOKE] Text length:', text?.length);
    console.log('[TTS-KARAOKE] Voice:', voice);

    if (!text || text.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Texto é obrigatório' }),
        { status: 400, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar tamanho do texto
    const MAX_TEXT_LENGTH = 5000;
    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Texto muito longo. Máximo ${MAX_TEXT_LENGTH} caracteres.` }),
        { status: 400, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('[TTS-KARAOKE] ❌ OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Serviço TTS não configurado' }),
        { status: 500, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar voz
    const selectedVoice = OPENAI_VOICES.includes(voice) ? voice : 'nova';

    // ============================================
    // PASSO 1: Gerar áudio TTS
    // ============================================
    console.log('[TTS-KARAOKE] Gerando áudio TTS...');

    const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: text,
        voice: selectedVoice,
        response_format: "mp3",
        speed: speed,
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[TTS-KARAOKE] ❌ Erro TTS:', ttsResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro ao gerar áudio: ${ttsResponse.status}` }),
        { status: 500, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter áudio como ArrayBuffer
    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioArrayBuffer);

    console.log('[TTS-KARAOKE] ✅ Áudio gerado:', audioBytes.length, 'bytes');

    // Converter para base64 para retorno
    const audioBase64 = btoa(String.fromCharCode(...audioBytes));

    // ============================================
    // PASSO 2: Transcrever o áudio com Whisper para obter word timestamps
    // ============================================
    console.log('[TTS-KARAOKE] Transcrevendo áudio para word timestamps...');

    const formData = new FormData();
    const blob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });
    formData.append('file', blob, 'tts_audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('[TTS-KARAOKE] ❌ Erro Whisper:', whisperResponse.status, errorText);

      // Retornar áudio mesmo sem timestamps (fallback)
      console.log('[TTS-KARAOKE] ⚠️ Retornando áudio sem timestamps (fallback)');
      return new Response(
        JSON.stringify({
          audioBase64,
          audioMimeType: 'audio/mpeg',
          words: null,
          duration: null,
          text: text, // Retornar texto original como fallback
        }),
        { headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const whisperResult = await whisperResponse.json();

    console.log('[TTS-KARAOKE] ✅ Whisper transcreveu:', whisperResult.text?.substring(0, 50));
    console.log('[TTS-KARAOKE] Words encontradas:', whisperResult.words?.length || 0);
    console.log('[TTS-KARAOKE] Duration:', whisperResult.duration);

    // ============================================
    // PASSO 3: Retornar áudio + timestamps
    // ============================================
    const words = whisperResult.words?.map((w: { word: string; start: number; end: number }) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    })) || [];

    return new Response(
      JSON.stringify({
        audioBase64,
        audioMimeType: 'audio/mpeg',
        words,
        duration: whisperResult.duration || null,
        text: whisperResult.text || text,
      }),
      { headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[TTS-KARAOKE] ❌ Exceção:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
