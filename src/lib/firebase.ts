import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
  ConfirmationResult,
  Auth
} from 'firebase/auth';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAObOh-nLew9M9pT9n64M-QBHZcWMPzRqM",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "jobhai-ac983.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "jobhai-ac983",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "jobhai-ac983.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "423396752413",
  appId: env.VITE_FIREBASE_APP_ID || "1:423396752413:web:jobhaiac983app"
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

// Ensure local persistence for browser sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[Firebase Auth] Could not set persistence:', err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Format user-friendly Firebase Auth error messages
 */
export function formatFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  const message = err?.message || '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'current domain';

  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    return `Domain Authorization Required: "${hostname}" is not listed in your Firebase Authorized Domains. Add "${hostname}" in Firebase Console → Authentication → Settings → Authorized domains.`;
  }

  if (
    code === 'auth/captcha-check-failed' ||
    message.includes('captcha-check-failed') ||
    message.includes('Hostname match not found')
  ) {
    return `Phone OTP Domain Authorization Required: "${hostname}" is not authorized for reCAPTCHA/SMS. Add "${hostname}" in Firebase Console → Authentication → Settings → Authorized domains.`;
  }

  if (code === 'auth/invalid-phone-number') {
    return 'Invalid mobile number format. Please enter a valid 10-digit Indian mobile number.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Too many SMS requests. Please wait a few minutes or try Google / Password login.';
  }

  if (code === 'auth/invalid-verification-code') {
    return 'Invalid 6-digit OTP code. Please check and re-enter.';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in popup was closed before completion.';
  }

  return message || 'Authentication failed. Please try again.';
}

/**
 * Convert 10-digit mobile number to Indian format (+91XXXXXXXXXX)
 */
export function formatIndianPhoneNumber(mobile: string): string {
  const digitsOnly = mobile.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }
  if (mobile.startsWith('+')) {
    return mobile;
  }
  return `+91${digitsOnly}`;
}

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Initialize Firebase RecaptchaVerifier on a DOM element
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  // Clear any existing instance
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.log('[Recaptcha Cleanup]', e);
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'normal',
    callback: () => {
      console.log('[Recaptcha] Verified successfully');
    },
    'expired-callback': () => {
      console.warn('[Recaptcha] Expired, please solve again');
    }
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Send real SMS OTP via Firebase
 */
export async function sendPhoneOTP(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> {
  const formatted = formatIndianPhoneNumber(phoneNumber);
  const confirmationResult = await signInWithPhoneNumber(auth, formatted, recaptchaVerifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
}

/**
 * Confirm SMS OTP code with Firebase
 */
export async function confirmPhoneOTP(confirmationResult: ConfirmationResult, code: string) {
  return await confirmationResult.confirm(code);
}

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

/**
 * Sign in with Email & Password
 */
export async function loginWithEmailPassword(email: string, pass: string) {
  return await signInWithEmailAndPassword(auth, email, pass);
}

/**
 * Create user with Email & Password
 */
export async function registerWithEmailPassword(email: string, pass: string) {
  return await createUserWithEmailAndPassword(auth, email, pass);
}

/**
 * Sign out from Firebase
 */
export async function logoutFirebase() {
  return await signOut(auth);
}

/**
 * Subscribe to Firebase auth state changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
