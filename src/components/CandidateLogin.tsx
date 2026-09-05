import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Phone, Lock, LogIn, ArrowRight, Mail, Key, ShieldCheck, RefreshCw } from 'lucide-react';
import { Candidate } from '../types';
import {
  setupRecaptcha,
  sendPhoneOTP,
  confirmPhoneOTP,
  loginWithGoogle,
  loginWithEmailPassword,
  formatIndianPhoneNumber,
  formatFirebaseAuthError
} from '../lib/firebase';
import { ConfirmationResult } from 'firebase/auth';
import JobsnerLogo from './JobsnerLogo';

interface CandidateLoginProps {
  onSuccess: (candidate: Candidate, token: string) => void;
  onNavigateToRegister: (prefill?: { mobile?: string; email?: string; fullName?: string }) => void;
}

export default function CandidateLogin({ onSuccess, onNavigateToRegister }: CandidateLoginProps) {
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone OTP States
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unregisteredInfo, setUnregisteredInfo] = useState<{ identifier: string; mobile?: string; email?: string } | null>(null);

  useEffect(() => {
    if (authMode === 'otp' && otpStep === 'phone') {
      const timer = setTimeout(() => {
        try {
          setupRecaptcha('recaptcha-candidate-container');
          setRecaptchaReady(true);
        } catch (err) {
          console.error('[Recaptcha Init Error]', err);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [authMode, otpStep]);

  // Send Phone OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanDigits = mobile.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const verifier = window.recaptchaVerifier || setupRecaptcha('recaptcha-candidate-container');
      const result = await sendPhoneOTP(cleanDigits, verifier);
      setConfirmationResult(result);
      setOtpStep('code');
    } catch (err: any) {
      console.error('[Firebase Phone Auth Error]', err);
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Confirm Phone OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit OTP sent to your phone.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP.');
      setOtpStep('phone');
      return;
    }

    setLoading(true);
    try {
      const userCred = await confirmPhoneOTP(confirmationResult, otpCode.trim());
      const user = userCred.user;
      const idToken = await user.getIdToken();
      const cleanDigits = (user.phoneNumber || mobile).replace(/\D/g, '').slice(-10);

      // Verify if account exists with this mobile number
      const response = await fetch('/api/firebase-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          firebaseUid: user.uid,
          role: 'candidate',
          mode: 'login',
          mobile: cleanDigits,
          fullName: user.displayName || 'Candidate'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.notFound || response.status === 404) {
          // Account doesn't exist yet -> take user to Register phase with mobile prefilled
          onNavigateToRegister({
            mobile: cleanDigits,
            fullName: user.displayName || ''
          });
          return;
        }
        throw new Error(data.error || 'Failed to authorize profile.');
      }

      // Existing candidate found -> login directly to dashboard
      onSuccess(data.candidate, data.token);
    } catch (err: any) {
      console.error('[OTP Verification Error]', err);
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const userCred = await loginWithGoogle();
      const user = userCred.user;
      const idToken = await user.getIdToken();

      const response = await fetch('/api/firebase-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          firebaseUid: user.uid,
          role: 'candidate',
          mode: 'login',
          email: user.email,
          fullName: user.displayName,
          photoURL: user.photoURL,
          mobile: user.phoneNumber
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.notFound || response.status === 404) {
          // Account doesn't exist yet with this email -> transition to Register phase with Google email & name
          onNavigateToRegister({
            email: user.email || '',
            fullName: user.displayName || '',
            mobile: user.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : ''
          });
          return;
        }
        throw new Error(data.error || 'Failed to authorize candidate profile with Google.');
      }

      // Existing candidate found -> direct login to dashboard
      onSuccess(data.candidate, data.token);
    } catch (err: any) {
      console.error('[Google Sign In Error]', err);
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Password Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const identifier = (email || mobile).trim();
    if (!identifier || !password) {
      setError('Mobile/Email and Password are required.');
      return;
    }

    setLoading(true);

    try {
      // First try Firebase Email/Password auth if input looks like an email
      if (identifier.includes('@')) {
        try {
          const userCred = await loginWithEmailPassword(identifier, password);
          const user = userCred.user;
          const idToken = await user.getIdToken();

          const response = await fetch('/api/firebase-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              firebaseUid: user.uid,
              role: 'candidate',
              mode: 'login',
              email: user.email,
              fullName: user.displayName
            })
          });

          const data = await response.json();
          if (response.ok) {
            onSuccess(data.candidate, data.token);
            return;
          } else if (data.notFound || response.status === 404) {
            onNavigateToRegister({ email: user.email || identifier, fullName: user.displayName || '' });
            return;
          }
        } catch (fbErr: any) {
          console.log('[Firebase Email Login Fallback]', fbErr.message);
        }
      }

      // Standard API Login
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.notFound || response.status === 404) {
          const prefillMobile = data.prefill?.mobile || (!identifier.includes('@') ? identifier.replace(/\D/g, '').slice(-10) : undefined);
          const prefillEmail = data.prefill?.email || (identifier.includes('@') ? identifier.toLowerCase() : undefined);
          
          setUnregisteredInfo({
            identifier,
            mobile: prefillMobile,
            email: prefillEmail
          });
          setError(`No candidate account found for "${identifier}".`);
          return;
        }
        throw new Error(data.error || 'Login failed.');
      }

      onSuccess(data.candidate, data.token);
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto bg-white border border-gray-100 rounded-3xl shadow-xl shadow-gray-100/50 p-8"
      id="candidate-login-card"
    >
      {/* Header */}
      <div className="text-center mb-6 flex flex-col items-center">
        <JobsnerLogo variant="full" size="md" className="mb-3" />
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Candidate Login</h2>
        <p className="text-xs text-gray-500 mt-0.5">Access Jobsner verified delivery & driver careers</p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl mb-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setAuthMode('otp');
            setError(null);
            setUnregisteredInfo(null);
          }}
          className={`py-2 rounded-xl transition-all cursor-pointer ${
            authMode === 'otp' ? 'bg-white text-orange-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          📱 Phone OTP
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('password');
            setError(null);
            setUnregisteredInfo(null);
          }}
          className={`py-2 rounded-xl transition-all cursor-pointer ${
            authMode === 'password' ? 'bg-white text-orange-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          🔐 Password
        </button>
      </div>

      {/* Unregistered Candidate Alert Card */}
      {unregisteredInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-orange-50/90 border border-orange-200 rounded-2xl text-xs text-orange-950 shadow-sm flex flex-col gap-2.5"
          id="unregistered-account-card"
        >
          <div className="flex items-center gap-2 font-black text-orange-900 text-sm">
            <span className="text-lg">✨</span>
            <span>Account Not Found / New Candidate?</span>
          </div>
          <p className="text-gray-700 leading-relaxed text-[11px]">
            No registered profile exists for <span className="font-bold text-gray-900">{unregisteredInfo.identifier}</span>. Register a new candidate account in less than 1 minute to start applying!
          </p>
          <button
            type="button"
            onClick={() => onNavigateToRegister({ mobile: unregisteredInfo.mobile, email: unregisteredInfo.email })}
            className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Create New Account / Register Now <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* Error Banner */}
      {error && !unregisteredInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-3.5 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-100 flex items-start gap-2 font-medium"
          id="login-error-banner"
        >
          <span className="font-semibold text-red-600">⚠️</span>
          <span>{error}</span>
        </motion.div>
      )}

      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full mb-5 py-3 px-4 bg-white border border-gray-200 hover:border-orange-500/30 hover:bg-orange-50/10 text-gray-700 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:opacity-50"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Sign in with Google
      </button>

      <div className="relative flex py-2 items-center mb-5">
        <div className="flex-grow border-t border-gray-150"></div>
        <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Or continue with</span>
        <div className="flex-grow border-t border-gray-150"></div>
      </div>

      {/* PHONE OTP FLOW */}
      {authMode === 'otp' && (
        <>
          {otpStep === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 font-semibold text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-sm transition-all outline-none font-medium"
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    id="login-input-mobile"
                  />
                </div>
              </div>

              {/* ReCAPTCHA Container */}
              <div id="recaptcha-candidate-container" className="my-2 flex justify-center scale-90"></div>

              <button
                type="submit"
                disabled={loading || mobile.length < 10}
                className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-orange-600/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Sending SMS OTP...
                  </>
                ) : (
                  <>
                    Send OTP <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center p-3 bg-orange-50/50 rounded-2xl border border-orange-100 text-xs text-gray-600">
                OTP sent to <span className="font-bold text-gray-900">+91 {mobile}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep('phone');
                    setOtpCode('');
                    setError(null);
                  }}
                  className="ml-2 text-orange-600 underline font-semibold hover:text-orange-700"
                >
                  Edit Number
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  6-Digit Verification Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-center tracking-widest text-lg font-bold transition-all outline-none"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-orange-600/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Code...
                  </>
                ) : (
                  <>
                    Verify & Log In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </>
      )}

      {/* PASSWORD FLOW */}
      {authMode === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Mobile Number or Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none"
                placeholder="Mobile number or Email address"
                value={mobile || email}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('@')) {
                    setEmail(val);
                  } else {
                    setMobile(val);
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-orange-600/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Log In'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
        Don't have an account yet?{' '}
        <button
          type="button"
          onClick={onNavigateToRegister}
          className="text-orange-600 font-bold hover:underline cursor-pointer"
        >
          Register candidate profile
        </button>
      </div>
    </motion.div>
  );
}
