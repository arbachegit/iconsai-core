import { useMemo } from 'react';
import { analyzeTimeSeries, type StateSpaceResult } from '@/lib/state-space-model';
import { detectFrequencyFromData, type Frequency } from '@/lib/date-formatters';
import {
  linearRegression,
  standardDeviation,
  mean,
  movingAverage,
  detectTrend,
  coefficientOfVariation,
} from '@/lib/statistics-utils';

export interface TimeSeriesAnalysis extends StateSpaceResult {
  statistics: {
    mean: number;
    stdDev: number;
    coefficientOfVariation: number;
    movingAverage: number | null;
    min: number;
    max: number;
    slope: number;
    r2: number;
    trendDirection: 'up' | 'down' | 'stable';
  };
  detectedFrequency: Frequency;
}

/**
 * Hook for comprehensive time series analysis
 * Combines State-Space model with basic statistics
 */
export function useTimeSeriesAnalysis(
  data: { date: Date | string; value: number }[] | null | undefined,
  frequency?: Frequency
): TimeSeriesAnalysis | null {
  return useMemo(() => {
    if (!data || data.length < 3) {
      return null;
    }

    // Sort by date
    const sorted = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const values = sorted.map(d => d.value);
    const x = values.map((_, i) => i);

    // Detect frequency if not provided
    const detectedFrequency = frequency || detectFrequencyFromData(
      values.length,
      sorted[0].date,
      sorted[sorted.length - 1].date
    );

    // State-Space analysis
    const stateSpaceResult = analyzeTimeSeries(sorted, detectedFrequency);

    // Basic statistics
    const regression = linearRegression(x, values);
    const trend = detectTrend(regression.slope);
    const stdDev = standardDeviation(values);
    const avg = mean(values);
    const cv = coefficientOfVariation(values);
    
    // Moving average (window size based on frequency)
    const maWindow = detectedFrequency === 'daily' ? 30 : 
                     detectedFrequency === 'monthly' ? 12 : 
                     detectedFrequency === 'quarterly' ? 4 : 3;
    const movAvg = movingAverage(values, Math.min(maWindow, values.length));
    const lastMovingAvg = movAvg.length > 0 ? movAvg[movAvg.length - 1] : null;

    return {
      ...stateSpaceResult,
      statistics: {
        mean: avg,
        stdDev,
        coefficientOfVariation: cv,
        movingAverage: lastMovingAvg,
        min: Math.min(...values),
        max: Math.max(...values),
        slope: regression.slope,
        r2: regression.r2,
        trendDirection: trend,
      },
      detectedFrequency,
    };
  }, [data, frequency]);
}

/**
 * Generate analysis suggestions based on statistics
 */
export function generateSuggestions(analysis: TimeSeriesAnalysis | null, unit: string | null): string[] {
  if (!analysis) return [];

  const result: string[] = [];
  const { statistics, forecast, direction, uncertainty, nextPeriodLabel } = analysis;

  // Format value helper
  const formatValue = (value: number): string => {
    const u = (unit || '').toLowerCase();
    if (u.includes('%')) return `${value.toFixed(2)}%`;
    if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
    }
    if (u.includes('us$') || u.includes('usd') || u.includes('dólar')) {
      return `$ ${value.toFixed(2)}`;
    }
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  };

  // Forecast suggestion
  if (forecast.value !== 0) {
    const changeSymbol = direction === 'up' ? '↗' : direction === 'down' ? '↘' : '→';
    const changeLabel = direction === 'up' ? 'Alta' : direction === 'down' ? 'Baixa' : 'Estabilidade';
    result.push(
      `📌 VALOR ESTIMADO: ${formatValue(forecast.lower)} - ${formatValue(forecast.upper)} para ${nextPeriodLabel}`
    );
    result.push(
      `📈 TENDÊNCIA: ${changeSymbol} ${changeLabel} prevista para o próximo período`
    );
  }

  // Uncertainty
  const uncertaintyLabels = { low: 'Baixa', moderate: 'Moderada', high: 'Alta' };
  const confidencePercent = Math.round(forecast.confidence * 100);
  result.push(
    `📊 GRAU DE INCERTEZA: ${uncertaintyLabels[uncertainty]} (${confidencePercent}% de confiança)`
  );

  // Moving average insight
  if (statistics.movingAverage !== null) {
    const maLabel = statistics.movingAverage > statistics.mean ? 'acima' : 'abaixo';
    result.push(
      `📈 MÉDIA MÓVEL: ${formatValue(statistics.movingAverage)} - ${maLabel} da média histórica`
    );
  }

  // Coefficient of variation insight
  if (statistics.coefficientOfVariation > 30) {
    result.push(
      `⚠️ VOLATILIDADE: Alta variabilidade detectada (CV: ${statistics.coefficientOfVariation.toFixed(1)}%). Considere analisar períodos específicos.`
    );
  } else if (statistics.coefficientOfVariation < 10) {
    result.push(
      `✅ ESTABILIDADE: Baixa volatilidade (CV: ${statistics.coefficientOfVariation.toFixed(1)}%). Série previsível.`
    );
  }

  // R² insight
  if (statistics.r2 > 0.7) {
    result.push(
      `📈 TENDÊNCIA CLARA: R² de ${(statistics.r2 * 100).toFixed(1)}% indica tendência bem definida.`
    );
  }

  return result;
}

export default useTimeSeriesAnalysis;
