import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Background from '@/components/auth/Background';
import SecurityBadge from '@/components/auth/SecurityBadge';
import LogoHero from '@/components/auth/LogoHero';
import InstallBanner from '@/components/auth/InstallBanner';
import ProgressBar from '@/components/auth/ProgressBar';
import EmailStep from '@/components/auth/EmailStep';
import PasswordStep from '@/components/auth/PasswordStep';
import CardFooter from '@/components/auth/CardFooter';
import PageFooter from '@/components/auth/PageFooter';
import useSecurityProtection from '@/hooks/useSecurityProtection';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import { verifyEmail, authenticate } from '@/services/authApi';

const Index = () => {
  useSecurityProtection();
  const loginLimiter = useRateLimiter({ maxAttempts: 5, windowMs: 60_000 });

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Verify email/ID against API
  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;
      if (loginLimiter.isBlocked()) {
        setError(`Muitas tentativas. Aguarde ${loginLimiter.getSecondsUntilReset()}s.`);
        return;
      }
      setError(null);
      setIsLoading(true);
      loginLimiter.recordAttempt();

      try {
        const data = await verifyEmail(email);
        if (!data.exists) throw new Error('Usuário não encontrado.');
        setUserName(data.user?.display_name || data.name || 'Cliente');
        setAvatarUrl(data.user?.avatar_url || null);
        setStep(2);
      } catch (err: any) {
        setError(err?.message || 'Erro ao verificar identidade.');
      } finally {
        setIsLoading(false);
      }
    },
    [email]
  );

  // Step 2: Authenticate with password
  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password) return;
      if (loginLimiter.isBlocked()) {
        setError(`Muitas tentativas. Aguarde ${loginLimiter.getSecondsUntilReset()}s.`);
        return;
      }
      setError(null);
      setIsLoading(true);
      loginLimiter.recordAttempt();

      try {
        const data = await authenticate(email, password);
        // Conforme contrato: redirecionar para data.redirectUrl. O Hub processa os tokens no /auth/callback.
        window.location.href = data.redirectUrl!;
      } catch (err: any) {
        setError(err?.message || 'Falha na autenticação.');
      } finally {
        setIsLoading(false);
      }
    },
    [email, password]
  );

  const handleBack = useCallback(() => {
    setStep(1);
    setPassword('');
    setError(null);
  }, []);

  return (
    <div
      className="min-h-[100svh] flex flex-col items-center justify-center px-4 py-6 relative no-select"
      style={{
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <InstallBanner />
      <Background />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-4 sm:gap-6">
        <SecurityBadge />
        <LogoHero />

        {/* Login Card */}
        <div className="w-full glass-card rounded-2xl overflow-hidden glow-primary">
          <ProgressBar step={step} />

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <EmailStep
                  email={email}
                  setEmail={setEmail}
                  isLoading={isLoading}
                  error={error}
                  onSubmit={handleEmailSubmit}
                />
              ) : (
                <PasswordStep
                  email={email}
                  userName={userName}
                  avatarUrl={avatarUrl}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  toggleShowPassword={() => setShowPassword((v) => !v)}
                  isLoading={isLoading}
                  error={error}
                  onSubmit={handleLogin}
                  onBack={handleBack}
                />
              )}
            </AnimatePresence>
          </div>

          <CardFooter />
        </div>

        <PageFooter />
      </div>
    </div>
  );
};

export default Index;
