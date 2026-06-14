import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const DISMISS_KEY = 'pwa-banner-dismissed';

const InstallBanner = () => {
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  const visible = !installed && !dismissed && (canInstall || isIOS);
  if (!visible) return null;

  const close = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (canInstall) {
      const ok = await promptInstall();
      if (ok) close();
    } else if (isIOS) {
      setShowIosHelp((v) => !v);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="fixed top-3 inset-x-0 z-50 flex justify-center px-3 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-xl">
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-[hsl(220_30%_10%/0.95)] via-[hsl(217_60%_14%/0.95)] to-[hsl(220_30%_10%/0.95)] backdrop-blur-xl shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.5)]">
            {/* glow accent */}
            <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

            <div className="relative flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
              {/* Icon badge */}
              <div className="shrink-0 relative">
                <div className="absolute inset-0 rounded-xl bg-primary/40 blur-md" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(217_91%_45%)] flex items-center justify-center shadow-lg shadow-primary/30">
                  <Smartphone className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                {showIosHelp ? (
                  <p className="text-xs sm:text-sm text-foreground/90 leading-snug">
                    No Safari: toque em <span className="font-semibold text-primary">Compartilhar</span> e depois em <span className="font-semibold text-primary">"Adicionar à Tela de Início"</span>.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-primary">
                        Aplicativo disponível
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                      Instale o Lead Seller para acesso rápido
                    </p>
                  </>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={handleInstall}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(217_91%_70%)] hover:from-[hsl(217_91%_65%)] hover:to-[hsl(217_91%_75%)] text-primary-foreground text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 transition-all shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS && !canInstall ? 'Como instalar' : 'Instalar'}</span>
              </button>

              {/* Close */}
              <button
                onClick={close}
                aria-label="Fechar"
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallBanner;
