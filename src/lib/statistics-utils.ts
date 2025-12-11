/**
 * Calculates Pearson correlation coefficient between two arrays
 * @returns r value between -1 and 1
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((a, b) => a + b, 0);
  const sumY = ySlice.reduce((a, b) => a + b, 0);
  const sumXY = xSlice.reduce((acc, xi, i) => acc + xi * ySlice[i], 0);
  const sumX2 = xSlice.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = ySlice.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Linear regression using least squares method
 * @returns slope, intercept, and R² value
 */
export function linearRegression(
  x: number[],
  y: number[]
): { slope: number; intercept: number; r2: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((a, b) => a + b, 0);
  const sumY = ySlice.reduce((a, b) => a + b, 0);
  const sumXY = xSlice.reduce((acc, xi, i) => acc + xi * ySlice[i], 0);
  const sumX2 = xSlice.reduce((acc, xi) => acc + xi * xi, 0);

  const meanX = sumX / n;
  const meanY = sumY / n;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = meanY - slope * meanX;

  // Calculate R²
  const yPredicted = xSlice.map((xi) => slope * xi + intercept);
  const ssRes = ySlice.reduce(
    (acc, yi, i) => acc + Math.pow(yi - yPredicted[i], 2),
    0
  );
  const ssTot = ySlice.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Standard deviation of an array
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Mean of an array
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Moving average with specified period
 */
export function movingAverage(values: number[], period: number): number[] {
  if (period < 1 || values.length < period) return [];

  const result: number[] = [];
  for (let i = 0; i <= values.length - period; i++) {
    const sum = values.slice(i, i + period).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Detect trend direction based on regression slope
 */
export function detectTrend(
  slope: number,
  threshold: number = 0.01
): "up" | "down" | "stable" {
  if (slope > threshold) return "up";
  if (slope < -threshold) return "down";
  return "stable";
}

/**
 * Get correlation strength description
 */
export function getCorrelationStrength(r: number): {
  strength: string;
  color: string;
  description: string;
} {
  const absR = Math.abs(r);
  const direction = r >= 0 ? "positiva" : "negativa";

  if (absR >= 0.9) {
    return {
      strength: "Muito Forte",
      color: r >= 0 ? "text-green-500" : "text-red-500",
      description: `Correlação ${direction} muito forte`,
    };
  }
  if (absR >= 0.7) {
    return {
      strength: "Forte",
      color: r >= 0 ? "text-green-400" : "text-red-400",
      description: `Correlação ${direction} forte`,
    };
  }
  if (absR >= 0.5) {
    return {
      strength: "Moderada",
      color: "text-yellow-500",
      description: `Correlação ${direction} moderada`,
    };
  }
  if (absR >= 0.3) {
    return {
      strength: "Fraca",
      color: "text-gray-400",
      description: `Correlação ${direction} fraca`,
    };
  }
  return {
    strength: "Muito Fraca",
    color: "text-gray-500",
    description: "Correlação insignificante",
  };
}

/**
 * Generate all unique pairs from an array
 */
export function generatePairs<T>(items: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

/**
 * Predict future value using linear regression
 */
export function predictValue(
  regression: { slope: number; intercept: number },
  x: number
): number {
  return regression.slope * x + regression.intercept;
}

/**
 * Calculate coefficient of variation (CV)
 */
export function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return (standardDeviation(values) / m) * 100;
}
