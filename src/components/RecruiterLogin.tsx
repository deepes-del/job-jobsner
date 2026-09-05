import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, Key, Mail, ShieldAlert, Phone, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import { Recruiter } from '../types';
import {
  loginWithGoogle,
  loginWithEmailPassword,
  setupRecaptcha,
  sendPhoneOTP,
  confirmPhoneOTP,
  formatFirebaseAuthError
} from '../lib/firebase';
import { ConfirmationResult } from 'firebase/auth';
import JobsnerLogo from './JobsnerLogo';

interface RecruiterLoginProps {
  onSuccess: (recruiter: Recruiter, token: string) => void;
  onNavigateToRegister: (prefill?: { mobile?: string; email?: string; name?: string }) => void;
  onSwitchToCandidate: () => void;
}

export default function RecruiterLogin({ 
  onSuccess, 
  onNavigateToRegister,
  onSwitchToCandidate
}: RecruiterLoginProps) {
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP States
  const [mobile, setMobile] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authMode === 'otp' && otpStep === 'phone') {
      const timer = setTimeout(() => {
        try {
          setupRecaptcha('recaptcha-recruiter-container');
        } catch (e) {
          console.warn('[Recaptcha Init Warning]', e);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [authMode, otpStep]);

  // Google Sign In
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
          role: 'recruiter',
          mode: 'login',
          email: user.email,
          fullName: user.displayName || 'Recruiter',
          photoURL: user.photoURL,
          mobile: user.phoneNumber
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.notFound || response.status === 404) {
          onNavigateToRegister({
            email: user.email || '',
            name: user.displayName || ''
          });
          return;
        }
        throw new Error(data.error || 'Failed to authorize recruiter profile with Google.');
      }

      onSuccess(data.recruiter, data.token);
    } catch (err: any) {
      console.error('[Google Recruiter Sign In Error]', err);
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP Send
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const verifier = window.recaptchaVerifier || setupRecaptcha('recaptcha-recruiter-container');
      const result = await sendPhoneOTP(cleanMobile, verifier);
      setConfirmationResult(result);
      setOtpStep('code');
    } catch (err: any) {
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
      setError('Please enter the 6-digit OTP code.');
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

      const response = await fetch('/api/firebase-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          firebaseUid: user.uid,
          role: 'recruiter',
          mode: 'login',
          mobile: cleanDigits,
          fullName: user.displayName || 'Recruiter'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.notFound || response.status === 404) {
          onNavigateToRegister({
            mobile: cleanDigits,
            name: user.displayName || ''
          });
          return;
        }
        throw new Error(data.error || 'Failed to authorize recruiter profile.');
      }

      onSuccess(data.recruiter, data.token);
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Form
  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please provide your mobile/email and password.');
      return;
    }

    setLoading(true);

    try {
      // Try Firebase Auth if identifier is email
      if (identifier.includes('@')) {
        try {
          const userCred = await loginWithEmailPassword(identifier.trim(), password);
          const user = userCred.user;
          const idToken = await user.getIdToken();

          const response = await fetch('/api/firebase-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              firebaseUid: user.uid,
              role: 'recruiter',
              mode: 'login',
              email: user.email,
              fullName: user.displayName || 'Recruiter'
            })
          });

          const data = await response.json();
          if (response.ok) {
            onSuccess(data.recruiter, data.token);
            return;
          } else if (data.notFound || response.status === 404) {
            onNavigateToRegister({
              email: user.email || identifier,
              name: user.displayName || ''
            });
            return;
          }
        } catch (fbErr: any) {
          console.log('[Firebase Recruiter Email Login Fallback]', fbErr.message);
        }
      }

      // Legacy API Fallback
      const response = await fetch('/api/recruiter/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.notFound || response.status === 404) {
          setError(`No recruiter account found for ${identifier}. Redirecting to register...`);
          setTimeout(() => {
            onNavigateToRegister({
              email: identifier.includes('@') ? identifier : undefined,
              mobile: !identifier.includes('@') ? identifier.replace(/\D/g, '').slice(-10) : undefined
            });
          }, 1200);
          return;
        }
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }

      onSuccess(data.recruiter, data.token);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto" id="recruiter-login-container">
      <div className="bg-white border border-gray-150 rounded-3xl p-8 shadow-xl shadow-gray-100/40">
        
        {/* Portal Info Badge */}
        <div className="flex justify-between items-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-100">
            Recruiter Portal
          </span>
          <button 
            type="button"
            onClick={onSwitchToCandidate}
            className="text-xs font-bold text-gray-500 hover:text-orange-600 transition-colors cursor-pointer"
          >
            Apply as Candidate?
          </button>
        </div>

        {/* Heading */}
        <div className="mb-6 flex flex-col items-center text-center">
          <JobsnerLogo variant="full" size="md" className="mb-3" />
          <h2 className="text-xl font-black text-gray-900 tracking-tight leading-tight">Recruiter Sign In</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage Jobsner openings & applicant hiring funnels</p>
        </div>

        {/* Auth Tabs */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              authMode === 'password' ? 'bg-white text-orange-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            🔐 Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('otp');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              authMode === 'otp' ? 'bg-white text-orange-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📱 Phone OTP
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-100/60 flex items-start gap-2.5 leading-relaxed">
            <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
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

        {/* PASSWORD MODE */}
        {authMode === 'password' && (
          <form onSubmit={handleSubmitPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Registered Mobile / Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. recruiter@company.com or 9876543210"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-orange-600/10 hover:shadow-orange-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              )}
            </button>
          </form>
        )}

        {/* PHONE OTP MODE */}
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
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none font-medium"
                      placeholder="10-digit mobile number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div id="recaptcha-recruiter-container" className="my-2 flex justify-center scale-90"></div>

                <button
                  type="submit"
                  disabled={loading || mobile.length < 10}
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-orange-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Sending SMS OTP...
                    </>
                  ) : (
                    'Send OTP Code'
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
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-center tracking-widest text-lg font-bold transition-all outline-none"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-orange-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying OTP...' : 'Verify & Log In'}
                </button>
              </form>
            )}
          </>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-orange-600 font-bold hover:underline transition-all cursor-pointer"
            >
              Register your Company
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
