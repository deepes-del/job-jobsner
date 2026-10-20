import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AnimatedHeroRiderProps {
  className?: string;
  imageSrc?: string;
}

export const AnimatedHeroRider: React.FC<AnimatedHeroRiderProps> = ({
  className = '',
  imageSrc = '/delivery_rider_hero.png'
}) => {
  const [isStopped, setIsStopped] = useState(false);

  useEffect(() => {
    const stopTimer = setTimeout(() => {
      setIsStopped(true);
    }, 1600);

    return () => clearTimeout(stopTimer);
  }, []);

  return (
    <div className={`relative flex flex-col items-center justify-end pointer-events-none select-none overflow-visible ${className}`}>
      
      {/* Background Radial Glow */}
      <motion.div
        initial={{ opacity: 0.3, scale: 0.8 }}
        animate={{
          opacity: [0.5, 0.8, 0.6],
          scale: [0.95, 1.1, 1.02],
        }}
        transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute w-28 h-28 sm:w-96 sm:h-96 bg-blue-400/30 rounded-full blur-2xl sm:blur-3xl -z-10 pointer-events-none"
      />

      {/* Main Animated Assembly: Rider + Scooter moving down the road */}
      <motion.div
        initial={{ x: '-140%', y: 0, rotate: -2 }}
        animate={{
          x: '0%',
          y: isStopped ? [0, -3, 0] : [0, -6, 0],
          rotate: isStopped ? [0, -1, 0] : [-2, 1, -2],
        }}
        transition={{
          x: { duration: 1.6, ease: [0.16, 1, 0.3, 1] },
          y: { duration: isStopped ? 2 : 0.25, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: isStopped ? 3 : 0.3, repeat: Infinity, ease: 'easeInOut' }
        }}
        className="relative z-10 flex flex-col items-center justify-end w-full"
      >
        {/* Waving Hello Speech Bubble */}
        {isStopped && (
          <motion.div
            initial={{ opacity: 0, scale: 0.4, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            className="absolute -top-7 sm:-top-10 right-2 sm:right-8 z-30 bg-white text-[#1D61F2] px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-xl font-black text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 border border-blue-200"
          >
            <span>On Time Delivery!</span>
            <motion.span
              animate={{ rotate: [0, 20, -10, 20, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
            >
              🚀
            </motion.span>
            <div className="absolute -bottom-1.5 right-4 sm:right-6 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-white rotate-45 border-r border-b border-blue-200" />
          </motion.div>
        )}

        {/* Speed Lines & Wind Motion while riding */}
        {!isStopped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.9, 0.3], x: [-10, -80] }}
            transition={{ duration: 0.35, repeat: Infinity, ease: 'linear' }}
            className="absolute -left-8 sm:-left-12 top-1/3 flex flex-col gap-1.5 sm:gap-2 z-0 pointer-events-none"
          >
            <div className="w-12 sm:w-24 h-0.5 sm:h-1 bg-white/80 rounded-full" />
            <div className="w-8 sm:w-16 h-0.5 sm:h-1 bg-blue-200/70 rounded-full ml-2 sm:ml-4" />
            <div className="w-14 sm:w-28 h-0.5 sm:h-1 bg-white/90 rounded-full -ml-1 sm:-ml-2" />
          </motion.div>
        )}

        {/* High Resolution Delivery Rider Image */}
        <img
          src={imageSrc}
          alt="Animated Delivery Rider"
          className="h-28 sm:h-56 lg:h-64 w-auto object-contain filter drop-shadow-2xl sm:scale-125"
        />

        {/* Ground Contact Wheel Shadow */}
        <div className="w-4/5 h-1.5 sm:h-3 bg-slate-950/30 rounded-full blur-xs mt-0.5 sm:mt-1" />
      </motion.div>

      {/* Moving Road Track under Rider */}
      <div className="relative w-full h-2.5 sm:h-3 mt-1 overflow-hidden rounded-full bg-blue-900/40 border-t border-white/20 flex items-center">
        <motion.div
          animate={{ x: [0, -80] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
          className="flex items-center gap-4 sm:gap-6 w-[200%] shrink-0"
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="w-6 sm:w-8 h-0.5 sm:h-1 bg-white/70 rounded-full shrink-0 shadow-xs" />
          ))}
        </motion.div>
      </div>

    </div>
  );
};

export default AnimatedHeroRider;
