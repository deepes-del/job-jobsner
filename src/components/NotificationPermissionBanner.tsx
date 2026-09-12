import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, ShieldAlert } from 'lucide-react';
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission,
  showSystemNotification
} from '../lib/webPush';

interface NotificationPermissionBannerProps {
  recruiterName?: string;
  onPermissionChange?: (permission: NotificationPermission) => void;
}

export default function NotificationPermissionBanner({
  recruiterName,
  onPermissionChange
}: NotificationPermissionBannerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [grantedToast, setGrantedToast] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) {
      setDismissed(true);
      return;
    }

    const current = getNotificationPermission();
    setPermission(current);
    if (current === 'granted') {
      setDismissed(true);
    }

    // Check if dismissed previously in session
    const isDismissed = sessionStorage.getItem('jobsner_notif_banner_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (onPermissionChange) onPermissionChange(result);

      if (result === 'granted') {
        setGrantedToast(true);
        // Fire confirmation test notification
        showSystemNotification({
          title: '🔔 Notifications Active | Jobsner',
          message: `Hello ${recruiterName || 'Partner'}, you will receive real-time pop-up alerts whenever candidate profiles are allocated to your active listings.`,
          icon: '/jobsner-logo.png'
        });
        setTimeout(() => {
          setDismissed(true);
          setGrantedToast(false);
        }, 3500);
      } else {
        sessionStorage.setItem('jobsner_notif_banner_dismissed', 'true');
        setDismissed(true);
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('jobsner_notif_banner_dismissed', 'true');
  };

  if (dismissed || !isNotificationSupported() || permission === 'granted') {
    if (grantedToast) {
      return (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950/90 border border-emerald-500/40 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Pop-up notifications enabled! You will be alerted when candidates are allocated.</span>
        </div>
      );
    }
    return null;
  }

  if (permission === 'denied') {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-950/90 via-slate-900/90 to-slate-950/90 border-b border-orange-500/30 text-white px-4 py-3 shadow-lg backdrop-blur-md animate-fade-in relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm font-bold text-white tracking-tight">
                Enable Candidate Allocation Pop-ups
              </p>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Recommended
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-tight">
              Get notified with candidate contact details on your screen even when Jobsner is in the background or minimized.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            Not Now
          </button>
          <button
            onClick={handleRequestPermission}
            disabled={requesting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            {requesting ? 'Enabling...' : 'Enable Pop-ups'}
          </button>
          <button 
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
