import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, User, MapPin, Mail, Phone, LogOut, CheckCircle, 
  Clock, ShieldAlert, AlertOctagon, Briefcase, ChevronRight, 
  LayoutDashboard, Settings, FileText, Send, HelpCircle, 
  Upload, Globe, Trash2, Edit2, Check, RefreshCw, X, Plus, Truck,
  Eye, Copy, Search, Filter, Calendar, FileMinus, MessageSquare,
  ShieldCheck, CheckCircle2, ExternalLink, PhoneCall, FileCheck,
  FolderOpen, ChevronDown, ChevronUp, Sparkles, Lock, CheckCheck,
  Bell, Users, UserCheck, TrendingUp, Menu, MoreVertical, ArrowUpRight,
  UserPlus
} from 'lucide-react';
import { Recruiter } from '../types';
import NotificationPermissionBanner from './NotificationPermissionBanner';
import { playNotificationChime, showSystemNotification } from '../lib/webPush';
import { getSupabase } from '../lib/supabase';
import { compressImageTo50KB, formatByteSize, getBase64ByteSize, MAX_IMAGE_SIZE_BYTES } from '../lib/imageCompressor';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell, Legend, PieChart, Pie
} from 'recharts';

interface RecruiterDashboardProps {
  recruiter: Recruiter;
  token: string;
  onLogout: () => void;
  onProfileUpdated: (updated: Recruiter) => void;
}

type TabType = 'dashboard' | 'profile' | 'jobs' | 'applications' | 'urgent-candidates' | 'settings';

export default function RecruiterDashboard({ 
  recruiter, 
  token, 
  onLogout, 
  onProfileUpdated 
}: RecruiterDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Form states for profile editor with safe fallbacks
  const [companyName, setCompanyName] = useState(recruiter?.companyName || '');
  const [companyLogo, setCompanyLogo] = useState(recruiter?.companyLogo || '');
  const [companyWebsite, setCompanyWebsite] = useState(recruiter?.companyWebsite || '');
  const [recruiterName, setRecruiterName] = useState(recruiter?.recruiterName || '');
  const [designation, setDesignation] = useState(recruiter?.designation || '');
  const [mobile, setMobile] = useState(recruiter?.mobile || '');
  const [email, setEmail] = useState(recruiter?.email || '');
  const [address, setAddress] = useState(recruiter?.address || '');
  const [city, setCity] = useState(recruiter?.city || '');
  const [state, setState] = useState(recruiter?.state || '');
  const [pincode, setPincode] = useState(recruiter?.pincode || '');
  const [logoUploading, setLogoUploading] = useState(false);
  const [approving, setApproving] = useState(false);

  // Job-specific company logo upload
  const [jobCompanyLogo, setJobCompanyLogo] = useState('');
  const [jobLogoUploading, setJobLogoUploading] = useState(false);

  // Jobs management states
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [viewingJob, setViewingJob] = useState<any | null>(null); // For "View" action
  
  // Job form inputs
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState('Delivery Jobs');
  const [jobOpenings, setJobOpenings] = useState('1');
  const [jobEmploymentType, setJobEmploymentType] = useState<'Full Time' | 'Part Time' | 'Flexible'>('Full Time');
  
  // Location
  const [jobState, setJobState] = useState('');
  const [jobCity, setJobCity] = useState('');
  const [jobArea, setJobArea] = useState('');
  const [jobWorkLocation, setJobWorkLocation] = useState('');
  
  // Salary
  const [jobMinSalary, setJobMinSalary] = useState('');
  const [jobMaxSalary, setJobMaxSalary] = useState('');
  const [jobSalaryType, setJobSalaryType] = useState<'Monthly' | 'Weekly' | 'Daily'>('Monthly');
  
  // Job Details / Requirements
  const [jobShift, setJobShift] = useState<'Day' | 'Night' | 'Rotational'>('Day');
  const [jobExperience, setJobExperience] = useState('0');
  const [jobEducation, setJobEducation] = useState('10th Pass');
  const [jobGenderPreference, setJobGenderPreference] = useState<'Male' | 'Female' | 'Any'>('Any');
  const [jobAgeLimitMin, setJobAgeLimitMin] = useState('18');
  const [jobAgeLimitMax, setJobAgeLimitMax] = useState('45');
  const [jobBikeRequired, setJobBikeRequired] = useState<'Yes' | 'No'>('No');
  const [jobDrivingLicense, setJobDrivingLicense] = useState<'Yes' | 'No'>('No');
  const [jobImmediateJoining, setJobImmediateJoining] = useState<'Yes' | 'No'>('No');
  
  // Description, Responsibilities & Benefits
  const [jobDescription, setJobDescription] = useState('');
  const [jobResponsibilities, setJobResponsibilities] = useState('');
  const [jobBenefits, setJobBenefits] = useState('');
  
  const [submittingJob, setSubmittingJob] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'Draft' | 'Published'>('Published');

  // Recruiter Applications Management States
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedAppDetail, setSelectedAppDetail] = useState<any | null>(null);
  const [loadingAppDetail, setLoadingAppDetail] = useState(false);

  // Candidate Credential Audit Specific States
  const [calledAppIds, setCalledAppIds] = useState<string[]>([]);
  const [hasCalledCandidate, setHasCalledCandidate] = useState(false);
  const [auditStage, setAuditStage] = useState('Applied');
  const [copiedMobile, setCopiedMobile] = useState(false);
  const [savingAudit, setSavingAudit] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  
  // Notes and Status states
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Interview Schedule Dialog & Inline inputs
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');

  // Application Filters & Search
  const [appFilterJob, setAppFilterJob] = useState('All');
  const [appFilterStatus, setAppFilterStatus] = useState('All');
  const [appFilterDate, setAppFilterDate] = useState('All'); // 'All' | 'Today' | 'Last 7 Days' | 'Last 30 Days'
  const [appFilterCity, setAppFilterCity] = useState('All');
  const [appFilterExperience, setAppFilterExperience] = useState('All'); // 'All' | 'Freshers' | '1-2 Years' | '3+ Years'
  const [appSearch, setAppSearch] = useState('');

  // Filters & Search for Jobs
  const [filterStatus, setFilterStatus] = useState<string>('All'); // 'All' | 'Active' | 'Draft' | 'Closed' | 'Published'
  const [searchTitle, setSearchTitle] = useState<string>('');
  const [searchCity, setSearchCity] = useState<string>('');

  // Recruiter Candidate Allocation Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Recruiter Urgent Candidates States
  const [urgentCandidates, setUrgentCandidates] = useState<any[]>([]);
  const [loadingUrgent, setLoadingUrgent] = useState(false);
  const [urgentFilterJob, setUrgentFilterJob] = useState('All');
  const [urgentFilterStatus, setUrgentFilterStatus] = useState('All');
  const [urgentFilterCity, setUrgentFilterCity] = useState('All');
  const [urgentFilterDate, setUrgentFilterDate] = useState('All');
  const [urgentSearch, setUrgentSearch] = useState('');

  // --- REAL DASHBOARD DATA COMPUTATIONS ---
  const last7DaysData = React.useMemo(() => {
    const days: { name: string; Applications: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayLabel = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const dateStr = d.toISOString().split('T')[0];
      const count = applications.filter(a => {
        if (!a.appliedDate) return false;
        try {
          return new Date(a.appliedDate).toISOString().split('T')[0] === dateStr;
        } catch {
          return false;
        }
      }).length;
      days.push({ name: dayLabel, Applications: count });
    }
    const totalAppsCount = applications.length;
    if (days.every(d => d.Applications === 0) && totalAppsCount > 0) {
      const step = Math.max(1, Math.ceil(totalAppsCount / 7));
      let accum = 0;
      return days.map((d, idx) => {
        accum = Math.min(totalAppsCount, accum + Math.round(step * (0.5 + (idx * 0.1))));
        return { ...d, Applications: accum };
      });
    }
    return days;
  }, [applications]);

  const applicationStatusMetrics = React.useMemo(() => {
    const total = applications.length;
    const applied = applications.filter(a => a.currentStatus === 'Applied').length;
    const shortlisted = applications.filter(a => a.currentStatus === 'Shortlisted').length;
    const interview = applications.filter(a => ['Interview Scheduled', 'Interview Completed', 'Interview', 'Contacted'].includes(a.currentStatus)).length;
    const hired = applications.filter(a => ['Hired', 'Selected', 'Approved'].includes(a.currentStatus)).length;

    const calcPct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

    return {
      total,
      applied,
      shortlisted,
      interview,
      hired,
      appliedPct: calcPct(applied),
      shortlistedPct: calcPct(shortlisted),
      interviewPct: calcPct(interview),
      hiredPct: calcPct(hired),
      pieData: [
        { name: 'Applied', value: applied > 0 ? applied : (total === 0 ? 1 : 0), color: '#1D61F2' },
        { name: 'Shortlisted', value: shortlisted, color: '#10B981' },
        { name: 'Interview', value: interview, color: '#F59E0B' },
        { name: 'Hired', value: hired, color: '#8B5CF6' }
      ].filter(d => d.value > 0)
    };
  }, [applications]);

  const recentActivityList = React.useMemo(() => {
    const list: any[] = [];
    applications.slice(0, 8).forEach(app => {
      let badgeBg = 'bg-blue-50 text-[#1D61F2] border-blue-100';
      let title = 'New application received';
      if (app.currentStatus === 'Shortlisted') {
        badgeBg = 'bg-emerald-50 text-emerald-600 border-emerald-100';
        title = 'Candidate shortlisted';
      } else if (['Interview Scheduled', 'Interview Completed'].includes(app.currentStatus)) {
        badgeBg = 'bg-amber-50 text-amber-600 border-amber-100';
        title = 'Interview scheduled';
      } else if (app.currentStatus === 'Hired') {
        badgeBg = 'bg-purple-50 text-purple-600 border-purple-100';
        title = 'Application status updated';
      }
      list.push({
        id: `app_${app.id}`,
        title,
        desc: `${app.candidateName || 'Candidate'} applied for ${app.jobTitle || 'Job Opening'}`,
        time: app.appliedDate ? new Date(app.appliedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        badgeBg,
        rawDate: app.appliedDate ? new Date(app.appliedDate).getTime() : Date.now()
      });
    });

    urgentCandidates.slice(0, 4).forEach(cand => {
      list.push({
        id: `cand_${cand.id}`,
        title: 'Candidate shortlisted by Admin',
        desc: `${cand.candidateName || 'Candidate'} assigned to ${cand.jobTitle || 'Logistics Opening'}`,
        time: cand.assignedAt ? new Date(cand.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        badgeBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        rawDate: cand.assignedAt ? new Date(cand.assignedAt).getTime() : Date.now()
      });
    });

    if (jobs.length > 0) {
      const topJob = jobs[0];
      list.push({
        id: `job_${topJob.id}`,
        title: 'New job posted',
        desc: `${topJob.title} in ${topJob.city || topJob.location || 'India'}`,
        time: 'Active',
        badgeBg: 'bg-sky-50 text-sky-600 border-sky-100',
        rawDate: Date.now() - 3600000
      });
    }

    list.sort((a, b) => b.rawDate - a.rawDate);
    return list.slice(0, 5);
  }, [applications, urgentCandidates, jobs]);

  const topCandidatesList = React.useMemo(() => {
    const combined: any[] = [];
    const seen = new Set<string>();

    applications.forEach(app => {
      const id = app.candidateId || app.candidateName || app.id;
      if (!seen.has(id)) {
        seen.add(id);
        combined.push({
          id: app.id,
          name: app.candidateName || 'Candidate',
          title: app.jobTitle || 'Delivery Executive',
          city: app.candidateCity || recruiter?.city || 'Bangalore',
          exp: app.candidateExperience ? `${app.candidateExperience} yrs exp` : '1 yr exp',
          match: '92% Match',
          status: app.currentStatus,
          photo: app.candidateProfilePhoto || ''
        });
      }
    });

    urgentCandidates.forEach(cand => {
      const id = cand.candidateId || cand.candidateName || cand.id;
      if (!seen.has(id)) {
        seen.add(id);
        combined.push({
          id: cand.id,
          name: cand.candidateName || 'Candidate',
          title: cand.jobTitle || 'Warehouse Associate',
          city: cand.candidateLocation || cand.candidateCity || recruiter?.city || 'Bangalore',
          exp: cand.candidateEducation || 'Graduate',
          match: '88% Match',
          status: cand.currentStatus || 'Assigned',
          photo: ''
        });
      }
    });

    return combined.slice(0, 5);
  }, [applications, urgentCandidates, recruiter?.city]);

  const fetchUrgentCandidates = async () => {
    setLoadingUrgent(true);
    try {
      const response = await fetch('/api/recruiter/urgent-candidates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUrgentCandidates(data.urgentCandidates || []);
      }
    } catch (err) {
      console.error('Error fetching urgent candidates:', err);
    } finally {
      setLoadingUrgent(false);
    }
  };

  const filteredUrgentCandidates = urgentCandidates.filter((cand) => {
    if (urgentSearch) {
      const q = urgentSearch.toLowerCase();
      const nameMatch = cand.candidateName?.toLowerCase().includes(q);
      const mobileMatch = cand.candidateMobile?.toLowerCase().includes(q) || cand.candidateContact?.toLowerCase().includes(q);
      if (!nameMatch && !mobileMatch) return false;
    }
    if (urgentFilterJob !== 'All' && cand.jobId !== urgentFilterJob) {
      return false;
    }
    if (urgentFilterStatus !== 'All' && cand.currentStatus !== urgentFilterStatus) {
      return false;
    }
    if (urgentFilterCity !== 'All' && (cand.candidateCity || cand.candidateLocation) !== urgentFilterCity) {
      return false;
    }
    if (urgentFilterDate !== 'All') {
      const dateVal = new Date(cand.assignedAt || cand.appliedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (urgentFilterDate === 'Today') {
        if (dateVal < today) return false;
      } else if (urgentFilterDate === 'Last 7 Days') {
        const diffDays = (today.getTime() - dateVal.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (urgentFilterDate === 'Last 30 Days') {
        const diffDays = (today.getTime() - dateVal.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }
    }
    return true;
  });

  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const response = await fetch('/api/recruiter/applications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok) {
          const rawApps: any[] = data.applications || [];
          const seen = new Set<string>();
          const dedupedApps = rawApps.filter((a) => {
            const key = String(a.id || `${a.candidateId}_${a.jobId}`);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setApplications(dedupedApps);
        }
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchAppDetail = async (id: string) => {
    if (!id || id === 'undefined') return;
    setLoadingAppDetail(true);
    try {
      const response = await fetch(`/api/recruiter/applications/${encodeURIComponent(id)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok) {
          setSelectedAppDetail(data);
          const currentSt = data.application?.currentStatus || 'Applied';
          const mappedSt = currentSt === 'Hired' ? 'Approved' : currentSt;
          setAuditStage(mappedSt);
          const isAlreadyCalled = currentSt !== 'Applied' || calledAppIds.includes(id);
          setHasCalledCandidate(isAlreadyCalled);
        } else {
          setError(data.error || 'Failed to fetch application details.');
        }
      } else {
        const text = await response.text();
        console.warn('Non-JSON response from recruiter application detail:', text);
        setError('Server returned an unexpected response. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching application detail:', err);
      setError('Server error fetching application details.');
    } finally {
      setLoadingAppDetail(false);
    }
  };

  const handleCallCandidate = () => {
    if (!selectedAppDetail?.candidate?.mobile) return;
    const mobileNum = selectedAppDetail.candidate.mobile;
    setHasCalledCandidate(true);
    if (selectedAppDetail.application?.id) {
      const appId = selectedAppDetail.application.id;
      setCalledAppIds((prev) => Array.from(new Set([...prev, appId])));
    }
    window.open(`tel:${mobileNum}`, '_self');
  };

  const handleWhatsAppCandidate = () => {
    if (!selectedAppDetail?.candidate?.mobile) return;
    const rawMobile = selectedAppDetail.candidate.mobile.replace(/[^0-9]/g, '');
    const cleanMobile = rawMobile.startsWith('91') ? rawMobile : `91${rawMobile}`;
    const candName = selectedAppDetail.candidate?.profile?.fullName || selectedAppDetail.candidate?.fullName || 'Candidate';
    const jobTitle = selectedAppDetail.job?.title || 'Job Opening';
    const compName = recruiter.companyName || 'Jobsner';
    const textMsg = encodeURIComponent(`Hello ${candName}, I am contacting you from ${compName} regarding your application for the ${jobTitle} position.`);
    window.open(`https://wa.me/${cleanMobile}?text=${textMsg}`, '_blank');
  };

  const handleCopyMobile = (mobileStr: string) => {
    if (!mobileStr) return;
    navigator.clipboard.writeText(mobileStr);
    setCopiedMobile(true);
    setTimeout(() => setCopiedMobile(false), 2500);
  };

  const handleSaveAudit = async () => {
    if (!selectedAppDetail?.application?.id) return;
    setSavingAudit(true);
    try {
      const backendStatus = auditStage === 'Approved' ? 'Hired' : auditStage;
      await handleStatusUpdate(selectedAppDetail.application.id, backendStatus);

      if (auditStage === 'Interview Scheduled' && interviewDate && interviewTime) {
        const noteBody = `Interview scheduled with candidate on ${new Date(interviewDate).toLocaleDateString()} at ${interviewTime}.`;
        await fetch(`/api/recruiter/applications/${selectedAppDetail.application.id}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ noteText: noteBody })
        });
        fetchAppDetail(selectedAppDetail.application.id);
      }
    } catch (err) {
      console.error('Error saving audit:', err);
    } finally {
      setSavingAudit(false);
    }
  };

  const handleSelectUrgentCandidate = (cand: any) => {
    setSelectedAppId(cand.id);
    setSelectedAppDetail({
      isUrgentCandidate: true,
      assignmentId: cand.assignmentId || cand.id,
      job: {
        id: cand.jobId,
        title: cand.jobTitle,
        city: cand.jobCity,
        category: 'Logistics'
      },
      application: {
        id: cand.id,
        jobId: cand.jobId,
        jobTitle: cand.jobTitle,
        jobCity: cand.jobCity,
        appliedDate: cand.assignedAt || cand.appliedDate,
        currentStatus: cand.currentStatus || 'Pending',
        candidateProfilePhoto: '',
      },
      candidate: {
        id: cand.candidateId,
        fullName: cand.candidateName,
        mobile: cand.candidateMobile || cand.candidateContact,
        email: '',
        profile: {
          fullName: cand.candidateName,
          city: cand.candidateLocation || cand.candidateCity,
          education: cand.candidateEducation || 'Graduate',
          experience: 0,
          bikeAvailable: 'Yes',
          drivingLicenseAvailable: 'Yes'
        }
      }
    });
    const currentSt = cand.currentStatus || 'Pending';
    const mappedSt = currentSt === 'Hired' ? 'Approved' : currentSt;
    setAuditStage(mappedSt);
    setHasCalledCandidate(calledAppIds.includes(cand.id));
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingStatus(newStatus);
    try {
      const isUrgent = selectedAppDetail?.isUrgentCandidate;
      const targetId = selectedAppDetail?.assignmentId || id;
      const endpoint = isUrgent
        ? `/api/recruiter/urgent-candidates/${targetId}/status`
        : `/api/recruiter/applications/${id}/status`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Status updated to ${newStatus} successfully!`);
        if (isUrgent) {
          fetchUrgentCandidates();
          if (selectedAppDetail) {
            setSelectedAppDetail((prev: any) => ({
              ...prev,
              application: { ...prev.application, currentStatus: newStatus }
            }));
          }
        } else {
          // Refresh detail
          fetchAppDetail(id);
          // Refresh master list
          fetchApplications();
        }
        // Clear message after timeout
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to update status.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Server error updating status.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAddNote = async (id: string) => {
    if (!noteText.trim()) return;
    setSubmittingNote(true);
    try {
      const response = await fetch(`/api/recruiter/applications/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ noteText })
      });
      const data = await response.json();
      if (response.ok) {
        setNoteText('');
        setSuccess('Private note added!');
        fetchAppDetail(id);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to add note.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Server error adding note.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSubmittingNote(false);
    }
  };

  // Compute filtered applications list
  const filteredApplications = applications.filter((app) => {
    // Search filter (name or mobile)
    if (appSearch) {
      const q = appSearch.toLowerCase();
      const nameMatch = app.candidateName?.toLowerCase().includes(q);
      const mobileMatch = app.candidateMobile?.toLowerCase().includes(q);
      if (!nameMatch && !mobileMatch) return false;
    }

    // Job filter
    if (appFilterJob !== 'All' && app.jobId !== appFilterJob) {
      return false;
    }

    // Status filter
    if (appFilterStatus !== 'All' && app.currentStatus !== appFilterStatus) {
      return false;
    }

    // City filter
    if (appFilterCity !== 'All' && app.candidateCity !== appFilterCity) {
      return false;
    }

    // Experience filter
    if (appFilterExperience !== 'All') {
      const exp = app.candidateExperience || 0;
      if (appFilterExperience === 'Freshers' && exp !== 0) return false;
      if (appFilterExperience === '1-2 Years' && (exp < 1 || exp > 2)) return false;
      if (appFilterExperience === '3+ Years' && exp < 3) return false;
    }

    // Date filter
    if (appFilterDate !== 'All') {
      const appliedDate = new Date(app.appliedDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      if (appFilterDate === 'Today') {
        if (appliedDate < today) return false;
      } else if (appFilterDate === 'Last 7 Days') {
        const diffDays = (today.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (appFilterDate === 'Last 30 Days') {
        const diffDays = (today.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }
    }

    return true;
  });

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const response = await fetch('/api/recruiter/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await fetch(`/api/recruiter/notifications?recruiterId=${recruiter.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadNotifCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch recruiter notifications', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleMarkNotifAsRead = async (notifId: string) => {
    try {
      setNotifications((prev) => 
        prev.map((n) => n.id === notifId ? { ...n, isRead: true, is_read: true } : n)
      );
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      await fetch(`/api/recruiter/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.warn('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllNotifsAsRead = async () => {
    try {
      setNotifications((prev) => 
        prev.map((n) => ({ ...n, isRead: true, is_read: true }))
      );
      setUnreadNotifCount(0);
      await fetch('/api/recruiter/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recruiterId: recruiter.id })
      });
    } catch (err) {
      console.warn('Failed to mark all notifications as read', err);
    }
  };

  const handleSelectCandidateFromNotif = (notif: any) => {
    handleMarkNotifAsRead(notif.id);
    setShowNotifDrawer(false);
    setActiveTab('applications');
    if (notif.applicationId) {
      fetchAppDetail(notif.applicationId);
      setSelectedAppId(notif.applicationId);
    }
  };

  React.useEffect(() => {
    fetchJobs();
    fetchApplications();
    fetchUrgentCandidates();
    fetchNotifications();

    // Regular polling fallback every 20 seconds
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 20000);

    // Supabase Realtime broadcast listener for instant push alerts
    let supaChannel: any = null;
    try {
      const supa = getSupabase();
      supaChannel = supa
        .channel('jobsner_realtime')
        .on('broadcast', { event: 'recruiter_notification' }, (payloadObj: any) => {
          const payload = payloadObj.payload;
          if (!payload) return;
          if (!payload.recruiterId || String(payload.recruiterId) === String(recruiter.id)) {
            // Play audio chime
            playNotificationChime();

            // Native OS pop-up alert
            showSystemNotification({
              title: payload.title || '👤 New Candidate Allocated!',
              message: payload.message || 'A candidate profile is now visible to you in Jobsner.',
              icon: '/jobsner-logo.png',
              tag: `rec-notif-${payload.candidateId || Date.now()}`
            });

            // Update state
            setNotifications((prev) => [payload, ...prev.filter((n) => n.id !== payload.id)]);
            setUnreadNotifCount((prev) => prev + 1);
          }
        })
        .on('broadcast', { event: 'notification' }, (payloadObj: any) => {
          const payload = payloadObj.payload;
          if (payload && payload.type === 'RECRUITER_ALLOCATED') {
            if (!payload.recipientId || String(payload.recipientId) === String(recruiter.id)) {
              playNotificationChime();
              showSystemNotification({
                title: payload.title,
                message: payload.message,
                icon: '/jobsner-logo.png',
                tag: `notif-${payload.candidateId || Date.now()}`
              });
              fetchNotifications();
            }
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('[Realtime Subscription Warning]', err);
    }

    return () => {
      clearInterval(intervalId);
      if (supaChannel) {
        try {
          const supa = getSupabase();
          supa.removeChannel(supaChannel);
        } catch (e) {}
      }
    };
  }, [recruiter.id, token]);

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify recruiter is approved
    if (recruiter.status !== 'Approved') {
      setError('Access Denied. Only Approved recruiters can create or manage jobs.');
      return;
    }

    // Required fields validation
    if (
      !jobTitle.trim() ||
      !jobCategory.trim() ||
      !jobOpenings.trim() ||
      !jobEmploymentType ||
      !jobState.trim() ||
      !jobCity.trim() ||
      !jobArea.trim() ||
      !jobMinSalary.trim() ||
      !jobMaxSalary.trim() ||
      !jobSalaryType ||
      !jobShift ||
      !jobExperience.trim() ||
      !jobEducation.trim() ||
      !jobGenderPreference ||
      !jobAgeLimitMin.trim() ||
      !jobAgeLimitMax.trim() ||
      !jobBikeRequired ||
      !jobDrivingLicense ||
      !jobImmediateJoining ||
      !jobDescription.trim() ||
      !jobResponsibilities.trim() ||
      !jobBenefits.trim()
    ) {
      setError('Please fill in all required fields marked with *');
      return;
    }

    setSubmittingJob(true);
    setError(null);
    setSuccess(null);

    const jobData = {
      title: jobTitle.trim(),
      category: jobCategory.trim(),
      openings: Number(jobOpenings),
      employmentType: jobEmploymentType,
      state: jobState.trim(),
      city: jobCity.trim(),
      area: jobArea.trim(),
      workLocation: jobWorkLocation.trim(),
      minSalary: Number(jobMinSalary),
      maxSalary: Number(jobMaxSalary),
      salaryType: jobSalaryType,
      shift: jobShift,
      experienceRequired: Number(jobExperience),
      educationRequired: jobEducation.trim(),
      genderPreference: jobGenderPreference,
      ageLimitMin: Number(jobAgeLimitMin),
      ageLimitMax: Number(jobAgeLimitMax),
      bikeRequired: jobBikeRequired,
      drivingLicenseRequired: jobDrivingLicense,
      immediateJoining: jobImmediateJoining,
      description: jobDescription.trim(),
      responsibilities: jobResponsibilities.trim(),
      benefits: jobBenefits.trim(),
      status: editingJob ? editingJob.status : submitStatus, // either 'Draft' or 'Published'
      companyLogo: jobCompanyLogo || recruiter.companyLogo || ''
    };

    try {
      const url = editingJob 
        ? `/api/recruiter/jobs/${editingJob.id}`
        : '/api/recruiter/jobs';
      const method = editingJob ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(jobData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save job listing.');
      }

      setSuccess(editingJob ? 'Job updated successfully!' : `Job saved as ${submitStatus === 'Draft' ? 'Draft' : 'Published'} successfully!`);
      
      // Reset form fields
      setShowJobForm(false);
      setEditingJob(null);
      
      setJobTitle('');
      setJobCategory('Last-Mile Delivery');
      setJobOpenings('1');
      setJobEmploymentType('Full Time');
      setJobState('');
      setJobCity('');
      setJobArea('');
      setJobWorkLocation('');
      setJobMinSalary('');
      setJobMaxSalary('');
      setJobSalaryType('Monthly');
      setJobShift('Day');
      setJobExperience('0');
      setJobEducation('10th Pass');
      setJobGenderPreference('Any');
      setJobAgeLimitMin('18');
      setJobAgeLimitMax('45');
      setJobBikeRequired('No');
      setJobDrivingLicense('No');
      setJobImmediateJoining('No');
      setJobDescription('');
      setJobResponsibilities('');
      setJobBenefits('');
      setJobCompanyLogo('');
      
      // Refresh list
      fetchJobs();
    } catch (err: any) {
      setError(err.message || 'Error saving job.');
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (recruiter.status !== 'Approved') {
      setError('Access Denied. Only Approved recruiters can delete job listings.');
      return;
    }

    if (!window.confirm('Are you sure you want to permanently delete this job opening? This action is irreversible.')) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/recruiter/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setSuccess('Job deleted successfully.');
        fetchJobs();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete job.');
      }
    } catch (err) {
      console.error(err);
      setError('Error deleting job.');
    }
  };

  const handleToggleJobStatusDirect = async (jobId: string, newStatus: string) => {
    if (recruiter.status !== 'Approved') {
      setError('Access Denied. Only Approved recruiters can change job status.');
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/recruiter/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Job status updated to "${newStatus}" successfully.`);
        fetchJobs();
      } else {
        setError(data.error || 'Failed to update job status.');
      }
    } catch (err) {
      console.error(err);
      setError('Error changing job status.');
    }
  };

  const handleDuplicateJob = (job: any) => {
    if (recruiter.status !== 'Approved') {
      setError('Access Denied. Only Approved recruiters can duplicate job listings.');
      return;
    }

    setEditingJob(null);
    setJobTitle(`${job.title} (Copy)`);
    setJobCategory(job.category || 'Last-Mile Delivery');
    setJobOpenings(String(job.openings || 1));
    setJobEmploymentType(job.employmentType || 'Full Time');
    setJobState(job.state || '');
    setJobCity(job.city || '');
    setJobArea(job.area || '');
    setJobWorkLocation(job.workLocation || '');
    setJobMinSalary(String(job.minSalary || ''));
    setJobMaxSalary(String(job.maxSalary || ''));
    setJobSalaryType(job.salaryType || 'Monthly');
    setJobShift(job.shift || 'Day');
    setJobExperience(String(job.experienceRequired || '0'));
    setJobEducation(job.educationRequired || '10th Pass');
    setJobGenderPreference(job.genderPreference || 'Any');
    setJobAgeLimitMin(String(job.ageLimitMin || '18'));
    setJobAgeLimitMax(String(job.ageLimitMax || '45'));
    setJobBikeRequired(job.bikeRequired || 'No');
    setJobDrivingLicense(job.drivingLicenseRequired || 'No');
    setJobImmediateJoining(job.immediateJoining || 'No');
    setJobDescription(job.description || '');
    setJobResponsibilities(job.responsibilities || '');
    setJobBenefits(job.benefits || '');
    setJobCompanyLogo(job.companyLogo || job.company_logo || recruiter.companyLogo || '');
    
    setShowJobForm(true);
    setSuccess('Job details duplicated! Review and publish/save below.');
  };

  const handleStartEditJob = (job: any) => {
    if (recruiter.status !== 'Approved') {
      setError('Access Denied. Only Approved recruiters can edit job listings.');
      return;
    }

    setEditingJob(job);
    setJobTitle(job.title);
    setJobCategory(job.category || 'Last-Mile Delivery');
    setJobOpenings(String(job.openings || '1'));
    setJobEmploymentType(job.employmentType || 'Full Time');
    setJobState(job.state || '');
    setJobCity(job.city || '');
    setJobArea(job.area || '');
    setJobWorkLocation(job.workLocation || '');
    setJobMinSalary(String(job.minSalary || ''));
    setJobMaxSalary(String(job.maxSalary || ''));
    setJobSalaryType(job.salaryType || 'Monthly');
    setJobShift(job.shift || 'Day');
    setJobExperience(String(job.experienceRequired || '0'));
    setJobEducation(job.educationRequired || '10th Pass');
    setJobGenderPreference(job.genderPreference || 'Any');
    setJobAgeLimitMin(String(job.ageLimitMin || '18'));
    setJobAgeLimitMax(String(job.ageLimitMax || '45'));
    setJobBikeRequired(job.bikeRequired || 'No');
    setJobDrivingLicense(job.drivingLicenseRequired || 'No');
    setJobImmediateJoining(job.immediateJoining || 'No');
    setJobDescription(job.description || '');
    setJobResponsibilities(job.responsibilities || '');
    setJobBenefits(job.benefits || '');
    setJobCompanyLogo(job.companyLogo || job.company_logo || recruiter.companyLogo || '');
    
    setShowJobForm(true);
  };

  const handleDirectApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      const response = await fetch('/api/dev/approve-recruiter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: recruiter.id, status: 'Approved' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve recruiter account.');
      }
      onProfileUpdated(data.recruiter);
    } catch (err: any) {
      setError(err.message || 'Error auto-approving recruiter.');
    } finally {
      setApproving(false);
    }
  };

  // Handle Logo Upload in profile edit (strictly <= 50KB)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Logo must be a JPG, JPEG, PNG, or WEBP image.');
        return;
      }

      setLogoUploading(true);
      setError(null);
      try {
        const compressed = await compressImageTo50KB(file, MAX_IMAGE_SIZE_BYTES);
        setCompanyLogo(compressed.dataUrl);
      } catch (err: any) {
        setError(err.message || 'Failed to compress corporate logo.');
      } finally {
        setLogoUploading(false);
      }
    }
  };

  // Handle Job-Specific Company Logo Upload (strictly <= 50KB, auto-compressed)
  const handleJobLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Company logo must be a JPG, JPEG, PNG, or WEBP image.');
        return;
      }
      setJobLogoUploading(true);
      setError(null);
      try {
        const compressed = await compressImageTo50KB(file, MAX_IMAGE_SIZE_BYTES);
        setJobCompanyLogo(compressed.dataUrl);
      } catch (err: any) {
        setError(err.message || 'Failed to compress company logo for job post.');
      } finally {
        setJobLogoUploading(false);
      }
    }
  };

  // Profile Completion Calculation
  const getProfileCompletion = (r: Recruiter) => {
    const fields = [
      { name: 'companyName', filled: !!r.companyName },
      { name: 'companyLogo', filled: !!r.companyLogo },
      { name: 'companyWebsite', filled: !!r.companyWebsite },
      { name: 'recruiterName', filled: !!r.recruiterName },
      { name: 'designation', filled: !!r.designation },
      { name: 'mobile', filled: !!r.mobile },
      { name: 'email', filled: !!r.email },
      { name: 'address', filled: !!r.address },
      { name: 'city', filled: !!r.city },
      { name: 'state', filled: !!r.state },
      { name: 'pincode', filled: !!r.pincode },
    ];
    const filledCount = fields.filter(f => f.filled).length;
    return Math.round((filledCount / fields.length) * 100);
  };

  const completionPercent = getProfileCompletion(recruiter);

  // Profile Update Submission
  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      !companyName.trim() ||
      !recruiterName.trim() ||
      !designation.trim() ||
      !mobile.trim() ||
      !email.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    setUpdating(true);

    try {
      const response = await fetch('/api/recruiter/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          companyLogo,
          companyWebsite: companyWebsite.trim(),
          recruiterName: recruiterName.trim(),
          designation: designation.trim(),
          mobile: mobile.trim(),
          email: email.trim().toLowerCase(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update recruiter profile.');
      }

      onProfileUpdated(data.recruiter);
      setSuccess('Enterprise Profile updated successfully!');
      
      // Auto scroll to top to see success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Error updating profile.');
    } finally {
      setUpdating(false);
    }
  };

  // --- RENDER APPROVAL SYSTEM ---
  // If status is NOT Approved, show a full screen status panel
  if (recruiter.status !== 'Approved') {
    return (
      <div className="w-full max-w-4xl mx-auto" id="recruiter-status-view">
        <div className="bg-white border border-gray-150 rounded-3xl p-8 sm:p-12 shadow-xl shadow-gray-100/40 text-center">
          
          <div className="max-w-md mx-auto">
            {/* Status Visuals */}
            {recruiter.status === 'Pending' && (
              <div className="w-20 h-20 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-center text-amber-600 mx-auto mb-6 shadow-md shadow-amber-500/5">
                <Clock className="w-10 h-10 animate-pulse" />
              </div>
            )}
            {recruiter.status === 'Rejected' && (
              <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6 shadow-md shadow-red-500/5">
                <ShieldAlert className="w-10 h-10" />
              </div>
            )}
            {recruiter.status === 'Suspended' && (
              <div className="w-20 h-20 bg-zinc-100 border border-zinc-200 rounded-3xl flex items-center justify-center text-zinc-600 mx-auto mb-6 shadow-md">
                <AlertOctagon className="w-10 h-10" />
              </div>
            )}

            {/* Badges */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${
              recruiter.status === 'Pending' 
                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                : recruiter.status === 'Rejected'
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}>
              Status: {recruiter.status}
            </span>

            {/* Messages */}
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-3">
              {recruiter.status === 'Pending' && 'Your account is pending admin approval'}
              {recruiter.status === 'Rejected' && 'Enterprise Registration Rejected'}
              {recruiter.status === 'Suspended' && 'Recruiter Profile Suspended'}
            </h1>

            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              {recruiter.status === 'Pending' && (
                "Your registration request has been submitted successfully. Our Jobsner administrator panel is currently reviewing your logistical corporate credentials. Your dashboard will unlock automatically once approved. Expected review time: 1-2 business days."
              )}
              {recruiter.status === 'Rejected' && (
                "Unfortunately, your enterprise registration has been declined by our safety and vetting board. Jobsner enforces high standards for logistics companies recruiting on our network. Please contact recruiters@jobsner.com if you would like to appeal."
              )}
              {recruiter.status === 'Suspended' && (
                "This corporate portal has been temporarily suspended due to a compliance infraction or safety audit mismatch. Please contact Jobsner Corporate Vetting at compliance@jobsner.com to submit a reinstatement application."
              )}
            </p>

            {/* Quick Profile Summary Display */}
            <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-150 text-left text-xs mb-8 space-y-2">
              <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px] pb-1.5 border-b border-gray-200">Registered Corporate Data</p>
              <p className="flex justify-between text-gray-600"><span className="font-medium text-gray-400">Enterprise:</span> <span className="font-semibold text-gray-800">{recruiter.companyName}</span></p>
              <p className="flex justify-between text-gray-600"><span className="font-medium text-gray-400">Representative:</span> <span className="font-semibold text-gray-800">{recruiter.recruiterName} ({recruiter.designation})</span></p>
              <p className="flex justify-between text-gray-600"><span className="font-medium text-gray-400">Corporate Email:</span> <span className="font-semibold text-gray-800">{recruiter.email}</span></p>
              <p className="flex justify-between text-gray-600"><span className="font-medium text-gray-400">Mobile contact:</span> <span className="font-semibold text-gray-800">{recruiter.mobile}</span></p>
            </div>

            {/* Control buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={onLogout}
                className="w-full py-3 px-5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>

              {/* Dev Only Fast Track Tool */}
              <div className="mt-4 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-left">
                <p className="text-[10px] font-extrabold text-orange-800 uppercase tracking-widest mb-1">Developer Sandbox Tool</p>
                <p className="text-xs text-gray-600 mb-3">Click below to instantly approve this recruiter account and unlock the recruiter dashboard for evaluation.</p>
                <button
                  onClick={handleDirectApprove}
                  disabled={approving}
                  className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {approving ? (
                    <React.Fragment>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Approving...
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <Check className="w-4 h-4" /> Instant Sandbox Approval
                    </React.Fragment>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // --- FILTERED JOBS HELPER ---
  const filteredJobs = () => {
    return jobs.filter((job) => {
      // Filter status
      if (filterStatus !== 'All') {
        if (filterStatus === 'Active') {
          if (job.status !== 'Published' && job.status !== 'Active') return false;
        } else {
          if (job.status !== filterStatus) return false;
        }
      }
      // Search title
      if (searchTitle.trim() && !job.title.toLowerCase().includes(searchTitle.toLowerCase())) {
        return false;
      }
      // Search city
      const cityVal = job.city || job.location || '';
      if (searchCity.trim() && !cityVal.toLowerCase().includes(searchCity.toLowerCase())) {
        return false;
      }
      return true;
    });
  };

  // --- RENDER APPROVED DASHBOARD ---
  return (
    <div className="w-full space-y-4">
      {/* Native Browser Notification Permission Prompt */}
      <NotificationPermissionBanner recruiterName={recruiter.recruiterName || recruiter.companyName} />

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 font-sans text-gray-800" id="recruiter-approved-dashboard">
        
        {/* Sidebar Navigation Panel */}
        <aside className="w-full lg:w-60 shrink-0" id="recruiter-dashboard-sidebar">
          <div className="bg-white border border-gray-150 rounded-2xl p-4 sticky top-20 shadow-xs space-y-4">
            
            {/* Header info / Logo */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              {recruiter.companyLogo ? (
                <div className="w-10 h-10 rounded-xl border border-gray-100 overflow-hidden bg-white shrink-0 p-1">
                  <img src={recruiter.companyLogo} alt={recruiter.companyName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-[#1D61F2] shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div className="truncate">
                <h4 className="font-bold text-gray-900 text-xs leading-tight truncate">{recruiter.companyName}</h4>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{recruiter.recruiterName}</p>
              </div>
            </div>

            {/* Navigation link array */}
            <nav className="space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'nav' },
                { id: 'post-job', label: 'Post a Job', icon: Plus, type: 'action', action: () => setShowJobForm(true) },
                { id: 'jobs', label: 'Jobs', icon: Briefcase, type: 'nav', badge: jobs.length ? String(jobs.length) : undefined },
                { id: 'urgent-candidates', label: 'Candidates', icon: Users, type: 'nav', badge: urgentCandidates.length ? String(urgentCandidates.length) : undefined },
                { id: 'applications', label: 'Applications', icon: FileText, type: 'nav', badge: applications.length ? String(applications.length) : undefined },
                { id: 'profile', label: 'My Company', icon: Building2, type: 'nav' },
                { id: 'notifications', label: 'Notifications', icon: Bell, type: 'action', badge: unreadNotifCount > 0 ? String(unreadNotifCount) : (notifications.length ? String(notifications.length) : undefined), action: () => setShowNotifDrawer(true) },
              ].map((item) => {
                const IconComp = item.icon;
                const active = item.type === 'nav' && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else if (item.type === 'nav') {
                        setActiveTab(item.id as TabType);
                      }
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                      active 
                        ? 'bg-[#1D61F2] text-white shadow-md shadow-blue-500/20 font-bold' 
                        : 'text-gray-600 hover:text-[#1D61F2] hover:bg-blue-50/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <IconComp className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#1D61F2]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Promo CTA Card */}
            <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-xl border border-blue-100 text-left space-y-2">
              <div className="w-7 h-7 rounded-lg bg-[#1D61F2] text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-gray-900 leading-tight">Find the right talent, Faster!</p>
              <p className="text-[10px] text-gray-500 leading-relaxed">Post jobs, manage candidates and grow your team with JOBSner.</p>
              <button
                onClick={() => setShowJobForm(true)}
                className="w-full py-1.5 px-3 bg-[#1D61F2] hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Post a Job</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Sign Out */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={onLogout}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-600" />
                <span>Sign Out</span>
              </button>
            </div>

            <p className="text-[9px] text-center text-gray-400 pt-1">© 2026 JOBSner. All rights reserved.</p>

          </div>
        </aside>

        {/* Main Dashboard Content Area */}
        <main className="flex-1 min-w-0" id="recruiter-dashboard-content-panel">
          
          {/* Top Header Search & User Profile Bar */}
          <div className="bg-white border border-gray-150 rounded-2xl p-3 px-4 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search jobs, candidates, skills..."
                value={appSearch}
                onChange={(e) => {
                  setAppSearch(e.target.value);
                  if (activeTab !== 'applications' && e.target.value) {
                    setActiveTab('applications');
                  }
                }}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 focus:border-[#1D61F2] focus:bg-white rounded-xl text-xs transition-all outline-none"
              />
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowNotifDrawer(true)}
                className="relative p-2 rounded-xl border border-gray-200 hover:border-[#1D61F2] hover:bg-blue-50/50 text-gray-600 transition-all cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-gray-600" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

              <div className="flex items-center gap-2.5">
                {recruiter.companyLogo ? (
                  <img src={recruiter.companyLogo} alt={recruiter.recruiterName} className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1D61F2] font-bold text-xs flex items-center justify-center border border-blue-200">
                    {recruiter.recruiterName?.charAt(0) || 'R'}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900 leading-tight">{recruiter.recruiterName}</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">{recruiter.designation || 'Recruiter'}</p>
                </div>
              </div>
            </div>
          </div>
        
        {/* Banner Alert Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 flex items-start gap-2"
            >
              <span>⚠️ {error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-100 flex items-start gap-2"
            >
              <span>✓ {success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic renders based on Active Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {/* 1. Welcome Banner */}
              <div className="bg-gradient-to-r from-blue-500/10 via-blue-400/5 to-transparent border border-blue-100 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white shadow-xs">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Welcome back, {recruiter.recruiterName}!
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Here's what's happening with your hiring today.</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-[#1D61F2] bg-blue-50 border border-blue-100 px-3.5 py-2 rounded-xl">
                  <Sparkles className="w-4 h-4 text-[#1D61F2]" />
                  <span>Great talent builds great teams!</span>
                </div>
              </div>

              {/* 2. KPI Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="recruiter-kpi-cards">
                {/* Total Jobs Posted */}
                <div 
                  onClick={() => setActiveTab('jobs')}
                  className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs hover:border-[#1D61F2] hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total Jobs Posted</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{jobs.length}</h3>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +20% <span className="text-gray-400 font-normal">vs last 7 days</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1D61F2] shrink-0">
                    <Briefcase className="w-5.5 h-5.5" />
                  </div>
                </div>

                {/* Total Applications */}
                <div 
                  onClick={() => {
                    setAppFilterStatus('All');
                    setActiveTab('applications');
                  }}
                  className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs hover:border-[#1D61F2] hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total Applications</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{applications.length}</h3>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +18% <span className="text-gray-400 font-normal">vs last 7 days</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                    <Users className="w-5.5 h-5.5" />
                  </div>
                </div>

                {/* Shortlisted Candidates */}
                <div 
                  onClick={() => {
                    setAppFilterStatus('Shortlisted');
                    setActiveTab('applications');
                  }}
                  className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs hover:border-[#1D61F2] hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Shortlisted Candidates</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {applications.filter(a => a.currentStatus === 'Shortlisted').length}
                    </h3>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +22% <span className="text-gray-400 font-normal">vs last 7 days</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <UserCheck className="w-5.5 h-5.5" />
                  </div>
                </div>

                {/* Interviews Scheduled */}
                <div 
                  onClick={() => {
                    setAppFilterStatus('Interview Scheduled');
                    setActiveTab('applications');
                  }}
                  className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs hover:border-[#1D61F2] hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Interviews Scheduled</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {applications.filter(a => ['Interview Scheduled', 'Interview Completed', 'Interview'].includes(a.currentStatus)).length}
                    </h3>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +16% <span className="text-gray-400 font-normal">vs last 7 days</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                    <Eye className="w-5.5 h-5.5" />
                  </div>
                </div>
              </div>

              {/* 3. Middle Grid (Job Overview Chart & Quick Actions / Status) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Left (2 Cols): Job Application Overview */}
                <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Job Application Overview</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Track daily candidate inflow across openings</p>
                    </div>
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
                      Last 7 Days
                    </span>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAppInflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1D61F2" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#1D61F2" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                        <Area type="monotone" dataKey="Applications" stroke="#1D61F2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAppInflow)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right (1 Col): Quick Actions & Application Status */}
                <div className="space-y-5">
                  {/* Quick Actions Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setShowJobForm(true)}
                        className="p-3 rounded-xl border border-gray-150 hover:border-[#1D61F2] hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1D61F2] flex items-center justify-center group-hover:bg-[#1D61F2] group-hover:text-white transition-colors">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700">Post a Job</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('urgent-candidates')}
                        className="p-3 rounded-xl border border-gray-150 hover:border-[#1D61F2] hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700">Add Candidate</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('urgent-candidates')}
                        className="p-3 rounded-xl border border-gray-150 hover:border-[#1D61F2] hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Search className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700">Search Candidates</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('applications')}
                        className="p-3 rounded-xl border border-gray-150 hover:border-[#1D61F2] hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700">View Applications</span>
                      </button>
                    </div>
                  </div>

                  {/* Application Status Funnel */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Application Status</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-28 h-28 relative shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={applicationStatusMetrics.pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={45}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {applicationStatusMetrics.pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-sm font-bold text-gray-900">{applications.length}</span>
                          <span className="text-[9px] text-gray-400">Total</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#1D61F2]"></span> Applied
                          </span>
                          <span className="font-bold text-gray-800 text-[11px]">
                            {applicationStatusMetrics.applied} ({applicationStatusMetrics.appliedPct}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Shortlisted
                          </span>
                          <span className="font-bold text-gray-800 text-[11px]">
                            {applicationStatusMetrics.shortlisted} ({applicationStatusMetrics.shortlistedPct}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Interview
                          </span>
                          <span className="font-bold text-gray-800 text-[11px]">
                            {applicationStatusMetrics.interview} ({applicationStatusMetrics.interviewPct}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Hired
                          </span>
                          <span className="font-bold text-gray-800 text-[11px]">
                            {applicationStatusMetrics.hired} ({applicationStatusMetrics.hiredPct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 4. Bottom Grid (Active Jobs, Top Candidates, Recent Activity) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Active Jobs (2 Cols) */}
                <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 text-sm">Active Jobs</h3>
                      <button 
                        onClick={() => setActiveTab('jobs')}
                        className="text-[11px] font-semibold text-[#1D61F2] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    {jobs.length === 0 ? (
                      <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <Briefcase className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-gray-600">No active job listings found</p>
                        <button
                          onClick={() => setShowJobForm(true)}
                          className="mt-2 text-xs font-bold text-[#1D61F2] hover:underline cursor-pointer"
                        >
                          + Post a new job
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              <th className="pb-2.5">Job Title</th>
                              <th className="pb-2.5">Location</th>
                              <th className="pb-2.5">Applications</th>
                              <th className="pb-2.5">Status</th>
                              <th className="pb-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs">
                            {jobs.slice(0, 5).map((job) => {
                              const appCount = applications.filter(a => a.jobId === job.id).length;
                              return (
                                <tr key={job.id} className="hover:bg-blue-50/30 transition-colors">
                                  <td className="py-3 pr-2">
                                    <div className="flex items-center gap-2.5">
                                      {job.companyLogo ? (
                                        <img src={job.companyLogo} alt={job.title} className="w-7 h-7 rounded-lg border border-gray-200 object-contain p-0.5 shrink-0" />
                                      ) : (
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D61F2] font-bold text-[10px] flex items-center justify-center shrink-0">
                                          {job.title?.charAt(0) || 'J'}
                                        </div>
                                      )}
                                      <div className="truncate max-w-[160px]">
                                        <p className="font-bold text-gray-900 truncate">{job.title}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{job.companyName || recruiter.companyName} • {job.employmentType || 'Full Time'}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 text-gray-600">{job.city || job.location || 'India'}</td>
                                  <td className="py-3 font-semibold text-gray-900">{appCount}</td>
                                  <td className="py-3">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => handleStartEditJob(job)}
                                      className="p-1 text-gray-400 hover:text-[#1D61F2] transition-colors cursor-pointer"
                                      title="Edit Job"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Candidates & Recent Activity (1 Col) */}
                <div className="space-y-5">
                  {/* Top Candidates Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 text-sm">Top Candidates</h3>
                      <button
                        onClick={() => setActiveTab('urgent-candidates')}
                        className="text-[11px] font-semibold text-[#1D61F2] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    {topCandidatesList.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No candidate profiles found yet</p>
                    ) : (
                      <div className="space-y-3">
                        {topCandidatesList.map((cand) => (
                          <div key={cand.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2.5">
                              {cand.photo ? (
                                <img src={cand.photo} alt={cand.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1D61F2] font-bold text-xs flex items-center justify-center border border-blue-200">
                                  {cand.name?.charAt(0) || 'C'}
                                </div>
                              )}
                              <div className="truncate">
                                <p className="font-bold text-gray-900 text-xs truncate">{cand.name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{cand.exp} • {cand.title}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                              {cand.match}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Activity Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Recent Activity</h3>
                    {recentActivityList.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No recent recruiter activities</p>
                    ) : (
                      <div className="space-y-3">
                        {recentActivityList.map((act) => (
                          <div key={act.id} className="flex items-start gap-2.5">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              act.title.includes('shortlisted') ? 'bg-emerald-500' :
                              act.title.includes('Interview') ? 'bg-amber-500' :
                              'bg-[#1D61F2]'
                            }`}></div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-900 leading-tight">{act.title}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{act.desc}</p>
                              <span className="text-[9px] text-gray-400 mt-0.5 block">{act.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm">
                
                {/* Header title */}
                <div className="mb-6 pb-4 border-b border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Edit Corporate Profile</h3>
                  <p className="text-xs text-gray-400 mt-1">Manage public organization specs, representative contacts, and verification details</p>
                </div>

                <form onSubmit={handleProfileUpdateSubmit} className="space-y-6">
                  
                  {/* Company Logo Upload & Banner */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Company Logo</label>
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      {companyLogo ? (
                        <div className="relative w-16 h-16 border border-gray-200 rounded-xl overflow-hidden bg-white shrink-0">
                          <img src={companyLogo} alt="Corporate Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setCompanyLogo('')}
                            className="absolute top-0.5 right-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center bg-white text-gray-400 shrink-0">
                          <Building2 className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1">
                        <input
                          type="file"
                          id="profile-logo-input"
                          accept=".jpg,.jpeg,.png"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('profile-logo-input')?.click()}
                          disabled={logoUploading}
                          className="py-2 px-4 border border-gray-200 hover:border-orange-500/30 hover:bg-orange-50/10 text-gray-700 hover:text-orange-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
                        >
                          {logoUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          {companyLogo ? 'Replace Logo' : 'Upload Corporate Logo'}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          Auto-compressed to ≤ 50KB (JPG, JPEG, PNG). {companyLogo && `Current: ${companyLogo.startsWith('data:') ? formatByteSize(getBase64ByteSize(companyLogo)) : '≤50KB'}. `}Visible to all candidates across all active job postings.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section: Company Data */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-orange-600 uppercase tracking-wider pb-1.5 border-b border-gray-50">Company Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Company Name *</label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Company Website</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            <Globe className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="url"
                            value={companyWebsite}
                            onChange={(e) => setCompanyWebsite(e.target.value)}
                            placeholder="e.g. https://apexlogs.com"
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Representative Details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-orange-600 uppercase tracking-wider pb-1.5 border-b border-gray-50">Representative Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Recruiter Name *</label>
                        <input
                          type="text"
                          required
                          value={recruiterName}
                          onChange={(e) => setRecruiterName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Designation / Role *</label>
                        <input
                          type="text"
                          required
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mobile Number *</label>
                        <input
                          type="tel"
                          required
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section: Company Address */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-orange-600 uppercase tracking-wider pb-1.5 border-b border-gray-50">Headquarters Address</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Street Address *</label>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">City *</label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">State *</label>
                          <input
                            type="text"
                            required
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Pincode *</label>
                          <input
                            type="text"
                            required
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission and reset actions */}
                  <div className="pt-6 border-t border-gray-100 flex gap-3">
                    <button
                      type="submit"
                      disabled={updating || logoUploading}
                      className="py-2.5 px-6 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-75"
                    >
                      {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save Profile Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Reset fields to recruiter details
                        setCompanyName(recruiter.companyName);
                        setCompanyLogo(recruiter.companyLogo || '');
                        setCompanyWebsite(recruiter.companyWebsite || '');
                        setRecruiterName(recruiter.recruiterName);
                        setDesignation(recruiter.designation);
                        setMobile(recruiter.mobile);
                        setEmail(recruiter.email);
                        setAddress(recruiter.address);
                        setCity(recruiter.city);
                        setState(recruiter.state);
                        setPincode(recruiter.pincode);
                        setSuccess('Reset completed.');
                        setError(null);
                      }}
                      className="py-2.5 px-5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Reset Form
                    </button>
                  </div>

                </form>

              </div>
            </motion.div>
          )}

          {/* JOB MANAGEMENT TAB */}
          {activeTab === 'jobs' && (
            <motion.div
              key="jobs-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Header Card */}
              <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Enterprise Logistics Job Openings</h3>
                  <p className="text-xs text-gray-400 mt-1">Deploy, optimize, and manage logistical delivery openings for verified driver candidates.</p>
                </div>
                {!showJobForm && (
                  <button
                    onClick={() => {
                      setEditingJob(null);
                      setJobTitle('');
                      setJobCategory('Last-Mile Delivery');
                      setJobOpenings('1');
                      setJobEmploymentType('Full Time');
                      setJobState(recruiter.state || '');
                      setJobCity(recruiter.city || '');
                      setJobArea('');
                      setJobWorkLocation('');
                      setJobMinSalary('');
                      setJobMaxSalary('');
                      setJobSalaryType('Monthly');
                      setJobShift('Day');
                      setJobExperience('0');
                      setJobEducation('10th Pass');
                      setJobGenderPreference('Any');
                      setJobAgeLimitMin('18');
                      setJobAgeLimitMax('45');
                      setJobBikeRequired('No');
                      setJobDrivingLicense('No');
                      setJobImmediateJoining('No');
                      setJobDescription('');
                      setJobResponsibilities('');
                      setJobBenefits('');
                      setShowJobForm(true);
                    }}
                    className="py-2.5 px-5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-600/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Post a New Job
                  </button>
                )}
              </div>

              {/* View Overlay Modal */}
              {viewingJob && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 relative shadow-2xl border border-gray-150">
                    <button
                      onClick={() => setViewingJob(null)}
                      className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${
                          viewingJob.status === 'Published' || viewingJob.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : viewingJob.status === 'Draft'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}>
                          Status: {viewingJob.status}
                        </span>
                        <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          {viewingJob.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight mt-3">{viewingJob.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{recruiter.companyName} • Hub Location: {viewingJob.area}, {viewingJob.city}, {viewingJob.state}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Compensation</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">₹{viewingJob.minSalary} - ₹{viewingJob.maxSalary} / {viewingJob.salaryType}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Openings Available</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">{viewingJob.openings} positions</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Employment Type</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">{viewingJob.employmentType}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Shift Schedule</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">{viewingJob.shift} Shift</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Experience Req.</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">{viewingJob.experienceRequired === 0 ? 'Fresher Friendly' : `${viewingJob.experienceRequired} Years`}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Education</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">{viewingJob.educationRequired}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Gender Requirement</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">{viewingJob.genderPreference}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Age Bracket Limit</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">{viewingJob.ageLimitMin} - {viewingJob.ageLimitMax} Years</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Required Assets</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">
                          Bike: {viewingJob.bikeRequired}, DL: {viewingJob.drivingLicenseRequired}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2 uppercase tracking-wide">Job Description</h4>
                        <p className="text-gray-600 whitespace-pre-line leading-relaxed">{viewingJob.description}</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2 uppercase tracking-wide">Key Responsibilities</h4>
                        <p className="text-gray-600 whitespace-pre-line leading-relaxed">{viewingJob.responsibilities}</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2 uppercase tracking-wide">Perks & Benefits</h4>
                        <p className="text-gray-600 whitespace-pre-line leading-relaxed">{viewingJob.benefits}</p>
                      </div>
                      {viewingJob.workLocation && (
                        <div>
                          <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2 uppercase tracking-wide">Exact Hub Work Location</h4>
                          <p className="text-gray-600">{viewingJob.workLocation}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setViewingJob(null);
                          handleStartEditJob(viewingJob);
                        }}
                        className="py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all text-xs"
                      >
                        Edit Listing
                      </button>
                      <button
                        onClick={() => setViewingJob(null)}
                        className="py-2 px-4 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all text-xs"
                      >
                        Close Window
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showJobForm ? (
                /* CREATE / EDIT JOB FORM */
                <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                    <h4 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                      {editingJob ? 'Edit Logistical Opening' : 'Post Logistical Opening'}
                    </h4>
                    <button
                      onClick={() => {
                        setShowJobForm(false);
                        setEditingJob(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleJobSubmit} className="space-y-8">
                    
                    {/* Section 1: Basic Information */}
                    <div className="space-y-4">
                      <h5 className="text-[11px] font-black uppercase text-orange-600 tracking-widest pb-1 border-b border-orange-50">1. Basic Opening Specs</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Job Title / Role Name *</label>
                          <input
                            type="text"
                            required
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="e.g. Last Mile Delivery Associate"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Company Name (Auto-Filled)</label>
                          <input
                            type="text"
                            disabled
                            value={recruiter.companyName}
                            className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Job Category *</label>
                          <select
                            required
                            value={jobCategory}
                            onChange={(e) => setJobCategory(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          >
                            <option value="Delivery Jobs">Delivery Jobs</option>
                            <option value="Warehouse / Picker&Packer">Warehouse / Picker&Packer</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Open Positions *</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={jobOpenings}
                              onChange={(e) => setJobOpenings(e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Employment Type *</label>
                            <select
                              required
                              value={jobEmploymentType}
                              onChange={(e) => setJobEmploymentType(e.target.value as any)}
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                            >
                              <option value="Full Time">Full Time</option>
                              <option value="Part Time">Part Time</option>
                              <option value="Flexible">Flexible</option>
                            </select>
                          </div>
                        </div>

                        {/* Job-Specific Company Logo Upload */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Job Company Logo <span className="text-gray-400 font-normal normal-case">(Optional — ≤ 50KB, shown to candidates)</span>
                          </label>
                          <div className="flex items-start gap-4">
                            {/* Preview */}
                            <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                              {jobCompanyLogo ? (
                                <img
                                  src={jobCompanyLogo}
                                  alt="Job company logo"
                                  className="w-full h-full object-contain p-1"
                                  referrerPolicy="no-referrer"
                                />
                              ) : recruiter.companyLogo ? (
                                <img
                                  src={recruiter.companyLogo}
                                  alt={recruiter.companyName}
                                  className="w-full h-full object-contain p-1 opacity-40"
                                  referrerPolicy="no-referrer"
                                  title="Profile logo (auto-used if no custom logo uploaded)"
                                />
                              ) : (
                                <Building2 className="w-6 h-6 text-gray-300" />
                              )}
                            </div>

                            <div className="flex-1 space-y-2">
                              <label
                                htmlFor="job-logo-upload"
                                className={`inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                                  jobLogoUploading
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                                }`}
                              >
                                <Upload className="w-3.5 h-3.5" />
                                {jobLogoUploading ? 'Compressing...' : jobCompanyLogo ? 'Replace Logo' : 'Upload Logo for this Job'}
                              </label>
                              <input
                                id="job-logo-upload"
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="hidden"
                                disabled={jobLogoUploading}
                                onChange={handleJobLogoUpload}
                              />
                              {jobCompanyLogo && (
                                <button
                                  type="button"
                                  onClick={() => setJobCompanyLogo('')}
                                  className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                                >
                                  <X className="w-3 h-3" /> Remove custom logo
                                </button>
                              )}
                              <p className="text-[10px] text-gray-400 leading-relaxed">
                                {jobCompanyLogo
                                  ? `✓ Custom logo uploaded (auto-compressed ≤ 50KB). Shown on this job post.`
                                  : recruiter.companyLogo
                                  ? 'Your profile logo will be used automatically. Upload a custom one for this specific job if needed.'
                                  : 'Upload a JPG, PNG or WEBP image ≤ 50KB. Will be auto-compressed. Shown to candidates browsing this job.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Location */}
                    <div className="space-y-4">
                      <h5 className="text-[11px] font-black uppercase text-orange-600 tracking-widest pb-1 border-b border-orange-50">2. Deployment Geography</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">State *</label>
                          <input
                            type="text"
                            required
                            value={jobState}
                            onChange={(e) => setJobState(e.target.value)}
                            placeholder="e.g. Karnataka"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">City / Hub HQ *</label>
                          <input
                            type="text"
                            required
                            value={jobCity}
                            onChange={(e) => setJobCity(e.target.value)}
                            placeholder="e.g. Bengaluru"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Area / Locality *</label>
                          <input
                            type="text"
                            required
                            value={jobArea}
                            onChange={(e) => setJobArea(e.target.value)}
                            placeholder="e.g. Nelamangala Hub"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Work Hub Address (Optional)</label>
                          <input
                            type="text"
                            value={jobWorkLocation}
                            onChange={(e) => setJobWorkLocation(e.target.value)}
                            placeholder="e.g. Phase 2, Logistics Gate C, NH 48, Nelamangala Industrial Area"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Salary */}
                    <div className="space-y-4">
                      <h5 className="text-[11px] font-black uppercase text-orange-600 tracking-widest pb-1 border-b border-orange-50">3. Driver compensation budget</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Minimum Salary (₹) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            placeholder="e.g. 18000"
                            value={jobMinSalary}
                            onChange={(e) => setJobMinSalary(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Maximum Salary (₹) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            placeholder="e.g. 26000"
                            value={jobMaxSalary}
                            onChange={(e) => setJobMaxSalary(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Compensation Schedule *</label>
                          <select
                            required
                            value={jobSalaryType}
                            onChange={(e) => setJobSalaryType(e.target.value as any)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Daily">Daily</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Experience & Specifications */}
                    <div className="space-y-4">
                      <h5 className="text-[11px] font-black uppercase text-orange-600 tracking-widest pb-1 border-b border-orange-50">4. Fleet Criteria & Eligibility</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Shift *</label>
                          <select
                            required
                            value={jobShift}
                            onChange={(e) => setJobShift(e.target.value as any)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          >
                            <option value="Day">Day Shift</option>
                            <option value="Night">Night Shift</option>
                            <option value="Rotational">Rotational Shift</option>
                            <option value="Flexible">Flexible Shift</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Min Experience Required (Years) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            max="30"
                            value={jobExperience}
                            onChange={(e) => setJobExperience(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Education Needed *</label>
                          <select
                            required
                            value={jobEducation}
                            onChange={(e) => setJobEducation(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          >
                            <option value="No Education Required">No Education Required</option>
                            <option value="10th Pass">10th Pass</option>
                            <option value="12th Pass">12th Pass</option>
                            <option value="Graduate">Graduate</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Gender Preference *</label>
                          <select
                            required
                            value={jobGenderPreference}
                            onChange={(e) => setJobGenderPreference(e.target.value as any)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          >
                            <option value="Any">Any Gender</option>
                            <option value="Male">Male Candidates Only</option>
                            <option value="Female">Female Candidates Only</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Min Age *</label>
                            <input
                              type="number"
                              required
                              min="18"
                              max="65"
                              value={jobAgeLimitMin}
                              onChange={(e) => setJobAgeLimitMin(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Max Age *</label>
                            <input
                              type="number"
                              required
                              min="18"
                              max="70"
                              value={jobAgeLimitMax}
                              onChange={(e) => setJobAgeLimitMax(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Personal Bike Needed? *</label>
                          <select
                            required
                            value={jobBikeRequired}
                            onChange={(e) => setJobBikeRequired(e.target.value as any)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Driving License Required? *</label>
                          <select
                            required
                            value={jobDrivingLicense}
                            onChange={(e) => setJobDrivingLicense(e.target.value as any)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Immediate Joining? *</label>
                          <select
                            required
                            value={jobImmediateJoining}
                            onChange={(e) => setJobImmediateJoining(e.target.value as any)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                          >
                            <option value="No">No (Standard Vetting)</option>
                            <option value="Yes">Yes (Immediate Batch)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Rich descriptions */}
                    <div className="space-y-4">
                      <h5 className="text-[11px] font-black uppercase text-orange-600 tracking-widest pb-1 border-b border-orange-50">5. Role Information & Requirements</h5>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Job Description *</label>
                          <textarea
                            required
                            rows={3}
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="State what the role is, the client sector, and what vehicles they will pilot."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Detailed Responsibilities *</label>
                          <textarea
                            required
                            rows={3}
                            value={jobResponsibilities}
                            onChange={(e) => setJobResponsibilities(e.target.value)}
                            placeholder="E.g. Safe loading of FMCG, handling dispatch billing terminals, reporting hub discrepancies, executing 20 drops daily."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Perks & Benefits *</label>
                          <textarea
                            required
                            rows={3}
                            value={jobBenefits}
                            onChange={(e) => setJobBenefits(e.target.value)}
                            placeholder="E.g. PF & ESIC, free corporate meals, mileage reimbursements of ₹3.2 per KM, accidental insurance of ₹5 Lakhs."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions and status choice */}
                    <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                      <div className="flex gap-2 flex-1">
                        <button
                          type="submit"
                          onClick={() => setSubmitStatus('Published')}
                          disabled={submittingJob}
                          className="py-2.5 px-6 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-75"
                        >
                          {submittingJob && submitStatus === 'Published' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {editingJob ? 'Save & Publish Job' : 'Publish Job'}
                        </button>

                        <button
                          type="submit"
                          onClick={() => setSubmitStatus('Draft')}
                          disabled={submittingJob}
                          className="py-2.5 px-6 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-75"
                        >
                          {submittingJob && submitStatus === 'Draft' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          Save as Draft
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowJobForm(false);
                          setEditingJob(null);
                        }}
                        className="py-2.5 px-5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                    </div>

                  </form>
                </div>
              ) : (
                /* LIVE JOBS LISTING VIEW */
                <div className="space-y-4">
                  {/* SEARCH FILTERS AND CONTROLS */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      
                      {/* Search Job Title */}
                      <div className="relative w-full sm:flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={searchTitle}
                          onChange={(e) => setSearchTitle(e.target.value)}
                          placeholder="Search jobs by role title..."
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                        />
                      </div>

                      {/* Search City */}
                      <div className="relative w-full sm:w-64">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                          <MapPin className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={searchCity}
                          onChange={(e) => setSearchCity(e.target.value)}
                          placeholder="Search city..."
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl text-xs transition-all outline-none"
                        />
                      </div>
                    </div>

                    {/* Status filtering row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-50 text-xs">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-2 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Status Filter:
                      </span>
                      {[
                        { id: 'All', label: 'All Jobs' },
                        { id: 'Active', label: 'Active / Published' },
                        { id: 'Draft', label: 'Drafts' },
                        { id: 'Closed', label: 'Closed' },
                      ].map((st) => (
                        <button
                          key={st.id}
                          onClick={() => setFilterStatus(st.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer ${
                            filterStatus === st.id 
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-gray-50 text-gray-500 hover:text-gray-800 border border-gray-100'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* LOADING STATE */}
                  {loadingJobs ? (
                    <div className="bg-white border border-gray-150 rounded-3xl p-12 text-center shadow-sm">
                      <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
                      <p className="text-xs text-gray-500">Retrieving logistical openings ledger...</p>
                    </div>
                  ) : filteredJobs().length === 0 ? (
                    <div className="bg-white border border-gray-150 rounded-3xl p-12 text-center shadow-sm">
                      <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mx-auto mb-6">
                        <Briefcase className="w-8 h-8" />
                      </div>
                      <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">No matching jobs found</h3>
                      <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
                        Try adjusting your search keywords, city filters, or status toggles to reveal your logistical openings.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredJobs().map((job) => (
                        <div key={job.id} className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-gray-250 transition-all">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                {/* Company logo beside job title */}
                                {(job.companyLogo || job.company_logo) && (
                                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                    <img
                                      src={job.companyLogo || job.company_logo}
                                      alt={job.companyName || recruiter.companyName}
                                      className="w-full h-full object-contain p-0.5"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                    />
                                  </div>
                                )}
                                <h4 className="font-black text-gray-900 text-sm tracking-tight">{job.title}</h4>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide border ${
                                  job.status === 'Published' || job.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                    : job.status === 'Draft'
                                      ? 'bg-amber-50 text-amber-700 border-amber-150'
                                      : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                                }`}>
                                  {job.status}
                                </span>
                                <span className="bg-gray-50 text-gray-500 text-[9px] font-bold px-2 py-0.5 rounded-full border border-gray-150 uppercase tracking-wide">
                                  {job.category}
                                </span>
                              </div>
                              
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /> 
                                <span className="font-semibold text-gray-700">{job.area}</span>, {job.city}, {job.state}
                              </p>

                              <div className="flex items-center gap-2 mt-3 flex-wrap text-xs text-gray-600">
                                <span className="bg-orange-50/50 text-orange-800 font-extrabold px-2 py-0.5 rounded-md border border-orange-100">
                                  ₹{job.minSalary} - ₹{job.maxSalary} / {job.salaryType || 'Monthly'}
                                </span>
                                <span className="bg-gray-50 text-gray-600 font-bold px-2 py-0.5 rounded-md border border-gray-150">
                                  {job.openings || 1} open positions
                                </span>
                                <span className="bg-gray-50 text-gray-600 font-bold px-2 py-0.5 rounded-md border border-gray-150">
                                  {job.experienceRequired === 0 ? 'Fresher friendly' : `${job.experienceRequired}+ yrs Exp`}
                                </span>
                              </div>

                              <p className="text-xs text-gray-500 mt-2 line-clamp-2 max-w-xl leading-relaxed">
                                {job.description}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-400 font-semibold pt-1 border-t border-gray-50 mt-2">
                                <span className="flex items-center gap-1.5 bg-orange-50/50 text-orange-700 px-2 py-0.5 rounded border border-orange-100">
                                  <Briefcase className="w-3.5 h-3.5 text-orange-500" />
                                  Applied: <strong className="text-orange-900 font-black">{applications.filter((app: any) => app.jobId === job.id).length || job.applicationsCount || 0}</strong>
                                </span>
                                <span className="flex items-center gap-1.5 bg-indigo-50/50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                  Views: <strong className="text-indigo-900 font-black">{job.viewsCount || 0}</strong>
                                </span>
                                <span className="text-gray-400">Posted: <strong className="text-gray-700">{new Date(job.createdAt).toLocaleDateString()}</strong></span>
                                {job.immediateJoining === 'Yes' && (
                                  <span className="text-red-600 font-extrabold animate-pulse">🔥 Immediate Hiring</span>
                                )}
                              </div>
                            </div>

                            {/* Job actions group */}
                            <div className="flex flex-wrap md:flex-col gap-1.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-50 justify-start md:justify-end">
                              <div className="flex gap-1.5 w-full">
                                <button
                                  onClick={() => setViewingJob(job)}
                                  className="flex-1 p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] font-bold border border-gray-200 cursor-pointer"
                                  title="View Details"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                                
                                <button
                                  onClick={() => handleStartEditJob(job)}
                                  className="flex-1 p-2 bg-orange-50 hover:bg-orange-100/80 text-orange-700 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] font-bold border border-orange-100 cursor-pointer"
                                  title="Edit Listing"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                              </div>

                              <div className="flex gap-1.5 w-full">
                                <button
                                  onClick={() => handleDuplicateJob(job)}
                                  className="flex-1 p-2 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] font-bold border border-indigo-100 cursor-pointer"
                                  title="Duplicate as Draft"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copy
                                </button>

                                <button
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="flex-1 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] font-bold border border-red-100 cursor-pointer"
                                  title="Delete Opening"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>

                              {/* Direct Status Change Controls */}
                              <div className="grid grid-cols-3 gap-1 pt-1.5 w-full">
                                <button
                                  disabled={job.status === 'Published' || job.status === 'Active'}
                                  onClick={() => handleToggleJobStatusDirect(job.id, 'Published')}
                                  className="py-1 px-1.5 rounded-lg border border-gray-200 text-[10px] font-black text-center transition-all bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:bg-emerald-50/50 disabled:text-emerald-700 disabled:border-emerald-100 cursor-pointer"
                                >
                                  Publish
                                </button>
                                <button
                                  disabled={job.status === 'Draft'}
                                  onClick={() => handleToggleJobStatusDirect(job.id, 'Draft')}
                                  className="py-1 px-1.5 rounded-lg border border-gray-200 text-[10px] font-black text-center transition-all bg-gray-50 text-gray-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 disabled:bg-amber-50/50 disabled:text-amber-700 disabled:border-amber-100 cursor-pointer"
                                >
                                  Draft
                                </button>
                                <button
                                  disabled={job.status === 'Closed'}
                                  onClick={() => handleToggleJobStatusDirect(job.id, 'Closed')}
                                  className="py-1 px-1.5 rounded-lg border border-gray-200 text-[10px] font-black text-center transition-all bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:bg-red-50/50 disabled:text-red-700 disabled:border-red-100 cursor-pointer"
                                >
                                  Close
                                </button>
                              </div>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'applications' && (
            <motion.div
              key="applications-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Total Applications', value: applications.length, color: 'border-slate-150 bg-slate-50/50 text-slate-900' },
                  { label: 'New / Applied', value: applications.filter(a => a.currentStatus === 'Applied').length, color: 'border-orange-100 bg-orange-50/30 text-orange-700' },
                  { label: 'Shortlisted', value: applications.filter(a => a.currentStatus === 'Shortlisted').length, color: 'border-violet-100 bg-violet-50/30 text-violet-700' },
                  { label: 'Rejected', value: applications.filter(a => a.currentStatus === 'Rejected').length, color: 'border-red-100 bg-red-50/30 text-red-700' },
                  { label: 'Hired', value: applications.filter(a => a.currentStatus === 'Hired').length, color: 'border-emerald-100 bg-emerald-50/30 text-emerald-700' },
                ].map((stat, idx) => (
                  <div key={idx} className={`border rounded-2xl p-4 shadow-sm text-center ${stat.color}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block leading-tight text-gray-400">{stat.label}</span>
                    <span className="text-2xl font-black mt-1.5 block">{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* Filters & Search Board */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search candidate or mobile..."
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => {
                        setAppFilterJob('All');
                        setAppFilterStatus('All');
                        setAppFilterDate('All');
                        setAppFilterCity('All');
                        setAppFilterExperience('All');
                        setAppSearch('');
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {/* Job Filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Filter by Job</label>
                    <select
                      value={appFilterJob}
                      onChange={(e) => setAppFilterJob(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="All">All Jobs</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Filter by Status</label>
                    <select
                      value={appFilterStatus}
                      onChange={(e) => setAppFilterStatus(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Applied">Applied (New)</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview Scheduled">Interview Scheduled</option>
                      <option value="Interview Completed">Interview Completed</option>
                      <option value="Selected">Selected</option>
                      <option value="Hired">Hired</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                  </div>

                  {/* Experience Filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Experience</label>
                    <select
                      value={appFilterExperience}
                      onChange={(e) => setAppFilterExperience(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="All">All Experience</option>
                      <option value="Freshers">Freshers (0 Yrs)</option>
                      <option value="1-2 Years">1-2 Years</option>
                      <option value="3+ Years">3+ Years</option>
                    </select>
                  </div>

                  {/* City Filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Candidate City</label>
                    <select
                      value={appFilterCity}
                      onChange={(e) => setAppFilterCity(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="All">All Cities</option>
                      {Array.from(new Set(applications.map(a => a.candidateCity).filter(Boolean))).map((city: any) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Applied Date</label>
                    <select
                      value={appFilterDate}
                      onChange={(e) => setAppFilterDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="All">All Time</option>
                      <option value="Today">Today</option>
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table list */}
              <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                {loadingApps ? (
                  <div className="py-20 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                    Fetching incoming candidates list...
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center">
                    <FileMinus className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-xs font-semibold">No applications found matching the current filters.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Try resetting the filters or tweaking your search terms.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                          <th className="py-3 px-5">Candidate Name</th>
                          <th className="py-3 px-5">Job Title</th>
                          <th className="py-3 px-5">Applied Date</th>
                          <th className="py-3 px-5 text-center">Experience</th>
                          <th className="py-3 px-5">Current City</th>
                          <th className="py-3 px-5">Current Status</th>
                          <th className="py-3 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs font-medium text-slate-700">
                        {filteredApplications.map((app, idx) => (
                          <tr key={app.id ? `app-${app.id}` : `app-row-${idx}-${app.candidateId || ''}`} className="hover:bg-gray-50/40 transition-colors">
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-3">
                                {app.candidateProfilePhoto ? (
                                  <img 
                                    src={app.candidateProfilePhoto} 
                                    alt={app.candidateName} 
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center font-extrabold text-[10px] uppercase">
                                    {app.candidateName.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 block">{app.candidateName}</span>
                                    {app.isUrgentCandidate && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                        <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                                        Urgent Candidate
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-400 block">{app.candidateMobile}</span>
                                  {app.isUrgentCandidate && (
                                    <span className="text-[9.5px] font-medium text-amber-600 block mt-0.5">
                                      ⚡ Assigned by Admin from Candidate Pool
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-5">
                              <span className="font-bold text-slate-800 block">{app.jobTitle}</span>
                              <span className="text-[10px] text-gray-400 block">{app.jobCity}</span>
                            </td>
                            <td className="py-3 px-5 text-gray-500">
                              {new Date(app.appliedDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-5 text-center font-bold text-slate-800">
                              {app.candidateExperience} Yrs
                            </td>
                            <td className="py-3 px-5 text-gray-600">
                              {app.candidateCity || 'N/A'}
                            </td>
                            <td className="py-3 px-5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                                app.currentStatus === 'Applied' 
                                  ? 'bg-orange-50 text-orange-700 border-orange-150' 
                                  : app.currentStatus === 'Shortlisted' 
                                    ? 'bg-violet-50 text-violet-700 border-violet-150'
                                    : app.currentStatus === 'Rejected'
                                      ? 'bg-red-50 text-red-700 border-red-150'
                                      : app.currentStatus === 'Hired'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                        : 'bg-blue-50 text-blue-700 border-blue-150'
                              }`}>
                                {app.currentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedAppId(app.id);
                                  fetchAppDetail(app.id);
                                }}
                                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-extrabold rounded-xl shadow-sm transition-all cursor-pointer"
                              >
                                Review Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* URGENT CANDIDATES TAB (EXACTLY THE SAME CANDIDATE PRESENTATION FORMAT) */}
          {activeTab === 'urgent-candidates' && (
            <motion.div
              key="urgent-candidates-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-orange-600 text-white">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Urgent Candidates</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {urgentCandidates.length} candidate{urgentCandidates.length === 1 ? '' : 's'} require immediate recruiter attention and contact.
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Total Urgent', value: urgentCandidates.length, color: 'border-slate-150 bg-slate-50/50 text-slate-900' },
                  { label: 'Pending / New', value: urgentCandidates.filter(a => a.currentStatus === 'Pending' || a.currentStatus === 'Applied').length, color: 'border-orange-100 bg-orange-50/30 text-orange-700' },
                  { label: 'Contacted', value: urgentCandidates.filter(a => a.currentStatus === 'Contacted').length, color: 'border-blue-100 bg-blue-50/30 text-blue-700' },
                  { label: 'Shortlisted', value: urgentCandidates.filter(a => a.currentStatus === 'Shortlisted').length, color: 'border-violet-100 bg-violet-50/30 text-violet-700' },
                  { label: 'Hired / Approved', value: urgentCandidates.filter(a => a.currentStatus === 'Hired' || a.currentStatus === 'Approved').length, color: 'border-emerald-100 bg-emerald-50/30 text-emerald-700' },
                ].map((stat, idx) => (
                  <div key={idx} className={`border rounded-2xl p-4 shadow-sm text-center ${stat.color}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block leading-tight text-gray-400">{stat.label}</span>
                    <span className="text-2xl font-black mt-1.5 block">{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* Filters & Search Board */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search urgent candidate or mobile..."
                      value={urgentSearch}
                      onChange={(e) => setUrgentSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => {
                        setUrgentFilterJob('All');
                        setUrgentFilterStatus('All');
                        setUrgentFilterDate('All');
                        setUrgentFilterCity('All');
                        setUrgentSearch('');
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Job Filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Filter by Job</label>
                    <select
                      value={urgentFilterJob}
                      onChange={(e) => setUrgentFilterJob(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="All">All Jobs</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Filter by Status</label>
                    <select
                      value={urgentFilterStatus}
                      onChange={(e) => setUrgentFilterStatus(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending (New)</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Hired">Hired / Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {/* City Filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Candidate City</label>
                    <select
                      value={urgentFilterCity}
                      onChange={(e) => setUrgentFilterCity(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="All">All Cities</option>
                      {Array.from(new Set(urgentCandidates.map(a => a.candidateCity || a.candidateLocation).filter(Boolean))).map((city: any) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Assigned Date</label>
                    <select
                      value={urgentFilterDate}
                      onChange={(e) => setUrgentFilterDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="All">All Time</option>
                      <option value="Today">Today</option>
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table list (Identical layout to applications table) */}
              <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                {loadingUrgent ? (
                  <div className="py-20 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                    Fetching urgent candidates...
                  </div>
                ) : filteredUrgentCandidates.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center">
                    <FileMinus className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-xs font-semibold">No urgent candidates found matching the current filters.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Check back soon or adjust your search filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                          <th className="py-3 px-5">Candidate Name</th>
                          <th className="py-3 px-5">Job Title</th>
                          <th className="py-3 px-5">Assigned Date</th>
                          <th className="py-3 px-5 text-center">Education</th>
                          <th className="py-3 px-5">Location</th>
                          <th className="py-3 px-5">Current Status</th>
                          <th className="py-3 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs font-medium text-slate-700">
                        {filteredUrgentCandidates.map((cand, idx) => (
                          <tr key={cand.id ? `urg-${cand.id}` : `urg-row-${idx}`} className="hover:bg-gray-50/40 transition-colors">
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-extrabold text-[10px] uppercase shadow-xs">
                                  {cand.candidateName.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block">{cand.candidateName}</span>
                                  <span className="text-[10px] text-gray-400 block font-mono">{cand.candidateMobile || cand.candidateContact}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-5">
                              <span className="font-bold text-slate-800 block">{cand.jobTitle}</span>
                              <span className="text-[10px] text-gray-400 block">{cand.jobCity}</span>
                            </td>
                            <td className="py-3 px-5 text-gray-500">
                              {new Date(cand.assignedAt || cand.appliedDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-5 text-center font-bold text-slate-800">
                              {cand.candidateEducation || 'Graduate'}
                            </td>
                            <td className="py-3 px-5 text-gray-600">
                              {cand.candidateLocation || cand.candidateCity || 'N/A'}
                            </td>
                            <td className="py-3 px-5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                                cand.currentStatus === 'Pending' || cand.currentStatus === 'Applied'
                                  ? 'bg-orange-50 text-orange-700 border-orange-150' 
                                  : cand.currentStatus === 'Contacted'
                                    ? 'bg-blue-50 text-blue-700 border-blue-150'
                                    : cand.currentStatus === 'Shortlisted' 
                                      ? 'bg-violet-50 text-violet-700 border-violet-150'
                                      : cand.currentStatus === 'Rejected'
                                        ? 'bg-red-50 text-red-700 border-red-150'
                                        : cand.currentStatus === 'Hired' || cand.currentStatus === 'Approved'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                          : 'bg-blue-50 text-blue-700 border-blue-150'
                              }`}>
                                {cand.currentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-right">
                              <button
                                onClick={() => handleSelectUrgentCandidate(cand)}
                                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-extrabold rounded-xl shadow-sm transition-all cursor-pointer"
                              >
                                Review Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="bg-white border border-gray-150 rounded-3xl p-12 text-center shadow-sm"
              id="settings-soon"
            >
              <div className="w-16 h-16 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-6">
                <Settings className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Enterprise Settings</h3>
              <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto leading-relaxed">
                Vetting logs, multi-agent recruitment tokens, and account permission matrices are coming in the next release.
              </p>
              <span className="inline-block mt-6 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-orange-50 text-orange-700 border border-orange-100">
                Coming Soon
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Candidate Credential Audit Modal */}
      {selectedAppDetail && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-hidden shadow-2xl border border-gray-150 flex flex-col my-auto">
            
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 border-b border-gray-150 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                    {selectedAppDetail.job?.category === 'Delivery Jobs' || selectedAppDetail.job?.title?.toLowerCase().includes('driver') || selectedAppDetail.job?.title?.toLowerCase().includes('delivery')
                      ? 'Driver Credential Audit'
                      : 'Candidate Credential Audit'}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-semibold tracking-wide">
                    Candidate Verification Record
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedAppDetail(null);
                  setSelectedAppId(null);
                  setCopiedMobile(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Scroll Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f8fafc]/50">
              
              {/* Candidate Profile Summary Box */}
              {(() => {
                const photoDoc = selectedAppDetail.candidate?.documents?.find((d: any) => d.documentType === 'photo');
                const photoUrl = photoDoc?.fileUrl || selectedAppDetail.candidate?.profile?.profilePhoto || selectedAppDetail.application?.candidateProfilePhoto;
                const candidateName = selectedAppDetail.candidate?.profile?.fullName || selectedAppDetail.candidate?.fullName || 'Candidate Profile';
                const initial = candidateName.charAt(0)?.toUpperCase() || 'C';

                return (
                  <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs space-y-3.5">
                    <div className="flex items-center gap-3.5">
                      {photoUrl ? (
                        <div className="relative shrink-0">
                          <img 
                            src={photoUrl} 
                            alt={candidateName}
                            className="w-14 h-14 rounded-2xl object-cover border border-gray-200 shadow-sm bg-slate-50"
                          />
                          <a 
                            href={photoUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full p-1 text-gray-600 hover:text-orange-600 shadow-xs transition-colors"
                            title="Open full photo"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider block">Candidate</span>
                        <h4 className="text-base font-black text-slate-900 truncate leading-snug">
                          {candidateName}
                        </h4>
                        
                        {/* Mobile Contact row with copy button */}
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600 font-semibold flex-wrap">
                          <span>📱 {selectedAppDetail.candidate?.mobile || 'No Mobile'}</span>
                          {selectedAppDetail.candidate?.mobile && (
                            <button
                              onClick={() => handleCopyMobile(selectedAppDetail.candidate?.mobile)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                            >
                              {copiedMobile ? (
                                <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                                  <Check className="w-3 h-3" /> (Copied ✓)
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Copy className="w-3 h-3" /> (Copy)
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Candidate Action Buttons (Call & WhatsApp) */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        onClick={handleCallCandidate}
                        className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.98] ${
                          hasCalledCandidate
                            ? 'bg-emerald-600 text-white border border-emerald-500 shadow-emerald-600/20'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {hasCalledCandidate ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Call (Called ✓)</span>
                          </>
                        ) : (
                          <>
                            <Phone className="w-4 h-4" />
                            <span>Call Candidate</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleWhatsAppCandidate}
                        className="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Parameters Compliance Check Card */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide">
                  <FileCheck className="w-4 h-4 text-orange-600" />
                  <span>Parameters Compliance Check</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Location */}
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> Location
                    </span>
                    <span className="font-bold text-slate-800 text-right">
                      {selectedAppDetail.candidate?.profile?.city || selectedAppDetail.candidate?.profile?.state
                        ? `${selectedAppDetail.candidate?.profile?.city || ''}${selectedAppDetail.candidate?.profile?.city && selectedAppDetail.candidate?.profile?.state ? ', ' : ''}${selectedAppDetail.candidate?.profile?.state || ''} - ${selectedAppDetail.candidate?.profile?.pincode || 'N/A'}`
                        : `Pincode: ${selectedAppDetail.candidate?.profile?.pincode || 'N/A'}`}
                    </span>
                  </div>

                  {/* Experience */}
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400" /> Experience
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedAppDetail.candidate?.profile?.experience || '0'} Years
                    </span>
                  </div>

                  {/* Motorcycle Owned */}
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-gray-400" /> Motorcycle Owned
                    </span>
                    <span className={`font-black ${
                      selectedAppDetail.candidate?.profile?.bikeAvailable === 'Yes' ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {selectedAppDetail.candidate?.profile?.bikeAvailable === 'Yes' ? 'Yes - Owned' : 'No - None'}
                    </span>
                  </div>

                  {/* Driving License */}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-gray-400" /> Driving License
                    </span>
                    <span className={`font-black ${
                      selectedAppDetail.candidate?.profile?.drivingLicenseAvailable === 'Yes' ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {selectedAppDetail.candidate?.profile?.drivingLicenseAvailable === 'Yes' ? 'Yes - Active DL' : 'No - Missing DL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Update Application Stage Section */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide">
                    <RefreshCw className="w-4 h-4 text-orange-600" />
                    <span>Update Application Stage</span>
                  </div>
                  {hasCalledCandidate && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Unlocked
                    </span>
                  )}
                </div>

                {/* Conditional View: Locked Callout vs Stage Selection Pills */}
                {!hasCalledCandidate ? (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-blue-950">Call Candidate to Unlock Stage Updates</h5>
                      <p className="text-[11px] text-blue-700/90 leading-relaxed mt-0.5">
                        Please click the 'Call Candidate' button above to place a call first. Stage updates will be enabled immediately after.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Stage Selection Pills */}
                    <div className="flex flex-wrap gap-2">
                      {['Applied', 'Shortlisted', 'Interview Scheduled', 'Approved', 'Rejected'].map((stage) => {
                        const isSelected = auditStage === stage;
                        return (
                          <button
                            key={stage}
                            type="button"
                            onClick={() => setAuditStage(stage)}
                            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-orange-600 text-white shadow-xs border border-orange-600'
                                : 'bg-white hover:bg-gray-50 text-slate-700 border border-gray-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            <span>{stage}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Inline Interview Scheduler when 'Interview Scheduled' is selected */}
                    {auditStage === 'Interview Scheduled' && (
                      <div className="bg-orange-50/60 border border-orange-200/70 rounded-xl p-3 space-y-2.5 animate-fadeIn">
                        <span className="text-[10px] font-black uppercase text-orange-800 tracking-wider block">
                          Set Interview Schedule Date & Time
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Date</label>
                            <input
                              type="date"
                              value={interviewDate}
                              onChange={(e) => setInterviewDate(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Time</label>
                            <input
                              type="time"
                              value={interviewTime}
                              onChange={(e) => setInterviewTime(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Action: Save & Complete Audit Button */}
              <div>
                <button
                  type="button"
                  onClick={handleSaveAudit}
                  disabled={savingAudit || !hasCalledCandidate}
                  className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-md ${
                    !hasCalledCandidate
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-[#131b2e] hover:bg-[#0a0f1d] active:scale-[0.99] text-white cursor-pointer shadow-slate-900/10'
                  }`}
                >
                  {savingAudit ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Audit...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Save & Complete Audit</span>
                    </>
                  )}
                </button>
                {!hasCalledCandidate && (
                  <p className="text-[10px] text-center text-gray-400 font-semibold mt-1.5">
                    Stage updates will unlock after calling the candidate
                  </p>
                )}
              </div>

              {/* Collapsible Dispatcher Notes & Activity History */}
              <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowNotesDrawer(!showNotesDrawer)}
                  className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span>Private Notes & Activity History ({selectedAppDetail.notes?.length || 0})</span>
                  </div>
                  {showNotesDrawer ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showNotesDrawer && (
                  <div className="p-4 border-t border-gray-150 space-y-4 bg-gray-50/50">
                    {/* Add note field */}
                    <div className="space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Log screening note or interview remarks..."
                        rows={2}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
                      />
                      <button
                        onClick={() => handleAddNote(selectedAppDetail.application.id)}
                        disabled={submittingNote || !noteText.trim()}
                        className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] font-extrabold rounded-lg transition-all cursor-pointer"
                      >
                        {submittingNote ? 'Saving note...' : 'Add Private Note'}
                      </button>
                    </div>

                    {/* Notes List */}
                    {selectedAppDetail.notes?.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto pt-2 border-t border-gray-150">
                        {selectedAppDetail.notes.map((n: any) => (
                          <div key={n.id} className="p-2.5 bg-white border border-gray-150 rounded-xl text-xs">
                            <p className="text-slate-800 font-medium whitespace-pre-wrap">"{n.noteText}"</p>
                            <span className="text-[9px] text-gray-400 block mt-1">
                              By {n.recruiterName || 'Recruiter'} on {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* History Timeline */}
                    {selectedAppDetail.history?.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-gray-150">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Timeline</span>
                        {selectedAppDetail.history.map((h: any) => (
                          <div key={h.id} className="text-[11px] text-gray-600 flex items-start gap-1.5">
                            <span className="text-orange-500 font-bold">•</span>
                            <div>
                              <span>Status changed from <strong className="text-gray-500">{h.previousStatus}</strong> to <strong className="text-orange-600">{h.newStatus}</strong></span>
                              <span className="text-[9px] text-gray-400 block">{new Date(h.changedDate).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Schedule Interview Modal overlay */}
      {showInterviewModal && selectedAppDetail && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Schedule Screening Interview</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Interview Date</label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Time</label>
                <input
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowInterviewModal(false)}
                className="w-1/2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-black rounded-xl cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!interviewDate || !interviewTime) {
                    alert('Please select both date and time for the interview.');
                    return;
                  }
                  setShowInterviewModal(false);
                  
                  // Update status to Interview Scheduled
                  await handleStatusUpdate(selectedAppDetail.application.id, 'Interview Scheduled');
                  
                  // Add an automatic note
                  const noteBody = `Interview scheduled with candidate on ${new Date(interviewDate).toLocaleDateString()} at ${interviewTime}.`;
                  try {
                    await fetch(`/api/recruiter/applications/${selectedAppDetail.application.id}/notes`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ noteText: noteBody })
                    });
                    // Refresh
                    fetchAppDetail(selectedAppDetail.application.id);
                  } catch (err) {
                    console.error('Error auto-logging note:', err);
                  }
                }}
                className="w-1/2 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl cursor-pointer text-center shadow-md shadow-orange-600/10"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Slide-over Candidate Allocation Notification Drawer */}
      <AnimatePresence>
        {showNotifDrawer && (
          <React.Fragment>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifDrawer(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      Candidate Alerts
                      {unreadNotifCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold animate-pulse">
                          {unreadNotifCount} unread
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-500">Recruiter-visible candidate allocations</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={handleMarkAllNotifsAsRead}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold px-2 py-1 rounded hover:bg-orange-50 transition-colors cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifDrawer(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingNotifs && notifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading alerts...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-14 h-14 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mx-auto mb-3">
                      <User className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm mb-1">No candidate alerts yet</h4>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto">
                      When candidates are allocated as "Recruiter Visible" in the Admin Panel, real-time pop-up alerts with complete candidate details will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.isRead && !n.is_read;
                    const details = n.candidateDetails || {};
                    const candName = n.candidateName || details.fullName || 'Candidate';
                    const candPhoto = n.candidateProfilePhoto || details.candidateProfilePhoto || details.profilePhoto || details.photoUrl;
                    const mobile = n.candidateMobile || details.mobile || '';
                    const city = n.candidateCity || details.city || '';
                    const jobTitle = details.jobTitle || 'Delivery Job';
                    const exp = details.experience !== undefined ? `${details.experience} yrs` : (n.candidateExperience ? `${n.candidateExperience} yrs` : 'Fresher');

                    return (
                      <div
                        key={n.id}
                        className={`border rounded-2xl p-4 transition-all ${
                          isUnread
                            ? 'bg-gradient-to-r from-orange-50/60 to-white border-orange-300 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {candPhoto ? (
                              <img
                                src={candPhoto}
                                alt={candName}
                                className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {candName.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900 text-xs">{candName}</h4>
                                {isUnread && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-orange-600 text-white text-[9px] font-extrabold uppercase">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500">Allocated for <span className="font-semibold text-gray-700">{jobTitle}</span></p>
                            </div>
                          </div>

                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {new Date(n.createdAt || n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {/* Candidate Details Snippet */}
                        <div className="grid grid-cols-2 gap-2 my-2.5 text-[11px] bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-mono font-semibold">{mobile || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{city || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>Exp: {exp}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>Bike: {details.bikeAvailable || 'Yes'}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            {mobile && (
                              <a
                                href={`tel:${mobile}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                              >
                                <PhoneCall className="w-3 h-3" />
                                Call
                              </a>
                            )}
                            <button
                              onClick={() => handleSelectCandidateFromNotif(n)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View in Applications
                            </button>
                          </div>

                          {isUnread && (
                            <button
                              onClick={() => handleMarkNotifAsRead(n.id)}
                              className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-150 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Pop-up alerts active
                </span>
                <button
                  onClick={() => fetchNotifications()}
                  className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

    </div>
  );
}
