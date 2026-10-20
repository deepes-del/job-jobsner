import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, LogIn, UserPlus, CheckCircle, Briefcase, User, Database, Package, Bell, Heart, ChevronDown, Search, LogOut } from 'lucide-react';
import { Candidate, Profile, Recruiter } from './types';
import CandidateRegistration from './components/CandidateRegistration';
import CandidateLogin from './components/CandidateLogin';
import CandidateDashboard from './components/CandidateDashboard';
import CandidateProfileEdit from './components/CandidateProfileEdit';
import CandidateDocuments from './components/CandidateDocuments';
import AdminPanel from './components/AdminPanel';
import { logoutFirebase, subscribeToAuthState } from './lib/firebase';
import JobsnerLogo from './components/JobsnerLogo';

// Recruiter Components
import RecruiterLogin from './components/RecruiterLogin';
import RecruiterRegistration from './components/RecruiterRegistration';
import RecruiterDashboard from './components/RecruiterDashboard';

export default function App() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [userRole, setUserRole] = useState<'candidate' | 'recruiter' | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (localStorage.getItem('delivery_hiring_token')) return 'candidate';
        if (localStorage.getItem('recruiter_hiring_token')) return 'recruiter';
      }
    } catch {}
    return null;
  });
  const [portal, setPortal] = useState<'candidate' | 'recruiter'>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (localStorage.getItem('recruiter_hiring_token') && !localStorage.getItem('delivery_hiring_token')) {
          return 'recruiter';
        }
      }
    } catch {}
    return 'candidate';
  });

  // Admin / Logo click triggers
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const handleLogoClick = () => {
    setLogoClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setIsAdminPanelOpen(true);
        return 0;
      }
      return next;
    });
  };

  // Supabase Guide State
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; active: boolean; mode: string; errorDetails?: string | null } | null>(null);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/database-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.error('Database status error:', err);
    }
  };

  // Candidate States
  const [token, setToken] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [candidatePrefill, setCandidatePrefill] = useState<{ mobile?: string; email?: string; fullName?: string } | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'profile_edit' | 'documents'>('login');
  const [candidateActiveTab, setCandidateActiveTab] = useState<'find_jobs' | 'applications' | 'saved' | 'overview'>('find_jobs');

  // Recruiter States
  const [recruiterToken, setRecruiterToken] = useState<string | null>(null);
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [recruiterPrefill, setRecruiterPrefill] = useState<{ mobile?: string; email?: string; name?: string } | null>(null);
  const [recruiterView, setRecruiterView] = useState<'login' | 'register' | 'dashboard'>('login');

  // Modal / Notification States
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Restore session tokens on mount
  useEffect(() => {
    let isCancelled = false;
    let isSyncingFirebaseAuth = false;

    const checkCandidate = async (): Promise<'success' | 'unauthorized' | 'transient'> => {
      const currentToken = localStorage.getItem('delivery_hiring_token');
      if (!currentToken) return 'unauthorized';

      try {
        const res = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setCandidate({
              id: data.id,
              fullName: data.fullName,
              mobile: data.mobile,
              email: data.email,
              profile: data.profile,
              documents: data.documents || []
            });
            if (data.renewedToken && data.renewedToken !== currentToken) {
              localStorage.setItem('delivery_hiring_token', data.renewedToken);
              setToken(data.renewedToken);
            } else {
              setToken(currentToken);
            }
            setView('dashboard');
            setPortal('candidate');
            setUserRole('candidate');
          }
          return 'success';
        } else if (res.status === 401) {
          // Token is genuinely invalid, expired or revoked on server
          localStorage.removeItem('delivery_hiring_token');
          return 'unauthorized';
        } else {
          // 403, 500, etc. may be transient server restart; preserve token
          console.warn('[Candidate Restore] Status', res.status, '- keeping token for retry');
          return 'transient';
        }
      } catch (err) {
        console.error('Candidate restore error (network):', err);
        return 'transient';
      }
    };

    const checkRecruiter = async (): Promise<'success' | 'unauthorized' | 'transient'> => {
      const currentRecToken = localStorage.getItem('recruiter_hiring_token');
      if (!currentRecToken) return 'unauthorized';

      try {
        const res = await fetch('/api/recruiter/profile', {
          headers: {
            'Authorization': `Bearer ${currentRecToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setRecruiter(data.recruiter);
            if (data.renewedToken && data.renewedToken !== currentRecToken) {
              localStorage.setItem('recruiter_hiring_token', data.renewedToken);
              setRecruiterToken(data.renewedToken);
            } else {
              setRecruiterToken(currentRecToken);
            }
            setRecruiterView('dashboard');
            setPortal('recruiter');
            setUserRole('recruiter');
          }
          return 'success';
        } else if (res.status === 401) {
          // Only clear on 401 (truly invalid token); 403 may be transient
          localStorage.removeItem('recruiter_hiring_token');
          return 'unauthorized';
        } else {
          console.warn('[Recruiter Restore] Status', res.status, '- keeping token for retry');
          return 'transient';
        }
      } catch (err) {
        console.error('Recruiter restore error (network):', err);
        return 'transient';
      }
    };

    const restoreAll = async () => {
      try {
        fetchDbStatus().catch(() => {});
        const preferredPortal = localStorage.getItem('jobsner_portal') || 'candidate';

        let candResult: 'success' | 'unauthorized' | 'transient' = 'unauthorized';
        let recResult: 'success' | 'unauthorized' | 'transient' = 'unauthorized';

        if (preferredPortal === 'recruiter') {
          recResult = await checkRecruiter();
          if (recResult !== 'success') {
            candResult = await checkCandidate();
          }
        } else {
          candResult = await checkCandidate();
          if (candResult !== 'success') {
            recResult = await checkRecruiter();
          }
        }

        if (isCancelled) return;

        const isRestored = candResult === 'success' || recResult === 'success';
        const isTransient = candResult === 'transient' || recResult === 'transient';

        // Only clear role and force login view if user has no valid session and not a transient network error
        if (!isRestored && !isTransient) {
          setUserRole(null);
          setView('login');
          setRecruiterView('login');
        }
      } catch (err) {
        console.error('Session restore error:', err);
      } finally {
        if (!isCancelled) {
          setInitialLoading(false);
        }
      }
    };

    restoreAll();

    // Firebase Auth State Listener (Guard against repeated auto-sync loops & explicit logout)
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      // 1. If user explicitly logged out, DO NOT automatically log back in!
      if (localStorage.getItem('jobsner_explicit_logout') === 'true') {
        return;
      }

      if (firebaseUser && !isSyncingFirebaseAuth && !isCancelled) {
        const currentCandToken = localStorage.getItem('delivery_hiring_token');
        const currentRecToken = localStorage.getItem('recruiter_hiring_token');

        // Only attempt auto-sync if neither token is present and user is not explicitly logged out
        if (!currentCandToken && !currentRecToken) {
          isSyncingFirebaseAuth = true;
          try {
            const idToken = await firebaseUser.getIdToken();
            const currentPortal = localStorage.getItem('jobsner_portal') || 'candidate';
            const res = await fetch('/api/firebase-auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                firebaseUid: firebaseUser.uid,
                role: currentPortal,
                email: firebaseUser.email,
                fullName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                mobile: firebaseUser.phoneNumber
              })
            });
            if (res.ok && !isCancelled) {
              const data = await res.json();
              if (data.role === 'candidate') {
                handleCandidateAuthSuccess(data.candidate, data.token);
              } else if (data.role === 'recruiter') {
                handleRecruiterAuthSuccess(data.recruiter, data.token);
              }
            } else {
              console.warn('[Firebase Auth Auto Sync Notice] Status:', res.status);
            }
          } catch (err) {
            console.error('[Firebase Auth Auto Sync Error]', err);
          } finally {
            isSyncingFirebaseAuth = false;
          }
        }
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  // --- CANDIDATE EVENT HANDLERS ---
  const handleCandidateAuthSuccess = (newCandidate: Candidate, newToken: string) => {
    localStorage.removeItem('jobsner_explicit_logout');
    setCandidate(newCandidate);
    setToken(newToken);
    localStorage.setItem('delivery_hiring_token', newToken);
    localStorage.setItem('jobsner_portal', 'candidate');
    setUserRole('candidate');
    setView('dashboard');
    setPortal('candidate');
    setCandidatePrefill(null);
  };

  const handleCandidateProfileSaveSuccess = (updatedProfile: Profile) => {
    if (candidate) {
      const updatedCandidate = {
        ...candidate,
        fullName: updatedProfile.fullName,
        profile: updatedProfile
      };
      setCandidate(updatedCandidate);
    }
    setView('dashboard');
  };

  const handleCandidateLogout = () => {
    localStorage.setItem('jobsner_explicit_logout', 'true');
    const tokenToRevoke = localStorage.getItem('delivery_hiring_token');
    if (tokenToRevoke) {
      fetch('/api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenToRevoke}` }
      }).catch(e => console.warn('[Candidate Logout] Server token invalidation failed:', e));
    }
    logoutFirebase().catch(e => console.warn('[Firebase SignOut]', e));
    localStorage.removeItem('delivery_hiring_token');
    setCandidate(null);
    setToken(null);
    setView('login');
    setUserRole(null);
  };

  // --- RECRUITER EVENT HANDLERS ---
  const handleRecruiterAuthSuccess = (newRecruiter: Recruiter, newToken: string) => {
    localStorage.removeItem('jobsner_explicit_logout');
    setRecruiter(newRecruiter);
    setRecruiterToken(newToken);
    localStorage.setItem('recruiter_hiring_token', newToken);
    localStorage.setItem('jobsner_portal', 'recruiter');
    setRecruiterView('dashboard');
    setPortal('recruiter');
    setUserRole('recruiter');
  };

  const handleRecruiterProfileUpdated = (updatedRecruiter: Recruiter) => {
    setRecruiter(updatedRecruiter);
  };

  const handleRecruiterLogout = () => {
    localStorage.setItem('jobsner_explicit_logout', 'true');
    const tokenToRevoke = localStorage.getItem('recruiter_hiring_token');
    if (tokenToRevoke) {
      fetch('/api/recruiter/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenToRevoke}` }
      }).catch(e => console.warn('[Recruiter Logout] Server token invalidation failed:', e));
    }
    logoutFirebase().catch(e => console.warn('[Firebase SignOut]', e));
    localStorage.removeItem('jobsner_portal');
    localStorage.removeItem('recruiter_hiring_token');
    setRecruiter(null);
    setRecruiterToken(null);
    setRecruiterView('login');
    setUserRole(null);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const isCandidateLoggedIn = !!candidate && !!token;
  const isRecruiterLoggedIn = !!recruiter && !!recruiterToken;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-full overflow-x-hidden" id="app-root-container">
      {/* Top Navbar Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shrink-0 shadow-xs" id="global-navbar">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 sm:h-20 md:h-22 flex items-center justify-between gap-1.5 sm:gap-4">
          
          {/* Logo brand */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-1.5 sm:gap-3 select-none cursor-pointer group active:scale-95 transition-all" 
            id="navbar-brand"
          >
            <JobsnerLogo size="xl" className="h-10 sm:h-14 md:h-18" />
            {userRole !== null && userRole !== 'candidate' && (
              <span className="text-[10px] sm:text-[11px] font-bold text-[#1D61F2] uppercase bg-blue-50 border border-blue-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full tracking-wider shrink-0 hidden xs:inline-block ml-1">
                {portal === 'candidate' ? 'Candidate Portal' : 'Recruiter Portal'}
              </span>
            )}
          </div>

          {/* Center Navigation Links (Matching Reference Image) */}
          {isCandidateLoggedIn && portal === 'candidate' && view === 'dashboard' ? (
            <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
              <button 
                onClick={() => setCandidateActiveTab('find_jobs')} 
                className={`relative py-5 px-1 cursor-pointer transition-colors ${candidateActiveTab === 'find_jobs' ? 'text-[#1D61F2] font-black' : 'hover:text-slate-900'}`}
              >
                Jobs
                {candidateActiveTab === 'find_jobs' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1D61F2] rounded-full" />}
              </button>
              <button 
                onClick={() => setCandidateActiveTab('applications')} 
                className={`relative py-5 px-1 cursor-pointer transition-colors ${candidateActiveTab === 'applications' ? 'text-[#1D61F2] font-black' : 'hover:text-slate-900'}`}
              >
                My Applications
                {candidateActiveTab === 'applications' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1D61F2] rounded-full" />}
              </button>
              <button 
                onClick={() => setCandidateActiveTab('saved')} 
                className={`relative py-5 px-1 cursor-pointer transition-colors flex items-center gap-1.5 ${candidateActiveTab === 'saved' ? 'text-[#1D61F2] font-black' : 'hover:text-slate-900'}`}
              >
                <Heart className="w-4 h-4" /> Saved Jobs
                {candidateActiveTab === 'saved' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1D61F2] rounded-full" />}
              </button>
              <button 
                onClick={() => setCandidateActiveTab('overview')} 
                className={`relative py-5 px-1 cursor-pointer transition-colors flex items-center gap-1.5 ${candidateActiveTab === 'overview' ? 'text-[#1D61F2] font-black' : 'hover:text-slate-900'}`}
              >
                <User className="w-4 h-4" /> My Profile
                {candidateActiveTab === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1D61F2] rounded-full" />}
              </button>
            </nav>
          ) : null}

          {/* Right Controls: Notifications + User Profile Badge (Matching Reference Image) */}
          <div className="flex items-center gap-1.5 sm:gap-4" id="navbar-controls">
            {isCandidateLoggedIn && portal === 'candidate' && candidate ? (
              <div className="flex items-center gap-1.5 sm:gap-4">
                {/* Notification Bell */}
                <button 
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="relative cursor-pointer p-1.5 sm:p-2 hover:bg-gray-100 rounded-full text-slate-700 transition-colors border-none bg-transparent" 
                  title="View Notifications"
                  id="header-notification-bell"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#1D61F2] text-white text-[9px] sm:text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                    3
                  </span>
                </button>

                {/* Profile Badge & Logout Control */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Profile Circle — visible on all sizes */}
                  <div 
                    onClick={() => setCandidateActiveTab('overview')} 
                    className="flex items-center gap-1.5 sm:gap-2.5 sm:pl-3 sm:border-l sm:border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    title="View Profile"
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 overflow-hidden border-2 border-white shadow-sm shrink-0 flex items-center justify-center text-white font-extrabold text-[11px] sm:text-xs">
                      {candidate.profile?.profilePhoto ? (
                        <img src={candidate.profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        candidate.profile?.fullName?.[0]?.toUpperCase() || 'D'
                      )}
                    </div>
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-xs font-extrabold text-slate-900 leading-tight">
                        {candidate.profile?.fullName?.toLowerCase() || candidate.fullName?.toLowerCase() || 'deepesh'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Job Seeker
                      </span>
                    </div>
                  </div>
                  {/* Logout button — hidden on mobile, visible on sm+ */}
                  <button
                    onClick={handleCandidateLogout}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs ml-1"
                    title="Log Out of Candidate Account"
                    id="header-candidate-logout-btn"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : userRole === null ? (
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
                Gateway Select
              </span>
            ) : portal === 'candidate' ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setPortal('recruiter');
                    setUserRole('recruiter');
                    localStorage.setItem('jobsner_portal', 'recruiter');
                    if (isRecruiterLoggedIn) {
                      setRecruiterView('dashboard');
                    } else {
                      setRecruiterView('login');
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-gray-200 hover:border-orange-500 hover:text-orange-600 rounded-lg text-xs font-bold transition-all cursor-pointer text-gray-600 bg-white"
                  id="switch-to-recruiter-portal"
                >
                  <Briefcase className="w-3.5 h-3.5" /> For Employers
                </button>
              </div>
            ) : (
              isRecruiterLoggedIn ? (
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${recruiter?.status === 'Approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="hidden sm:inline text-xs font-semibold text-gray-700 truncate max-w-[200px]">
                    {recruiter?.recruiterName} ({recruiter?.companyName})
                  </span>
                  <button
                    onClick={handleRecruiterLogout}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/70 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer shadow-2xs ml-0.5 sm:ml-1"
                    title="Log Out of Recruiter Account"
                    id="header-recruiter-logout-btn"
                  >
                    <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setPortal('candidate');
                      setUserRole('candidate');
                      localStorage.setItem('jobsner_portal', 'candidate');
                      if (isCandidateLoggedIn) {
                        setView('dashboard');
                      } else {
                        setView('login');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-orange-500 hover:text-orange-600 rounded-lg text-xs font-bold transition-all cursor-pointer text-gray-600 bg-white"
                    id="switch-to-candidate-portal"
                  >
                    <User className="w-3.5 h-3.5" /> Driver Careers
                  </button>
                </div>
              )
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className={`${userRole === null ? 'flex-1 flex flex-col justify-center items-center max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-10' : 'flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6'}`} id="main-content-layout">
        <AnimatePresence mode="wait">
          
          {userRole === null ? (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-4xl mx-auto flex flex-col justify-center items-center my-auto py-2 sm:py-4"
            >
              <div className="text-center max-w-2xl mx-auto mb-5 sm:mb-8 flex flex-col items-center">
                <JobsnerLogo variant="full" size="md" className="mb-2 sm:mb-3" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight mb-2 sm:mb-3 px-2">
                  Connecting Fleet Owners with Certified Drivers
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed max-w-xl px-2">
                  Jobsner is the leading compliance-first network for logistics and delivery hiring. Tell us who you are to get started.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
                
                {/* Recruiter Card */}
                <motion.div
                  whileHover={{ y: -3, boxShadow: '0 15px 20px -5px rgb(0 0 0 / 0.05)' }}
                  className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-orange-50/50 rounded-bl-full -z-0 transition-colors group-hover:bg-orange-50" />
                  
                  <div className="relative z-10">
                    <div className="w-11 h-11 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-3">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-orange-50 text-orange-700 border border-orange-100 mb-2">
                      For Fleet Owners & Employers
                    </span>
                    
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
                      Are you a Recruiter?
                    </h2>
                    
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed font-medium">
                      Post regional logistics job openings, perform verified document compliance audits, and manage applications.
                    </p>

                    <ul className="mt-4 space-y-2 text-xs text-gray-500 font-medium">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>Unlimited dispatch job postings</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>Verified driving license check audits</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>Interactive screening compliance tracker</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setPortal('recruiter');
                      setUserRole('recruiter');
                      localStorage.setItem('jobsner_portal', 'recruiter');
                      if (isRecruiterLoggedIn) {
                        setRecruiterView('dashboard');
                      } else {
                        setRecruiterView('login');
                      }
                    }}
                    id="gateway-recruiter-btn"
                    className="mt-6 w-full min-h-[48px] py-3.5 px-4 bg-slate-950 hover:bg-slate-900 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation"
                  >
                    Post a Job & Sign In
                  </button>
                </motion.div>

                {/* Candidate Card */}
                <motion.div
                  whileHover={{ y: -3, boxShadow: '0 15px 20px -5px rgb(0 0 0 / 0.05)' }}
                  className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-orange-50/50 rounded-bl-full -z-0 transition-colors group-hover:bg-orange-50" />
                  
                  <div className="relative z-10">
                    <div className="w-11 h-11 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-3">
                      <Truck className="w-5 h-5" />
                    </div>
                    
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-orange-50 text-orange-700 border border-orange-100 mb-2">
                      For Drivers & Delivery Agents
                    </span>
                    
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
                      Find a Job
                    </h2>
                    
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed font-medium">
                      Search for transport & delivery driver careers, upload driving credentials, and receive job interview offers.
                    </p>

                    <ul className="mt-4 space-y-2 text-xs text-gray-500 font-medium">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>Search verified fleet driver opportunities</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>Quick profile creation & instant apply</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>Real-time background vetting status checks</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setPortal('candidate');
                      setUserRole('candidate');
                      localStorage.setItem('jobsner_portal', 'candidate');
                      if (isCandidateLoggedIn) {
                        setView('dashboard');
                      } else {
                        setView('login');
                      }
                    }}
                    id="gateway-candidate-btn"
                    className="mt-6 w-full min-h-[48px] py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation"
                  >
                    Find a Job & Sign In
                  </button>
                </motion.div>

              </div>
            </motion.div>
          ) : (
            <React.Fragment>
              {/* --- CANDIDATE PORTAL VIEWS --- */}
              {portal === 'candidate' && (
                <React.Fragment>
                  {(view === 'login' || (!candidate && (view === 'dashboard' || view === 'profile_edit' || view === 'documents'))) && (
                    <motion.div
                      key="cand-login"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CandidateLogin 
                        onSuccess={handleCandidateAuthSuccess}
                        onNavigateToRegister={(prefill) => {
                          if (prefill) setCandidatePrefill(prefill);
                          setView('register');
                        }}
                      />
                      <div className="max-w-md mx-auto text-center mt-4 flex flex-col gap-2.5">
                        <button
                          onClick={() => {
                            setPortal('recruiter');
                            setUserRole('recruiter');
                            localStorage.setItem('jobsner_portal', 'recruiter');
                            if (isRecruiterLoggedIn) {
                              setRecruiterView('dashboard');
                            } else {
                              setRecruiterView('login');
                            }
                          }}
                          className="text-xs font-bold text-gray-500 hover:text-orange-600 transition-colors cursor-pointer"
                        >
                          Are you a Recruiter? Access Recruiter Portal
                        </button>
                        <button
                          onClick={() => {
                            setUserRole(null);
                          }}
                          className="text-xs font-extrabold text-orange-600 hover:underline transition-all cursor-pointer"
                        >
                          ← Choose Another Account Type
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {view === 'register' && (
                    <motion.div
                      key="cand-register"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CandidateRegistration 
                        prefill={candidatePrefill}
                        onSuccess={handleCandidateAuthSuccess}
                        onNavigateToLogin={() => setView('login')}
                      />
                    </motion.div>
                  )}

                  {view === 'dashboard' && candidate && (
                    <motion.div
                      key="cand-dashboard"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CandidateDashboard 
                        candidate={candidate}
                        token={token}
                        activeTab={candidateActiveTab}
                        onTabChange={setCandidateActiveTab}
                        onEditProfile={() => setCandidateActiveTab('overview')}
                        onLogout={handleCandidateLogout}
                        onManageDocuments={() => setView('documents')}
                        onUpdateProfile={handleCandidateProfileSaveSuccess}
                        isNotificationOpen={isNotificationModalOpen}
                        onCloseNotification={() => setIsNotificationModalOpen(false)}
                      />
                    </motion.div>
                  )}

                  {view === 'profile_edit' && candidate && token && (
                    <motion.div
                      key="cand-profile-edit"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CandidateProfileEdit 
                        initialProfile={candidate.profile}
                        token={token}
                        onSaveSuccess={handleCandidateProfileSaveSuccess}
                        onCancel={() => setView('dashboard')}
                      />
                    </motion.div>
                  )}

                  {view === 'documents' && candidate && token && (
                    <motion.div
                      key="cand-documents"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CandidateDocuments 
                        documents={candidate.documents || []}
                        token={token}
                        onBackToDashboard={() => setView('dashboard')}
                        onDocumentsUpdated={(updatedDocs) => {
                          setCandidate({
                            ...candidate,
                            documents: updatedDocs
                          });
                        }}
                      />
                    </motion.div>
                  )}
                </React.Fragment>
              )}

              {/* --- RECRUITER PORTAL VIEWS --- */}
              {portal === 'recruiter' && (
                <React.Fragment>
                  {(recruiterView === 'login' || (!recruiter && recruiterView === 'dashboard')) && (
                    <motion.div
                      key="recruiter-login"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <RecruiterLogin 
                        onSuccess={handleRecruiterAuthSuccess}
                        onNavigateToRegister={(prefill) => {
                          if (prefill) setRecruiterPrefill(prefill);
                          setRecruiterView('register');
                        }}
                        onSwitchToCandidate={() => {
                          setPortal('candidate');
                          setUserRole('candidate');
                          localStorage.setItem('jobsner_portal', 'candidate');
                          if (isCandidateLoggedIn) {
                            setView('dashboard');
                          } else {
                            setView('login');
                          }
                        }}
                      />
                      <div className="max-w-md mx-auto text-center mt-4">
                        <button
                          onClick={() => {
                            setUserRole(null);
                          }}
                          className="text-xs font-extrabold text-orange-600 hover:underline transition-all cursor-pointer"
                        >
                          ← Choose Another Account Type
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {recruiterView === 'register' && (
                    <motion.div
                      key="recruiter-register"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <RecruiterRegistration 
                        prefill={recruiterPrefill}
                        onSuccess={handleRecruiterAuthSuccess}
                        onNavigateToLogin={() => setRecruiterView('login')}
                        onSwitchToCandidate={() => {
                          setPortal('candidate');
                          setUserRole('candidate');
                          localStorage.setItem('jobsner_portal', 'candidate');
                          if (isCandidateLoggedIn) {
                            setView('dashboard');
                          } else {
                            setView('login');
                          }
                        }}
                      />
                    </motion.div>
                  )}

                  {recruiterView === 'dashboard' && recruiter && recruiterToken && (
                    <motion.div
                      key="recruiter-dashboard"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <RecruiterDashboard 
                        recruiter={recruiter}
                        token={recruiterToken}
                        onLogout={handleRecruiterLogout}
                        onProfileUpdated={handleRecruiterProfileUpdated}
                      />
                    </motion.div>
                  )}
                </React.Fragment>
              )}
            </React.Fragment>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={`bg-white border-t border-gray-150 shrink-0 ${userRole === null ? 'py-3' : 'py-6'}`} id="global-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>© 2026 Jobsner. Connecting Careers. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-gray-500 font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-orange-500" /> Verified Logistics Hiring Network
            </span>
          </div>
        </div>
      </footer>

      {/* Admin Panel Modal */}
      <AdminPanel 
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        onJobPosted={() => {
          // If candidate is logged in, reload jobs in background
          window.dispatchEvent(new Event('refresh-jobs'));
        }}
      />
    </div>
  );
}
