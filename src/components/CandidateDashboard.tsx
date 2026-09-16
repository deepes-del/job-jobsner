import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Calendar, MapPin, Briefcase, GraduationCap, 
  IndianRupee, Languages, Bike, FileText, CheckCircle, 
  AlertCircle, Edit2, LogOut, Phone, Mail, Sparkles, AlertTriangle, Upload,
  Search, SlidersHorizontal, ArrowUpDown, Clock, Building, UserCheck, ShieldAlert,
  FileMinus, ExternalLink, ChevronRight, X, Info, RefreshCw,
  RotateCcw, Heart, ThumbsUp, ThumbsDown, ClipboardList, Bookmark,
  Shield, Store, Car, ChevronDown, Bell, Package, Users, BarChart2
} from 'lucide-react';
import { Candidate, Profile } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import FlowerBlastAnimation from './FlowerBlastAnimation';
import CandidateProfileEdit from './CandidateProfileEdit';

interface CandidateDashboardProps {
  candidate: Candidate;
  token: string | null;
  activeTab?: 'overview' | 'find_jobs' | 'applications' | 'saved';
  onTabChange?: (tab: 'overview' | 'find_jobs' | 'applications' | 'saved') => void;
  onEditProfile: () => void;
  onLogout: () => void;
  onManageDocuments: () => void;
  onUpdateProfile?: (updatedProfile: Profile) => void;
}

export default function CandidateDashboard({ 
  candidate, 
  token,
  activeTab: externalActiveTab,
  onTabChange,
  onEditProfile, 
  onLogout,
  onManageDocuments,
  onUpdateProfile
}: CandidateDashboardProps) {
  const { profile, mobile, email } = candidate;

  // Navigation state
  const [internalActiveTab, setInternalActiveTab] = React.useState<'overview' | 'find_jobs' | 'applications' | 'saved'>('find_jobs');
  const activeTab = externalActiveTab || internalActiveTab;

  const setActiveTab = (tab: 'overview' | 'find_jobs' | 'applications' | 'saved') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

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
      } catch (err) {}
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
  const [selectedCategory, setSelectedCategory] = React.useState('All'); // 'All' | 'Delivery Jobs' | 'Warehouse / Picker&Packer'
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
  const [sortOrder, setSortOrder] = React.useState('newest'); // 'newest' | 'oldest'

  // Celebratory Flower Animation State
  const [showFlowerAnimation, setShowFlowerAnimation] = React.useState(false);
  const [flowerJobDetails, setFlowerJobDetails] = React.useState<{ title: string; companyName: string }>({ title: '', companyName: '' });

  // Swipe vs Grid View State
  const [viewMode] = React.useState<'swipe' | 'grid'>('grid');
  const [currentSwipeIndex, setCurrentSwipeIndex] = React.useState(0);
  const [swipeTrigger, setSwipeTrigger] = React.useState<'left' | 'right' | null>(null);
  const [swipedJobHistory, setSwipedJobHistory] = React.useState<number[]>([]); // Track index history for rewind capability
  const [dragOffset, setDragOffset] = React.useState(0);

  // Reset swipe card index when any filter changes
  React.useEffect(() => {
    setCurrentSwipeIndex(0);
    setSwipedJobHistory([]);
    setSwipeTrigger(null);
  }, [searchQuery, selectedCategory, selectedState, selectedCity, selectedSalary, selectedEmpType, selectedExperience, selectedShift, selectedBike, selectedLicense, selectedJoining, selectedGender, sortOrder]);

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

  // Status alerts & Complete verification states
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);
  const [missingRequirements, setMissingRequirements] = React.useState<{ profile: string[], docs: string[] } | null>(null);

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

        // Cross-platform sync fallback: Query Supabase directly on client if available
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

            if (!jobsRes.error && supaJobs && supaJobs.length > 0) {
              const jobMap = new Map<string, any>();
              jobsList.forEach((j: any) => {
                if (j.id) jobMap.set(String(j.id), j);
              });
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

  // Live Realtime Notification State (Syncs with Android & Server broadcasts)
  const [liveNotification, setLiveNotification] = React.useState<{ title: string; message: string; type?: string } | null>(null);

  React.useEffect(() => {
    if (liveNotification) {
      const timer = setTimeout(() => setLiveNotification(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [liveNotification]);

  // Load stats & details on mount and subscribe to Realtime broadcast
  React.useEffect(() => {
    fetchJobs();
    fetchMyApplications();
    fetchDocuments();

    const handleRefresh = () => {
      fetchJobs();
    };
    window.addEventListener('refresh-jobs', handleRefresh);

    let realtimeSubscription: any = null;
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const channel = supabase.channel('jobsner_realtime')
          .on('broadcast', { event: 'new_job' }, (payload: any) => {
            fetchJobs();
            if (payload?.payload?.title) {
              setLiveNotification({
                title: `🚨 New Job Posted: ${payload.payload.title}`,
                message: `${payload.payload.companyName || 'Company'} is hiring in ${payload.payload.city || 'your area'}! Salary: ${payload.payload.salary || 'Competitive'}.`,
                type: 'job'
              });
            }
          })
          .on('broadcast', { event: 'notification' }, (payload: any) => {
            const notif = payload?.payload;
            if (notif) {
              const forMe = !notif.recipientId || notif.recipientId === 'ALL' || notif.recipientId === candidate?.id;
              const forRole = !notif.targetRole || notif.targetRole === 'ALL' || notif.targetRole === 'CANDIDATE';
              if (forMe && forRole) {
                setLiveNotification({
                  title: notif.title || 'Notification',
                  message: notif.message || '',
                  type: notif.type
                });
                fetchJobs();
                fetchMyApplications();
              }
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
            fetchJobs();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
            fetchMyApplications();
          })
          .subscribe();

        realtimeSubscription = channel;
      }
    } catch (err) {
      console.warn('[Supabase Realtime Subscription Error]', err);
    }

    return () => {
      window.removeEventListener('refresh-jobs', handleRefresh);
      if (realtimeSubscription && isSupabaseConfigured()) {
        try {
          const supabase = getSupabase();
          supabase.removeChannel(realtimeSubscription);
        } catch (e) {}
      }
    };
  }, [fetchJobs, fetchMyApplications, fetchDocuments, candidate?.id]);

  // Profile checklist
  const checklist = [
    { key: 'fullName', label: 'Full Name', done: !!profile.fullName?.trim() },
    { key: 'age', label: 'Age', done: typeof profile.age === 'number' || (!!profile.age && String(profile.age).trim() !== '') },
    { key: 'gender', label: 'Gender Selection', done: !!profile.gender },
    { key: 'pincode', label: '6-digit Pincode', done: !!profile.pincode?.trim() },
  ];

  const completedCount = checklist.filter((item) => item.done).length;
  const totalCount = checklist.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);
  const isProfileIncomplete = completionPercentage < 100;

  // Documents checklist
  const documentChecklist: any[] = [];

  const totalDocs = 0;
  const uploadedDocsCount = 0;
  const isDocsIncomplete = false;

  // Dynamically populated filter option arrays
  const uniqueStates = React.useMemo(() => {
    const states = activeJobs.map(j => j.state).filter(Boolean);
    return ['All', ...Array.from(new Set(states))];
  }, [activeJobs]);

  const uniqueCities = React.useMemo(() => {
    const cities = activeJobs
      .filter(j => selectedState === 'All' || (j.state || '').toLowerCase() === selectedState.toLowerCase())
      .map(j => j.city)
      .filter(Boolean);
    return ['All', ...Array.from(new Set(cities))];
  }, [activeJobs, selectedState]);

  // Client-side dynamic instant-search filtering & sorting
  const filteredJobsList = React.useMemo(() => {
    let result = [...activeJobs];

    // Filter active jobs (Exclude closed, deleted, inactive, expired, rejected)
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
      result = result.filter(j => j.employmentType === selectedEmpType);
    }

    // Experience Limit
    if (selectedExperience !== 'All') {
      const maxExp = parseInt(selectedExperience, 10);
      result = result.filter(j => (j.experienceRequired || 0) <= maxExp);
    }

    // Shift
    if (selectedShift !== 'All') {
      result = result.filter(j => j.shift === selectedShift);
    }

    // Bike requirement
    if (selectedBike !== 'All') {
      result = result.filter(j => j.bikeRequired === selectedBike);
    }

    // Driving License
    if (selectedLicense !== 'All') {
      result = result.filter(j => j.drivingLicenseRequired === selectedLicense);
    }

    // Immediate Joining
    if (selectedJoining !== 'All') {
      result = result.filter(j => j.immediateJoining === selectedJoining);
    }

    // Gender
    if (selectedGender !== 'All') {
      result = result.filter(j => j.genderPreference === selectedGender);
    }

    // Sorting
    if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [activeJobs, searchQuery, selectedState, selectedCity, selectedSalary, selectedEmpType, selectedExperience, selectedShift, selectedBike, selectedLicense, selectedJoining, selectedGender, sortOrder]);

  // Swipe Action Helpers
  const handleSwipeLeft = () => {
    setSwipeTrigger('left');
    setTimeout(() => {
      setSwipedJobHistory(prev => [...prev, currentSwipeIndex]);
      setCurrentSwipeIndex(prev => prev + 1);
      setSwipeTrigger(null);
    }, 200);
  };

  const handleSwipeRight = async (job: any) => {
    setSwipeTrigger('right');
    await handleApplyNow(job);
    setTimeout(() => {
      setSwipedJobHistory(prev => [...prev, currentSwipeIndex]);
      setCurrentSwipeIndex(prev => prev + 1);
      setSwipeTrigger(null);
    }, 200);
  };

  const handleRewind = () => {
    if (swipedJobHistory.length > 0) {
      const prevHistory = [...swipedJobHistory];
      const prevIndex = prevHistory.pop();
      setSwipedJobHistory(prevHistory);
      if (prevIndex !== undefined) {
        setCurrentSwipeIndex(prevIndex);
      }
      setSwipeTrigger(null);
    }
  };

  // Apply Action Trigger
  const handleApplyNow = async (job: any) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setMissingRequirements(null);

    const alreadyApplied = myApplications.some(
      app => (String(app.jobId) === String(job.id) || String(app.job_id) === String(job.id)) && app.withdrawStatus !== 'Withdrawn'
    );
    if (alreadyApplied) {
      setSubmitError('You have already applied for this position.');
      return;
    }

    // Check if the 4 key fields are complete
    const isNameDone = !!profile.fullName?.trim();
    const isAgeDone = typeof profile.age === 'number' || (!!profile.age && String(profile.age).trim() !== '');
    const isGenderDone = !!profile.gender;
    const isPincodeDone = !!profile.pincode?.trim() && /^\d{6}$/.test(profile.pincode.trim());

    if (!isNameDone || !isAgeDone || !isGenderDone || !isPincodeDone) {
      // Open the Instant Apply popup to fill missing fields
      setInstantFullName(profile.fullName || '');
      setInstantAge(profile.age ? String(profile.age) : '');
      setInstantGender(profile.gender || '');
      setInstantPincode(profile.pincode || '');
      setInstantError(null);
      setJobForInstantApply(job);
      return;
    }

    // Submit application immediately
    setApplyingJobId(job.id);
    try {
      const response = await fetch(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId: job.id })
      });

      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error || 'Failed to submit application.');
        return;
      }

      setSubmitSuccess('Application submitted successfully.');
      setFlowerJobDetails({ title: job.title, companyName: job.companyName });
      setShowFlowerAnimation(true);
      fetchMyApplications();
      fetchJobs();

      // Close details modal if open
      if (selectedJob) {
        setSelectedJob(null);
      }

      // Automatically clear success banner after 5s
      setTimeout(() => {
        setSubmitSuccess(null);
      }, 5000);
    } catch (err) {
      console.error(err);
      setSubmitError('A connection issue occurred. Please check your network and apply again.');
    } finally {
      setApplyingJobId(null);
    }
  };

  // Submit Fast Apply details & then apply
  const handleInstantApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstantError(null);

    if (!instantFullName.trim()) {
      setInstantError('Full Name is required.');
      return;
    }

    const parsedAge = instantAge ? parseInt(instantAge, 10) : undefined;
    if (parsedAge === undefined || isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
      setInstantError('Please enter a valid age between 1 and 120.');
      return;
    }

    if (!instantGender) {
      setInstantError('Please select your gender.');
      return;
    }

    if (!instantPincode || !/^\d{6}$/.test(instantPincode)) {
      setInstantError('Pincode must be a 6-digit number.');
      return;
    }

    setInstantLoading(true);

    try {
      // 1. Save profile information
      const updatedProfile: Profile = {
        fullName: instantFullName.trim(),
        age: parsedAge,
        gender: instantGender,
        pincode: instantPincode,
      };

      const profileResponse = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile)
      });

      const profileData = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error(profileData.error || 'Failed to update profile details.');
      }

      // Update local state in parent App component
      if (onUpdateProfile) {
        onUpdateProfile(profileData.candidate.profile);
      }

      // 2. Submit job application
      const applyResponse = await fetch(`/api/jobs/${jobForInstantApply.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId: jobForInstantApply.id })
      });

      const applyData = await applyResponse.json();
      if (!applyResponse.ok) {
        throw new Error(applyData.error || 'Failed to submit application.');
      }

      setSubmitSuccess('Application submitted successfully.');
      if (jobForInstantApply) {
        setFlowerJobDetails({ title: jobForInstantApply.title, companyName: jobForInstantApply.companyName });
        setShowFlowerAnimation(true);
      }
      setJobForInstantApply(null);
      fetchMyApplications();
      fetchJobs();

      if (selectedJob) {
        setSelectedJob(null);
      }

      setTimeout(() => {
        setSubmitSuccess(null);
      }, 5000);
    } catch (err: any) {
      setInstantError(err.message || 'An error occurred during fast apply.');
    } finally {
      setInstantLoading(false);
    }
  };

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    fetch(`/api/jobs/${job.id}/view`, { method: 'POST' }).catch(err => {
      console.error('Error tracking job view:', err);
    });
  };

  // Withdraw Action Trigger
  const handleWithdrawApp = async (applicationId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this application? This will permanently cancel your candidacy for this opening.')) {
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    setWithdrawingAppId(applicationId);

    try {
      const response = await fetch(`/api/applications/${applicationId}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error || 'Failed to withdraw application.');
        return;
      }

      setSubmitSuccess('Application withdrawn successfully.');
      fetchMyApplications();
      fetchJobs();

      // Update active modal status if open
      if (selectedApp && selectedApp.id === applicationId) {
        setSelectedApp(prev => prev ? { ...prev, currentStatus: 'Withdrawn', withdrawStatus: 'Withdrawn' } : null);
      }

      setTimeout(() => {
        setSubmitSuccess(null);
      }, 5000);
    } catch (err) {
      console.error(err);
      setSubmitError('A connection issue occurred. Could not withdraw application.');
    } finally {
      setWithdrawingAppId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
      id="candidate-portal-wrapper"
    >
      {/* Live Realtime Notification Banner (Syncs with Android & Web) */}
      <AnimatePresence>
        {liveNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="p-4 bg-gradient-to-r from-orange-950/90 via-slate-900/90 to-amber-950/90 border-2 border-orange-500/50 text-white rounded-2xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-md relative overflow-hidden"
            id="candidate-live-notification-banner"
          >
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-orange-500 animate-pulse" />
            <div className="flex items-center gap-3.5 pl-2">
              <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30 shrink-0">
                <Sparkles className="w-5 h-5 animate-spin text-orange-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-orange-300 flex items-center gap-2">
                  {liveNotification.title}
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                    Live Realtime
                  </span>
                </h4>
                <p className="text-xs text-slate-200 mt-0.5 font-medium leading-relaxed">
                  {liveNotification.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLiveNotification(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Banner (Matching Reference Image) */}
      <div 
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#FFF6F0] via-[#FFF3EB] to-[#FFEAE0] border border-orange-100 p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6"
        id="dashboard-welcome-banner"
      >
        {/* Left Section: Candidate Profile & Greeting */}
        <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
          <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white font-black text-2xl shrink-0">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt={profile.fullName || candidate.fullName} className="w-full h-full object-cover" referrerpolicy="no-referrer" />
            ) : (
              <span className="text-2xl font-black">{profile.fullName?.[0]?.toUpperCase() || candidate.fullName?.[0]?.toUpperCase() || 'D'}</span>
            )}
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Welcome back, {profile.fullName?.toLowerCase() || candidate.fullName?.toLowerCase() || 'deepesh'}! 👋
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm font-semibold mt-1">
              Discover verified jobs and take the next step in your career
            </p>
            
            <div className="flex items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-800 border border-orange-200/70 shadow-2xs">
                <Briefcase className="w-3.5 h-3.5 text-[#FF5500]" />
                Job Seeker
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-800 border border-orange-200/70 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-[#FF5500]" />
                {profile.city || profile.locality || 'Bengal'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Quote (Matching Reference Image) */}
        <div className="hidden lg:flex flex-col items-center text-center px-4 relative z-10">
          <h3 className="text-lg font-black text-slate-900 tracking-tight italic">
            “Better Jobs<br />Brighter Futures”
          </h3>
          <div className="w-12 h-1 bg-[#FF5500] rounded-full mt-2" />
        </div>

        {/* Right Section: Professional Hero Job-Seeker Cutout Graphic (Matching Reference Image) */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-tr from-amber-400 via-orange-400 to-orange-500">
            <img 
              src="/job_seeker_hero.png" 
              alt="Professional Job Seeker" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Error & Success Messages */}
      <AnimatePresence mode="wait">
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-150 rounded-xl text-xs font-bold text-red-700 flex items-start gap-2"
            id="candidate-error-banner"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </motion.div>
        )}
        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2"
            id="candidate-success-banner"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{submitSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER TAB 1: OVERVIEW & JOBSNER PROFILE VIEW */}
      {activeTab === 'overview' && (
        <motion.div
          key="overview-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          id="tab-overview-content"
        >
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
        </motion.div>
      )}

      {/* RENDER TAB 2: FIND JOBS PAGE */}
      {activeTab === 'find_jobs' && (
        <motion.div
          key="find-jobs-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-6"
          id="tab-find-jobs-content"
        >
          {/* Search Bar Container (Matching Reference Image) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-2.5 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs by title, company, skills, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-transparent text-slate-800 text-xs sm:text-sm font-bold focus:outline-none placeholder:text-slate-400"
                id="jobs-search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Location selector & Search Button */}
            <div className="flex flex-col sm:flex-row items-center gap-2 border-t md:border-t-0 md:border-l border-gray-200 pt-2.5 md:pt-0 pl-0 md:pl-3 w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-2.5 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer hover:bg-gray-50 rounded-xl transition-colors w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Bengaluru, Karnataka</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>

              <button
                onClick={() => {}}
                className="w-full sm:w-auto bg-[#FF5500] hover:bg-orange-600 text-white font-extrabold px-7 py-3 rounded-xl shadow-xs transition-all text-xs sm:text-sm cursor-pointer shrink-0"
              >
                Search Jobs
              </button>
            </div>
          </div>

          {/* Category Quick Filter Pills (Matching Reference Image) */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`py-2.5 px-5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 shadow-xs ${
                selectedCategory === 'All'
                  ? 'bg-[#1E293B] text-white'
                  : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Openings
            </button>

            <button
              onClick={() => setSelectedCategory('Delivery Jobs')}
              className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 border flex items-center gap-2 ${
                selectedCategory === 'Delivery Jobs'
                  ? 'bg-[#FF5500] text-white border-[#FF5500]'
                  : 'bg-white text-slate-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Bike className="w-4 h-4" /> Delivery Jobs
            </button>

            <button
              onClick={() => setSelectedCategory('Warehouse / Picker&Packer')}
              className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 border flex items-center gap-2 ${
                selectedCategory === 'Warehouse / Picker&Packer'
                  ? 'bg-[#FF5500] text-white border-[#FF5500]'
                  : 'bg-white text-slate-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Package className="w-4 h-4" /> Warehouse / Picker & Packer
            </button>

            <button
              onClick={() => setSelectedCategory('Security Jobs')}
              className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 border flex items-center gap-2 ${
                selectedCategory === 'Security Jobs'
                  ? 'bg-[#FF5500] text-white border-[#FF5500]'
                  : 'bg-white text-slate-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-4 h-4" /> Security Jobs
            </button>

            <button
              onClick={() => setSelectedCategory('Housekeeping')}
              className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 border flex items-center gap-2 ${
                selectedCategory === 'Housekeeping'
                  ? 'bg-[#FF5500] text-white border-[#FF5500]'
                  : 'bg-white text-slate-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Housekeeping
            </button>

            <button
              onClick={() => setSelectedCategory('Retail')}
              className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 border flex items-center gap-2 ${
                selectedCategory === 'Retail'
                  ? 'bg-[#FF5500] text-white border-[#FF5500]'
                  : 'bg-white text-slate-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Store className="w-4 h-4" /> Retail
            </button>

            <button
              onClick={() => setSelectedCategory('Driver')}
              className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 border flex items-center gap-2 ${
                selectedCategory === 'Driver'
                  ? 'bg-[#FF5500] text-white border-[#FF5500]'
                  : 'bg-white text-slate-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Car className="w-4 h-4" /> Driver
            </button>

            <button className="py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 border bg-white text-slate-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5">
              More <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Results Header and Cards Section (Matching Reference Image) */}
          <div id="jobs-grid-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Found <span className="text-[#FF5500]">{filteredJobsList.length}</span> matching jobs
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Jobs from verified companies across India
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-extrabold text-slate-700 shadow-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sort by</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="newest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>

            {loadingJobs ? (
              <div className="py-24 text-center bg-white rounded-2xl border border-gray-200 shadow-xs">
                <RefreshCw className="w-8 h-8 text-[#FF5500] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-wide">Syncing Logistics Dispatch Grid...</p>
              </div>
            ) : filteredJobsList.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-2xl border border-gray-200 shadow-xs" id="empty-jobs-view">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h4 className="font-extrabold text-slate-800 text-sm uppercase">No matching jobs found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed font-medium">
                  Try adjusting your keywords or clearing your search term to see all available openings.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-5 text-xs font-extrabold bg-[#FF5500] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              /* 3-COLUMN DESKTOP JOB CARDS GRID (Matching Reference Image) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobsList.map((job) => {
                  const alreadyApplied = myApplications.some(app => (String(app.jobId) === String(job.id) || String(app.job_id) === String(job.id)) && app.withdrawStatus !== 'Withdrawn');
                  
                  return (
                    <div 
                      key={job.id} 
                      className="p-5 border border-gray-200/90 rounded-2xl bg-white hover:border-orange-300 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
                      id={`job-card-${job.id}`}
                    >
                      <div>
                        {/* Company Logo, Company Name, Posted Date, Status Badge, Saved Heart */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                              {job.companyLogo ? (
                                <img
                                  src={job.companyLogo}
                                  alt={job.companyName}
                                  className="w-full h-full object-contain p-0.5"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Building className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-black uppercase text-[#FF5500] block leading-tight tracking-wide">{job.companyName}</span>
                              <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                                Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase py-1 px-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Active
                            </span>
                            <button
                              onClick={(e) => handleToggleSaveJob(job.id, e)}
                              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                              title={savedJobIds.includes(job.id) ? "Saved" : "Save job"}
                            >
                              <Heart className={`w-4 h-4 transition-colors ${savedJobIds.includes(job.id) ? 'fill-[#FF5500] text-[#FF5500]' : 'text-slate-400 hover:text-[#FF5500]'}`} />
                            </button>
                          </div>
                        </div>

                        {/* Job Title */}
                        <h3 className="font-black text-slate-900 text-base leading-snug tracking-tight line-clamp-1">{job.title}</h3>
                        
                        {/* Location */}
                        <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {job.area ? `${job.area}, ` : ''}{job.city}, {job.state}
                        </p>

                        {/* 2x2 Specs Grid (Matching Reference Image) */}
                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-bold text-slate-800">
                          <div className="p-2.5 bg-slate-50 rounded-xl flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1 flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-slate-400" /> Employment Type
                            </span>
                            <span className="line-clamp-1">{job.employmentType || 'Full Time'}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> Preferred Shift
                            </span>
                            <span className="line-clamp-1">{job.shift || 'Day'}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1 flex items-center gap-1">
                              <BarChart2 className="w-3 h-3 text-slate-400" /> Experience Required
                            </span>
                            <span>{job.experienceRequired === 0 || !job.experienceRequired ? 'Fresher Friendly' : `${job.experienceRequired}+ Yr Exp`}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" /> Open Positions
                            </span>
                            <span>{job.openings || '1'} Opening{job.openings > 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Description clip */}
                        {job.description && (
                          <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed font-medium">
                            {job.description}
                          </p>
                        )}
                      </div>

                      {/* Card Footer: Monthly Salary & Actions */}
                      <div className="mt-5 pt-4 border-t border-gray-150 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none mb-1">Monthly Salary</span>
                          <span className="text-sm font-black text-slate-900">
                            ₹ {job.minSalary ? `${job.minSalary.toLocaleString()} - ${job.maxSalary.toLocaleString()}` : (job.salary || 'Best in Class')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(job)}
                            className="py-2.5 px-3 bg-white hover:bg-gray-50 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-gray-200"
                            id={`view-details-btn-${job.id}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Details
                          </button>
                          
                          {alreadyApplied ? (
                            <span className="py-2.5 px-4 bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-black rounded-xl flex items-center gap-1">
                              Applied ✓
                            </span>
                          ) : job.status === 'Closed' ? (
                            <span className="py-2.5 px-4 bg-gray-100 text-gray-400 border border-gray-200 text-xs font-black rounded-xl">
                              Closed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApplyNow(job)}
                              disabled={applyingJobId === job.id}
                              className="py-2.5 px-4 bg-[#FF5500] hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1"
                              id={`apply-now-btn-${job.id}`}
                            >
                              {applyingJobId === job.id ? 'Applying...' : 'Apply Now'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* RENDER TAB 3: MY APPLICATIONS */}
      {activeTab === 'applications' && (
        <motion.div
          key="applications-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
          id="tab-my-applications-content"
        >
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-5 mb-6 gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-wide uppercase flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-orange-500" /> Active Dispatches Tracking
                </h3>
                <p className="text-xs text-gray-400 mt-1">Real-time dispatcher status audits, application milestones, and withdraw panel.</p>
              </div>
              <span className="bg-orange-50 text-orange-700 border border-orange-100 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                {myApplications.length} Application{myApplications.length !== 1 ? 's' : ''} Record{myApplications.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingApps ? (
              <div className="py-16 text-center text-xs text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-2" />
                Querying application dispatch state...
              </div>
            ) : myApplications.length === 0 ? (
              <div className="py-16 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200" id="empty-applications-view">
                <FileMinus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="font-extrabold text-slate-700 text-sm uppercase">No applied dispatches</h4>
                <p className="text-xs max-w-sm mx-auto mt-2 leading-relaxed">
                  You have not submitted applications for any regional logistics roles yet. Head over to the Find Jobs dispatcher grid to search local openings.
                </p>
                <button
                  onClick={() => setActiveTab('find_jobs')}
                  className="mt-5 text-xs font-black bg-slate-950 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-slate-950/10"
                >
                  Explore Job Ledger
                </button>
              </div>
            ) : (
              <div className="space-y-4" id="applications-list-container">
                {myApplications.map((app, idx) => (
                  <div 
                    key={app.id ? `cand-app-${app.id}` : `cand-app-${idx}-${app.jobId || ''}`}
                    className="p-5 border border-gray-150 rounded-2xl bg-white hover:border-gray-300 transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                    id={`app-item-${app.id || idx}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Company logo branding */}
                      <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {app.companyLogo ? (
                          <img
                            src={app.companyLogo}
                            alt={app.companyName}
                            className="w-full h-full object-contain p-0.5"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Building className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <div>
                        {/* Company & position info */}
                        <span className="text-[10px] font-black uppercase text-orange-600 block leading-tight">{app.companyName}</span>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-snug mt-1">{app.jobTitle}</h4>
                        
                        {/* Date row */}
                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1.5 flex-wrap">
                          <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3 text-gray-400" /> Applied: {new Date(app.appliedDate).toLocaleDateString()}</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 text-gray-400" /> Updated: {new Date(app.lastUpdated).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & actions row */}
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 border-gray-50 pt-3 md:pt-0">
                      <div className="flex flex-col text-left md:text-right">
                        <span className="text-[8px] text-gray-400 font-extrabold uppercase leading-none mb-1">Dispatch Status</span>
                        <span 
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest inline-block text-center border ${
                            app.currentStatus === 'Withdrawn'
                              ? 'bg-red-50 text-red-700 border-red-150'
                              : app.currentStatus === 'Applied'
                              ? 'bg-orange-50 text-orange-700 border-orange-150 animate-pulse'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-150'
                          }`}
                        >
                          {app.currentStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="py-2 px-3 bg-gray-50 hover:bg-gray-100 text-slate-700 text-xs font-bold border border-gray-150 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          id={`view-app-details-${app.id}`}
                        >
                          Details <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        
                        {app.currentStatus === 'Applied' && app.withdrawStatus !== 'Withdrawn' && (
                          <button
                            onClick={() => handleWithdrawApp(app.id)}
                            disabled={withdrawingAppId === app.id}
                            className="py-2 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-bold rounded-xl border border-red-100 transition-all cursor-pointer flex items-center gap-1"
                            id={`withdraw-app-${app.id}`}
                          >
                            {withdrawingAppId === app.id ? 'Withdrawing...' : 'Withdraw'}
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* RENDER TAB 4: SAVED JOBS PAGE */}
      {activeTab === 'saved' && (
        <motion.div
          key="saved-jobs-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-6"
          id="tab-saved-jobs-content"
        >
          <div className="flex items-center justify-between bg-gray-50 border border-gray-150 p-3.5 rounded-2xl">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Heart className="w-4 h-4 text-orange-500 fill-orange-500" />
              Saved Jobs ({activeJobs.filter(j => savedJobIds.includes(j.id)).length})
            </span>
            <button
              onClick={() => setActiveTab('find_jobs')}
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer flex items-center gap-1"
            >
              Browse more jobs <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {activeJobs.filter(j => savedJobIds.includes(j.id)).length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-gray-150 shadow-sm" id="empty-saved-jobs-view">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="font-extrabold text-slate-800 text-sm uppercase">No saved jobs yet</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-2 leading-relaxed">
                Click the heart icon on any job card to save it for quick review and one-tap application.
              </p>
              <button
                onClick={() => setActiveTab('find_jobs')}
                className="mt-5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-orange-600/10"
              >
                Explore Open Jobs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeJobs.filter(j => savedJobIds.includes(j.id)).map((job) => {
                const alreadyApplied = myApplications.some(app => (String(app.jobId) === String(job.id) || String(app.job_id) === String(job.id)) && app.withdrawStatus !== 'Withdrawn');
                const isDraft = String(job.status || '').toLowerCase() === 'draft';
                return (
                  <div 
                    key={job.id} 
                    className="p-5 border border-gray-150 rounded-2xl bg-white hover:border-orange-300 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
                    id={`saved-job-card-${job.id}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {job.companyLogo ? (
                              <img
                                src={job.companyLogo}
                                alt={job.companyName}
                                className="w-full h-full object-contain p-0.5"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Building className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-orange-600 block leading-tight">{job.companyName}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block mt-0.5">
                              Posted {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isDraft ? (
                            <span className="text-[9px] font-black tracking-widest uppercase py-0.5 px-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Draft Listing
                            </span>
                          ) : (
                            <span className={`text-[9px] font-black tracking-widest uppercase py-0.5 px-2 rounded-full ${job.status === 'Closed' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                              {job.status === 'Closed' ? 'Closed' : 'Active'}
                            </span>
                          )}
                          <button
                            onClick={(e) => handleToggleSaveJob(job.id, e)}
                            className="p-1.5 rounded-full hover:bg-gray-100 text-orange-600 cursor-pointer"
                            title="Remove from saved"
                          >
                            <Heart className="w-4 h-4 fill-orange-500 text-orange-500" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1">{job.title}</h4>
                      <p className="text-[11px] font-bold text-gray-400 mt-1 flex items-center gap-1 uppercase">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {job.area ? `${job.area}, ` : ''}{job.city}, {job.state}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold text-slate-700">
                        <div className="p-2 bg-gray-50 rounded-lg flex flex-col">
                          <span className="text-[8px] text-gray-400 uppercase leading-none mb-1">Employment Type</span>
                          <span className="line-clamp-1">{job.employmentType || 'Full Time'}</span>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg flex flex-col">
                          <span className="text-[8px] text-gray-400 uppercase leading-none mb-1">Preferred Shift</span>
                          <span className="line-clamp-1">{job.shift || 'Day Shift'}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-2 border-t border-gray-50 pt-2.5">
                        {job.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                      <div className="text-xs font-black text-slate-800 shrink-0">
                        <span className="text-[9px] font-bold text-gray-400 block uppercase leading-none mb-1">Monthly Salary</span>
                        ₹ {job.minSalary ? `${job.minSalary.toLocaleString()} - ${job.maxSalary.toLocaleString()}` : (job.salary || 'Best in Class')}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(job)}
                          className="py-2 px-2.5 bg-gray-50 hover:bg-gray-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-gray-150"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Details
                        </button>
                        {alreadyApplied ? (
                          <span className="py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-150 text-xs font-black rounded-xl">
                            Applied ✓
                          </span>
                        ) : job.status === 'Closed' ? (
                          <span className="py-2 px-3 bg-gray-100 text-gray-400 border border-gray-150 text-xs font-black rounded-xl">
                            Closed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyNow(job)}
                            disabled={applyingJobId === job.id}
                            className="py-2 px-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md shadow-orange-600/10 flex items-center gap-1"
                          >
                            {applyingJobId === job.id ? 'Applying...' : 'Apply Now'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* MODAL 1: JOB DETAILS PREVIEW */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="job-details-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-100 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative"
              id="job-details-modal-content"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedJob(null)}
                className="absolute right-5 top-5 w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-slate-900 cursor-pointer shadow-sm transition-all"
                id="close-job-modal-btn"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Branding and Title */}
              <div className="flex items-start gap-4 border-b border-gray-100 pb-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                  {selectedJob.companyLogo ? (
                    <img
                      src={selectedJob.companyLogo}
                      alt={selectedJob.companyName}
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Building className="w-7 h-7 text-gray-400" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-orange-600 tracking-wide block">{selectedJob.companyName}</span>
                  <h3 className="text-lg font-black text-slate-900 leading-snug mt-1 pr-8">{selectedJob.title}</h3>
                  <p className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-1 uppercase">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {selectedJob.area ? `${selectedJob.area}, ` : ''}{selectedJob.city}, {selectedJob.state}
                  </p>
                </div>
              </div>

              {/* Multi-section content container */}
              <div className="space-y-6 text-xs text-slate-700 leading-relaxed font-medium">
                
                {/* Section 1: Detailed description */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2.5">Job Description</h4>
                  <p className="whitespace-pre-line text-slate-600 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl">
                    {selectedJob.description}
                  </p>
                </div>

                {/* Section 2: Key Responsibilities */}
                {selectedJob.responsibilities && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2.5">Key Responsibilities</h4>
                    <p className="whitespace-pre-line text-slate-600 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl">
                      {selectedJob.responsibilities}
                    </p>
                  </div>
                )}

                {/* Section 3: Requirements */}
                {(selectedJob.educationRequired || selectedJob.experienceRequired !== undefined) && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2.5">Job Requirements & Vetting</h4>
                    <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-2xl space-y-2 text-slate-600">
                      <p><strong>Education:</strong> {selectedJob.educationRequired || 'No minimal education requirement'}</p>
                      <p><strong>Experience:</strong> {selectedJob.experienceRequired === 0 ? 'Freshers / No past experience required' : `${selectedJob.experienceRequired}+ Year${selectedJob.experienceRequired === 1 ? '' : 's'} required`}</p>
                      {selectedJob.genderPreference && <p><strong>Gender Preference:</strong> {selectedJob.genderPreference}</p>}
                    </div>
                  </div>
                )}

                {/* Section 4: Benefits */}
                {selectedJob.benefits && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2.5">Benefits & Perks</h4>
                    <p className="whitespace-pre-line text-slate-600 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl">
                      {selectedJob.benefits}
                    </p>
                  </div>
                )}

                {/* Section 5: Dispatch details grid */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Compliance & Logistics Metrics</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-slate-700">
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">Employment</span>
                      <span className="font-extrabold">{selectedJob.employmentType || 'Full Time'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">Salary Type</span>
                      <span className="font-extrabold">{selectedJob.salaryType || 'Monthly'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">Shift Hours</span>
                      <span className="font-extrabold">{selectedJob.shift || 'Day Shift'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">Bike Required?</span>
                      <span className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] inline-block mt-0.5 ${selectedJob.bikeRequired === 'Yes' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {selectedJob.bikeRequired || 'No'}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">License Required?</span>
                      <span className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] inline-block mt-0.5 ${selectedJob.drivingLicenseRequired === 'Yes' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {selectedJob.drivingLicenseRequired || 'No'}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">Immediate Joining?</span>
                      <span className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] inline-block mt-0.5 ${selectedJob.immediateJoining === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                        {selectedJob.immediateJoining || 'No'}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">Open Positions</span>
                      <span className="font-extrabold">{selectedJob.openings || '1'} Available</span>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">Age Limits</span>
                      <span className="font-extrabold">{selectedJob.ageLimitMin ? `${selectedJob.ageLimitMin} - ${selectedJob.ageLimitMax}` : '18 - 45'} Years</span>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">Recruiter Agent</span>
                      <span className="font-extrabold text-slate-500 italic">Vetted Logistics Broker</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between gap-4">
                <div className="text-slate-800 font-black">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none mb-1">Total Compensation Range</span>
                  <span className="text-base sm:text-lg">
                    ₹ {selectedJob.minSalary ? `${selectedJob.minSalary.toLocaleString()} - ${selectedJob.maxSalary.toLocaleString()}` : (selectedJob.salary || 'Salary Disclosed on Vetting Call')}
                  </span>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer border border-gray-150"
                  >
                    Cancel
                  </button>

                  {myApplications.some(app => (String(app.jobId) === String(selectedJob.id) || String(app.job_id) === String(selectedJob.id)) && app.withdrawStatus !== 'Withdrawn') ? (
                    <span className="py-2.5 px-5 bg-emerald-50 text-emerald-700 border border-emerald-150 text-xs font-black rounded-xl flex items-center">
                      Applied Verified ✓
                    </span>
                  ) : selectedJob.status === 'Closed' ? (
                    <span className="py-2.5 px-5 bg-gray-100 text-gray-400 border border-gray-150 text-xs font-black rounded-xl">
                      Listing Closed
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApplyNow(selectedJob)}
                      disabled={applyingJobId === selectedJob.id}
                      className="py-2.5 px-5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-600/15"
                      id={`modal-apply-btn-${selectedJob.id}`}
                    >
                      {applyingJobId === selectedJob.id ? 'Submitting...' : 'Apply Now'}
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: APPLICATION TIMELINE DETAILS */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="app-details-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-100 rounded-3xl w-full max-w-xl shadow-2xl p-6 sm:p-8 relative"
              id="app-details-modal-content"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedApp(null)}
                className="absolute right-5 top-5 w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-slate-900 cursor-pointer shadow-sm transition-all"
                id="close-app-modal-btn"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-base font-black text-slate-900 border-b border-gray-100 pb-4 mb-5 uppercase tracking-wide flex items-center gap-2">
                <Info className="w-5 h-5 text-orange-500" /> Dispatch Audit Details
              </h3>

              {/* Job Summary box */}
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl mb-6">
                <span className="text-[9px] font-black uppercase text-orange-600 block leading-tight">{selectedApp.companyName}</span>
                <h4 className="font-extrabold text-slate-900 text-sm mt-1">{selectedApp.jobTitle}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {selectedApp.jobCity && selectedApp.jobState ? `${selectedApp.jobCity}, ${selectedApp.jobState}` : 'Regional Logistics Center'}
                </p>
              </div>

              {/* Application Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700 mb-6 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Application Date</span>
                  <span>{new Date(selectedApp.appliedDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Last Activity Audit</span>
                  <span>{new Date(selectedApp.lastUpdated).toLocaleDateString()}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-100">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Current Dispatch Status</span>
                  <span className={`px-2.5 py-0.5 border text-[9px] font-extrabold uppercase tracking-widest rounded-full ${selectedApp.currentStatus === 'Withdrawn' ? 'bg-red-50 text-red-700 border-red-150' : 'bg-orange-50 text-orange-700 border-orange-150'}`}>
                    {selectedApp.currentStatus}
                  </span>
                </div>
              </div>

              {/* Dynamic Status Progress Flow */}
              <div className="mb-6">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-4">Application Progress Flow</h4>
                {selectedApp.currentStatus === 'Withdrawn' ? (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-xl flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold uppercase text-[10px]">Application Withdrawn</p>
                      <p className="text-[11px] leading-relaxed mt-1 font-medium text-red-600">You have withdrawn your application. No further action will be taken.</p>
                    </div>
                  </div>
                ) : selectedApp.currentStatus === 'Rejected' ? (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <div>
                      <p className="font-extrabold uppercase text-[10px]">Application Reviewed</p>
                      <p className="text-[11px] leading-relaxed mt-1 font-medium text-red-600">The recruiter has reviewed your application and decided not to move forward with your profile at this time.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between relative mt-2 px-2">
                    {/* Background Line */}
                    <div className="absolute top-[13px] left-8 right-8 h-0.5 bg-gray-200 -z-10" />
                    
                    {[
                      { id: 'Applied', label: 'Applied' },
                      { id: 'Shortlisted', label: 'Shortlisted' },
                      { id: 'Interview Scheduled', label: 'Interview' },
                      { id: 'Selected', label: 'Selected' },
                      { id: 'Hired', label: 'Hired' }
                    ].map((step, idx) => {
                      // Determine status index in progression
                      const statuses = [
                        'Applied', 'Contacted', 'Shortlisted', 'Interview Scheduled', 
                        'Interview Completed', 'Selected', 'Hired'
                      ];
                      const currentIdx = statuses.indexOf(selectedApp.currentStatus);
                      
                      let isDone = false;
                      let isCurrent = false;

                      if (selectedApp.currentStatus === 'Hired') {
                        isDone = true;
                        isCurrent = idx === 4;
                      } else if (idx === 0) {
                        isDone = true;
                        isCurrent = selectedApp.currentStatus === 'Applied';
                      } else if (idx === 1) {
                        isDone = currentIdx >= 1; // Contacted, Shortlisted, etc
                        isCurrent = selectedApp.currentStatus === 'Shortlisted' || selectedApp.currentStatus === 'Contacted';
                      } else if (idx === 2) {
                        isDone = currentIdx >= 3; // Interview Scheduled, etc
                        isCurrent = selectedApp.currentStatus === 'Interview Scheduled' || selectedApp.currentStatus === 'Interview Completed';
                      } else if (idx === 3) {
                        isDone = currentIdx >= 5; // Selected, etc
                        isCurrent = selectedApp.currentStatus === 'Selected';
                      } else if (idx === 4) {
                        isDone = selectedApp.currentStatus === 'Hired';
                        isCurrent = selectedApp.currentStatus === 'Hired';
                      }

                      return (
                        <div key={step.id} className="flex flex-col items-center flex-1 text-center">
                          <div 
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                              isDone 
                                ? 'bg-orange-600 border-orange-600 text-white shadow-sm shadow-orange-600/25' 
                                : 'bg-white border-gray-200 text-gray-400'
                            } ${isCurrent ? 'ring-4 ring-orange-50' : ''}`}
                          >
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[9px] font-black uppercase mt-1.5 block tracking-tight ${isCurrent ? 'text-orange-600' : isDone ? 'text-slate-800' : 'text-gray-400'}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Audit History List */}
              <div className="border-t border-gray-100 pt-5 mt-6">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Status Audit History</h4>
                {loadingTimeline ? (
                  <div className="py-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                    Syncing history...
                  </div>
                ) : appTimeline.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic">No previous status updates recorded. Application is currently in "Applied" state.</p>
                ) : (
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                    {appTimeline.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-2.5 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 text-[11px]">
                            Status changed from <span className="text-gray-400">{log.previousStatus}</span> to <span className="text-orange-600">{log.newStatus}</span>
                          </p>
                          <p className="text-[9px] text-gray-400 mt-0.5">
                            Changed by {log.changedBy} on {new Date(log.changedDate).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-black rounded-xl shadow-lg cursor-pointer text-center"
                >
                  Close Audit Sheet
                </button>
                
                {selectedApp.currentStatus === 'Applied' && selectedApp.withdrawStatus !== 'Withdrawn' && (
                  <button
                    onClick={() => handleWithdrawApp(selectedApp.id)}
                    disabled={withdrawingAppId === selectedApp.id}
                    className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold rounded-xl cursor-pointer shrink-0 transition-all"
                  >
                    Withdraw Application
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: INCOMPLETE CHECKLIST ERROR OVERLAY */}
      <AnimatePresence>
        {missingRequirements && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="incomplete-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-100 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-8 relative"
              id="incomplete-modal-content"
            >
              {/* Close Button */}
              <button
                onClick={() => setMissingRequirements(null)}
                className="absolute right-5 top-5 w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-slate-900 cursor-pointer shadow-sm transition-all"
                id="close-incomplete-modal-btn"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-5">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-black text-slate-900 tracking-tight">Application Blocked: Incomplete Profile</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed font-medium">
                Recruiters require your Full Name, Age, Gender, and Pincode to submit an application. Please resolve the following pending items:
              </p>

              <div className="mt-5 space-y-4 max-h-60 overflow-y-auto pr-1">
                {/* Missing Profile Items */}
                {missingRequirements.profile.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Pending Profile Fields ({missingRequirements.profile.length})
                    </span>
                    <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl space-y-1.5 text-slate-700 text-xs font-semibold">
                      {missingRequirements.profile.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-orange-500 font-bold">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Docs */}
                {missingRequirements.docs.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Missing Document Vault Files ({missingRequirements.docs.length})
                    </span>
                    <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-1.5 text-slate-700 text-xs font-semibold">
                      {missingRequirements.docs.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-5 border-t border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => setMissingRequirements(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>

                {missingRequirements.profile.length > 0 ? (
                  <button
                    onClick={() => {
                      setMissingRequirements(null);
                      setActiveTab('overview');
                      onEditProfile();
                    }}
                    className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer text-center shadow-lg shadow-orange-600/10 flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Fill Profile Now
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMissingRequirements(null);
                      onManageDocuments();
                    }}
                    className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer text-center shadow-lg shadow-orange-600/10 flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Vault Now
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: INSTANT FAST APPLY MODAL */}
      <AnimatePresence>
        {jobForInstantApply && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="instant-apply-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-gray-100 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
              id="instant-apply-content"
            >
              <form onSubmit={handleInstantApplySubmit} className="flex flex-col" id="instant-apply-form">
                {/* Header */}
                <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 bg-orange-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold uppercase bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full tracking-wider">Fast Apply Active</span>
                    <button
                      type="button"
                      onClick={() => setJobForInstantApply(null)}
                      className="w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-slate-900 cursor-pointer shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Confirm Your Candidate Details</h3>
                  <p className="text-xs text-gray-400 mt-1 font-medium">To apply for <span className="font-extrabold text-slate-800">{jobForInstantApply.title}</span>, please provide these 4 fields. No documents required.</p>
                </div>

                {/* Body Form */}
                <div className="p-6 sm:p-8 space-y-4">
                  {instantError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100" id="instant-apply-error">
                      ⚠️ {instantError}
                    </div>
                  )}

                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="e.g. John Doe"
                        value={instantFullName}
                        onChange={(e) => setInstantFullName(e.target.value)}
                        id="instant-input-name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Age */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                        Age <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                          <Calendar className="w-4 h-4" />
                        </span>
                        <input
                          type="number"
                          required
                          min="1"
                          max="120"
                          className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                          placeholder="e.g. 25"
                          value={instantAge}
                          onChange={(e) => setInstantAge(e.target.value)}
                          id="instant-input-age"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
                        value={instantGender}
                        onChange={(e) => setInstantGender(e.target.value)}
                        id="instant-input-gender"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="e.g. 560001"
                        value={instantPincode}
                        onChange={(e) => setInstantPincode(e.target.value.replace(/\D/g, ''))}
                        id="instant-input-pincode"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setJobForInstantApply(null)}
                    className="py-2 px-4 border border-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={instantLoading}
                    className="py-2 px-5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-orange-600/10 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    id="instant-apply-submit-btn"
                  >
                    {instantLoading ? 'Applying...' : 'Apply Immediately'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebratory Overlay on Successful Job Application */}
      <FlowerBlastAnimation
        show={showFlowerAnimation}
        onComplete={() => setShowFlowerAnimation(false)}
        jobTitle={flowerJobDetails.title}
        companyName={flowerJobDetails.companyName}
      />

      {/* Sticky Bottom Quick Navigation Bar for Mobile / Quick Access */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 py-2 px-4 shadow-lg sm:hidden" id="candidate-bottom-nav">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            onClick={() => { setActiveTab('find_jobs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'find_jobs' ? 'text-orange-600 font-extrabold' : 'text-gray-500 font-medium hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Search className="w-5 h-5" />
              {activeJobs.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[8px] font-black rounded-full px-1 py-0.2 leading-none">
                  {activeJobs.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1">Jobs</span>
          </button>

          <button
            onClick={() => { setActiveTab('applications'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'applications' ? 'text-orange-600 font-extrabold' : 'text-gray-500 font-medium hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Briefcase className="w-5 h-5" />
              {myApplications.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[8px] font-black rounded-full px-1 py-0.2 leading-none">
                  {myApplications.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1">Applies</span>
          </button>

          <button
            onClick={() => { setActiveTab('saved'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'saved' ? 'text-orange-600 font-extrabold' : 'text-gray-500 font-medium hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Heart className={`w-5 h-5 ${activeTab === 'saved' ? 'fill-orange-600' : ''}`} />
              {savedJobIds.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[8px] font-black rounded-full px-1 py-0.2 leading-none">
                  {savedJobIds.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1">Saved</span>
          </button>

          <button
            onClick={() => { setActiveTab('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview' ? 'text-teal-700 font-extrabold' : 'text-gray-500 font-medium hover:text-slate-800'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-1">Profile</span>
          </button>
        </div>
      </div>

    </motion.div>
  );
}
