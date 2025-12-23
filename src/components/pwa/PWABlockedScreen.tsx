import { ShieldX, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import knowriskLogo from '@/assets/knowrisk-pwa-logo.png';

interface PWABlockedScreenProps {
  reason: string | null;
  fingerprint: string;
}

export function PWABlockedScreen({ reason, fingerprint }: PWABlockedScreenProps) {
  const handleContact = () => {
    const subject = encodeURIComponent('Dispositivo Bloqueado - PWA');
    const body = encodeURIComponent(
      `Olá,\n\nMeu dispositivo foi bloqueado no PWA KnowRisk.\n\nID do dispositivo: ${fingerprint}\nMotivo informado: ${reason || 'Não informado'}\n\nPor favor, me ajudem a resolver esta situação.\n\nObrigado.`
    );
    window.location.href = `mailto:suporte@knowyou.com.br?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-900/30 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6">
      {/* Ícone de Bloqueio */}
      <div className="relative mb-8 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border-2 border-red-500/30">
          <ShieldX className="w-12 h-12 text-red-500" />
        </div>
        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Título */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-white mb-2">
          Dispositivo Bloqueado
        </h1>
        <p className="text-slate-400 text-sm max-w-xs">
          Este dispositivo foi bloqueado e não pode acessar o aplicativo
        </p>
      </div>

      {/* Razão do bloqueio */}
      {reason && (
        <div className="w-full max-w-sm mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg animate-fade-in">
          <p className="text-red-300 text-sm text-center">
            <span className="font-medium">Motivo: </span>
            {reason}
          </p>
        </div>
      )}

      {/* Card de Contato */}
      <div className="w-full max-w-sm p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl backdrop-blur-sm animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={knowriskLogo}
            alt="KnowRisk"
            className="w-10 h-10 rounded-lg"
          />
          <div>
            <p className="text-white font-medium">Precisa de ajuda?</p>
            <p className="text-slate-400 text-sm">Entre em contato conosco</p>
          </div>
        </div>

        <Button
          onClick={handleContact}
          variant="outline"
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <Mail className="w-4 h-4 mr-2" />
          Enviar Email
        </Button>
      </div>

      {/* Device ID */}
      <p className="mt-8 text-slate-700 text-xs font-mono">
        ID: {fingerprint.slice(0, 20)}...
      </p>
    </div>
  );
}
