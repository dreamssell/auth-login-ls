import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, X, Loader2, ShieldCheck } from 'lucide-react';
import { registerPasskey } from '@/services/passkeyApi';

interface Props {
  open: boolean;
  email: string;
  userName: string;
  accessToken: string;
  onDone: () => void;
}

const PasskeyRegisterPrompt = ({ open, email, userName, accessToken, onDone }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      await registerPasskey({
        accessToken,
        userName: email,
        userDisplayName: userName,
        friendlyName: 'Este dispositivo',
      });
      onDone();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        onDone();
        return;
      }
      setError(err?.message || 'Não foi possível cadastrar a biometria.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm glass-card rounded-2xl p-6 glow-primary"
      >
        <button
          type="button"
          onClick={onDone}
          disabled={loading}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center ring-2 ring-primary/30">
            <Fingerprint className="w-8 h-8 text-primary" />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-card">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-foreground" />
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Entrar mais rápido?</h3>
            <p className="text-sm text-muted-foreground">
              Cadastre sua biometria neste dispositivo e da próxima vez acesse com um toque, sem
              digitar senha.
            </p>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 w-full">
              {error}
            </p>
          )}

          <div className="w-full space-y-2 pt-2">
            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 glow-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  Cadastrar biometria
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onDone}
              disabled={loading}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Agora não
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PasskeyRegisterPrompt;
