import { ShieldCheck, Lock, Download } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const PageFooter = () => {
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();

  const handleDownload = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIOS) {
      alert('No Safari: toque em Compartilhar (ícone de seta) e depois em "Adicionar à Tela de Início".');
    } else {
      alert('Para instalar, abra esta página no Chrome/Edge no celular ou desktop e use o menu "Instalar aplicativo".');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 mt-8">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>LGPD Compliance</span>
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>Suporte em horário comercial</span>
        </div>
      </div>
      {!installed && (
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        >
          <Download className="w-3.5 h-3.5" />
          Baixar aplicativo
        </button>
      )}
    </div>
  );
};

export default PageFooter;
