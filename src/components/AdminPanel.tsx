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
  KeyRound,
  Copy,
  Check,
  PlusCircle,
  ArrowRight,
  DollarSign,
  Zap,
  CheckCircle
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

  // Section 1: Register Recruiter Form State
  const [recruiterForm, setRecruiterForm] = useState({
    recruiterName: '',
    mobile: '',
    email: '',
    password: '',
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
  const [showRecruiterPassword, setShowRecruiterPassword] = useState(false);
  const [submittingRecruiter, setSubmittingRecruiter] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  // Recruiter Account Created Credentials State for Admin View & Copy
  const [createdCredentials, setCreatedCredentials] = useState<{
    recruiterId: string;
    recruiterName: string;
    companyName: string;
    email: string;
    mobile: string;
    password: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Section 4: Post Job Form State
  const [postJobForm, setPostJobForm] = useState({
    recruiterId: '',
    title: 'Delivery Executive / Rider',
    category: 'Delivery Jobs',
    openings: 10,
    employmentType: 'Full Time',
    state: 'Delhi',
    city: 'Delhi',
    area: 'Connaught Place Hub',
    workLocation: 'Connaught Place Hub, Delhi',
    minSalary: 18000,
    maxSalary: 28000,
    salaryType: 'Per Month',
    shift: 'Day Shift',
    experienceRequired: 0,
    educationRequired: '10th Pass or below',
    genderPreference: 'Any',
    ageLimitMin: 18,
    ageLimitMax: 45,
    bikeRequired: 'Yes',
    drivingLicenseRequired: 'Yes',
    immediateJoining: 'Yes',
    description: 'Urgent hiring for high-paying delivery executives. Instant onboarding, daily incentives, and fuel compensation provided.',
    responsibilities: 'Pick up customer packages and orders from hub locations. Safely navigate assigned delivery zones and fulfill deliveries on time.',
    benefits: 'Daily delivery incentives, joining bonus of ₹3,000, accidental insurance cover up to ₹5 Lakhs, fuel allowance.',
    status: 'Published'
  });
  const [submittingJob, setSubmittingJob] = useState(false);
  const [jobSuccessMessage, setJobSuccessMessage] = useState<string | null>(null);
  const [jobErrorMessage, setJobErrorMessage] = useState<string | null>(null);
  const [postedJobData, setPostedJobData] = useState<any | null>(null);

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
      const existingToken = sessionStorage.getItem('jobsner_admin_token');
      if (existingToken) {
        setAuthLoading(true);
        fetch('/api/admin/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: existingToken })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.valid) {
              setIsAdminAuth(true);
              fetchRecruiters();
            } else {
              sessionStorage.removeItem('jobsner_admin_token');
              setIsAdminAuth(false);
            }
          })
          .catch(() => {
            // Network error: don't clear token, allow retry
          })
          .finally(() => {
            setAuthLoading(false);
          });
      } else {
        setIsAdminAuth(false);
        setAuthUsername('');
        setAuthPassword('');
        setAuthError(null);
      }
    }
  }, [isOpen]);

  const handleClosePanel = () => {
    setAuthUsername('');
    setAuthPassword('');
    setAuthError(null);
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

  // Section 1: Submit Register Recruiter Form
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
      const adminToken = sessionStorage.getItem('jobsner_admin_token') || '';
      const res = await fetch('/api/admin/recruiters', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(recruiterForm)
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccessMessage(`Recruiter "${recruiterForm.recruiterName}" (${recruiterForm.companyName}) registered successfully!`);
        // If server returned assigned credentials, save them for prominent display and copy
        if (data.credentials) {
          setCreatedCredentials(data.credentials);
        }
        // Refresh recruiters list & select newly created recruiter
        await fetchRecruiters();
        if (data.recruiter?.id) {
          setSelectedRecruiterId(data.recruiter.id);
          setPostJobForm(prev => ({
            ...prev,
            recruiterId: data.recruiter.id,
            city: recruiterForm.city || prev.city,
            state: recruiterForm.state || prev.state
          }));
        }
        // Reset form to defaults
        setRecruiterForm({
          recruiterName: '',
          mobile: '',
          email: '',
          password: '',
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

  // Copy Recruiter Credentials to Clipboard
  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `JOBSNER Recruiter Login Credentials:\nCompany: ${createdCredentials.companyName}\nRecruiter: ${createdCredentials.recruiterName}\nLogin Email: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}\nLogin Portal: ${window.location.origin}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 3000);
    }).catch(() => {
      // Fallback
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 3000);
    });
  };

  // Quick Auto-fill for Recruiter Form
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
      password: `Jobsner@${Math.floor(100000 + Math.random() * 900000)}`,
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

  // Quick Auto-fill for Post Job Form
  const handleAutoFillTestJob = (roleType: 'rider' | 'warehouse') => {
    const targetRecruiterId = postJobForm.recruiterId || selectedRecruiterId || (recruiters[0]?.id || '');
    const currentRecruiter = recruiters.find(r => r.id === targetRecruiterId);
    const city = currentRecruiter?.city || 'Delhi';
    const state = currentRecruiter?.state || 'Delhi';

    if (roleType === 'rider') {
      setPostJobForm({
        recruiterId: targetRecruiterId,
        title: 'Delivery Executive (Bike Rider)',
        category: 'Delivery Jobs',
        openings: 15,
        employmentType: 'Full Time',
        state: state,
        city: city,
        area: `${city} Central Fulfillment Hub`,
        workLocation: `${city} Central Fulfillment Hub, ${city}`,
        minSalary: 18000,
        maxSalary: 28000,
        salaryType: 'Per Month',
        shift: 'Flexible Shift',
        experienceRequired: 0,
        educationRequired: '10th Pass or below',
        genderPreference: 'Any',
        ageLimitMin: 18,
        ageLimitMax: 45,
        bikeRequired: 'Yes',
        drivingLicenseRequired: 'Yes',
        immediateJoining: 'Yes',
        description: 'Urgent requirement for high-earning Delivery Partners. On-spot onboarding with attractive per-order payouts, daily milestone bonuses, and accidental insurance coverage.',
        responsibilities: 'Pick up customer parcels and food orders from hub kitchens. Navigate designated local delivery clusters safely and complete deliveries on time.',
        benefits: 'Per-order incentives, joining bonus of ₹3,000, accidental insurance up to ₹5 Lakhs, fuel allowance, flexible shifts.',
        status: 'Published'
      });
    } else {
      setPostJobForm({
        recruiterId: targetRecruiterId,
        title: 'Warehouse Operations Associate',
        category: 'Warehouse & Logistics',
        openings: 8,
        employmentType: 'Full Time',
        state: state,
        city: city,
        area: `${city} Logistics Industrial Park`,
        workLocation: `${city} Logistics Industrial Park, ${city}`,
        minSalary: 16000,
        maxSalary: 24000,
        salaryType: 'Per Month',
        shift: 'Rotational Shift',
        experienceRequired: 0,
        educationRequired: '10th Pass or below',
        genderPreference: 'Any',
        ageLimitMin: 18,
        ageLimitMax: 40,
        bikeRequired: 'No',
        drivingLicenseRequired: 'No',
        immediateJoining: 'Yes',
        description: 'Immediate opening for warehouse inventory pickers and packers in modern air-cooled logistics fulfillment centers.',
        responsibilities: 'Receive incoming shipments, scan barcodes using handheld RFID scanners, pick items according to invoice manifests, and pack parcels safely.',
        benefits: 'Monthly attendance bonus of ₹2,000, subsidised cafeteria meals, medical insurance, overtime pay.',
        status: 'Published'
      });
    }
  };

  // Section 4: Submit Post Job Form Directly from Admin Panel
  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobSuccessMessage(null);
    setJobErrorMessage(null);
    setPostedJobData(null);

    if (!postJobForm.recruiterId) {
      setJobErrorMessage('Please select a recruiter or company to assign this job to.');
      return;
    }
    if (!postJobForm.title.trim()) {
      setJobErrorMessage('Job Title is required.');
      return;
    }
    if (!postJobForm.city.trim() || !postJobForm.state.trim()) {
      setJobErrorMessage('City and State are required.');
      return;
    }

    setSubmittingJob(true);
    try {
      const adminToken = sessionStorage.getItem('jobsner_admin_token') || '';
      const res = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(postJobForm)
      });

      const data = await res.json();
      if (res.ok) {
        setJobSuccessMessage(`Job "${postJobForm.title}" successfully published and synced with Supabase!`);
        setPostedJobData(data.job);
        if (onJobPosted) {
          onJobPosted();
        }
        // If the selected recruiter in Section 2 is the same, reload their jobs
        if (selectedRecruiterId === postJobForm.recruiterId) {
          await fetchJobsForRecruiter(postJobForm.recruiterId);
        }
      } else {
        setJobErrorMessage(data.error || 'Failed to post job.');
      }
    } catch (err: any) {
      setJobErrorMessage(err.message || 'Server error posting job.');
    } finally {
      setSubmittingJob(false);
    }
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img 
              src="/logo.png" 
              alt="Jobsner Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-lg border-2 border-white/30 bg-white select-none shrink-0" 
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight truncate">Jobsner Central Admin Panel</h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  SYSTEM READY
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Recruiter onboarding & 1:3 random candidate allocation engine</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                fetchRecruiters();
                if (selectedJobId) fetchAllocationsForJob(selectedJobId);
              }}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
              title="Refresh all admin data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleAdminLogout}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/30 transition flex items-center gap-1.5"
              title="Log Out Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Log Out</span>
            </button>
            <button
              onClick={handleClosePanel}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
              title="Close Admin Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Tabs (md:hidden) */}
        <div className="md:hidden flex items-center gap-1.5 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto shrink-0 select-none">
          {[
            { id: 1, label: '1. Recruiter', icon: UserPlus },
            { id: 2, label: '2. Allocation', icon: Users },
            { id: 3, label: '3. Candidate Pool', icon: FileSpreadsheet },
            { id: 4, label: '4. Post Job', icon: Briefcase },
            { id: 5, label: '5. Slot 5', icon: Settings },
          ].map((tab) => {
            const IconComp = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-orange-500 text-white font-bold shadow-xs'
                    : 'bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Body with Sidebar Navigation */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar Nav (Desktop / Tablet) */}
          <div className="hidden md:flex md:w-64 bg-slate-950/60 border-r border-slate-800 p-3 flex-col justify-between select-none shrink-0">
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

              {/* Section 4: Post Job */}
              <button
                onClick={() => {
                  setActiveSection(4);
                  if (!postJobForm.recruiterId && recruiters.length > 0) {
                    setPostJobForm(prev => ({ ...prev, recruiterId: selectedRecruiterId || recruiters[0].id }));
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeSection === 4
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className={`w-4 h-4 ${activeSection === 4 ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span className="truncate">4. Post Job</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">New</span>
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
            
            {/* SECTION 1: CREATE RECRUITER ACCOUNT */}
            {activeSection === 1 && (
              <div className="max-w-4xl mx-auto w-full space-y-5 animate-fade-in">
                <div className="flex items-center justify-between bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-orange-400" />
                      Section 1: Create Recruiter Account
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Create recruiter accounts directly into PostgreSQL <code className="text-orange-300 font-mono">public.recruiters</code> schema with secure password hashing.
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

                {/* Prominent Created Credentials Card with Copy Button */}
                {createdCredentials && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">Recruiter Account Generated</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active & Ready for Login
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Provide these login credentials to the recruiter. Password is cryptographically hashed with PBKDF2 in Supabase.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCreatedCredentials(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                        title="Dismiss credentials card"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/90 p-4 rounded-xl border border-slate-800 shadow-inner">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Company</span>
                        <p className="text-xs font-semibold text-white truncate mt-1">{createdCredentials.companyName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Recruiter Name</span>
                        <p className="text-xs font-semibold text-white truncate mt-1">{createdCredentials.recruiterName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Login Email</span>
                        <p className="text-xs font-mono font-semibold text-emerald-400 truncate mt-1">{createdCredentials.email}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Temporary Password</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <p className="text-xs font-mono font-bold text-amber-300 select-all">
                            {showRecruiterPassword ? createdCredentials.password : '••••••••••••'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowRecruiterPassword(!showRecruiterPassword)}
                            className="text-slate-400 hover:text-white p-1"
                            title={showRecruiterPassword ? "Hide password" : "Show password"}
                          >
                            {showRecruiterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyCredentials}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer ${
                          copiedCredentials
                            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        }`}
                      >
                        {copiedCredentials ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedCredentials ? 'Credentials Copied to Clipboard!' : 'Copy Recruiter Credentials'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPostJobForm(prev => ({
                            ...prev,
                            recruiterId: createdCredentials.recruiterId,
                            city: recruiterForm.city || prev.city,
                            state: recruiterForm.state || prev.state
                          }));
                          setActiveSection(4);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 transition cursor-pointer"
                      >
                        <Briefcase className="w-4 h-4" />
                        <span>Post a Job for this Recruiter</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

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

                    {/* Password Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">
                          Password (Optional / Auto-Gen)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const gen = `Jobsner@${Math.floor(100000 + Math.random() * 900000)}`;
                            setRecruiterForm(prev => ({ ...prev, password: gen }));
                            setShowRecruiterPassword(true);
                          }}
                          className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          Generate
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showRecruiterPassword ? "text" : "password"}
                          value={recruiterForm.password}
                          onChange={(e) => setRecruiterForm({ ...recruiterForm, password: e.target.value })}
                          placeholder="Auto-generated if left blank"
                          className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRecruiterPassword(!showRecruiterPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                        >
                          {showRecruiterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
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
                      {submittingRecruiter ? 'Creating Recruiter Account...' : 'Create Recruiter Account'}
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

            {/* SECTION 4: POST JOB DIRECTLY */}
            {activeSection === 4 && (
              <div className="max-w-4xl mx-auto w-full space-y-5 animate-fade-in pb-8">
                {/* Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-orange-400" />
                      Section 4: Post Job Directly from Admin Panel
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Publish live jobs associated with any registered recruiter. Synchronizes immediately with Supabase, candidate listings, and the recruiter's dashboard.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAutoFillTestJob('rider')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-xs font-semibold rounded-lg border border-orange-500/30 transition shadow-sm cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-orange-400" />
                      Auto-Fill Rider Job
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoFillTestJob('warehouse')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-lg border border-blue-500/30 transition shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Auto-Fill Warehouse
                    </button>
                  </div>
                </div>

                {/* Success Feedback Card */}
                {jobSuccessMessage && postedJobData && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in relative overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">Job Published Successfully!</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Live & Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Job ID: <code className="text-emerald-400 font-mono">{postedJobData.id}</code>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setJobSuccessMessage(null);
                          setPostedJobData(null);
                        }}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/90 p-4 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Title</span>
                        <p className="text-xs font-semibold text-white truncate mt-1">{postedJobData.title}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Company</span>
                        <p className="text-xs font-semibold text-white truncate mt-1">{postedJobData.companyName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Location</span>
                        <p className="text-xs font-semibold text-slate-300 truncate mt-1">{postedJobData.city}, {postedJobData.state}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Salary Range</span>
                        <p className="text-xs font-bold text-emerald-400 mt-1">
                          ₹{Number(postedJobData.minSalary).toLocaleString('en-IN')} - ₹{Number(postedJobData.maxSalary).toLocaleString('en-IN')} / {postedJobData.salaryType}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Available in recruiter dashboard & public candidate listings</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecruiterId(postJobForm.recruiterId);
                            setSelectedJobId(postedJobData.id);
                            setActiveSection(2);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>View in Allocations (Section 2)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setJobSuccessMessage(null);
                            setPostedJobData(null);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                        >
                          Post Another Job
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {jobErrorMessage && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{jobErrorMessage}</span>
                  </div>
                )}

                {/* Main Job Post Form */}
                <form onSubmit={handlePostJob} className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-6 shadow-xl">
                  {/* Step 1: Assign Recruiter / Company */}
                  <div className="space-y-3 pb-5 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-orange-400" />
                        1. Select Hiring Company / Recruiter <span className="text-orange-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveSection(1)}
                        className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 transition"
                      >
                        <UserPlus className="w-3 h-3" />
                        + Register New Recruiter First
                      </button>
                    </div>

                    {recruiters.length === 0 ? (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center justify-between">
                        <span>No recruiters registered yet. Please create a recruiter account first.</span>
                        <button
                          type="button"
                          onClick={() => setActiveSection(1)}
                          className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition"
                        >
                          Go to Section 1
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <select
                          required
                          value={postJobForm.recruiterId}
                          onChange={(e) => {
                            const newRecId = e.target.value;
                            const rec = recruiters.find(r => r.id === newRecId);
                            setPostJobForm(prev => ({
                              ...prev,
                              recruiterId: newRecId,
                              city: rec?.city || prev.city,
                              state: rec?.state || prev.state,
                              workLocation: rec?.city ? `${rec.city} Hub, ${rec.city}` : prev.workLocation
                            }));
                          }}
                          className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="">-- Choose Recruiter / Company --</option>
                          {recruiters.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.companyName} — {r.recruiterName} ({r.city || 'National Hub'})
                            </option>
                          ))}
                        </select>

                        {/* Selected Recruiter Badge */}
                        {postJobForm.recruiterId && (() => {
                          const r = recruiters.find(rec => rec.id === postJobForm.recruiterId);
                          if (!r) return null;
                          return (
                            <div className="flex items-center gap-2.5 p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                              {r.companyLogo ? (
                                <img src={r.companyLogo} alt={r.companyName} className="w-8 h-8 rounded-md object-cover bg-slate-800 border border-slate-700 shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                                  {r.companyName.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate">{r.companyName}</p>
                                <p className="text-[10px] text-slate-400 truncate">{r.recruiterName} • {r.email}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Job Role & Vacancy Details */}
                  <div className="space-y-3 pb-5 border-b border-slate-800">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-orange-400" />
                      2. Job Role & Vacancies
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Job Title */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Job Title <span className="text-orange-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={postJobForm.title}
                          onChange={(e) => setPostJobForm({ ...postJobForm, title: e.target.value })}
                          placeholder="e.g. Delivery Executive / Bike Rider"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                        {/* Quick Title Chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {['Delivery Rider', 'Warehouse Associate', 'Picker & Packer', 'Van Driver', 'Operations Lead'].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setPostJobForm(prev => ({ ...prev, title: chip }))}
                              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-white border border-slate-800 transition"
                            >
                              + {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Category <span className="text-orange-400">*</span>
                        </label>
                        <select
                          value={postJobForm.category}
                          onChange={(e) => setPostJobForm({ ...postJobForm, category: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="Delivery & Logistics">Delivery & Logistics</option>
                          <option value="Warehouse & Packing">Warehouse & Packing</option>
                          <option value="Drivers">Drivers</option>
                          <option value="Office & Admin">Office & Admin</option>
                          <option value="Other Jobs">Other Jobs</option>
                          <option value="Delivery Jobs">Delivery Jobs</option>
                          <option value="Warehouse & Logistics">Warehouse & Logistics</option>
                          <option value="Driver & Fleet">Driver & Fleet</option>
                          <option value="Operations & Support">Operations & Support</option>
                          <option value="Customer Support">Customer Support</option>
                          <option value="Retail & Commercial">Retail & Commercial</option>
                        </select>
                      </div>

                      {/* Openings */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Total Openings / Vacancies
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={postJobForm.openings}
                          onChange={(e) => setPostJobForm({ ...postJobForm, openings: Number(e.target.value) || 1 })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Location Details */}
                  <div className="space-y-3 pb-5 border-b border-slate-800">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-400" />
                      3. Location & Hub Details
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* State */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">State <span className="text-orange-400">*</span></label>
                        <input
                          type="text"
                          required
                          value={postJobForm.state}
                          onChange={(e) => setPostJobForm({ ...postJobForm, state: e.target.value })}
                          placeholder="e.g. Delhi"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      {/* City */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">City <span className="text-orange-400">*</span></label>
                        <input
                          type="text"
                          required
                          value={postJobForm.city}
                          onChange={(e) => setPostJobForm({ ...postJobForm, city: e.target.value })}
                          placeholder="e.g. Delhi"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      {/* Area / Hub */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Area / Hub Name</label>
                        <input
                          type="text"
                          value={postJobForm.area}
                          onChange={(e) => setPostJobForm({ ...postJobForm, area: e.target.value })}
                          placeholder="e.g. Connaught Place Hub"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      {/* Full Work Location */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Display Work Location</label>
                        <input
                          type="text"
                          value={postJobForm.workLocation}
                          onChange={(e) => setPostJobForm({ ...postJobForm, workLocation: e.target.value })}
                          placeholder="e.g. Connaught Place, Central Delhi"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Salary & Shift */}
                  <div className="space-y-3 pb-5 border-b border-slate-800">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-orange-400" />
                      4. Salary & Shift Schedule
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Min Salary */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Min Salary (₹)</label>
                        <input
                          type="number"
                          value={postJobForm.minSalary}
                          onChange={(e) => setPostJobForm({ ...postJobForm, minSalary: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>

                      {/* Max Salary */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Max Salary (₹)</label>
                        <input
                          type="number"
                          value={postJobForm.maxSalary}
                          onChange={(e) => setPostJobForm({ ...postJobForm, maxSalary: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>

                      {/* Salary Type */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Salary Frequency</label>
                        <select
                          value={postJobForm.salaryType}
                          onChange={(e) => setPostJobForm({ ...postJobForm, salaryType: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="Per Month">Per Month</option>
                          <option value="Per Week">Per Week</option>
                          <option value="Per Day">Per Day</option>
                          <option value="Per Order">Per Order / Payout</option>
                        </select>
                      </div>

                      {/* Shift */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Shift Schedule</label>
                        <select
                          value={postJobForm.shift}
                          onChange={(e) => setPostJobForm({ ...postJobForm, shift: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="Day Shift">Day Shift</option>
                          <option value="Night Shift">Night Shift</option>
                          <option value="Rotational Shift">Rotational Shift</option>
                          <option value="Flexible Shift">Flexible / Part Time</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Step 5: Eligibility & Logistics Prerequisites */}
                  <div className="space-y-3 pb-5 border-b border-slate-800">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-orange-400" />
                      5. Candidate Eligibility & Logistics Criteria
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Experience */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Min Experience</label>
                        <select
                          value={postJobForm.experienceRequired}
                          onChange={(e) => setPostJobForm({ ...postJobForm, experienceRequired: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value={0}>0 Years (Fresher Welcome)</option>
                          <option value={1}>1+ Year Experience</option>
                          <option value={2}>2+ Years Experience</option>
                          <option value={3}>3+ Years Experience</option>
                        </select>
                      </div>

                      {/* Education */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Education Required</label>
                        <select
                          value={postJobForm.educationRequired}
                          onChange={(e) => setPostJobForm({ ...postJobForm, educationRequired: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="10th Pass or below">10th Pass or below</option>
                          <option value="12th Pass">12th Pass</option>
                          <option value="Graduate / Diploma">Graduate / Diploma</option>
                          <option value="Any Education">Any Education</option>
                        </select>
                      </div>

                      {/* Bike Required */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Two-Wheeler / Bike</label>
                        <select
                          value={postJobForm.bikeRequired}
                          onChange={(e) => setPostJobForm({ ...postJobForm, bikeRequired: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="Yes">Yes (Bike Mandatory)</option>
                          <option value="No">No (Company Vehicle / Warehouse)</option>
                        </select>
                      </div>

                      {/* Driving License */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Driving License (DL)</label>
                        <select
                          value={postJobForm.drivingLicenseRequired}
                          onChange={(e) => setPostJobForm({ ...postJobForm, drivingLicenseRequired: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="Yes">Yes (Valid DL Mandatory)</option>
                          <option value="No">No (Not Required)</option>
                          <option value="Learner License">Learner License Accepted</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Step 6: Description, Responsibilities & Benefits */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-orange-400" />
                      6. Job Description & Benefits
                    </label>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Job Overview</label>
                        <textarea
                          rows={2}
                          value={postJobForm.description}
                          onChange={(e) => setPostJobForm({ ...postJobForm, description: e.target.value })}
                          placeholder="Brief description of the job..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Key Responsibilities</label>
                          <textarea
                            rows={2}
                            value={postJobForm.responsibilities}
                            onChange={(e) => setPostJobForm({ ...postJobForm, responsibilities: e.target.value })}
                            placeholder="Primary duties..."
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Benefits & Perks</label>
                          <textarea
                            rows={2}
                            value={postJobForm.benefits}
                            onChange={(e) => setPostJobForm({ ...postJobForm, benefits: e.target.value })}
                            placeholder="Insurance, fuel allowance, joining bonus..."
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Action Bar */}
                  <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Postings sync in realtime to Supabase and candidate feeds.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingJob || recruiters.length === 0}
                      className={`w-full sm:w-auto px-8 py-3 rounded-xl text-xs font-bold transition shadow-xl flex items-center justify-center gap-2 ${
                        submittingJob || recruiters.length === 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white cursor-pointer active:scale-95 shadow-orange-950/40'
                      }`}
                    >
                      {submittingJob ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Publishing Job to Supabase...</span>
                        </>
                      ) : (
                        <>
                          <Briefcase className="w-4 h-4" />
                          <span>Publish Job Instantly</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
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
