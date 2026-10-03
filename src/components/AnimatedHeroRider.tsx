import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AnimatedHeroRiderProps {
  className?: string;
}

export const AnimatedHeroRider: React.FC<AnimatedHeroRiderProps> = ({ className = '' }) => {
  const [isStopped, setIsStopped] = useState(false);
  const [isWaving, setIsWaving] = useState(false);

  useEffect(() => {
    // Stage 1: Scooter arrives and stops after ~1.8s
    const stopTimer = setTimeout(() => {
      setIsStopped(true);
    }, 1800);

    // Stage 2: Wave hand after stopping (~2.1s)
    const waveTimer = setTimeout(() => {
      setIsWaving(true);
    }, 2100);

    return () => {
      clearTimeout(stopTimer);
      clearTimeout(waveTimer);
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
      
      {/* Dynamic Bright Blue Glow Background (Highlights Focal Area) */}
      <motion.div
        initial={{ opacity: 0.3, scale: 0.8 }}
        animate={{
          opacity: isStopped ? [0.6, 0.9, 0.7] : 0.5,
          scale: isStopped ? [1, 1.15, 1.05] : 0.9,
        }}
        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-blue-300/40 rounded-full blur-3xl -z-10 pointer-events-none"
      />

      {/* Speed lines & Dust particles while rider is moving */}
      {!isStopped && (
        <React.Fragment>
          {/* Speed Lines */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: [0.2, 0.8, 0.2], x: [-20, -100] }}
            transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
            className="absolute left-0 top-1/3 flex flex-col gap-2 z-0"
          >
            <div className="w-16 sm:w-24 h-1 bg-white/70 rounded-full" />
            <div className="w-10 sm:w-16 h-1 bg-blue-100/60 rounded-full ml-4" />
            <div className="w-20 sm:w-28 h-1 bg-white/80 rounded-full -ml-2" />
          </motion.div>

          {/* Smoke / Dust Trails under rear wheel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 20 }}
            animate={{ opacity: [0.6, 0], scale: [0.5, 1.5], x: [-10, -50], y: [-5, -20] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: 'easeOut' }}
            className="absolute left-8 bottom-4 w-6 h-6 bg-white/40 rounded-full blur-xs z-0"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.4, x: 30 }}
            animate={{ opacity: [0.5, 0], scale: [0.4, 1.3], x: [0, -40], y: [0, -15] }}
            transition={{ duration: 0.4, repeat: Infinity, delay: 0.15, ease: 'easeOut' }}
            className="absolute left-12 bottom-6 w-5 h-5 bg-blue-100/50 rounded-full blur-xs z-0"
          />
        </React.Fragment>
      )}

      {/* Main Animated Delivery Rider Assembly */}
      <motion.div
        initial={{ x: '-160%', rotate: -3 }}
        animate={{
          x: '0%',
          rotate: isStopped ? [0, -2, 0] : [-3, 1, -3],
        }}
        transition={{
          x: { duration: 1.8, ease: [0.16, 1, 0.3, 1] }, // Smooth deceleration spring ease
          rotate: { duration: isStopped ? 3 : 0.3, repeat: isStopped ? Infinity : Infinity, ease: 'easeInOut' },
        }}
        className="relative z-10 w-full max-w-[280px] sm:max-w-[340px] md:max-w-[400px]"
      >

        {/* Friendly Floating Greeting Speech Bubble (Appears upon arrival) */}
        {isStopped && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
            className="absolute -top-10 right-8 sm:right-12 z-30 bg-white text-[#1D61F2] px-3.5 py-1.5 rounded-2xl shadow-xl font-black text-xs sm:text-sm flex items-center gap-1.5 border-2 border-blue-100"
          >
            <span>Hello!</span>
            <motion.span
              animate={{ rotate: [0, 20, -10, 20, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
            >
              👋
            </motion.span>
            {/* Bubble Tail */}
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white rotate-45 border-r-2 border-b-2 border-blue-100" />
          </motion.div>
        )}

        {/* High Precision Crisp Vector SVG Delivery Rider & Scooter */}
        <svg viewBox="0 0 500 400" className="w-full h-auto overflow-visible filter drop-shadow-2xl">
          <defs>
            {/* Scooter Blue Gradient */}
            <linearGradient id="scooterBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#1D61F2" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>

            {/* Helmet Shield Gloss Gradient */}
            <linearGradient id="helmetVisor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>

            {/* Grocery Bag Color */}
            <linearGradient id="paperBag" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Delivery Box Gradient */}
            <linearGradient id="deliveryBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#EFF6FF" />
            </linearGradient>
          </defs>

          {/* Ground Contact Shadow */}
          <ellipse cx="260" cy="365" rx="160" ry="14" fill="#0F172A" opacity="0.25" />

          {/* REAR SCOOTER WHEEL */}
          <g>
            <circle cx="140" cy="330" r="42" fill="#1E293B" />
            <circle cx="140" cy="330" r="28" fill="#94A3B8" />
            <circle cx="140" cy="330" r="14" fill="#475569" />
            {/* Spinning Spokes */}
            <motion.g
              animate={{ rotate: isStopped ? 0 : 360 }}
              transition={{ duration: 0.25, repeat: isStopped ? 0 : Infinity, ease: 'linear' }}
              style={{ transformOrigin: '140px 330px' }}
            >
              <line x1="140" y1="302" x2="140" y2="358" stroke="#FFFFFF" strokeWidth="3" opacity="0.8" />
              <line x1="112" y1="330" x2="168" y2="330" stroke="#FFFFFF" strokeWidth="3" opacity="0.8" />
            </motion.g>
          </g>

          {/* FRONT SCOOTER WHEEL */}
          <g>
            <circle cx="370" cy="330" r="42" fill="#1E293B" />
            <circle cx="370" cy="330" r="28" fill="#94A3B8" />
            <circle cx="370" cy="330" r="14" fill="#475569" />
            {/* Spinning Spokes */}
            <motion.g
              animate={{ rotate: isStopped ? 0 : 360 }}
              transition={{ duration: 0.25, repeat: isStopped ? 0 : Infinity, ease: 'linear' }}
              style={{ transformOrigin: '370px 330px' }}
            >
              <line x1="370" y1="302" x2="370" y2="358" stroke="#FFFFFF" strokeWidth="3" opacity="0.8" />
              <line x1="342" y1="330" x2="398" y2="330" stroke="#FFFFFF" strokeWidth="3" opacity="0.8" />
            </motion.g>
          </g>

          {/* MAIN SCOOTER BODY CHASSIS */}
          {/* Underbody & Mudguards */}
          <path d="M 100 320 Q 140 270 200 310 L 320 310 Q 370 260 410 320 L 380 340 Q 350 300 290 320 L 190 320 Q 130 300 110 340 Z" fill="url(#scooterBlue)" />
          
          {/* Footrest Floorboard */}
          <rect x="200" y="300" width="100" height="12" rx="6" fill="#0F172A" />

          {/* Front Shield & Dashboard */}
          <path d="M 310 300 L 355 190 Q 375 180 385 200 L 350 300 Z" fill="url(#scooterBlue)" />
          {/* Chrome Trim Accent */}
          <path d="M 345 205 L 325 295" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.9" />

          {/* Bright Front Headlight */}
          <circle cx="362" cy="192" r="14" fill="#FEF08A" />
          <circle cx="362" cy="192" r="10" fill="#FFFFFF" />
          {/* Headlight Beam Effect */}
          <polygon points="372,184 480,150 480,240 372,200" fill="#FEF08A" opacity="0.25" />

          {/* Seat Cushion */}
          <path d="M 170 265 C 190 255, 260 255, 280 270 L 170 270 Z" fill="#1E293B" />

          {/* REAR DELIVERY BOX WITH FRESH GROCERIES */}
          <g>
            {/* Box Main Body */}
            <rect x="90" y="150" width="105" height="115" rx="14" fill="url(#deliveryBoxGrad)" stroke="#DBEAFE" strokeWidth="4" />
            
            {/* JOBSner Brand Label on Box */}
            <rect x="102" y="195" width="81" height="34" rx="8" fill="#1D61F2" />
            <text x="142.5" y="217" fill="#FFFFFF" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">JOBSner</text>

            {/* Fresh Groceries Sticking Out of Top Box */}
            {/* Carrots / Veggies */}
            <path d="M 115 152 Q 110 120 122 110 Q 130 120 125 152 Z" fill="#F97316" />
            <path d="M 118 112 Q 110 100 115 90" stroke="#22C55E" strokeWidth="3" fill="none" />
            <path d="M 120 112 Q 125 100 130 92" stroke="#22C55E" strokeWidth="3" fill="none" />

            {/* Fresh Green Bag / Bread */}
            <rect x="135" y="125" width="28" height="32" rx="4" fill="url(#paperBag)" />
            <ellipse cx="149" cy="120" rx="12" ry="8" fill="#F59E0B" />
            
            {/* Fresh Leafy Greens */}
            <circle cx="172" cy="138" r="12" fill="#22C55E" />
            <circle cx="182" cy="144" r="10" fill="#16A34A" />
            <circle cx="165" cy="146" r="9" fill="#15803D" />
          </g>

          {/* RIDER CHARACTER (TORSO, LEGS, HELMET, WAVING HAND) */}
          {/* Driver Legs */}
          <path d="M 235 255 L 260 300 L 310 300" stroke="#1E293B" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 235 255 L 260 300 L 310 300" stroke="#1D61F2" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Driver Shoes */}
          <ellipse cx="318" cy="302" rx="14" ry="7" fill="#0F172A" />

          {/* Driver Jacket / Torso */}
          <path d="M 210 240 Q 230 180 260 175 Q 290 180 280 250 Z" fill="#1D61F2" />
          {/* Jacket Zipper Accent */}
          <path d="M 260 178 L 265 245" stroke="#FFFFFF" strokeWidth="3" opacity="0.8" />

          {/* Left Arm Holding Handlebars */}
          <path d="M 255 190 L 310 215 L 345 205" stroke="#1E40AF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* RIDER HELMET & HEAD */}
          <g>
            {/* Helmet Main Blue Sphere */}
            <circle cx="255" cy="140" r="32" fill="#1D61F2" />
            {/* Helmet Top Gloss Highlight */}
            <path d="M 235 125 A 25 25 0 0 1 275 125" stroke="#60A5FA" strokeWidth="4" fill="none" strokeLinecap="round" />
            {/* Helmet Visor Shield */}
            <path d="M 255 130 Q 285 132 282 154 Q 255 158 255 130 Z" fill="url(#helmetVisor)" />
            {/* Visor Glint */}
            <path d="M 262 135 L 278 142" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
          </g>

          {/* RIGHT ARM & WAVING HAND ANIMATION */}
          <motion.g
            animate={{
              rotate: isWaving ? [0, 25, -15, 25, -10, 0] : 0,
            }}
            transition={{
              duration: 1.4,
              repeat: isWaving ? Infinity : 0,
              repeatDelay: 1.2,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '250px 190px' }}
          >
            {/* Sleeve */}
            <path d="M 250 190 L 285 160 L 315 130" stroke="#1D61F2" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            
            {/* Hand Glove (Friendly Open Palm / Wave) */}
            <circle cx="320" cy="125" r="10" fill="#FEF08A" />
            {/* Glove Fingers */}
            <circle cx="324" cy="116" r="4" fill="#FDE047" />
            <circle cx="328" cy="122" r="4" fill="#FDE047" />
            <circle cx="326" cy="129" r="4" fill="#FDE047" />
            <circle cx="316" cy="132" r="4" fill="#FDE047" />
          </motion.g>

        </svg>
      </motion.div>

    </div>
  );
};

export default AnimatedHeroRider;
