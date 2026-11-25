import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Trash2,
  Download,
  AlertTriangle,
  Lock,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  FileDown
} from 'lucide-react';
import { logoutFirebase } from '../lib/firebase';

interface DeleteAccountScreenProps {
  token: string;
  candidateId: string;
  candidateName: string;
  onBack: () => void;
  onAccountDeleted: () => void;
}

type Step = 'overview' | 'export' | 'confirm' | 'deleting' | 'done';

export default function DeleteAccountScreen({
  token,
  candidateId,
  candidateName,
  onBack,
  onAccountDeleted
}: DeleteAccountScreenProps) {
  const [step, setStep] = useState<Step>('overview');
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmChecked, setIsConfirmChecked] = useState(false);

  /* ───────────────────────────────────────────────
     Data Export
  ─────────────────────────────────────────────── */
  const handleExportData = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/account/export', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export failed. Please try again.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jobsner-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportDone(true);
    } catch (err: any) {
      setError(err.message || 'Failed to export data.');
    } finally {
      setIsExporting(false);
    }
  };

  /* ───────────────────────────────────────────────
     Account Deletion
  ─────────────────────────────────────────────── */
  const handleDeleteAccount = async () => {
    setStep('deleting');
    setError(null);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason.trim() || undefined })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Account deletion failed. Please try again.');
      }

      // Logout Firebase
      await logoutFirebase().catch(() => {});

      // Clear all local storage
      localStorage.removeItem('delivery_hiring_token');
      localStorage.removeItem('recruiter_hiring_token');
      localStorage.removeItem('jobsner_portal');
      localStorage.removeItem('jobsner_is_guest');
      localStorage.setItem('jobsner_explicit_logout', 'true');

      setStep('done');
      // After 3 s redirect to login
      setTimeout(() => {
        onAccountDeleted();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete account.');
      setStep('confirm');
    }
  };

  /* ───────────────────────────────────────────────
     RENDER STEPS
  ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50" id="delete-account-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 h-14 flex items-center gap-3 shadow-xs">
        {step !== 'deleting' && step !== 'done' && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
        )}
        <div>
          <h1 className="text-sm font-black text-slate-900 leading-none">Delete Account</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">This action is permanent and cannot be undone</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* ── STEP: DONE ── */}
        <AnimatePresence mode="wait">
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Account Deleted</h2>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Your account and all associated data have been permanently deleted. Redirecting to login…
              </p>
              <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  className="w-1/2 h-full bg-[#1D61F2] rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* ── STEP: DELETING ── */}
          {step === 'deleting' && (
            <motion.div
              key="deleting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center gap-4"
            >
              <Loader2 className="w-10 h-10 text-[#1D61F2] animate-spin" />
              <h2 className="text-lg font-black text-slate-900">Deleting Your Account…</h2>
              <p className="text-sm text-slate-500">Please wait. Do not close this page.</p>
            </motion.div>
          )}

          {/* ── STEP: OVERVIEW ── */}
          {step === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Warning card */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black text-red-700 mb-1">This action is irreversible</h3>
                  <p className="text-xs text-red-600 leading-relaxed">
                    Deleting your account will permanently erase all your personal data, job applications, saved jobs,
                    uploaded documents, and profile information from Jobsner. This cannot be undone.
                  </p>
                </div>
              </div>

              {/* What gets deleted */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">What will be deleted</h3>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  {[
                    'Your profile and personal information',
                    'All job applications and history',
                    'Saved jobs and preferences',
                    'Uploaded documents (CV, ID proofs, photos)',
                    'Notifications and activity history',
                    'Your login account (Firebase auth)'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Export data first */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-3">
                <FileDown className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-blue-800 mb-1">Export your data first (Recommended)</h3>
                  <p className="text-xs text-blue-700 leading-relaxed mb-3">
                    Download a copy of all your data before deleting. This is your only chance to keep a record.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    {isExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {isExporting ? 'Exporting…' : exportDone ? 'Download Again' : 'Download My Data'}
                  </button>
                  {exportDone && (
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 font-bold">
                      <CheckCircle className="w-3 h-3" /> Data downloaded successfully
                    </p>
                  )}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => setStep('confirm')}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-2xl transition-colors cursor-pointer shadow-sm"
              >
                Continue to Delete Account
              </button>

              <button
                onClick={onBack}
                className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 font-black text-sm rounded-2xl transition-colors cursor-pointer"
              >
                Cancel – Keep My Account
              </button>
            </motion.div>
          )}

          {/* ── STEP: CONFIRM ── */}
          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 font-medium flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Account being deleted */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Deleting account for</p>
                  <p className="text-sm font-black text-slate-900">{candidateName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{candidateId.slice(0, 16)}…</p>
                </div>
              </div>

              {/* Optional reason */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Reason for deletion <span className="text-slate-400 normal-case font-normal">(optional)</span>
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1D61F2] transition-all"
                >
                  <option value="">Select a reason…</option>
                  <option value="Found a job">I found a job</option>
                  <option value="Privacy concerns">Privacy concerns</option>
                  <option value="Too many notifications">Too many notifications</option>
                  <option value="App not useful">App was not useful</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfirmChecked}
                  onChange={e => setIsConfirmChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-red-600"
                />
                <span className="text-xs text-red-700 leading-relaxed font-medium">
                  I understand that deleting my account is <strong>permanent and irreversible</strong>. All my data, applications, documents, and profile information will be erased forever.
                </span>
              </label>

              {/* Delete button */}
              <button
                onClick={handleDeleteAccount}
                disabled={!isConfirmChecked}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Permanently Delete My Account
              </button>

              <button
                onClick={() => { setStep('overview'); setError(null); }}
                className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 font-black text-sm rounded-2xl transition-colors cursor-pointer"
              >
                ← Go Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer security note */}
        {(step === 'overview' || step === 'confirm') && (
          <div className="flex items-center gap-2 justify-center text-xs text-slate-400 pt-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured by Jobsner · Your data is handled per our <a href="/privacy-policy" className="underline hover:text-slate-600">Privacy Policy</a></span>
          </div>
        )}
      </div>
    </div>
  );
}
