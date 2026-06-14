import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
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
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="fixed top-0 inset-x-0 z-50 bg-primary/90 backdrop-blur-md text-primary-foreground shadow-lg"
      >
        <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 py-2.5 text-sm">
          <Download className="w-4 h-4 shrink-0" />
          <span className="flex-1 truncate font-medium">
            {showIosHelp
              ? 'No Safari: toque em Compartilhar e depois "Adicionar à Tela de Início".'
              : 'Instalar aplicativo Lead Seller para acesso rápido.'}
          </span>
          <button
            onClick={handleInstall}
            className="bg-white/15 hover:bg-white/25 transition-colors rounded-md px-3 py-1 font-semibold"
          >
            {isIOS && !canInstall ? 'Como instalar' : 'Instalar'}
          </button>
          <button onClick={close} aria-label="Fechar" className="opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallBanner;
