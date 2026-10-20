import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building,
  CheckCircle,
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  Briefcase,
  GraduationCap,
  Bike,
  FileText,
  Shield,
  Share2,
  Bookmark,
  Sparkles,
  Award,
  Zap,
  Check,
  Users,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';

interface JobDetailsViewProps {
  job: any;
  onBack: () => void;
  onApply: (job: any) => void;
  isApplied: boolean;
  isApplying: boolean;
  isSaved: boolean;
  onToggleSave: (jobId: string, e: React.MouseEvent) => void;
  candidate?: any;
}

export default function JobDetailsView({
  job,
  onBack,
  onApply,
  isApplied,
  isApplying,
  isSaved,
  onToggleSave,
  candidate
}: JobDetailsViewProps) {
  const [copiedShare, setCopiedShare] = React.useState(false);

  const handleShare = () => {
    const shareText = `Check out this job opening: ${job.title} at ${job.companyName} on Jobsner! Salary: ₹${job.minSalary?.toLocaleString()} - ₹${job.maxSalary?.toLocaleString()}/month.`;
    if (navigator.share) {
      navigator.share({
        title: `${job.title} - Jobsner`,
        text: shareText,
        url: window.location.href,
      }).catch(() => {
        navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      });
    } else {
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  // Format salary display
  const formattedSalary = job.minSalary && job.maxSalary
    ? `₹${Number(job.minSalary).toLocaleString('en-IN')} - ₹${Number(job.maxSalary).toLocaleString('en-IN')}`
    : job.salary || '₹25,000 - ₹35,000';

  const salaryPeriod = job.salaryType || 'Per Month';

  // Format responsibilities into list
  const responsibilitiesList = React.useMemo(() => {
    if (job.responsibilities && typeof job.responsibilities === 'string') {
      const items = job.responsibilities.split(/\n|•|\*/).map((s: string) => s.trim()).filter(Boolean);
      if (items.length > 0) return items;
    }
    // Default rich responsibilities based on category
    return [
      'Pick up orders and customer packages safely from assigned hub or merchant center.',
      'Deliver parcels to customer destinations on-time using GPS navigation routes.',
      'Verify customer details, collect OTPs or digital signatures upon delivery.',
      'Maintain package safety and prevent any transit damage during deliveries.',
      'Provide polite and professional customer service during order handovers.',
      'Adhere strictly to traffic safety regulations and company delivery protocols.'
    ];
  }, [job.responsibilities]);

  // Format benefits into list
  const benefitsList = React.useMemo(() => {
    if (job.benefits && typeof job.benefits === 'string') {
      const items = job.benefits.split(/\n|•|\*/).map((s: string) => s.trim()).filter(Boolean);
      if (items.length > 0) return items;
    }
    // Default rich benefits
    return [
      'Fuel / Petrol reimbursement & allowance on every kilometer traveled',
      'Accidental Insurance & Medical Healthcare Coverage up to ₹5,00,000',
      'Weekly performance bonuses, surge incentives & attendance rewards',
      'Flexible shift schedules with choice of morning, afternoon, or evening',
      'Free company branded delivery bag, helmet & safety gear provided',
      'Fast joining bonus on completing target delivery milestones'
    ];
  }, [job.benefits]);

  // Format description
  const jobDescription = job.description && job.description.trim()
    ? job.description
    : `We are hiring enthusiastic and motivated candidates for the role of ${job.title} at ${job.companyName}. In this role, you will be an integral part of our delivery network, ensuring prompt deliveries to customers across ${job.city || 'your area'}. We offer competitive compensation, weekly payouts, comprehensive insurance coverage, and excellent performance-based growth opportunities. Immediate joining is available for eligible candidates with fast onboarding!`;

  return (
    <div className="space-y-6 pb-28 animate-fadeIn" id="job-details-page">
      {/* TOP NAVIGATION / BREADCRUMB */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 sm:px-3.5 sm:py-2 bg-slate-100 hover:bg-[#1D61F2] text-slate-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer group"
            title="Back to all jobs"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Jobs</span>
          </button>

          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold overflow-x-auto whitespace-nowrap">
            <span className="hover:text-slate-700 cursor-pointer" onClick={onBack}>Jobs</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-slate-600 font-bold">{job.category || 'Delivery'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-slate-900 font-bold truncate max-w-[160px] sm:max-w-[240px]">{job.title}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Share button */}
          <button
            onClick={handleShare}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer relative"
            title="Share this job"
          >
            <Share2 className="w-3.5 h-3.5 text-[#1D61F2]" />
            <span className="hidden sm:inline">Share</span>
            {copiedShare && (
              <span className="absolute -top-8 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md whitespace-nowrap">
                Link Copied!
              </span>
            )}
          </button>

          {/* Save / Bookmark Button */}
          <button
            onClick={(e) => onToggleSave(job.id, e)}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Save Job"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#1D61F2] text-[#1D61F2]' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* HERO BANNER CARD */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Company Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center p-2 shrink-0 shadow-xs overflow-hidden">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-contain" />
              ) : (
                <Building className="w-8 h-8 sm:w-10 sm:h-10 text-[#1D61F2]" />
              )}
            </div>

            {/* Title & Metadata */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5 fill-emerald-500 text-white" /> Verified Employer
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200">
                  <Sparkles className="w-3 h-3 text-[#1D61F2]" /> Direct Hiring
                </span>
                {job.immediateJoining === 'Yes' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <Zap className="w-3 h-3 fill-amber-500 text-white" /> Immediate Joining
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {job.title}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs sm:text-sm font-bold text-slate-600">
                <span className="text-[#1D61F2] font-black">{job.companyName}</span>
                <span>•</span>
                <span className="text-slate-500">{job.employmentType || 'Full Time'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-[#1D61F2] shrink-0" />
                  {job.workLocation || job.area || job.city || 'India'}
                  {job.state ? `, ${job.state}` : ''}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="px-3 py-1 bg-blue-50 text-[#1D61F2] text-xs font-extrabold rounded-lg">
                  {job.category || 'Delivery Jobs'}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                  {job.openings ? `${job.openings} Openings` : 'Multiple Openings'}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {job.shift || 'Day Shift'}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold pl-1">
                  Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-GB') : 'Recently'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Box on Desktop */}
          <div className="lg:text-right shrink-0 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Offered Salary</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {formattedSalary}
              </div>
              <span className="text-xs font-bold text-emerald-600 block">
                {salaryPeriod} • Weekly payouts available
              </span>
            </div>

            <div className="w-full sm:w-auto pt-2">
              {isApplied ? (
                <div className="px-6 py-3.5 bg-emerald-50 border-2 border-emerald-300 text-emerald-700 font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xs">
                  <CheckCircle className="w-5 h-5 fill-emerald-500 text-white" />
                  <span>Applied Successfully</span>
                </div>
              ) : (
                <button
                  onClick={() => onApply(job)}
                  disabled={isApplying}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#1D61F2] hover:bg-blue-700 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isApplying ? 'Applying...' : 'Apply Now (Fast)'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6-CARD QUICK HIGHLIGHTS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Salary */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1D61F2] flex items-center justify-center mb-2.5">
            <IndianRupee className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Salary</span>
          <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">{formattedSalary}</p>
          <span className="text-[10px] font-semibold text-slate-500 block truncate">{salaryPeriod}</span>
        </div>

        {/* Shift */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Shift Timing</span>
          <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">{job.shift || 'Flexible'}</p>
          <span className="text-[10px] font-semibold text-slate-500 block">Standard Hours</span>
        </div>

        {/* Experience */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Experience</span>
          <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">
            {job.experienceRequired ? `${job.experienceRequired}+ Yrs` : 'Fresher'}
          </p>
          <span className="text-[10px] font-semibold text-slate-500 block">No experience required</span>
        </div>

        {/* Vacancies */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Vacancies</span>
          <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">{job.openings || 1} Openings</p>
          <span className="text-[10px] font-semibold text-slate-500 block">Active Hiring</span>
        </div>

        {/* Vehicle */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-2.5">
            <Bike className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Two-Wheeler</span>
          <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">
            {job.bikeRequired === 'Yes' ? 'Required' : 'Optional / Cycle'}
          </p>
          <span className="text-[10px] font-semibold text-slate-500 block">Bike / EV / Cycle</span>
        </div>

        {/* Joining */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2.5">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Joining</span>
          <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">
            {job.immediateJoining === 'Yes' || !job.immediateJoining ? 'Immediate' : 'Standard'}
          </p>
          <span className="text-[10px] font-semibold text-slate-500 block">24-48 Hours</span>
        </div>
      </div>

      {/* TWO-COLUMN DETAILS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: DESCRIPTION, RESPONSIBILITIES, BENEFITS (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Job Description & Overview */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1D61F2] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">Job Overview & Description</h3>
                <span className="text-[11px] text-slate-400 font-medium">Role summary and background</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-line">
              {jobDescription}
            </p>
          </div>

          {/* 2. Key Responsibilities */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">Key Responsibilities</h3>
                <span className="text-[11px] text-slate-400 font-medium">Day-to-day duties & tasks</span>
              </div>
            </div>

            <ul className="space-y-3">
              {responsibilitiesList.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span className="leading-normal">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Perks & Benefits */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">Perks, Benefits & Incentives</h3>
                <span className="text-[11px] text-slate-400 font-medium">Rewards, insurance & extra allowances</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefitsList.map((benefit: string, idx: number) => (
                <div key={idx} className="p-3.5 bg-gradient-to-r from-purple-50/50 to-blue-50/50 border border-purple-100/80 rounded-2xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white shadow-2xs text-[#1D61F2] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 leading-snug">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ELIGIBILITY, HUB ADDRESS, GUARANTEE (1 COL) */}
        <div className="space-y-6">
          
          {/* Eligibility Requirements */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D61F2] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900">Eligibility Criteria</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-500">Education</span>
                <span className="font-extrabold text-slate-900">{job.educationRequired || '10th / 12th Pass'}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-500">Age Limit</span>
                <span className="font-extrabold text-slate-900">
                  {job.ageLimitMin || 18} - {job.ageLimitMax || 45} Years
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-500">Gender Preference</span>
                <span className="font-extrabold text-slate-900">{job.genderPreference || 'Any / All candidates'}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-500">Two-Wheeler / Bike</span>
                <span className="font-extrabold text-slate-900">{job.bikeRequired || 'Bike / EV / Cycle'}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-500">Driving License</span>
                <span className="font-extrabold text-slate-900">{job.drivingLicenseRequired || 'Valid DL / Learner’s'}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-500">Smartphone</span>
                <span className="font-extrabold text-slate-900">Android 4G/5G Phone</span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="font-bold text-slate-500">Documents Needed</span>
                <span className="font-extrabold text-slate-900">Aadhaar, PAN & Bank A/C</span>
              </div>
            </div>
          </div>

          {/* Working Location & Hub Details */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900">Hub & Work Location</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Assigned Work Area</span>
                <p className="font-black text-slate-900 text-sm">
                  {job.workLocation || job.area || job.city || 'Local Delivery Zone'}
                </p>
                <p className="text-slate-500 font-semibold text-xs">
                  {job.city || 'India'}{job.state ? `, ${job.state}` : ''}
                </p>
              </div>

              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Orders are dispatched within a 3 - 7 km radius of your assigned hub location for hassle-free round trips.
              </p>
            </div>
          </div>

          {/* Jobsner Verified Employer Guarantee */}
          <div className="bg-gradient-to-br from-blue-900 to-[#0F172A] text-white rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">Jobsner Trust & Safety</h4>
                <span className="text-[10px] text-blue-200 font-semibold block">100% Free & Direct Application</span>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-blue-100 font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero registration or consultancy charges</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Direct recruiter & employer contact</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Fast review & prompt onboarding support</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* STICKY BOTTOM ACTION BAR (Accessible on all screen sizes) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-3 px-4 sm:px-8 z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0 hidden sm:flex">
            {job.companyLogo ? (
              <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-contain" />
            ) : (
              <Building className="w-5 h-5 text-[#1D61F2]" />
            )}
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1">{job.title}</h4>
            <p className="text-[11px] font-bold text-slate-500">
              <span className="text-slate-900 font-black">{formattedSalary}</span> • {job.companyName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onBack}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer hidden md:inline-flex"
          >
            Back to Jobs
          </button>

          {isApplied ? (
            <div className="px-6 py-2.5 sm:py-3 bg-emerald-50 border-2 border-emerald-400 text-emerald-700 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-xs">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-emerald-500 text-white" />
              <span>Applied ✓</span>
            </div>
          ) : (
            <button
              onClick={() => onApply(job)}
              disabled={isApplying}
              className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#1D61F2] hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isApplying ? 'Applying...' : 'Apply Now'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
