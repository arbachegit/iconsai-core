import { useState, useEffect } from 'react';
import { Smartphone, Mic, Zap, Shield, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const PWADesktopBlock = () => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Get clean URL for the PWA (without slugs)
  const baseUrl = window.location.origin;
  const pwaUrl = `${baseUrl}/pwa-register`;

  // Generate QR Code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCode = await import('qrcode');
        const url = await QRCode.toDataURL(pwaUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#1e293b',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    };
    generateQR();
  }, [pwaUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pwaUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Ícone principal */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/30 backdrop-blur-sm">
              <Smartphone className="w-16 h-16 text-blue-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">
            App Exclusivo para Celular
          </h1>
          <p className="text-slate-400 text-lg">
            O KnowYOU PWA foi otimizado para a melhor experiência mobile
          </p>
        </div>

        {/* Benefícios */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 space-y-4">
          <h2 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Por que usar no celular?
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Mic className="w-5 h-5 text-rose-400" />
              </div>
              <span>Gravação de voz otimizada</span>
            </div>
            
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <span>Acesso rápido e prático</span>
            </div>
            
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <span>Segurança vinculada ao dispositivo</span>
            </div>
          </div>
        </div>

        {/* QR Code real */}
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-blue-500/20 text-center space-y-4">
          {qrDataUrl ? (
            <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden bg-white p-2">
              <img 
                src={qrDataUrl} 
                alt="QR Code para acessar o app" 
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-48 h-48 mx-auto rounded-xl bg-white/10 flex items-center justify-center border border-white/20 animate-pulse">
              <Smartphone className="w-12 h-12 text-white/40" />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-white font-medium">Escaneie com seu celular</p>
            <p className="text-slate-400 text-sm">
              Ou acesse este link no navegador do seu celular
            </p>
          </div>
        </div>

        {/* Link copiável */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="flex-1 overflow-hidden">
              <p className="text-xs text-slate-400 mb-1">Link de acesso:</p>
              <p className="text-blue-400 font-mono text-sm truncate">{pwaUrl}</p>
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="text-sm">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Dica */}
        <div className="text-center">
          <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
            <Smartphone className="w-4 h-4" />
            Abra a câmera do celular e aponte para o QR Code
          </p>
        </div>
      </div>
    </div>
  );
};

export default PWADesktopBlock;
