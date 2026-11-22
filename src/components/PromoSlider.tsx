import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Promo image list ─────────────────────────────────────────────────────────
// Add new images here — they will automatically appear in both the
// hero slider and the job-card in-feed banners.
export const PROMO_IMAGES: { src: string; alt: string }[] = [
  { src: '/banners/promo1.png', alt: 'Find Jobs Nearby – Jobsner' },
  { src: '/banners/promo2.png', alt: 'Delivery & Logistics Jobs Near You – Jobsner' },
  { src: '/banners/promo3.png', alt: 'Picker & Packer Jobs – Jobsner' },
  { src: '/banners/promo4.png', alt: 'Car Driver Jobs – Jobsner' },
];

// ─── Shared CSS injected once ─────────────────────────────────────────────────
const SLIDER_STYLE_ID = 'jobsner-promo-slider-styles';
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SLIDER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SLIDER_STYLE_ID;
  style.textContent = `
    .jps-track {
      display: flex;
      transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform;
    }
    .jps-slide {
      flex-shrink: 0;
      width: 100%;
    }
    .jps-slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border-radius: inherit;
    }
    @keyframes jps-fadein {
      from { opacity: 0; transform: scale(1.015); }
      to   { opacity: 1; transform: scale(1); }
    }
    .jps-dot {
      display: inline-block;
      border-radius: 9999px;
      transition: all 0.3s ease;
      cursor: pointer;
      background: rgba(255,255,255,0.45);
    }
    .jps-dot.active {
      background: #fff;
    }
  `;
  document.head.appendChild(style);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PromoSliderProps {
  /** Milliseconds between auto-advances (default 2000) */
  interval?: number;
  /** Height class string (default 'h-[160px] sm:h-[220px] md:h-[260px]') */
  heightClass?: string;
  /** Border-radius class (default 'rounded-2xl sm:rounded-3xl') */
  radiusClass?: string;
  /** Whether to show dot nav indicators */
  showDots?: boolean;
  /** Extra wrapper class */
  className?: string;
  /** Called when user clicks a banner slide */
  onClick?: (index: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PromoSlider({
  interval = 2000,
  heightClass = 'h-[150px] sm:h-[210px] md:h-[250px]',
  radiusClass = 'rounded-2xl sm:rounded-3xl',
  showDots = true,
  className = '',
  onClick,
}: PromoSliderProps) {
  const images = PROMO_IMAGES;
  const count = images.length;
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inject shared styles once
  useEffect(() => { ensureStyles(); }, []);

  const advance = useCallback(() => {
    setCurrent(prev => (prev + 1) % count);
  }, [count]);

  // Auto-advance
  useEffect(() => {
    timerRef.current = setInterval(advance, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance, interval]);

  // Reset timer when user clicks a dot
  const goTo = (idx: number) => {
    setCurrent(idx);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, interval);
  };

  if (!count) return null;

  return (
    <div
      className={`relative w-full overflow-hidden ${heightClass} ${radiusClass} ${className}`}
      style={{ isolation: 'isolate' }}
    >
      {/* Sliding track */}
      <div
        className="jps-track h-full"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((img, i) => (
          <div
            key={img.src}
            className={`jps-slide ${radiusClass}`}
            style={{ height: '100%' }}
            onClick={() => onClick?.(i)}
          >
            <img
              src={img.src}
              alt={img.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              style={{ borderRadius: 'inherit' }}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {showDots && count > 1 && (
        <div
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10"
          style={{ pointerEvents: 'none' }}
        >
          {images.map((_, i) => (
            <span
              key={i}
              className={`jps-dot ${i === current ? 'active' : ''}`}
              style={{
                width: i === current ? '20px' : '7px',
                height: '7px',
                pointerEvents: 'auto',
              }}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── In-feed job-card banner (compact variant for between job cards) ───────────
interface InFeedBannerProps {
  /** Which banner index to start on (derived from card position) */
  startIndex?: number;
  interval?: number;
}

export function InFeedBanner({ startIndex = 0, interval = 2000 }: InFeedBannerProps) {
  const images = PROMO_IMAGES;
  const count = images.length;
  const [current, setCurrent] = useState(startIndex % count);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { ensureStyles(); }, []);

  const advance = useCallback(() => {
    setCurrent(prev => (prev + 1) % count);
  }, [count]);

  useEffect(() => {
    timerRef.current = setInterval(advance, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance, interval]);

  if (!count) return null;
  const img = images[current];

  return (
    <div
      className="w-full rounded-2xl overflow-hidden shadow-sm border border-blue-100/60 relative"
      style={{ aspectRatio: '3.5/1', maxHeight: '180px', animation: 'jps-fadein 0.5s ease' }}
    >
      <img
        src={img.src}
        alt={img.alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
        style={{ display: 'block' }}
      />
      {/* Subtle "Ad" label */}
      <span
        className="absolute top-2 right-2 text-[9px] font-bold text-white/70 bg-black/30 px-1.5 py-0.5 rounded-full"
        style={{ backdropFilter: 'blur(4px)' }}
      >
        Sponsored
      </span>
    </div>
  );
}
