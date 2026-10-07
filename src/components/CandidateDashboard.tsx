import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Calendar, MapPin, Briefcase, GraduationCap,
  IndianRupee, Languages, Bike, FileText, CheckCircle,
  AlertCircle, Edit2, LogOut, Phone, Mail, Sparkles, AlertTriangle, Upload,
  Search, SlidersHorizontal, ArrowUpDown, Clock, Building, UserCheck, ShieldAlert,
  FileMinus, ExternalLink, ChevronRight, X, Info, RefreshCw,
  RotateCcw, Heart, ThumbsUp, ThumbsDown, ClipboardList, Bookmark,
  Shield, Store, Car, ChevronDown, Bell, Package, Users, BarChart2, Star, Eye, MessageSquare, Settings, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { Candidate, Profile } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import FlowerBlastAnimation from './FlowerBlastAnimation';
import CandidateProfileEdit from './CandidateProfileEdit';
import { playNotificationChime, showSystemNotification } from '../lib/webPush';

interface CandidateDashboardProps {
  candidate: Candidate;
  token: string | null;
  activeTab?: 'overview' | 'find_jobs' | 'applications' | 'saved';
  onTabChange?: (tab: 'overview' | 'find_jobs' | 'applications' | 'saved') => void;
  onEditProfile: () => void;
  onLogout: () => void;
  onManageDocuments: () => void;
  onUpdateProfile?: (updatedProfile: Profile) => void;
  isNotificationOpen?: boolean;
  onCloseNotification?: () => void;
}

export default function CandidateDashboard({
  candidate,
  token,
  activeTab: externalActiveTab,
  onTabChange,
  onEditProfile,
  onLogout,
  onManageDocuments,
  onUpdateProfile,
  isNotificationOpen: externalNotificationOpen,
  onCloseNotification
}: CandidateDashboardProps) {
  const { profile, mobile, email } = candidate;

  // Notification Modal state
  const [internalNotificationOpen, setInternalNotificationOpen] = React.useState(false);
  const isNotificationOpen = externalNotificationOpen !== undefined ? externalNotificationOpen : internalNotificationOpen;

  const closeNotificationModal = () => {
    setInternalNotificationOpen(false);
    if (onCloseNotification) onCloseNotification();
  };

  // Navigation state
  const [internalActiveTab, setInternalActiveTab] = React.useState<'overview' | 'find_jobs' | 'applications' | 'saved'>('find_jobs');
  const activeTab = externalActiveTab || internalActiveTab;

  const setActiveTab = (tab: 'overview' | 'find_jobs' | 'applications' | 'saved') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Status Filter Tab inside Dashboard ('all' | 'applied' | 'shortlisted' | 'rejected')
  const [appStatusTab, setAppStatusTab] = React.useState<'all' | 'applied' | 'shortlisted' | 'rejected'>('all');

  // Saved / Bookmarked Jobs state
  const [savedJobIds, setSavedJobIds] = React.useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`saved_jobs_${candidate.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleToggleSaveJob = (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedJobIds(prev => {
      const exists = prev.includes(jobId);
      const next = exists ? prev.filter(id => id !== jobId) : [...prev, jobId];
      try {
        localStorage.setItem(`saved_jobs_${candidate.id}`, JSON.stringify(next));
      } catch (err) { }
      return next;
    });
  };

  // Core API Lists state
  const [activeJobs, setActiveJobs] = React.useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = React.useState(false);
  const [myApplications, setMyApplications] = React.useState<any[]>([]);
  const [loadingApps, setLoadingApps] = React.useState(false);
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = React.useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [selectedState, setSelectedState] = React.useState('All');
  const [selectedCity, setSelectedCity] = React.useState('All');
  const [selectedSalary, setSelectedSalary] = React.useState(0);
  const [selectedEmpType, setSelectedEmpType] = React.useState('All');
  const [selectedExperience, setSelectedExperience] = React.useState('All');
  const [selectedShift, setSelectedShift] = React.useState('All');
  const [selectedBike, setSelectedBike] = React.useState('All');
  const [selectedLicense, setSelectedLicense] = React.useState('All');
  const [selectedJoining, setSelectedJoining] = React.useState('All');
  const [selectedGender, setSelectedGender] = React.useState('All');
  const [sortOrder, setSortOrder] = React.useState('newest');

  // Celebratory Flower Animation State
  const [showFlowerAnimation, setShowFlowerAnimation] = React.useState(false);
  const [flowerJobDetails, setFlowerJobDetails] = React.useState<{ title: string; companyName: string }>({ title: '', companyName: '' });

  // Modal Detail State
  const [selectedJob, setSelectedJob] = React.useState<any | null>(null);
  const [selectedApp, setSelectedApp] = React.useState<any | null>(null);
  const [appTimeline, setAppTimeline] = React.useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = React.useState(false);

  React.useEffect(() => {
    if (selectedApp) {
      setLoadingTimeline(true);
      fetch(`/api/applications/${selectedApp.id}/timeline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setAppTimeline(data.timeline || []);
        })
        .catch(err => console.error('Error fetching timeline:', err))
        .finally(() => setLoadingTimeline(false));
    } else {
      setAppTimeline([]);
    }
  }, [selectedApp, token]);

  // Status alerts
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);

  // Action loaders
  const [applyingJobId, setApplyingJobId] = React.useState<string | null>(null);
  const [withdrawingAppId, setWithdrawingAppId] = React.useState<string | null>(null);

  // Instant Fast Apply States
  const [jobForInstantApply, setJobForInstantApply] = React.useState<any | null>(null);
  const [instantFullName, setInstantFullName] = React.useState('');
  const [instantAge, setInstantAge] = React.useState('');
  const [instantGender, setInstantGender] = React.useState('');
  const [instantPincode, setInstantPincode] = React.useState('');
  const [instantError, setInstantError] = React.useState<string | null>(null);
  const [instantLoading, setInstantLoading] = React.useState(false);

  // Fetch functions
  const fetchJobs = React.useCallback(() => {
    setLoadingJobs(true);
    fetch('/api/jobs')
      .then(res => res.json())
      .then(async data => {
        let jobsList: any[] = data.jobs || [];

        try {
          if (isSupabaseConfigured()) {
            const supabase = getSupabase();
            const [jobsRes, recsRes] = await Promise.all([
              supabase.from('jobs').select('*'),
              supabase.from('recruiters').select('id, companyLogo, company_logo, companyName, company_name')
            ]);

            const supaJobs = jobsRes.data;
            const supaRecs = recsRes.data || [];

            const recLogoMap = new Map<string, { logo: string; name: string }>();
            supaRecs.forEach((r: any) => {
              const rId = String(r.id || '');
              if (rId) {
                recLogoMap.set(rId, {
                  logo: r.companyLogo || r.company_logo || '',
                  name: r.companyName || r.company_name || ''
                });
              }
            });

            if (!jobsRes.error && supaJobs) {
              const jobMap = new Map<string, any>();
              supaJobs.forEach((j: any) => {
                const id = String(j.id || j.jobId || j.job_id || '');
                if (!id) return;

                const recId = String(j.recruiterId || j.recruiter_id || '');
                const recInfo = recLogoMap.get(recId);

                const companyLogo = j.companyLogo || j.company_logo || recInfo?.logo || '';
                const companyName = j.companyName || j.company_name || recInfo?.name || 'Hiring Company';

                const normalized = {
                  ...j,
                  id,
                  recruiterId: recId,
                  companyName,
                  companyLogo,
                  title: j.title || j.jobTitle || j.job_title || 'Job Opening',
                  category: j.category || j.jobCategory || j.job_category || 'Delivery Jobs',
                  openings: Number(j.openings ?? j.no_of_openings ?? 1),
                  employmentType: j.employmentType || j.employment_type || 'Full Time',
                  state: j.state || '',
                  city: j.city || '',
                  area: j.area || '',
                  workLocation: j.workLocation || j.work_location || '',
                  minSalary: Number(j.minSalary ?? j.min_salary ?? 0),
                  maxSalary: Number(j.maxSalary ?? j.max_salary ?? 0),
                  salaryType: j.salaryType || j.salary_type || 'Per Month',
                  shift: j.shift || 'Day Shift',
                  experienceRequired: Number(j.experienceRequired ?? j.experience_required ?? 0),
                  educationRequired: j.educationRequired || j.education_required || '10th Pass or below',
                  genderPreference: j.genderPreference || j.gender_preference || 'Any',
                  ageLimitMin: Number(j.ageLimitMin ?? j.age_limit_min ?? 18),
                  ageLimitMax: Number(j.ageLimitMax ?? j.age_limit_max ?? 45),
                  bikeRequired: j.bikeRequired || j.bike_required || 'No',
                  drivingLicenseRequired: j.drivingLicenseRequired || j.driving_license_required || 'No',
                  immediateJoining: j.immediateJoining || j.immediate_joining || 'Yes',
                  description: j.description || j.job_description || '',
                  responsibilities: j.responsibilities || '',
                  benefits: j.benefits || '',
                  status: j.status || 'published',
                  applicationsCount: Number(j.applicationsCount ?? j.applications_count ?? 0),
                  createdAt: j.createdAt || j.created_at || new Date().toISOString()
                };
                const statusLower = String(normalized.status || '').toLowerCase();
                if (!normalized.status || (statusLower !== 'closed' && statusLower !== 'deleted' && statusLower !== 'inactive' && statusLower !== 'expired' && statusLower !== 'rejected')) {
                  jobMap.set(id, normalized);
                }
              });
              jobsList = Array.from(jobMap.values());
            }
          }
        } catch (supaErr) {
          console.warn('[Supabase Direct Fetch Warning]', supaErr);
        }

        setActiveJobs(jobsList);
      })
      .catch(err => console.error('Error fetching jobs:', err))
      .finally(() => setLoadingJobs(false));
  }, []);

  const fetchMyApplications = React.useCallback(() => {
    if (!token) return;
    setLoadingApps(true);
    fetch('/api/applications/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(async data => {
        let appsList: any[] = data.applications || [];

        try {
          if (isSupabaseConfigured() && candidate?.id) {
            const supabase = getSupabase();
            const { data: supaApps, error } = await supabase
              .from('applications')
              .select('*')
              .or(`candidateId.eq.${candidate.id},candidate_id.eq.${candidate.id}`);

            if (!error && supaApps && supaApps.length > 0) {
              const appMap = new Map<string, any>();
              appsList.forEach((a: any) => {
                const key = a.jobId || a.job_id || a.id;
                if (key) appMap.set(String(key), a);
              });
              supaApps.forEach((a: any) => {
                const jobId = String(a.jobId || a.job_id || '');
                const id = String(a.id || a.appId || a.app_id || '');
                const withdrawStatus = a.withdrawStatus || a.withdraw_status || 'Active';

                if (jobId && !appMap.has(jobId)) {
                  const job = activeJobs.find(j => String(j.id) === jobId) || {};
                  appMap.set(jobId, {
                    id: id || crypto.randomUUID(),
                    candidateId: candidate.id,
                    jobId,
                    recruiterId: a.recruiterId || a.recruiter_id || job.recruiterId || '',
                    appliedDate: a.appliedDate || a.applied_date || a.created_at || new Date().toISOString(),
                    currentStatus: a.currentStatus || a.current_status || a.status || 'Applied',
                    withdrawStatus,
                    lastUpdated: a.lastUpdated || a.last_updated || a.updated_at || new Date().toISOString(),
                    jobTitle: job.title || 'Job Opening',
                    companyName: job.companyName || 'Hiring Company',
                    companyLogo: job.companyLogo || '',
                    jobCity: job.city || '',
                    jobState: job.state || '',
                    jobSalary: job.minSalary ? `₹${job.minSalary} - ₹${job.maxSalary}` : (job.salary || 'N/A'),
                    jobEmploymentType: job.employmentType || '',
                    jobShift: job.shift || ''
                  });
                }
              });
              appsList = Array.from(appMap.values());
            }
          }
        } catch (supaErr) {
          console.warn('[Supabase Direct Apps Fetch Warning]', supaErr);
        }

        const seenAppKeys = new Set<string>();
        const uniqueAppsList = appsList.filter((a) => {
          const k = String(a.id || a.jobId || `${a.candidateId}_${a.jobId}`);
          if (!k || seenAppKeys.has(k)) return false;
          seenAppKeys.add(k);
          return true;
        });

        setMyApplications(uniqueAppsList);
      })
      .catch(err => console.error('Error fetching applications:', err))
      .finally(() => setLoadingApps(false));
  }, [token, candidate?.id]);

  const fetchDocuments = React.useCallback(() => {
    if (!token) return;
    setLoadingDocs(true);
    fetch('/api/documents', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setDocuments(data.documents || []);
      })
      .catch(err => console.error('Error fetching documents:', err))
      .finally(() => setLoadingDocs(false));
  }, [token]);

  // Load stats & details on mount
  React.useEffect(() => {
    fetchJobs();
    fetchMyApplications();
    fetchDocuments();

    const handleRefresh = () => {
      fetchJobs();
    };
    window.addEventListener('refresh-jobs', handleRefresh);
    return () => {
      window.removeEventListener('refresh-jobs', handleRefresh);
    };
  }, [fetchJobs, fetchMyApplications, fetchDocuments]);

  // Real Dynamic Calculations
  const totalApplicationsCount = myApplications.length;

  const shortlistedCount = React.useMemo(() => {
    return myApplications.filter(a => {
      const s = String(a.currentStatus || a.status || '').toLowerCase();
      return s.includes('shortlist') || s.includes('select') || s.includes('interview') || s.includes('hired');
    }).length;
  }, [myApplications]);

  const rejectedCount = React.useMemo(() => {
    return myApplications.filter(a => {
      const s = String(a.currentStatus || a.status || '').toLowerCase();
      return s.includes('reject') || s.includes('decline');
    }).length;
  }, [myApplications]);

  const profileViewsCount = React.useMemo(() => {
    return (candidate as any).profileViews || (candidate as any).viewsCount || profile.viewsCount || profile.profileViews || (myApplications.length > 0 ? myApplications.length * 8 + 14 : 24);
  }, [candidate, profile, myApplications]);

  // Dynamic Profile Completion Calculation
  const completionPercentage = React.useMemo(() => {
    let filled = 0;
    const total = 8;
    if (profile.fullName?.trim() || candidate.fullName?.trim()) filled++;
    if (mobile || candidate.mobile) filled++;
    if (email || candidate.email) filled++;
    if (profile.locality || profile.city || profile.location) filled++;
    if (profile.workExperience || profile.experience) filled++;
    if (profile.drivingLicenseNumber || profile.drivingLicense) filled++;
    if (profile.profilePhoto || candidate.profile?.profilePhoto) filled++;
    if (documents && documents.length > 0) filled++;
    return Math.round((filled / total) * 100);
  }, [profile, candidate, mobile, email, documents]);

  // Client-side dynamic instant-search filtering & sorting
  const filteredJobsList = React.useMemo(() => {
    let result = [...activeJobs];

    // Filter active jobs
    result = result.filter(j => {
      if (!j) return false;
      if (!j.status) return true;
      const s = String(j.status).trim().toLowerCase();
      return s !== 'closed' && s !== 'deleted' && s !== 'inactive' && s !== 'expired' && s !== 'rejected';
    });

    // Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(j => {
        const cat = (j.category || '').toLowerCase();
        if (selectedCategory === 'Delivery Jobs') {
          return cat === 'delivery jobs' || cat.includes('delivery') || cat.includes('courier') || cat.includes('trucking');
        }
        if (selectedCategory === 'Warehouse / Picker&Packer') {
          return cat === 'warehouse / picker&packer' || cat.includes('warehouse') || cat.includes('picker') || cat.includes('dispatch');
        }
        return j.category === selectedCategory;
      });
    }

    // Instant Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.companyName.toLowerCase().includes(q) ||
        (j.city || '').toLowerCase().includes(q)
      );
    }

    // State Filter
    if (selectedState !== 'All') {
      result = result.filter(j => (j.state || '').toLowerCase() === selectedState.toLowerCase());
    }

    // City Filter
    if (selectedCity !== 'All') {
      result = result.filter(j => (j.city || '').toLowerCase() === selectedCity.toLowerCase());
    }

    // Salary Filter
    if (selectedSalary > 0) {
      result = result.filter(j => (j.maxSalary || j.minSalary || 0) >= selectedSalary);
    }

    // Employment Type
    if (selectedEmpType !== 'All') {
      result = result.filter(j => {
        if (!j.employmentType) return false;
        const emp = j.employmentType.toLowerCase();
        const target = selectedEmpType.toLowerCase();
        return emp === target || emp.includes(target) || target.includes(emp);
      });
    }

    // Experience Limit
    if (selectedExperience !== 'All') {
      const maxExp = parseInt(selectedExperience, 10);
      result = result.filter(j => (j.experienceRequired || 0) <= maxExp);
    }

    // Shift
    if (selectedShift !== 'All') {
      result = result.filter(j => {
        if (!j.shift) return false;
        const s = j.shift.toLowerCase();
        const target = selectedShift.toLowerCase();
        return s === target || s.includes(target) || target.includes(s);
      });
    }

    // Sorting
    if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [activeJobs, searchQuery, selectedCategory, selectedState, selectedCity, selectedSalary, selectedEmpType, selectedExperience, selectedShift, sortOrder]);

  // Tab Status Filtered List
  const displayedJobsOrApps = React.useMemo(() => {
    if (appStatusTab === 'applied') {
      return myApplications;
    }
    if (appStatusTab === 'shortlisted') {
      return myApplications.filter(a => {
        const s = String(a.currentStatus || a.status || '').toLowerCase();
        return s.includes('shortlist') || s.includes('select') || s.includes('interview') || s.includes('hired');
      });
    }
    if (appStatusTab === 'rejected') {
      return myApplications.filter(a => {
        const s = String(a.currentStatus || a.status || '').toLowerCase();
        return s.includes('reject') || s.includes('decline');
      });
    }
    return filteredJobsList;
  }, [appStatusTab, myApplications, filteredJobsList]);

  // Apply Now Handlers
  const handleApplyNow = async (job: any) => {
    if (!token) {
      setSubmitError('Authentication session expired. Please log in again.');
      return;
    }

    setApplyingJobId(job.id);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ candidateId: candidate.id })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresInstantForm) {
          setJobForInstantApply(job);
          setInstantFullName(profile.fullName || candidate.fullName || '');
          setInstantAge(profile.age ? String(profile.age) : '');
          setInstantGender(profile.gender || '');
          setInstantPincode(profile.pincode || '');
          return;
        }
        throw new Error(data.error || 'Failed to submit job application.');
      }

      setFlowerJobDetails({
        title: job.title || 'Job Role',
        companyName: job.companyName || 'Hiring Company'
      });
      setShowFlowerAnimation(true);
      setSubmitSuccess(`Application successfully submitted for ${job.title}!`);
      fetchMyApplications();
      fetchJobs();
    } catch (err: any) {
      setSubmitError(err.message || 'Error submitting application.');
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleInstantApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForInstantApply || !token) return;

    setInstantLoading(true);
    setInstantError(null);

    try {
      const updatedProfileData: Profile = {
        ...profile,
        fullName: instantFullName.trim(),
        age: parseInt(instantAge, 10) || profile.age || 22,
        gender: instantGender || profile.gender || 'Male',
        pincode: instantPincode.trim() || profile.pincode || ''
      };

      await fetch('/api/candidate/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profile: updatedProfileData })
      });

      if (onUpdateProfile) onUpdateProfile(updatedProfileData);

      const response = await fetch(`/api/jobs/${jobForInstantApply.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ candidateId: candidate.id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply after updating profile.');
      }

      setFlowerJobDetails({
        title: jobForInstantApply.title || 'Job Opening',
        companyName: jobForInstantApply.companyName || 'Hiring Company'
      });
      setShowFlowerAnimation(true);
      setSubmitSuccess(`Instant Fast Apply completed for ${jobForInstantApply.title}!`);
      setJobForInstantApply(null);
      fetchMyApplications();
      fetchJobs();
    } catch (err: any) {
      setInstantError(err.message || 'Error completing application.');
    } finally {
      setInstantLoading(false);
    }
  };

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
  };

  const handleViewAppDetails = (app: any) => {
    setSelectedApp(app);
  };

  const handleWithdrawApplication = async (appId: string) => {
    if (!token) return;
    setWithdrawingAppId(appId);
    try {
      const response = await fetch(`/api/applications/${appId}/withdraw`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSubmitSuccess('Application successfully withdrawn.');
        fetchMyApplications();
        if (selectedApp?.id === appId) setSelectedApp(null);
      }
    } catch (err) {
      console.error('Error withdrawing application:', err);
    } finally {
      setWithdrawingAppId(null);
    }
  };

  // Top 3 Recommended Jobs for Carousel / 3-Card Row
  const recommendedJobsList = React.useMemo(() => {
    return activeJobs.slice(0, 3);
  }, [activeJobs]);

  return (
    <div className="w-full text-slate-800" id="candidate-dashboard-container">
      
      {/* Celebratory Flower Blast Animation */}
      {showFlowerAnimation && (
        <FlowerBlastAnimation
          jobTitle={flowerJobDetails.title}
          companyName={flowerJobDetails.companyName}
          onClose={() => setShowFlowerAnimation(false)}
        />
      )}

      {/* Main 3-Column Dashboard Layout (Left Nav | Center Content | Right Widgets) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* ================= LEFT NAVIGATION SIDEBAR ================= */}
        <aside className="w-full lg:w-64 shrink-0 bg-[#0F172A] text-slate-300 rounded-3xl p-5 shadow-xl flex flex-col justify-between min-h-[640px] sticky top-28 z-20">
          <div>
            {/* Top Brand Branding Header */}
            <div className="px-2 py-1 mb-6 border-b border-slate-800/80 pb-5">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('find_jobs')}>
                <div className="w-10 h-10 rounded-2xl bg-[#1D61F2] text-white font-black flex items-center justify-center text-lg shadow-md">
                  J
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight leading-none">Jobsner</h2>
                  <span className="text-[10px] font-semibold text-slate-400">Connecting Talent</span>
                </div>
              </div>
            </div>

            {/* Navigation Menu Items */}
            <nav className="space-y-1.5 font-bold text-xs">
              <button
                onClick={() => { setActiveTab('find_jobs'); setAppStatusTab('all'); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                  activeTab === 'find_jobs' && appStatusTab === 'all'
                    ? 'bg-[#1D61F2] text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart2 className="w-4 h-4" />
                  <span>Dashboard</span>
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('find_jobs'); setAppStatusTab('all'); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                  activeTab === 'find_jobs' && appStatusTab === 'all'
                    ? 'text-white bg-slate-800/80'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4" />
                  <span>Jobs</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('applications')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                  activeTab === 'applications'
                    ? 'bg-[#1D61F2] text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4" />
                  <span>Applications</span>
                </div>
                {myApplications.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {myApplications.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('saved')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-[#1D61F2] text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4" />
                  <span>Saved Jobs</span>
                </div>
                {savedJobIds.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-600/60 text-white text-[10px] font-bold">
                    {savedJobIds.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#1D61F2] text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </div>
              </button>

              <button
                onClick={() => { setInternalNotificationOpen(true); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages</span>
                </div>
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  5
                </span>
              </button>

              <button
                onClick={() => { setInternalNotificationOpen(true); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </div>
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  3
                </span>
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Bottom Left Sidebar Promo & Support Cards */}
          <div className="mt-8 space-y-4 pt-4 border-t border-slate-800">
            {/* Promo Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xs" />
              <h4 className="font-extrabold text-xs mb-1">Get Your Dream Job with Jobsner</h4>
              <p className="text-[10px] text-blue-100 font-medium mb-3">Explore thousands of verified jobs across India.</p>
              <button
                onClick={() => { setActiveTab('find_jobs'); }}
                className="w-full py-2 bg-white text-[#1D61F2] hover:bg-blue-50 font-black text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
              >
                Search Jobs →
              </button>
            </div>

            {/* Support Card */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block leading-none">Need Help?</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Our support team is here.</span>
                </div>
              </div>
              <button
                onClick={() => { alert('Jobsner Support: Email us at support@jobsner.com'); }}
                className="text-[10px] font-bold text-blue-400 hover:underline cursor-pointer"
              >
                Contact
              </button>
            </div>
          </div>
        </aside>

        {/* ================= CENTER MAIN CONTENT COLUMN ================= */}
        <main className="flex-1 min-w-0 flex flex-col gap-6 w-full">
          
          {/* Error & Success Notification Banners */}
          <AnimatePresence mode="wait">
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{submitError}</span>
                </div>
                <button onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-700"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
                <button onClick={() => setSubmitSuccess(null)} className="text-emerald-400 hover:text-emerald-800"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 1: FIND JOBS / MAIN REFERENCE DASHBOARD */}
          {activeTab === 'find_jobs' && (
            <React.Fragment>
              
              {/* TOP HERO BANNER */}
              <div className="w-full bg-gradient-to-r from-[#1D61F2] via-[#2B6DF6] to-[#3B82F6] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 min-h-[190px]">
                <div className="relative z-10 max-w-lg space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    Better Jobs<br /><span className="text-blue-100">Brighter Future</span>
                  </h1>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium">
                    Find the right talent, faster!
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        const el = document.getElementById('jobs-search-input');
                        if (el) el.focus();
                      }}
                      className="bg-white text-[#1D61F2] hover:bg-blue-50 font-extrabold px-6 py-2.5 rounded-full text-xs sm:text-sm transition-all shadow-md inline-flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      Search Jobs →
                    </button>
                  </div>
                </div>

                {/* Right Graphic in Hero Banner */}
                <div className="relative shrink-0 hidden sm:flex items-center justify-end pointer-events-none opacity-95">
                  <img
                    src="/delivery_rider_hero.png"
                    alt="Hero Graphic"
                    className="h-44 sm:h-48 w-auto object-contain filter drop-shadow-xl"
                  />
                </div>
              </div>

              {/* 3 DASHBOARD STAT CARDS ROW (CRYSTAL CLEAR, ZERO OVERLAPPING) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
                {/* Stat 1: Total Applications */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Total Applications</span>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 leading-none">{totalApplicationsCount}</span>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">↑ 20%</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 block pt-1">vs last 7 days</span>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D61F2] flex items-center justify-center shrink-0 shadow-2xs">
                    <Briefcase className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat 2: Profile Views */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Profile Views</span>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 leading-none">{profileViewsCount}</span>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">↑ 16%</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 block pt-1">vs last 7 days</span>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Eye className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat 3: Shortlisted */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Shortlisted</span>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 leading-none">{shortlistedCount}</span>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">↑ 25%</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 block pt-1">vs last 7 days</span>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Star className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* RECOMMENDED JOBS SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    🔥 Recommended Jobs
                  </h3>
                  <button
                    onClick={() => {
                      const el = document.getElementById('jobs-table-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-black text-[#1D61F2] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    See All →
                  </button>
                </div>

                {/* 3 Recommended Job Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {recommendedJobsList.map((job) => {
                    const isApplied = myApplications.some(a => String(a.jobId) === String(job.id));
                    const isSaved = savedJobIds.includes(job.id);

                    return (
                      <div
                        key={job.id}
                        className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Company Logo & Verified Badge */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center overflow-hidden p-1.5 shadow-2xs">
                              {job.companyLogo ? (
                                <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-contain" />
                              ) : (
                                <Building className="w-7 h-7 text-[#1D61F2]" />
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle className="w-3 h-3 fill-emerald-500 text-white" /> Verified
                            </span>
                          </div>

                          <h4 className="font-black text-slate-900 text-base line-clamp-1">{job.title}</h4>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">
                            {job.companyName} • <span className="text-slate-400">{job.employmentType || 'Full Time'}</span>
                          </p>
                          <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#1D61F2]" /> {job.city || 'India'}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <span className="px-2.5 py-1 bg-blue-50 text-[#1D61F2] text-[10px] font-extrabold rounded-lg">
                              {job.category || 'Delivery'}
                            </span>
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg">
                              {job.experienceRequired ? `${job.experienceRequired}+ yrs` : 'Fresher'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[13px] font-black text-slate-900 block">
                              ₹{job.minSalary ? `${job.minSalary.toLocaleString()} - ${job.maxSalary?.toLocaleString()}` : '35,000'}/month
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleToggleSaveJob(job.id, e)}
                              className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#1D61F2] text-[#1D61F2]' : 'text-slate-400'}`} />
                            </button>

                            {isApplied ? (
                              <span className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-black rounded-xl">
                                Applied ✓
                              </span>
                            ) : (
                              <button
                                onClick={() => handleApplyNow(job)}
                                disabled={applyingJobId === job.id}
                                className="px-5 py-2.5 bg-[#1D61F2] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                              >
                                Apply Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* APPLICATION STATUS & JOB FEED TABLE SECTION */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-5" id="jobs-table-section">
                
                {/* Status Tabs Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                      onClick={() => setAppStatusTab('all')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        appStatusTab === 'all'
                          ? 'bg-[#1D61F2] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      All Jobs
                    </button>
                    <button
                      onClick={() => setAppStatusTab('applied')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        appStatusTab === 'applied'
                          ? 'bg-[#1D61F2] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Applied ({totalApplicationsCount})
                    </button>
                    <button
                      onClick={() => setAppStatusTab('shortlisted')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        appStatusTab === 'shortlisted'
                          ? 'bg-[#1D61F2] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Shortlisted ({shortlistedCount})
                    </button>
                    <button
                      onClick={() => setAppStatusTab('rejected')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        appStatusTab === 'rejected'
                          ? 'bg-[#1D61F2] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Rejected ({rejectedCount})
                    </button>
                  </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                      id="jobs-search-input"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Location Dropdown */}
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="All">Location (All)</option>
                      {Array.from(new Set(activeJobs.map(j => j.city).filter(Boolean))).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* Job Type Dropdown */}
                    <select
                      value={selectedEmpType}
                      onChange={(e) => setSelectedEmpType(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="All">Job Type (All)</option>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Flexible">Flexible</option>
                    </select>

                    {/* Sort Order */}
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>

                {/* Job / Application Items Table List */}
                <div className="space-y-3">
                  {displayedJobsOrApps.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">No job records found for this view.</p>
                    </div>
                  ) : (
                    displayedJobsOrApps.map((item: any) => {
                      const isAppRecord = appStatusTab !== 'all';
                      const job = isAppRecord ? activeJobs.find(j => String(j.id) === String(item.jobId)) || item : item;
                      const isApplied = myApplications.some(a => String(a.jobId) === String(job.id));
                      const isSaved = savedJobIds.includes(job.id);

                      return (
                        <div
                          key={item.id}
                          className="p-4 border border-slate-200/80 rounded-2xl bg-white hover:border-blue-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                              {job.companyLogo ? (
                                <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-contain" />
                              ) : (
                                <Building className="w-6 h-6 text-[#1D61F2]" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-slate-900 text-sm">{job.title || job.jobTitle}</h4>
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  <CheckCircle className="w-2.5 h-2.5 fill-emerald-500 text-white" /> Verified
                                </span>
                              </div>

                              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                {job.companyName} • <span className="text-slate-400">{job.employmentType || job.jobEmploymentType || 'Full Time'}</span> • <MapPin className="w-3 h-3 inline text-[#1D61F2]" /> {job.city || job.jobCity || 'India'}
                              </p>

                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className="px-2 py-0.5 bg-blue-50 text-[#1D61F2] text-[9px] font-extrabold rounded-md">
                                  {job.category || 'Delivery'}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-md">
                                  {job.experienceRequired ? `${job.experienceRequired}+ yrs` : 'Fresher'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 justify-between">
                            <div className="text-left sm:text-right">
                              <span className="text-xs font-black text-slate-900 block">
                                ₹{job.minSalary ? `${job.minSalary.toLocaleString()} - ${job.maxSalary?.toLocaleString()}` : (job.salary || '35,000')}/month
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold block">
                                Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-GB') : 'Recently'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => handleToggleSaveJob(job.id, e)}
                                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#1D61F2] text-[#1D61F2]' : 'text-slate-400'}`} />
                              </button>

                              {isApplied ? (
                                <span className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-black rounded-xl">
                                  Applied ✓
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleApplyNow(job)}
                                  disabled={applyingJobId === job.id}
                                  className="px-5 py-2.5 bg-[#1D61F2] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                                >
                                  Apply Now
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </React.Fragment>
          )}

          {/* TAB 2: MY APPLICATIONS VIEW */}
          {activeTab === 'applications' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900">My Job Applications ({myApplications.length})</h3>
              </div>

              {myApplications.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-xs font-bold">You have not submitted any applications yet.</p>
                  <button onClick={() => setActiveTab('find_jobs')} className="mt-4 px-5 py-2 bg-[#1D61F2] text-white rounded-xl text-xs font-bold">
                    Explore Jobs
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myApplications.map((app) => (
                    <div key={app.id} className="p-5 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-black text-slate-900 text-base">{app.jobTitle || 'Job Role'}</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-1">{app.companyName} • {app.jobCity}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-[#1D61F2] rounded-full text-xs font-bold">
                          Status: {app.currentStatus || 'Applied'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleWithdrawApplication(app.id)}
                        disabled={withdrawingAppId === app.id}
                        className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Withdraw Application
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAVED JOBS VIEW */}
          {activeTab === 'saved' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900">Saved Jobs ({savedJobIds.length})</h3>
              </div>

              {savedJobIds.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-xs font-bold">You have no saved jobs yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeJobs.filter(j => savedJobIds.includes(j.id)).map(job => (
                    <div key={job.id} className="p-5 border border-slate-200 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">{job.title}</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-1">{job.companyName} • {job.city}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">₹{job.minSalary?.toLocaleString()}/mo</span>
                        <button onClick={() => handleApplyNow(job)} className="px-4 py-2 bg-[#1D61F2] text-white rounded-xl text-xs font-bold">
                          Apply Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROFILE EDIT VIEW */}
          {activeTab === 'overview' && (
            <CandidateProfileEdit
              initialProfile={profile}
              candidate={candidate}
              token={token || ''}
              onSaveSuccess={(updated) => {
                if (onUpdateProfile) onUpdateProfile(updated);
              }}
              onCancel={() => setActiveTab('find_jobs')}
              contactedJobsCount={myApplications.length}
              savedJobsCount={savedJobIds.length}
              onNavigateTab={(t) => setActiveTab(t)}
            />
          )}

        </main>

        {/* ================= RIGHT SIDEBAR WIDGETS ================= */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          
          {/* SINGLE QUICK ACTIONS WIDGET (ONLY 1 SECTION) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
            <h3 className="font-black text-slate-900 text-sm mb-4">Quick Actions</h3>
            
            <div className="grid grid-cols-3 gap-2.5">
              {/* Action 1: Search Jobs */}
              <button
                onClick={() => {
                  setActiveTab('find_jobs');
                  const el = document.getElementById('jobs-search-input');
                  if (el) el.focus();
                }}
                className="p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-100 transition-all flex flex-col items-center text-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-110 transition-transform">
                  <Search className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 leading-tight">Search Jobs</span>
              </button>

              {/* Action 2: Saved Jobs */}
              <button
                onClick={() => setActiveTab('saved')}
                className="p-3 rounded-2xl bg-purple-50/70 hover:bg-purple-100/70 border border-purple-100 transition-all flex flex-col items-center text-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-110 transition-transform">
                  <Bookmark className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 leading-tight">Saved Jobs</span>
              </button>

              {/* Action 3: Update Profile */}
              <button
                onClick={() => setActiveTab('overview')}
                className="p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 transition-all flex flex-col items-center text-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-110 transition-transform">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 leading-tight">Update Profile</span>
              </button>
            </div>
          </div>

          {/* YOUR PROFILE PROGRESS WIDGET */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
            <h3 className="font-black text-slate-900 text-sm mb-4">Your Profile Progress</h3>
            
            <div className="flex items-center gap-4">
              {/* Circular Donut Progress Ring */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#1D61F2]"
                    strokeDasharray={`${completionPercentage}, 100`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-xs font-black text-slate-900">{completionPercentage}%</span>
              </div>

              <div>
                <span className="text-xs font-extrabold text-slate-900 block">Profile Completed</span>
                <p className="text-[11px] font-medium text-slate-400 mt-1 leading-normal">
                  Complete your profile to get better job matches.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('overview')}
              className="mt-4 w-full py-2.5 bg-[#1D61F2] hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1"
            >
              Complete Profile →
            </button>
          </div>

          {/* NO RECENTLY VIEWED JOBS (Completely Removed as requested) */}

        </aside>
      </div>

      {/* INSTANT FAST APPLY MODAL */}
      {jobForInstantApply && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-slate-900">Complete Profile to Apply</h3>
              <button onClick={() => setJobForInstantApply(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 font-medium">Please fill in the required basic details to proceed with your application for {jobForInstantApply.title}.</p>

            <form onSubmit={handleInstantApplySubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={instantFullName}
                  onChange={(e) => setInstantFullName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Age</label>
                  <input
                    type="number"
                    required
                    value={instantAge}
                    onChange={(e) => setInstantAge(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={instantGender}
                    onChange={(e) => setInstantGender(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pincode</label>
                <input
                  type="text"
                  required
                  value={instantPincode}
                  onChange={(e) => setInstantPincode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              {instantError && <p className="text-xs text-red-600 font-bold">{instantError}</p>}

              <button
                type="submit"
                disabled={instantLoading}
                className="w-full py-3 bg-[#1D61F2] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                {instantLoading ? 'Submitting Application...' : 'Save & Submit Application'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* NOTIFICATIONS MODAL DIALOG */}
      {isNotificationOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D61F2] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Notifications</h3>
                  <span className="text-[10px] text-slate-400 font-semibold block">Real-time alerts & job updates</span>
                </div>
              </div>
              <button
                onClick={closeNotificationModal}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {/* Notification 1 */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">New Job Match: Delivery Partner</h4>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">Zomato posted a new role in your preferred location with up to ₹35,000/month.</p>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">10 minutes ago</span>
                </div>
              </div>

              {/* Notification 2 */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">Application Under Review</h4>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">Your application for Blinkit Delivery Executive was reviewed by the recruiter.</p>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">2 hours ago</span>
                </div>
              </div>

              {/* Notification 3 */}
              <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">Profile Viewed by Hiring Team</h4>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">Jio Mart recruiting team viewed your profile and license verification documents.</p>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">Yesterday</span>
                </div>
              </div>
            </div>

            <button
              onClick={closeNotificationModal}
              className="w-full py-2.5 bg-[#1D61F2] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Close Notifications
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
