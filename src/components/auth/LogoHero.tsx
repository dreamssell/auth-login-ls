import { Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';

const LogoHero = () => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className="text-center mb-8"
  >
    <div className="flex items-center justify-center gap-3 mb-2">
      <Fingerprint className="w-8 h-8 text-primary" />
      <h1 className="text-3xl font-bold text-gradient-primary">Lead Seller</h1>
    </div>
    <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
      Atendimento Exclusivo
    </p>
  </motion.div>
);

export default LogoHero;
