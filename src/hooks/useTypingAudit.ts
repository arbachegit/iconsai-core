import { useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingAuditResult {
  getAverageLatency: () => number;
  getMaxLatency: () => number;
  reset: () => void;
}

// Gerar session ID único para esta sessão de navegação
const generateSessionId = () => {
  const stored = sessionStorage.getItem('typing_audit_session');
  if (stored) return stored;
  const newId = `typing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('typing_audit_session', newId);
  return newId;
};

/**
 * Hook para auditoria de latência de digitação
 * Salva no banco APENAS quando detecta latência crítica (>100ms)
 * Usa debouncing para evitar múltiplos inserts
 */
export const useTypingAudit = (
  input: string, 
  enabled: boolean = false,
  componentName: string = 'unknown'
): TypingAuditResult => {
  const lastInputTime = useRef(performance.now());
  const latencies = useRef<number[]>([]);
  const isFirstInput = useRef(true);
  const sessionId = useRef(generateSessionId());
  const pendingLog = useRef<{
    latency: number;
    avg: number;
    max: number;
    count: number;
  } | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Função para salvar no banco (debounced, não bloqueia)
  const saveToDatabase = useCallback(async () => {
    if (!pendingLog.current) return;
    
    const log = pendingLog.current;
    pendingLog.current = null;
    
    try {
      // Insert assíncrono - não bloqueia a thread principal
      await supabase.from('typing_latency_logs').insert({
        session_id: sessionId.current,
        component: componentName,
        latency_ms: log.latency,
        avg_latency_ms: log.avg,
        max_latency_ms: log.max,
        sample_count: log.count,
        user_agent: navigator.userAgent
      });
      
      console.log(`🔴 [TypingAudit] Latência crítica salva: ${log.latency.toFixed(0)}ms (avg: ${log.avg.toFixed(0)}ms)`);
    } catch (error) {
      // Silencioso - não interromper UX por falha de log
      console.error('[TypingAudit] Falha ao salvar:', error);
    }
  }, [componentName]);
  
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
      
      // 🔴 CRÍTICO: Latência > 100ms - preparar para salvar no banco
      if (latency > 100) {
        const recent = latencies.current.slice(-20);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const max = Math.max(...recent);
        
        // Armazenar para debounce (pega o pior caso)
        if (!pendingLog.current || latency > pendingLog.current.latency) {
          pendingLog.current = {
            latency,
            avg,
            max,
            count: recent.length
          };
        }
        
        // Debounce: aguardar 2s sem nova latência crítica antes de salvar
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
          saveToDatabase();
        }, 2000);
        
        console.warn(`🔴 [TypingAudit] Latência CRÍTICA: ${latency.toFixed(2)}ms (será salva no banco)`);
      }
      // ⚠️ Alerta local se latência > 50ms (não salva no banco)
      else if (latency > 50) {
        console.warn(`⚠️ [TypingAudit] Latência alta: ${latency.toFixed(2)}ms`);
      }
    }
  }, [input, enabled, saveToDatabase]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        // Salvar pendente antes de desmontar
        if (pendingLog.current) {
          saveToDatabase();
        }
      }
    };
  }, [saveToDatabase]);
  
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
    pendingLog.current = null;
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
  }, []);
  
  return { getAverageLatency, getMaxLatency, reset };
};
