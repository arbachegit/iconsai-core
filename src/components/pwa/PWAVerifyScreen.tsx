import { useState, useEffect, useRef } from 'react';
import { MessageSquare, ArrowLeft, Loader2, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import knowriskLogo from '@/assets/knowrisk-pwa-logo.png';

interface PWAVerifyScreenProps {
  phone: string | null;
  verificationCode: string | null; // Para exibir em ambiente de teste
  onVerify: (params: { code: string }) => Promise<{ success: boolean; error?: string }>;
  onResendCode: () => Promise<{ success: boolean; code?: string; error?: string }>;
  onBack: () => void;
  isSubmitting: boolean;
}

const CODE_EXPIRY_MINUTES = 10;

export function PWAVerifyScreen({
  phone,
  verificationCode,
  onVerify,
  onResendCode,
  onBack,
  isSubmitting,
}: PWAVerifyScreenProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(CODE_EXPIRY_MINUTES * 60);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer de expiração
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Cooldown para reenvio
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  // Focar primeiro input ao montar
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhone = (phoneNumber: string | null): string => {
    if (!phoneNumber) return '';
    const numbers = phoneNumber.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) *****-${numbers.slice(7)}`;
    }
    return `***-${numbers.slice(-4)}`;
  };

  const handleInputChange = (index: number, value: string) => {
    // Aceitar apenas números
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);

    // Mover para próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit quando todos os dígitos forem preenchidos
    if (index === 5 && value) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleSubmit(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (codeString?: string) => {
    const fullCode = codeString || code.join('');
    
    if (fullCode.length !== 6) {
      setError('Digite o código completo');
      return;
    }

    const result = await onVerify({ code: fullCode });
    
    if (!result.success) {
      setError(result.error || 'Código inválido');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend || isSubmitting) return;

    setCanResend(false);
    setResendCooldown(60);
    setTimeLeft(CODE_EXPIRY_MINUTES * 60);
    setCode(['', '', '', '', '', '']);
    setError(null);

    const result = await onResendCode();
    
    if (result.success) {
      toast.success('Código reenviado!');
      inputRefs.current[0]?.focus();
    } else {
      toast.error(result.error || 'Erro ao reenviar código');
    }
  };

  const isExpired = timeLeft === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6">
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white transition-colors"
        disabled={isSubmitting}
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Logo e Título */}
      <div className="mb-8 text-center animate-fade-in">
        <div className="relative inline-block mb-4">
          <img
            src={knowriskLogo}
            alt="KnowRisk PWA"
            className="w-20 h-20 mx-auto rounded-2xl shadow-lg shadow-emerald-500/20"
          />
          <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Verificar Telefone
        </h1>
        <p className="text-slate-400 text-sm">
          Digite o código enviado para
        </p>
        <p className="text-emerald-400 font-medium">
          {formatPhone(phone)}
        </p>
      </div>

      {/* Código de teste (ambiente de desenvolvimento) */}
      {verificationCode && (
        <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-fade-in">
          <p className="text-amber-400 text-xs text-center mb-1">
            🔧 Código de teste (dev)
          </p>
          <p className="text-amber-300 text-2xl font-mono font-bold text-center tracking-widest">
            {verificationCode}
          </p>
        </div>
      )}

      {/* Inputs do código */}
      <div className="flex gap-2 mb-6 animate-fade-in">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleInputChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isSubmitting || isExpired}
            className={`
              w-12 h-14 text-center text-2xl font-bold rounded-lg
              bg-slate-800/50 border-2 text-white
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50
              transition-all duration-200
              ${error ? 'border-red-500 shake' : 'border-slate-700 focus:border-emerald-500'}
              ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          />
        ))}
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm mb-4 animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Timer */}
      <div className={`text-sm mb-6 ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
        {isExpired ? (
          <span>Código expirado</span>
        ) : (
          <span>Código expira em {formatTime(timeLeft)}</span>
        )}
      </div>

      {/* Botão Verificar */}
      <Button
        onClick={() => handleSubmit()}
        disabled={isSubmitting || code.join('').length !== 6 || isExpired}
        className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-6 transition-all duration-200"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Verificando...
          </>
        ) : (
          <>
            <Check className="w-5 h-5 mr-2" />
            Verificar
          </>
        )}
      </Button>

      {/* Reenviar código */}
      <button
        onClick={handleResend}
        disabled={!canResend || isSubmitting}
        className={`mt-6 flex items-center gap-2 text-sm transition-colors ${
          canResend ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600'
        }`}
      >
        <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
        {resendCooldown > 0 ? (
          <span>Reenviar em {resendCooldown}s</span>
        ) : (
          <span>Reenviar código</span>
        )}
      </button>

      {/* CSS para animação shake */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
