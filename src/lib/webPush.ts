/**
 * Web Push & Notification Helper for Jobsner
 * Handles browser notification permissions, Service Worker registration,
 * native system pop-ups, and audio chime alerts.
 */

export interface SystemNotificationOptions {
  title: string;
  message: string;
  icon?: string;
  metadata?: any;
  tag?: string;
}

/**
 * Register Service Worker for background notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[ServiceWorker] Registered successfully with scope:', registration.scope);
    return registration;
  } catch (err) {
    console.warn('[ServiceWorker] Registration failed:', err);
    return null;
  }
}

/**
 * Check if the browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Prompt user for browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return permission;
  } catch (err) {
    console.error('[Notification] Error requesting permission:', err);
    return 'denied';
  }
}

/**
 * Synthesize a modern 2-tone notification sound using Web Audio API
 */
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn('[Audio] Failed to play notification sound:', err);
  }
}

/**
 * Display a native browser system pop-up notification
 * Works whether the browser tab is focused, in the background, or minimized.
 */
export async function showSystemNotification({
  title,
  message,
  icon = '/jobsner-logo.png',
  metadata,
  tag = `jobsner-${Date.now()}`
}: SystemNotificationOptions): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  playNotificationChime();

  if (Notification.permission !== 'granted') {
    return false;
  }

  // 1. Try displaying via Service Worker registration (best for background/mobile)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body: message,
          icon,
          badge: '/favicon.png',
          tag,
          vibrate: [200, 100, 200],
          data: metadata || { url: '/' }
        } as any);
        return true;
      }
    } catch (swErr) {
      console.warn('[ServiceWorker Notification Fallback]', swErr);
    }
  }

  // 2. Fallback to standard window Notification
  try {
    const notif = new Notification(title, {
      body: message,
      icon,
      tag
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn('[Window Notification Error]', err);
    return false;
  }
}
