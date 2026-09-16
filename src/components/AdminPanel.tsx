import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Users, 
  Box, 
  Layers, 
  Settings, 
  Building2, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Globe,
  MapPin,
  Phone,
  Mail,
  FileSpreadsheet,
  Lock,
  LogOut,
  KeyRound
} from 'lucide-react';
import { ExcelCandidateGrid, CandidateGridRow } from './ExcelCandidateGrid';
import CandidatePoolSection from './CandidatePoolSection';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onJobPosted?: () => void;
}

interface RecruiterItem {
  id: string;
  companyName: string;
  companyLogo?: string;
  companyWebsite?: string;
  recruiterName: string;
  designation?: string;
  mobile: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status: string;
  createdAt?: string;
}

interface JobItem {
  id: string;
  recruiterId: string;
  companyName: string;
  companyLogo?: string;
  title: string;
  category: string;
  openings: number;
  city: string;
  state: string;
  salaryType: string;
  minSalary: number;
  maxSalary: number;
  applicationsCount?: number;
  status: string;
  createdAt?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onJobPosted }) => {
  // Navigation Section State (1 to 5)
  const [activeSection, setActiveSection] = useState<number>(2); // Default to Section 2: Candidate Allocation

  // Recruiter Data State
  const [recruiters, setRecruiters] = useState<RecruiterItem[]>([]);
  const [loadingRecruiters, setLoadingRecruiters] = useState(false);
  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>('');

  // Jobs Data State
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Allocation State for Section 2
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  const [recruiterVisibleCandidates, setRecruiterVisibleCandidates] = useState<CandidateGridRow[]>([]);
  const [adminOnlyCandidates, setAdminOnlyCandidates] = useState<CandidateGridRow[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<CandidateGridRow[]>([]);
  const [activeAllocationTab, setActiveAllocationTab] = useState<'recruiterVisible' | 'adminOnly' | 'pending'>('recruiterVisible');

  // Section 1: Register Fake Recruiter Form State
  const [recruiterForm, setRecruiterForm] = useState({
    recruiterName: '',
    mobile: '',
    email: '',
    companyName: '',
    designation: 'HR & Talent Acquisition Lead',
    companyWebsite: 'https://jobsner.com',
    address: 'Logistics Hub, Sector 18',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    companyLogo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80',
    status: 'Approved'
  });
  const [submittingRecruiter, setSubmittingRecruiter] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  // Preset Logos for quick selection in fake recruiter form
  const presetLogos = [
    { name: 'Zomato', url: 'https://images.unsplash.com/photo-1619454016518-697bc231e7cb?w=150&auto=format&fit=crop&q=80' },
    { name: 'Swiggy', url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=150&auto=format&fit=crop&q=80' },
    { name: 'Blinkit', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80' },
    { name: 'Delhivery', url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=150&auto=format&fit=crop&q=80' },
    { name: 'Shadowfax', url: 'https://images.unsplash.com/photo-1548695607-9c73430ba065?w=150&auto=format&fit=crop&q=80' },
    { name: 'Zepto', url: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=150&auto=format&fit=crop&q=80' }
  ];

  // Fetch Recruiters
  const fetchRecruiters = async () => {
    setLoadingRecruiters(true);
    try {
      const res = await fetch('/api/admin/recruiters');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.recruiters || []);
        setRecruiters(list);
        if (list.length > 0 && !selectedRecruiterId) {
          setSelectedRecruiterId(list[0].id);
        }
      }
    } catch (err) {
      console.error('[Admin] Error fetching recruiters:', err);
    } finally {
      setLoadingRecruiters(false);
    }
  };

  // Fetch Jobs when selectedRecruiterId changes
  const fetchJobsForRecruiter = async (recId: string) => {
    if (!recId) {
      setJobs([]);
      setSelectedJobId('');
      return;
    }
    setLoadingJobs(true);
    try {
      const res = await fetch(`/api/admin/recruiters/${recId}/jobs`);
      if (res.ok) {
        const data = await res.json();
        const jobList = Array.isArray(data) ? data : (data.jobs || []);
        setJobs(jobList);
        if (jobList.length > 0) {
          setSelectedJobId(jobList[0].id);
        } else {
          setSelectedJobId('');
          setRecruiterVisibleCandidates([]);
          setAdminOnlyCandidates([]);
          setPendingCandidates([]);
        }
      }
    } catch (err) {
      console.error('[Admin] Error fetching jobs for recruiter:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Fetch Candidate Allocations when selectedJobId changes
  const fetchAllocationsForJob = async (jobId: string) => {
    if (!jobId) {
      setRecruiterVisibleCandidates([]);
      setAdminOnlyCandidates([]);
      setPendingCandidates([]);
      return;
    }
    setLoadingAllocations(true);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/allocations`);
      if (res.ok) {
        const data = await res.json();
        setRecruiterVisibleCandidates(data.recruiterVisible || []);
        setAdminOnlyCandidates(data.adminOnly || []);
        setPendingCandidates(data.pending || []);
      }
    } catch (err) {
      console.error('[Admin] Error fetching candidate allocations:', err);
    } finally {
      setLoadingAllocations(false);
    }
  };

  // Admin Authentication State
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(false);
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Always require fresh credential entry whenever Admin Panel opens
      setIsAdminAuth(false);
      setAuthUsername('');
      setAuthPassword('');
      setAuthError(null);
      sessionStorage.removeItem('jobsner_admin_token');
    }
  }, [isOpen]);

  const handleClosePanel = () => {
    setIsAdminAuth(false);
    setAuthUsername('');
    setAuthPassword('');
    setAuthError(null);
    sessionStorage.removeItem('jobsner_admin_token');
    onClose();
  };

  useEffect(() => {
    if (selectedRecruiterId) {
      fetchJobsForRecruiter(selectedRecruiterId);
    }
  }, [selectedRecruiterId]);

  useEffect(() => {
    if (selectedJobId) {
      fetchAllocationsForJob(selectedJobId);
    }
  }, [selectedJobId]);

  // Section 1: Submit Register Fake Recruiter Form
  const handleRegisterRecruiter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccessMessage(null);
    setFormErrorMessage(null);

    if (!recruiterForm.recruiterName.trim() || !recruiterForm.mobile.trim() || !recruiterForm.email.trim() || !recruiterForm.companyName.trim()) {
      setFormErrorMessage('Recruiter Name, Mobile, Email, and Company Name are required.');
      return;
    }

    setSubmittingRecruiter(true);
    try {
      const res = await fetch('/api/admin/recruiters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recruiterForm)
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccessMessage(`Recruiter "${recruiterForm.recruiterName}" (${recruiterForm.companyName}) registered successfully!`);
        // Refresh recruiters list & select newly created recruiter
        await fetchRecruiters();
        if (data.recruiter?.id) {
          setSelectedRecruiterId(data.recruiter.id);
        }
        // Reset form to defaults
        setRecruiterForm({
          recruiterName: '',
          mobile: '',
          email: '',
          companyName: '',
          designation: 'HR & Talent Acquisition Lead',
          companyWebsite: 'https://jobsner.com',
          address: 'Logistics Hub, Sector 18',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          companyLogo: presetLogos[0].url,
          status: 'Approved'
        });
      } else {
        setFormErrorMessage(data.error || 'Failed to register recruiter.');
      }
    } catch (err: any) {
      setFormErrorMessage(err.message || 'Server connection error.');
    } finally {
      setSubmittingRecruiter(false);
    }
  };

  // Quick Auto-fill for Fake Recruiter Form
  const handleAutoFillTestRecruiter = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const companies = [
      { name: 'Delhivery Express Logistics', city: 'Gurugram', state: 'Haryana', logo: presetLogos[3].url },
      { name: 'Shadowfax Quick Delivery', city: 'Bengaluru', state: 'Karnataka', logo: presetLogos[4].url },
      { name: 'Zomato Fleet Services', city: 'Delhi', state: 'Delhi', logo: presetLogos[0].url },
      { name: 'Blinkit Commerce Hub', city: 'Noida', state: 'Uttar Pradesh', logo: presetLogos[2].url },
      { name: 'Zepto Express Deliveries', city: 'Mumbai', state: 'Maharashtra', logo: presetLogos[5].url }
    ];
    const pick = companies[Math.floor(Math.random() * companies.length)];

    setRecruiterForm({
      recruiterName: `Talent Partner ${randomNum}`,
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `recruiter.${randomNum}@jobsner-fleet.com`,
      companyName: pick.name,
      designation: 'Operations Hiring Lead',
      companyWebsite: `https://${pick.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      address: `Tower B, Industrial Area Phase 2`,
      city: pick.city,
      state: pick.state,
      pincode: '110020',
      companyLogo: pick.logo,
      status: 'Approved'
    });
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError('Please enter both username and password.');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem('jobsner_admin_token', data.token);
        setIsAdminAuth(true);
        setAuthPassword('');
        setAuthError(null);
        fetchRecruiters();
      } else {
        setAuthError(data.error || 'Invalid username or password.');
      }
    } catch (err: any) {
      setAuthError('Failed to connect to authentication server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    const token = sessionStorage.getItem('jobsner_admin_token');
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }).catch(() => {});
    }
    sessionStorage.removeItem('jobsner_admin_token');
    setIsAdminAuth(false);
  };

  if (!isOpen) return null;

  // Render Admin Authentication Modal if not authenticated
  if (!isAdminAuth) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-hidden animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md shadow-2xl p-6 sm:p-8 flex flex-col relative font-sans">
          
          <button
            onClick={handleClosePanel}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-3">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Admin Authorization Required</h2>
            <p className="text-xs text-slate-400 mt-1">Please enter master admin credentials stored in Supabase</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Enter admin username"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter admin password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-semibold text-white text-sm rounded-xl shadow-lg shadow-orange-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Authenticate Admin</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center mt-6">
            Protected by PBKDF2 SHA-512 encryption & Supabase row-level security.
          </p>
        </div>
      </div>
    );
  }

  const filteredRecruiters = recruiters.filter(r => 
    (r.companyName && r.companyName.toLowerCase().includes(recruiterSearch.toLowerCase())) ||
    (r.recruiterName && r.recruiterName.toLowerCase().includes(recruiterSearch.toLowerCase())) ||
    (r.mobile && r.mobile.includes(recruiterSearch)) ||
    (r.email && r.email.toLowerCase().includes(recruiterSearch.toLowerCase()))
  );

  const selectedRecruiter = recruiters.find(r => r.id === selectedRecruiterId);
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const totalJobCandidates = recruiterVisibleCandidates.length + adminOnlyCandidates.length + pendingCandidates.length;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-fade-in">
      <div className="bg-slate-950 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Jobsner Logo" 
              className="w-10 h-10 rounded-full object-cover shadow-lg border-2 border-white/30 bg-white select-none shrink-0" 
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Jobsner Central Admin Panel</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  SYSTEM READY
                </span>
              </div>
              <p className="text-xs text-slate-400">Recruiter onboarding & 1:3 random candidate allocation engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchRecruiters();
                if (selectedJobId) fetchAllocationsForJob(selectedJobId);
              }}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
              title="Refresh all admin data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleAdminLogout}
              className="px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/30 transition flex items-center gap-1.5"
              title="Log Out Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
            <button
              onClick={handleClosePanel}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
              title="Close Admin Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body with Sidebar Navigation */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Nav (5 Sections) */}
          <div className="w-64 bg-slate-950/60 border-r border-slate-800 p-3 flex flex-col justify-between select-none">
            <div className="space-y-1.5">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Core Modules
              </div>

              {/* Section 1: Register Fake Recruiter */}
              <button
                onClick={() => setActiveSection(1)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeSection === 1
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className={`w-4 h-4 ${activeSection === 1 ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span className="truncate">1. Register Recruiter</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Section 2: Candidate Allocation */}
              <button
                onClick={() => setActiveSection(2)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeSection === 2
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={`w-4 h-4 ${activeSection === 2 ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="truncate">2. Candidate Allocation</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <div className="pt-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Expansion Slots
              </div>

              {/* Section 3: Candidate Pool */}
              <button
                onClick={() => setActiveSection(3)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeSection === 3
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className={`w-4 h-4 ${activeSection === 3 ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span className="truncate">3. Candidate Pool</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">Pool</span>
              </button>

              {/* Section 4: Reserved */}
              <button
                onClick={() => setActiveSection(4)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeSection === 4
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>4. Reserved Section</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Slot 4</span>
              </button>

              {/* Section 5: Reserved */}
              <button
                onClick={() => setActiveSection(5)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeSection === 5
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>5. Reserved Section</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Slot 5</span>
              </button>
            </div>

            {/* Quick System Badge at Bottom of Nav */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
              <div className="flex items-center gap-2 font-medium text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Supabase Dual-Sync</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Database allocation table active with 1:3 ratio enforcement.
              </p>
            </div>
          </div>

          {/* Section Viewport Container */}
          <div className="flex-1 bg-slate-900/40 overflow-y-auto p-4 sm:p-6 flex flex-col">
            
            {/* SECTION 1: REGISTER FAKE RECRUITER */}
            {activeSection === 1 && (
              <div className="max-w-4xl mx-auto w-full space-y-5 animate-fade-in">
                <div className="flex items-center justify-between bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-orange-400" />
                      Section 1: Register Fake Recruiter
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Create recruiter accounts directly into PostgreSQL <code className="text-orange-300 font-mono">public.recruiters</code> schema.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoFillTestRecruiter}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-xs font-semibold rounded-lg border border-orange-500/30 transition shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    Auto-Fill Test Recruiter
                  </button>
                </div>

                {formSuccessMessage && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{formSuccessMessage}</span>
                  </div>
                )}

                {formErrorMessage && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formErrorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterRecruiter} className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Recruiter Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        1. Recruiter Name <span className="text-orange-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={recruiterForm.recruiterName}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, recruiterName: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 2. Mobile */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        2. Mobile Number <span className="text-orange-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={recruiterForm.mobile}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, mobile: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 3. Email */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        3. Email Address <span className="text-orange-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={recruiterForm.email}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, email: e.target.value })}
                        placeholder="e.g. hr@company.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 4. Company Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        4. Company Name <span className="text-orange-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={recruiterForm.companyName}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, companyName: e.target.value })}
                        placeholder="e.g. Zomato Logistics Pvt Ltd"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 5. Designation */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">5. Designation</label>
                      <input
                        type="text"
                        value={recruiterForm.designation}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, designation: e.target.value })}
                        placeholder="e.g. Regional HR Manager"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 6. Company Website */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">6. Company Website</label>
                      <input
                        type="url"
                        value={recruiterForm.companyWebsite}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, companyWebsite: e.target.value })}
                        placeholder="e.g. https://zomato.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 7. Address */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">7. Company Address</label>
                      <input
                        type="text"
                        value={recruiterForm.address}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, address: e.target.value })}
                        placeholder="e.g. Sector 18, Commercial Belt"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 8. City */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">8. City</label>
                      <input
                        type="text"
                        value={recruiterForm.city}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, city: e.target.value })}
                        placeholder="e.g. Delhi"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 9. State */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">9. State</label>
                      <input
                        type="text"
                        value={recruiterForm.state}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, state: e.target.value })}
                        placeholder="e.g. Delhi"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 10. Pincode */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">10. Pincode</label>
                      <input
                        type="text"
                        value={recruiterForm.pincode}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, pincode: e.target.value })}
                        placeholder="e.g. 110001"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 12. Status */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">12. Initial Status</label>
                      <select
                        value={recruiterForm.status}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, status: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="Approved">Approved (Immediate Active)</option>
                        <option value="Pending">Pending Admin Approval</option>
                        <option value="Active">Active</option>
                      </select>
                    </div>
                  </div>

                  {/* 11. Company Logo with Quick Presets */}
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-medium text-slate-300 mb-2">11. Company Logo URL</label>
                    <div className="flex gap-2 items-center mb-2">
                      <input
                        type="url"
                        value={recruiterForm.companyLogo}
                        onChange={(e) => setRecruiterForm({ ...recruiterForm, companyLogo: e.target.value })}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                      {recruiterForm.companyLogo && (
                        <img
                          src={recruiterForm.companyLogo}
                          alt="Logo Preview"
                          className="w-9 h-9 rounded-lg object-cover border border-slate-700 bg-slate-800"
                        />
                      )}
                    </div>

                    {/* Quick Logo Presets */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-slate-400">Quick Presets:</span>
                      {presetLogos.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setRecruiterForm({ ...recruiterForm, companyLogo: p.url, companyName: recruiterForm.companyName || p.name })}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[10px] font-medium border border-slate-800 transition"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingRecruiter}
                      className={`px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                        submittingRecruiter
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white cursor-pointer active:scale-95 shadow-orange-950/40'
                      }`}
                    >
                      {submittingRecruiter ? 'Registering Recruiter...' : 'Register Recruiter Directly'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SECTION 2: CANDIDATE ALLOCATION ENGINE & EXCEL GRIDS */}
            {activeSection === 2 && (
              <div className="flex-1 flex flex-col space-y-4 animate-fade-in">
                
                {/* Control Header: Recruiter & Job Selectors */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-xl">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    
                    {/* Recruiter Selector */}
                    <div className="md:col-span-6 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                          Select Recruiter
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {recruiters.length} Recruiters in DB
                        </span>
                      </div>

                      <div className="relative">
                        <select
                          value={selectedRecruiterId}
                          onChange={(e) => setSelectedRecruiterId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/90 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          {recruiters.length === 0 ? (
                            <option value="">No recruiters found in database</option>
                          ) : (
                            recruiters.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.companyName} — {r.recruiterName} ({r.mobile})
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Job Selector */}
                    <div className="md:col-span-6 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                          Select Active Job
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {jobs.length} Jobs for this Recruiter
                        </span>
                      </div>

                      <div className="relative">
                        <select
                          value={selectedJobId}
                          onChange={(e) => setSelectedJobId(e.target.value)}
                          disabled={jobs.length === 0}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/90 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        >
                          {jobs.length === 0 ? (
                            <option value="">No jobs posted by this recruiter yet</option>
                          ) : (
                            jobs.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.title} ({j.category} - {j.city}) [{j.openings} Openings]
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Quick Job Details & Allocation Stats Strip */}
                  {selectedJob && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{selectedJob.title}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700 font-medium">
                          {selectedJob.category}
                        </span>
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" /> {selectedJob.city}, {selectedJob.state}
                        </span>
                      </div>

                      {/* Allocation Stats Cards */}
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-center">
                          <span className="text-[10px] text-slate-400 block font-sans">Total Applied</span>
                          <span className="text-xs font-bold text-white font-mono">{totalJobCandidates}</span>
                        </div>
                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                          <span className="text-[10px] text-emerald-400 block font-sans">Recruiter Visible (1/3)</span>
                          <span className="text-xs font-bold text-emerald-300 font-mono">{recruiterVisibleCandidates.length}</span>
                        </div>
                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                          <span className="text-[10px] text-blue-400 block font-sans">Admin Only (2/3)</span>
                          <span className="text-xs font-bold text-blue-300 font-mono">{adminOnlyCandidates.length}</span>
                        </div>
                        <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                          <span className="text-[10px] text-amber-400 block font-sans">Pending Remainder</span>
                          <span className="text-xs font-bold text-amber-300 font-mono">{pendingCandidates.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subsections Tab Navigation */}
                <div className="flex items-center justify-between border-b border-slate-800 select-none">
                  <div className="flex items-center gap-2">
                    {/* Subsection 2.1 */}
                    <button
                      onClick={() => setActiveAllocationTab('recruiterVisible')}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                        activeAllocationTab === 'recruiterVisible'
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>Subsection 2.1: Recruiter Visible Candidates</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {recruiterVisibleCandidates.length}
                      </span>
                    </button>

                    {/* Subsection 2.2 */}
                    <button
                      onClick={() => setActiveAllocationTab('adminOnly')}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                        activeAllocationTab === 'adminOnly'
                          ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <EyeOff className="w-4 h-4 text-blue-400" />
                      <span>Subsection 2.2: Admin Only Candidates</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {adminOnlyCandidates.length}
                      </span>
                    </button>

                    {/* Pending Sub-tab */}
                    <button
                      onClick={() => setActiveAllocationTab('pending')}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                        activeAllocationTab === 'pending'
                          ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Pending Allocation (Remainder)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {pendingCandidates.length}
                      </span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2 pr-2">
                    <span className="font-mono">Engine Rule: 1 Random per 3 applicants</span>
                  </div>
                </div>

                {/* Subsections Grid Content */}
                <div className="flex-1 flex flex-col min-h-0">
                  {loadingAllocations ? (
                    <div className="flex-1 flex items-center justify-center py-16 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mr-2 text-emerald-400" />
                      <span className="text-xs font-semibold">Running allocation engine and fetching candidate profiles...</span>
                    </div>
                  ) : !selectedJobId ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                      <Briefcase className="w-10 h-10 mb-2 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">No Job Selected</p>
                      <p className="text-xs text-slate-500 mt-1">Please select a recruiter and a job above to view candidate allocations.</p>
                    </div>
                  ) : activeAllocationTab === 'recruiterVisible' ? (
                    <ExcelCandidateGrid
                      candidates={recruiterVisibleCandidates}
                      title="Subsection 2.1 — Recruiter Visible Candidates"
                      badgeColor="emerald"
                      emptyMessage="No candidates have been allocated to Recruiter Visible for this job yet."
                    />
                  ) : activeAllocationTab === 'adminOnly' ? (
                    <ExcelCandidateGrid
                      candidates={adminOnlyCandidates}
                      title="Subsection 2.2 — Admin Only Candidates (Masked from Recruiter)"
                      badgeColor="blue"
                      emptyMessage="No candidates are currently marked as Admin Only for this job."
                    />
                  ) : (
                    <div className="flex flex-col h-full space-y-3">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>
                            <strong>Pending Allocation Rule:</strong> These candidates are in an incomplete 3-candidate batch (1 or 2 applicants). Once the 3rd applicant arrives, 1 will be randomly allocated to Recruiter Visible and 2 to Admin Only.
                          </span>
                        </div>
                      </div>
                      <ExcelCandidateGrid
                        candidates={pendingCandidates}
                        title="Pending Allocation Candidates (Awaiting 3rd Candidate)"
                        badgeColor="amber"
                        emptyMessage="No applicants currently pending batch completion."
                      />
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* SECTION 3: CANDIDATE POOL */}
            {activeSection === 3 && (
              <CandidatePoolSection
                recruiters={recruiters}
                onAssignmentComplete={() => {
                  fetchRecruiters();
                }}
              />
            )}

            {/* SECTION 4: RESERVED */}
            {activeSection === 4 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-fade-in max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
                  <Layers className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Section 4: Reserved for Future Expansion</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  This section is reserved for platform analytics, candidate onboarding document verification workflows, and logistics background verification (BGV) integrations.
                </p>
                <div className="mt-6 px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono border border-slate-700">
                  SLOT_4_AVAILABLE
                </div>
              </div>
            )}

            {/* SECTION 5: RESERVED */}
            {activeSection === 5 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-fade-in max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
                  <Settings className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Section 5: Reserved for Future Expansion</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  This section is reserved for platform system settings, multi-city delivery zone controls, SMS/OTP gateway configuration, and Super Admin audit logs.
                </p>
                <div className="mt-6 px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono border border-slate-700">
                  SLOT_5_AVAILABLE
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
