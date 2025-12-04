import { useRef, useEffect, useCallback } from 'react';

interface TypingAuditResult {
  getAverageLatency: () => number;
  getMaxLatency: () => number;
  reset: () => void;
}

/**
 * Hook para auditoria contínua de latência de digitação
 * Monitora a performance do input e alerta se latência > 50ms
 */
export const useTypingAudit = (
  input: string, 
  enabled: boolean = process.env.NODE_ENV === 'development'
): TypingAuditResult => {
  const lastInputTime = useRef(performance.now());
  const latencies = useRef<number[]>([]);
  const isFirstInput = useRef(true);
  
  useEffect(() => {
    if (!enabled) return;
    
    const now = performance.now();
    const latency = now - lastInputTime.current;
    lastInputTime.current = now;
    
    // Ignorar primeira medição (inicialização)
    if (isFirstInput.current) {
      isFirstInput.current = false;
      return;
    }
    
    // Só medir se foi digitação real (delta < 2s indica digitação contínua)
    if (latency < 2000 && input.length > 0) {
      latencies.current.push(latency);
      
      // ⚠️ Alertar se latência > 50ms (perceptível pelo usuário)
      if (latency > 50) {
        console.warn(`⚠️ [TypingAudit] Latência alta detectada: ${latency.toFixed(2)}ms`);
      }
      
      // 📊 Relatório a cada 20 caracteres
      if (latencies.current.length % 20 === 0 && latencies.current.length > 0) {
        const recent = latencies.current.slice(-20);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const max = Math.max(...recent);
        
        if (avg > 16) {
          console.warn(`📊 [TypingAudit] Média alta: ${avg.toFixed(2)}ms (máx: ${max.toFixed(2)}ms)`);
        } else {
          console.log(`✅ [TypingAudit] Performance OK: ${avg.toFixed(2)}ms (máx: ${max.toFixed(2)}ms)`);
        }
      }
    }
  }, [input, enabled]);
  
  const getAverageLatency = useCallback(() => {
    if (latencies.current.length === 0) return 0;
    return latencies.current.reduce((a, b) => a + b, 0) / latencies.current.length;
  }, []);
  
  const getMaxLatency = useCallback(() => {
    if (latencies.current.length === 0) return 0;
    return Math.max(...latencies.current);
  }, []);
  
  const reset = useCallback(() => {
    latencies.current = [];
    isFirstInput.current = true;
  }, []);
  
  return { getAverageLatency, getMaxLatency, reset };
};
