import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Phone, Mail, Lock, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Candidate } from '../types';
import {
  registerWithEmailPassword,
  loginWithGoogle,
  setupRecaptcha,
  sendPhoneOTP,
  confirmPhoneOTP,
  formatFirebaseAuthError
} from '../lib/firebase';
import { ConfirmationResult } from 'firebase/auth';
import JobsnerLogo from './JobsnerLogo';

interface CandidateRegistrationProps {
  prefill?: { mobile?: string; email?: string; fullName?: string } | null;
  onSuccess: (candidate: Candidate, token: string) => void;
  onNavigateToLogin: () => void;
}

export default function CandidateRegistration({ prefill, onSuccess, onNavigateToLogin }: CandidateRegistrationProps) {
  const [fullName, setFullName] = useState(prefill?.fullName || '');
  const [mobile, setMobile] = useState(prefill?.mobile || '');
  const [email, setEmail] = useState(prefill?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sync when prefill changes
  React.useEffect(() => {
    if (prefill) {
      if (prefill.fullName && !fullName) setFullName(prefill.fullName);
      if (prefill.mobile && !mobile) setMobile(prefill.mobile);
      if (prefill.email && !email) setEmail(prefill.email);
    }
  }, [prefill]);

  // OTP Mode state
  const [regMethod, setRegMethod] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle Google Registration
  const handleGoogleRegister = async () => {
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
          mode: 'register',
          email: user.email,
          fullName: user.displayName || fullName || 'Candidate',
          photoURL: user.photoURL,
          mobile: user.phoneNumber || mobile
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register candidate profile.');
      }

      onSuccess(data.candidate, data.token);
    } catch (err: any) {
      console.error('[Google Registration Error]', err);
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle Phone OTP Send
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
      const verifier = setupRecaptcha('recaptcha-reg-container');
      const result = await sendPhoneOTP(cleanMobile, verifier);
      setConfirmationResult(result);
      setOtpStep('code');
    } catch (err: any) {
      console.error('[OTP Send Error]', err);
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle Phone OTP Verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please try sending OTP again.');
      setOtpStep('phone');
      return;
    }

    setLoading(true);
    try {
      const userCred = await confirmPhoneOTP(confirmationResult, otpCode.trim());
      const user = userCred.user;
      const idToken = await user.getIdToken();

      const response = await fetch('/api/firebase-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          firebaseUid: user.uid,
          role: 'candidate',
          mode: 'register',
          mobile: user.phoneNumber || mobile,
          fullName: fullName.trim() || 'Candidate',
          email: email.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      onSuccess(data.candidate, data.token);
    } catch (err: any) {
      console.error('[OTP Verification Error]', err);
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Standard Email/Password Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!mobile.trim()) {
      setError('Mobile Number is required.');
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Mobile Number must be at least 10 digits.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      let firebaseUid: string | null = null;
      let idToken: string | null = null;

      // Try Firebase Auth Registration if email is provided
      if (email.trim()) {
        try {
          const userCred = await registerWithEmailPassword(email.trim(), password);
          firebaseUid = userCred.user.uid;
          idToken = await userCred.user.getIdToken();
        } catch (fbErr: any) {
          console.warn('[Firebase Auth Reg Error]', fbErr.message);
          // If user already exists in Firebase, try logging in
          if (fbErr.code === 'auth/email-already-in-use') {
            setError('An account with this email already exists. Please log in.');
            setLoading(false);
            return;
          }
        }
      }

      if (firebaseUid && idToken) {
        // Sync with Firebase Auth endpoint
        const response = await fetch('/api/firebase-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            firebaseUid,
            role: 'candidate',
            mode: 'register',
            fullName: fullName.trim(),
            mobile: cleanMobile,
            email: email.trim()
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Registration failed.');
        }

        onSuccess(data.candidate, data.token);
        return;
      }

      // Legacy API Fallback Registration
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          mobile: cleanMobile,
          email: email || undefined,
          password,
          confirmPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      onSuccess(data.candidate, data.token);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
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
      id="candidate-registration-card"
    >
      <div className="text-center mb-6 flex flex-col items-center">
        <JobsnerLogo variant="full" size="md" className="mb-3" />
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Create Account</h2>
        <p className="text-xs text-gray-500 mt-0.5">Join Jobsner delivery & logistics driver network</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-3.5 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-100 flex items-start gap-2 font-medium"
          id="registration-error-banner"
        >
          <span className="font-semibold text-red-600">⚠️</span>
          <span>{error}</span>
        </motion.div>
      )}

      {/* Google Sign In Quick Button */}
      <button
        type="button"
        onClick={handleGoogleRegister}
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
        Sign up with Google
      </button>

      <div className="relative flex py-2 items-center mb-5">
        <div className="flex-grow border-t border-gray-150"></div>
        <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Or register with details</span>
        <div className="flex-grow border-t border-gray-150"></div>
      </div>

      <form onSubmit={regMethod === 'password' ? handleSubmit : (otpStep === 'phone' ? handleSendOTP : handleVerifyOTP)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none"
              placeholder="e.g. Amit Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              id="reg-input-name"
            />
          </div>
        </div>

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
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              id="reg-input-mobile"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Email Address <span className="text-gray-400">(Optional)</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none"
              placeholder="e.g. amit@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              id="reg-input-email"
            />
          </div>
        </div>

        {regMethod === 'password' ? (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="reg-input-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-xs transition-all outline-none"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  id="reg-input-confirmpassword"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {otpStep === 'code' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl text-center tracking-widest text-lg font-bold transition-all outline-none"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            )}
            <div id="recaptcha-reg-container" className="my-2 flex justify-center scale-90"></div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-orange-600/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          id="reg-submit-btn"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Creating Account...
            </>
          ) : (
            <>
              Register Profile <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-500" id="registration-footer">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="text-orange-600 font-bold hover:underline cursor-pointer"
          id="reg-to-login-btn"
        >
          Log in
        </button>
      </div>
    </motion.div>
  );
}
