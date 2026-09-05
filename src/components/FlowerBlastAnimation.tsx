import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, CheckCircle2 } from 'lucide-react';

interface FlowerBlastAnimationProps {
  show: boolean;
  onComplete?: () => void;
  jobTitle?: string;
  companyName?: string;
}

interface FlowerParticle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  duration: number;
  delay: number;
}

const FLOWER_EMOJIS = ['🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🏵️', '💐', '✨', '🎉', '🌟'];

export default function FlowerBlastAnimation({
  show,
  onComplete,
  jobTitle = 'Job Position',
  companyName = 'Employer'
}: FlowerBlastAnimationProps) {
  const [particles, setParticles] = useState<FlowerParticle[]>([]);

  useEffect(() => {
    if (show) {
      // Generate 36 random flower particles bursting outward
      const newParticles: FlowerParticle[] = Array.from({ length: 36 }).map((_, i) => {
        const angle = (i / 36) * Math.PI * 2 + (Math.random() - 0.5);
        const distance = 120 + Math.random() * 280;
        return {
          id: i,
          emoji: FLOWER_EMOJIS[Math.floor(Math.random() * FLOWER_EMOJIS.length)],
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - (40 + Math.random() * 100), // bias upwards
          scale: 0.8 + Math.random() * 1.2,
          rotation: Math.random() * 720 - 360,
          duration: 1.8 + Math.random() * 1.4,
          delay: Math.random() * 0.25
        };
      });

      setParticles(newParticles);

      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 pointer-events-auto"
          onClick={() => onComplete && onComplete()}
        >
          {/* Confetti & Flower Burst Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, scale: 0.2, rotate: 0, opacity: 1 }}
                animate={{
                  x: p.x,
                  y: [0, p.y, p.y + 180], // Burst out then float down
                  scale: [0.2, p.scale, p.scale * 0.8],
                  rotate: p.rotation,
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className="absolute text-3xl select-none"
              >
                {p.emoji}
              </motion.div>
            ))}
          </div>

          {/* Celebratory Dialog Card */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative max-w-sm w-full bg-white rounded-3xl p-8 text-center shadow-2xl border border-orange-100 space-y-5 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* Glowing Icon Badge */}
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 1, delay: 0.2 }}
              className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-orange-500/30"
            >
              <Trophy className="w-10 h-10" />
            </motion.div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-[11px] font-extrabold text-orange-600 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Application Sent!
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Congratulations!</h2>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                You have successfully applied to <span className="font-bold text-slate-900">{jobTitle}</span> at <span className="font-bold text-slate-900">{companyName}</span>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Recruiter notified instantly</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Track status anytime in "My Applications"</span>
              </div>
            </div>

            <button
              onClick={() => onComplete && onComplete()}
              className="w-full py-3 px-6 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              Done & Explore More
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
