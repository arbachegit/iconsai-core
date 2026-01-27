// ============================================
// VERSAO: 1.0.0 | DEPLOY: 2026-01-28
// Análise de frequência de voz (F0) IconsAI
// Detecta emoções baseado em características prosódicas
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const FUNCTION_VERSION = "1.0.0";

interface AnalyzeVoiceRequest {
  conversationId: string;
  audioType: "question" | "response";
  // Dados de F0 pré-computados (do cliente ou serviço de análise)
  f0Data?: {
    samples: number[];      // Array de F0 em Hz
    timestamps: number[];   // Timestamps em segundos
    sampleRate?: number;    // Taxa de amostragem (default 100 Hz)
  };
  // Ou métricas já calculadas
  metrics?: {
    f0Mean: number;
    f0Min: number;
    f0Max: number;
    f0Std?: number;
    speechRateWpm?: number;
    pauseCount?: number;
    avgPauseDuration?: number;
  };
  // Metadados do áudio
  audioUrl?: string;
  audioDuration?: number;
  // IDs para vínculo
  platformUserId?: string;
  institutionId?: string;
}

// Mapeamento de emoções baseado em F0 e velocidade
// Baseado em estudos de prosódia emocional
const EMOTION_PROFILES = {
  neutral: { f0Range: [100, 150], rangeHz: [30, 50], wpm: [120, 150], contour: "flat" },
  happy: { f0Range: [150, 200], rangeHz: [80, 120], wpm: [160, 200], contour: "ascending" },
  sad: { f0Range: [80, 120], rangeHz: [20, 40], wpm: [80, 100], contour: "descending" },
  angry: { f0Range: [180, 250], rangeHz: [100, 150], wpm: [180, 220], contour: "varied" },
  fearful: { f0Range: [150, 220], rangeHz: [80, 130], wpm: [160, 200], contour: "varied" },
  surprised: { f0Range: [200, 280], rangeHz: [120, 180], wpm: [140, 180], contour: "peak" },
  bored: { f0Range: [90, 110], rangeHz: [15, 30], wpm: [60, 90], contour: "flat" },
};

// Calcula estatísticas de F0 a partir dos samples
function calculateF0Stats(samples: number[]): {
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  std: number;
  variance: number;
  percentile25: number;
  percentile75: number;
  iqr: number;
} {
  // Filtrar valores inválidos (0 ou muito baixos)
  const validSamples = samples.filter(s => s > 50 && s < 500);

  if (validSamples.length === 0) {
    return {
      mean: 0, median: 0, min: 0, max: 0, range: 0,
      std: 0, variance: 0, percentile25: 0, percentile75: 0, iqr: 0,
    };
  }

  const sorted = [...validSamples].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = validSamples.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  const variance = validSamples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const std = Math.sqrt(variance);

  const percentile25 = sorted[Math.floor(n * 0.25)];
  const percentile75 = sorted[Math.floor(n * 0.75)];
  const iqr = percentile75 - percentile25;

  return { mean, median, min, max, range, std, variance, percentile25, percentile75, iqr };
}

// Converte range de Hz para semitons
function hzToSemitones(rangeHz: number, baseFreq: number): number {
  if (baseFreq <= 0 || rangeHz <= 0) return 0;
  return 12 * Math.log2((baseFreq + rangeHz) / baseFreq);
}

// Detecta tipo de contorno melódico
function detectContourType(samples: number[]): string {
  const validSamples = samples.filter(s => s > 50 && s < 500);
  if (validSamples.length < 4) return "flat";

  const firstQuarter = validSamples.slice(0, Math.floor(validSamples.length / 4));
  const lastQuarter = validSamples.slice(-Math.floor(validSamples.length / 4));

  const firstMean = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
  const lastMean = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;

  // Calcular variação
  const mean = validSamples.reduce((a, b) => a + b, 0) / validSamples.length;
  const variance = validSamples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validSamples.length;
  const cv = Math.sqrt(variance) / mean; // Coeficiente de variação

  // Detectar padrão
  const diff = lastMean - firstMean;
  const threshold = mean * 0.1; // 10% da média

  if (cv > 0.25) {
    // Alta variação - verificar se há pico ou vale
    const midSamples = validSamples.slice(
      Math.floor(validSamples.length / 3),
      Math.floor(2 * validSamples.length / 3)
    );
    const midMean = midSamples.reduce((a, b) => a + b, 0) / midSamples.length;

    if (midMean > firstMean && midMean > lastMean) {
      return "peak";
    } else if (midMean < firstMean && midMean < lastMean) {
      return "valley";
    }
    return "varied";
  }

  if (diff > threshold) {
    return "ascending";
  } else if (diff < -threshold) {
    return "descending";
  }

  return "flat";
}

// Detecta emoção baseado nas métricas
function detectEmotion(
  f0Mean: number,
  f0Range: number,
  speechRate?: number,
  contourType?: string
): { emotion: string; confidence: number; scores: Record<string, number> } {
  const scores: Record<string, number> = {};

  for (const [emotion, profile] of Object.entries(EMOTION_PROFILES)) {
    let score = 0;

    // Score baseado em F0 mean
    const [minF0, maxF0] = profile.f0Range;
    if (f0Mean >= minF0 && f0Mean <= maxF0) {
      score += 0.4 * (1 - Math.abs(f0Mean - (minF0 + maxF0) / 2) / ((maxF0 - minF0) / 2));
    }

    // Score baseado em range
    const [minRange, maxRange] = profile.rangeHz;
    if (f0Range >= minRange && f0Range <= maxRange) {
      score += 0.3 * (1 - Math.abs(f0Range - (minRange + maxRange) / 2) / ((maxRange - minRange) / 2));
    }

    // Score baseado em velocidade da fala
    if (speechRate) {
      const [minWpm, maxWpm] = profile.wpm;
      if (speechRate >= minWpm && speechRate <= maxWpm) {
        score += 0.2 * (1 - Math.abs(speechRate - (minWpm + maxWpm) / 2) / ((maxWpm - minWpm) / 2));
      }
    }

    // Score baseado em contorno
    if (contourType && contourType === profile.contour) {
      score += 0.1;
    }

    scores[emotion] = Math.max(0, Math.min(1, score));
  }

  // Encontrar emoção com maior score
  let maxEmotion = "neutral";
  let maxScore = 0;
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion;
    }
  }

  // Se score muito baixo, default para neutral
  if (maxScore < 0.3) {
    maxEmotion = "neutral";
    maxScore = 0.5;
  }

  return {
    emotion: maxEmotion,
    confidence: Math.round(maxScore * 100) / 100,
    scores,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log(`\n=== ANALYZE-VOICE-FREQUENCY v${FUNCTION_VERSION} START ===`);
  console.log(`[TIMESTAMP] ${new Date().toISOString()}`);
  const startTime = Date.now();

  const respond = (status: number, payload: Record<string, unknown>) => {
    const body = { ...payload, version: FUNCTION_VERSION };
    console.log(`[RESPONSE] ${JSON.stringify(body)}`);
    console.log(`=== ANALYZE-VOICE-FREQUENCY v${FUNCTION_VERSION} END ===\n`);
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const body: AnalyzeVoiceRequest = await req.json();

    // Validação
    if (!body.conversationId) {
      return respond(400, { success: false, error: "conversationId é obrigatório" });
    }

    if (!body.audioType || !["question", "response"].includes(body.audioType)) {
      return respond(400, { success: false, error: "audioType deve ser 'question' ou 'response'" });
    }

    console.log(`📋 [CONVERSATION] ${body.conversationId}`);
    console.log(`🎤 [TYPE] ${body.audioType}`);

    let f0Stats: ReturnType<typeof calculateF0Stats>;
    let contourType: string;
    let f0Samples: number[] = [];
    let f0Timestamps: number[] = [];

    // Usar dados de F0 pré-computados se fornecidos
    if (body.f0Data && body.f0Data.samples.length > 0) {
      console.log(`📊 [F0 DATA] ${body.f0Data.samples.length} samples`);
      f0Samples = body.f0Data.samples;
      f0Timestamps = body.f0Data.timestamps;
      f0Stats = calculateF0Stats(f0Samples);
      contourType = detectContourType(f0Samples);
    }
    // Ou usar métricas já calculadas
    else if (body.metrics) {
      console.log(`📊 [METRICS] Pre-computed`);
      f0Stats = {
        mean: body.metrics.f0Mean,
        median: body.metrics.f0Mean,
        min: body.metrics.f0Min,
        max: body.metrics.f0Max,
        range: body.metrics.f0Max - body.metrics.f0Min,
        std: body.metrics.f0Std || 0,
        variance: body.metrics.f0Std ? Math.pow(body.metrics.f0Std, 2) : 0,
        percentile25: body.metrics.f0Min,
        percentile75: body.metrics.f0Max,
        iqr: body.metrics.f0Max - body.metrics.f0Min,
      };
      contourType = "varied"; // Não é possível detectar sem samples
    }
    else {
      return respond(400, {
        success: false,
        error: "É necessário fornecer f0Data ou metrics",
      });
    }

    console.log(`📈 [STATS] Mean: ${f0Stats.mean.toFixed(1)} Hz, Range: ${f0Stats.range.toFixed(1)} Hz`);
    console.log(`📊 [CONTOUR] ${contourType}`);

    // Detectar emoção
    const emotionResult = detectEmotion(
      f0Stats.mean,
      f0Stats.range,
      body.metrics?.speechRateWpm,
      contourType
    );

    console.log(`😊 [EMOTION] ${emotionResult.emotion} (${emotionResult.confidence})`);

    // Encontrar segunda emoção
    const sortedEmotions = Object.entries(emotionResult.scores)
      .filter(([e]) => e !== emotionResult.emotion)
      .sort((a, b) => b[1] - a[1]);
    const secondaryEmotion = sortedEmotions[0]?.[0];
    const secondaryConfidence = sortedEmotions[0]?.[1] || 0;

    // Salvar no banco
    const supabase = getSupabaseAdmin();

    const analysisData = {
      conversation_id: body.conversationId,
      platform_user_id: body.platformUserId || null,
      institution_id: body.institutionId || null,
      audio_type: body.audioType,
      audio_url: body.audioUrl || null,
      audio_duration_seconds: body.audioDuration || null,

      // Dados brutos
      f0_samples: f0Samples,
      f0_timestamps: f0Timestamps,
      sample_rate: body.f0Data?.sampleRate || 100,

      // Estatísticas
      f0_mean: f0Stats.mean,
      f0_median: f0Stats.median,
      f0_min: f0Stats.min,
      f0_max: f0Stats.max,
      f0_range_hz: f0Stats.range,
      f0_range_semitones: hzToSemitones(f0Stats.range, f0Stats.mean),
      f0_std_deviation: f0Stats.std,
      f0_variance: f0Stats.variance,
      f0_percentile_25: f0Stats.percentile25,
      f0_percentile_75: f0Stats.percentile75,
      f0_iqr: f0Stats.iqr,

      // Contorno
      contour_type: contourType,

      // Emoção
      emotion: emotionResult.emotion,
      emotion_confidence: emotionResult.confidence,
      emotion_secondary: secondaryEmotion,
      emotion_secondary_confidence: secondaryConfidence,
      emotion_scores: emotionResult.scores,

      // Características da fala
      speech_rate_wpm: body.metrics?.speechRateWpm || null,
      pause_count: body.metrics?.pauseCount || null,
      avg_pause_duration: body.metrics?.avgPauseDuration || null,

      // Metadados
      processing_version: FUNCTION_VERSION,
      processing_duration_ms: Date.now() - startTime,
    };

    const { data: analysis, error: dbError } = await supabase
      .from("voice_frequency_analysis")
      .insert(analysisData)
      .select()
      .single();

    if (dbError) {
      console.error("❌ [DB] Error saving analysis:", dbError);
      return respond(500, {
        success: false,
        error: `Erro ao salvar análise: ${dbError.message}`,
      });
    }

    console.log(`✅ [DB] Analysis saved: ${analysis.id}`);

    // Atualizar baseline do usuário se houver
    if (body.platformUserId && body.audioType === "question") {
      try {
        await supabase.rpc("update_user_voice_baseline", {
          p_platform_user_id: body.platformUserId,
          p_f0_mean: f0Stats.mean,
          p_f0_range: f0Stats.range,
          p_f0_std: f0Stats.std,
          p_speech_rate: body.metrics?.speechRateWpm || 0,
          p_pause_frequency: body.metrics?.pauseCount || 0,
        });
        console.log(`✅ [BASELINE] Updated for user ${body.platformUserId}`);
      } catch (e) {
        console.warn(`⚠️ [BASELINE] Update failed:`, e);
      }
    }

    // Atualizar intonation_user na conversa
    if (body.audioType === "question") {
      await supabase
        .from("pwa_conversations")
        .update({
          intonation_user: {
            f0_mean: f0Stats.mean,
            f0_range_hz: f0Stats.range,
            f0_range_st: hzToSemitones(f0Stats.range, f0Stats.mean),
            contour: contourType,
            emotion: emotionResult.emotion,
            confidence: emotionResult.confidence,
          },
        })
        .eq("id", body.conversationId);
    }

    return respond(200, {
      success: true,
      analysisId: analysis.id,
      stats: {
        f0Mean: f0Stats.mean,
        f0Median: f0Stats.median,
        f0Min: f0Stats.min,
        f0Max: f0Stats.max,
        f0RangeHz: f0Stats.range,
        f0RangeSemitones: hzToSemitones(f0Stats.range, f0Stats.mean),
        f0Std: f0Stats.std,
      },
      contour: contourType,
      emotion: {
        primary: emotionResult.emotion,
        confidence: emotionResult.confidence,
        secondary: secondaryEmotion,
        secondaryConfidence: secondaryConfidence,
        scores: emotionResult.scores,
      },
      processingTimeMs: Date.now() - startTime,
    });

  } catch (error) {
    console.error("❌ [FATAL]", error);
    return respond(500, {
      success: false,
      error: error instanceof Error ? error.message : "Erro interno",
    });
  }
});
