import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import AnimatedHeroRider from './AnimatedHeroRider';

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
    /* Hero slider wrapper */
    .jhs-wrapper {
      position: relative;
      width: 100%;
      overflow: hidden;
      border-radius: inherit;
    }
    /* Sliding track: holds slide-0 (hero) + slide-1..N (promo images) */
    .jhs-track {
      display: flex;
      transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform;
      height: 100%;
    }
    .jhs-slide {
      flex-shrink: 0;
      width: 100%;
      height: 100%;
      position: relative;
    }
    /* Promo image — object-contain so the full image is visible, never cropped */
    .jhs-promo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      display: block;
      background: #0a1836;
    }
    /* Dot indicators */
    .jhs-dot {
      display: inline-block;
      border-radius: 9999px;
      transition: all 0.3s ease;
      cursor: pointer;
      background: rgba(255,255,255,0.4);
    }
    .jhs-dot.active {
      background: #fff;
      width: 20px !important;
    }
    /* In-feed banner fade */
    @keyframes jps-fadein {
      from { opacity: 0; transform: scale(1.01); }
      to   { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ─── HeroBannerSlider ─────────────────────────────────────────────────────────
// Slide 0  = original Jobsner hero (rider + text)
// Slides 1+ = promo images (object-contain, full, no crop)
// First slide stays for 3 seconds, then auto-advances every 2 seconds
export function HeroBannerSlider() {
  const totalSlides = 1 + PROMO_IMAGES.length; // hero + promos
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { ensureStyles(); }, []);

  const advance = useCallback(() => {
    setCurrent(prev => (prev + 1) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    // First slide stays for 3 seconds, subsequent slides for 2 seconds
    const delay = current === 0 ? 3000 : 2000;
    timerRef.current = setTimeout(advance, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, advance]);

  const goTo = (idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrent(idx);
  };

  return (
    <div
      className="w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg"
      style={{ minHeight: '185px' }}
    >
      <div className="jhs-wrapper" style={{ minHeight: 'inherit', borderRadius: 'inherit' }}>
        {/* Sliding track */}
        <div
          className="jhs-track"
          style={{
            transform: `translateX(-${current * 100}%)`,
            minHeight: '185px',
          }}
        >
          {/* ── Slide 0: Original Hero ─────────────────────────── */}
          <div
            className="jhs-slide"
            style={{ minHeight: '185px' }}
          >
            <div className="w-full h-full bg-gradient-to-r from-[#0052D4]/95 via-[#2B63FF]/90 to-[#4379FF]/95 px-3.5 py-4 sm:p-7 lg:p-8 text-white relative flex flex-row items-center justify-between gap-2 border border-blue-300/30 min-h-[185px] sm:min-h-[225px]">
              {/* Ambient glows */}
              <div className="absolute -left-12 -top-12 w-48 h-48 sm:w-64 sm:h-64 bg-blue-400/25 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-0 bottom-0 w-60 h-60 sm:w-80 sm:h-80 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />

              {/* Left text content */}
              <div className="relative z-10 flex-1 min-w-0 max-w-[56%] sm:max-w-lg space-y-1.5 sm:space-y-2.5">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[9px] sm:text-[11px] font-extrabold border border-white/20">
                  <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-yellow-300" /> #1 Delivery Hiring Platform
                </div>
                <h1 className="text-lg xs:text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  Better Jobs<br /><span>Brighter Future</span>
                </h1>
                <p className="text-blue-100 text-[10px] sm:text-xs font-medium leading-snug max-w-[200px] sm:max-w-sm line-clamp-2 sm:line-clamp-none">
                  Find top talent &amp; verified job opportunities faster with Jobsner!
                </p>
                <div className="pt-1 sm:pt-2">
                  <button
                    onClick={() => {
                      const el = document.getElementById('jobs-search-input');
                      if (el) el.focus();
                    }}
                    className="bg-white text-[#1D61F2] hover:bg-blue-50 font-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-sm transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    Search Jobs →
                  </button>
                </div>
              </div>

              {/* Right: Animated Rider */}
              <div className="relative z-10 shrink-0 w-[44%] sm:w-auto max-w-[170px] sm:max-w-[340px] lg:max-w-[400px] flex items-center justify-center sm:justify-end pointer-events-none">
                <AnimatedHeroRider className="w-full" />
              </div>
            </div>
          </div>

          {/* ── Slides 1–N: Promo Images ───────────────────────── */}
          {PROMO_IMAGES.map((img, i) => (
            <div
              key={img.src}
              className="jhs-slide"
              style={{ minHeight: '185px', background: '#0a1836' }}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="jhs-promo-img"
                style={{ minHeight: '185px' }}
              />
            </div>
          ))}
        </div>

        {/* Dot indicators — overlaid at the bottom */}
        {totalSlides > 1 && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20"
          >
            {Array.from({ length: totalSlides }).map((_, i) => (
              <span
                key={i}
                className={`jhs-dot ${i === current ? 'active' : ''}`}
                style={{
                  width: i === current ? '20px' : '7px',
                  height: '7px',
                }}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── In-feed job-card banner (compact variant for between job cards) ───────────
interface InFeedBannerProps {
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
      className="w-full rounded-2xl overflow-hidden shadow-sm border border-blue-100/60 relative bg-[#0a1836]"
      style={{ aspectRatio: '3.5/1', maxHeight: '180px', animation: 'jps-fadein 0.5s ease' }}
    >
      <img
        src={img.src}
        alt={img.alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full"
        style={{ display: 'block', objectFit: 'contain', objectPosition: 'center' }}
      />
      <span
        className="absolute top-2 right-2 text-[9px] font-bold text-white/70 bg-black/30 px-1.5 py-0.5 rounded-full"
        style={{ backdropFilter: 'blur(4px)' }}
      >
        Sponsored
      </span>
    </div>
  );
}

export default function PromoSlider() { return null; }
