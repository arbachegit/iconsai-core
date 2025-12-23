import { X, Mic, Volume2, Gauge, Share2, Plus } from "lucide-react";

interface PWAHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAHelpModal({ isOpen, onClose }: PWAHelpModalProps) {
  if (!isOpen) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-card rounded-t-3xl p-6 animate-slide-up safe-area-bottom">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-6">Como usar</h2>

        {/* Usage instructions */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Gravar pergunta</h3>
              <p className="text-sm text-muted-foreground">
                Toque no botão central e fale sua pergunta. A gravação para automaticamente após alguns segundos de silêncio.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Volume2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Ouvir resposta</h3>
              <p className="text-sm text-muted-foreground">
                Quando a resposta estiver pronta, toque no botão verde para ouvir. Use a barra de progresso para navegar.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Gauge className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Ajustar velocidade</h3>
              <p className="text-sm text-muted-foreground">
                Toque no botão de velocidade (1x, 1.5x, 2x) para ouvir mais rápido ou devagar.
              </p>
            </div>
          </div>
        </div>

        {/* Install instructions */}
        {(isIOS || isAndroid) && (
          <>
            <div className="border-t border-border pt-6 mb-4">
              <h3 className="font-medium text-foreground mb-3">Adicionar à Tela Inicial</h3>
              
              {isIOS && (
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">1</span>
                    <span>Toque no botão <Share2 className="h-4 w-4 inline mx-1" /> compartilhar</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">2</span>
                    <span>Selecione "Adicionar à Tela de Início"</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">3</span>
                    <span>Toque em "Adicionar"</span>
                  </li>
                </ol>
              )}

              {isAndroid && (
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">1</span>
                    <span>Toque no menu (três pontos) do navegador</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">2</span>
                    <span>Selecione "Adicionar à tela inicial" <Plus className="h-4 w-4 inline mx-1" /></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">3</span>
                    <span>Confirme tocando em "Adicionar"</span>
                  </li>
                </ol>
              )}
            </div>
          </>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Entendi
        </button>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        .safe-area-bottom {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}

export default PWAHelpModal;
