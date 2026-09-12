import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Phone, 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  Share2, 
  ChevronRight, 
  X, 
  Edit3, 
  Camera, 
  Upload, 
  FileText, 
  CheckCircle, 
  ArrowLeft,
  Calendar,
  Sparkles,
  Heart,
  ClipboardList,
  ShieldCheck,
  Bike,
  CreditCard,
  FileCheck,
  ExternalLink,
  Save
} from 'lucide-react';
import { Profile, Candidate } from '../types';
import { compressImageTo50KB, formatByteSize, getBase64ByteSize, MAX_IMAGE_SIZE_BYTES } from '../lib/imageCompressor';

interface CandidateProfileEditProps {
  initialProfile: Profile;
  candidate?: Candidate;
  token: string;
  onSaveSuccess: (updatedProfile: Profile) => void;
  onCancel: () => void;
  contactedJobsCount?: number;
  savedJobsCount?: number;
  onNavigateTab?: (tab: 'find_jobs' | 'applications' | 'saved' | 'overview') => void;
}

const EDUCATION_OPTIONS = [
  'Below 10th',
  '10th Pass',
  '12th Pass',
  'Diploma',
  'Graduate',
  'Post Graduate'
];

const EXPERIENCE_OPTIONS = [
  'Less than 1 year',
  '0 Years (Fresher)',
  '1 Year',
  '2 Years',
  '3 Years',
  '4+ Years'
];

const CATEGORY_OPTIONS = [
  'Last-Mile Delivery',
  'Food Delivery Partner',
  'Grocery & Quick Commerce',
  'E-Commerce Courier',
  'Warehouse Executive',
  'Field Sales & Verification',
  'Driver & Fleet Operator',
  'Retail Assistant',
  'Customer Support'
];

export default function CandidateProfileEdit({ 
  initialProfile, 
  candidate,
  token, 
  onSaveSuccess, 
  onCancel,
  contactedJobsCount = 1,
  savedJobsCount = 4,
  onNavigateTab
}: CandidateProfileEditProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Profile Form States (matching all inputs from user's screenshots)
  const [fullName, setFullName] = useState(initialProfile.fullName || candidate?.fullName || 'Sathya');
  const [mobile, setMobile] = useState(initialProfile.mobile || candidate?.mobile || '7892939485');
  const [locality, setLocality] = useState(initialProfile.locality || initialProfile.city || initialProfile.address || '100 Feet Road');
  const [education, setEducation] = useState(initialProfile.education || 'Below 10th');
  const [experience, setExperience] = useState<string>(
    typeof initialProfile.experience === 'number' 
      ? (initialProfile.experience === 0 ? '0 Years (Fresher)' : `${initialProfile.experience} Year${initialProfile.experience > 1 ? 's' : ''}`)
      : (initialProfile.experience || 'Less than 1 year')
  );
  const [bikeAvailable, setBikeAvailable] = useState<boolean>(
    initialProfile.bikeAvailable === 'Yes' || initialProfile.bikeAvailable === undefined
  );
  const [drivingLicenseAvailable, setDrivingLicenseAvailable] = useState<boolean>(
    initialProfile.drivingLicenseAvailable === 'Yes' || initialProfile.drivingLicenseAvailable === undefined
  );
  const [age, setAge] = useState<string>(initialProfile.age ? String(initialProfile.age) : '30');
  const [gender, setGender] = useState(initialProfile.gender || 'Male');
  const [recentCategory, setRecentCategory] = useState(initialProfile.recentAppliedCategory || 'Last-Mile Delivery');
  const [currentJobRole, setCurrentJobRole] = useState(initialProfile.currentJobRole || 'Delivery Executive');
  const [profilePhoto, setProfilePhoto] = useState(initialProfile.profilePhoto || '');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>('My_Resume.pdf');

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Form Submission
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }

    const parsedAge = age ? parseInt(age, 10) : undefined;
    if (parsedAge !== undefined && (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120)) {
      setError('Please enter a valid age between 1 and 120.');
      return;
    }

    setLoading(true);

    const updatedProfile: Profile = {
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      locality: locality.trim(),
      city: locality.trim(),
      address: locality.trim(),
      education: education,
      experience: experience,
      bikeAvailable: bikeAvailable ? 'Yes' : 'No',
      drivingLicenseAvailable: drivingLicenseAvailable ? 'Yes' : 'No',
      age: parsedAge,
      gender: gender,
      recentAppliedCategory: recentCategory,
      currentJobRole: currentJobRole,
      profilePhoto: profilePhoto || undefined
    };

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      setSuccessMsg('Profile updated successfully!');
      setIsEditModalOpen(false);
      onSaveSuccess(data.candidate.profile);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating profile.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Share Profile
  const handleShareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: `${fullName}'s Jobsner Profile`,
        text: `Check out ${fullName}'s verified profile on Jobsner!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setSuccessMsg('Profile link copied to clipboard!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Handle Document Upload
  const handleFileUpload = async (type: 'resume' | 'photo', file: File) => {
    setUploadingDoc(type);
    setError(null);
    try {
      let fileContentToUpload = '';
      let effectiveFileName = file.name;

      if (type === 'photo') {
        // Compress photo to strictly under 50KB
        const compressed = await compressImageTo50KB(file, MAX_IMAGE_SIZE_BYTES);
        fileContentToUpload = compressed.dataUrl;
        effectiveFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
      } else {
        fileContentToUpload = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentType: type,
          fileName: effectiveFileName,
          fileContent: fileContentToUpload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      if (type === 'resume') {
        setResumeFileName(file.name);
      }

      if (type === 'photo' && data.document?.fileUrl) {
        setProfilePhoto(data.document.fileUrl);
        // Auto sync photo to profile
        fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ fullName, profilePhoto: data.document.fileUrl })
        });
      }

      setSuccessMsg(`${type === 'resume' ? 'Resume' : 'Profile Photo (under 50KB)'} uploaded successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploadingDoc(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto font-sans antialiased text-slate-800 space-y-6" id="jobsner-web-profile-screen">
      
      {/* 1. TOP BREADCRUMB & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:px-6 sm:py-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Back to Job Search"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Jobs</span>
          </button>
          
          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Candidate Profile</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">Manage your contact info, vehicle details, documents, and delivery job readiness.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={handleShareProfile}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-gray-50 transition-all cursor-pointer"
            id="share-profile-btn"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Share Profile</span>
          </button>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-black text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
            id="edit-profile-open-btn"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile Details</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-start gap-2.5 shadow-2xs"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-2xs"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO PROFILE BANNER CARD */}
      <div className="bg-gradient-to-br from-orange-50/70 via-white to-orange-50/30 border border-orange-100/80 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          {/* Candidate Info with Large Avatar */}
          <div className="flex items-start sm:items-center gap-5">
            {/* Avatar with Camera Trigger */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-orange-500 border-2 border-white shadow-md flex items-center justify-center text-white text-3xl font-black overflow-hidden">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <span>{fullName ? fullName.charAt(0).toUpperCase() : 'S'}</span>
                )}
              </div>
              <button 
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl border border-gray-200 shadow-md text-slate-700 hover:text-orange-600 transition-colors cursor-pointer"
                title="Change profile photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={photoInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload('photo', e.target.files[0]);
                }} 
              />
            </div>

            {/* Name & Contact Details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{fullName || 'Sathya'}</h2>
                <span className="text-xs font-bold text-slate-600 bg-white/90 border border-gray-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {recentCategory}
                </span>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 pt-1">
                <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-lg shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <strong className="text-slate-800">{mobile || '7892939485'}</strong>
                </span>
                <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-lg shadow-2xs">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{locality || '100 Feet Road'}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-lg shadow-2xs">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{experience || 'Less than 1 year'}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-lg shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>{education || 'Below 10th'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stat Tiles on Right */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            {/* Contacted Jobs / Applied */}
            <button
              onClick={() => onNavigateTab ? onNavigateTab('applications') : onCancel()}
              className="p-3.5 bg-white border border-gray-200 rounded-2xl flex flex-col justify-between text-left shadow-2xs hover:border-orange-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <span className="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 flex items-center justify-between">
                Contacted Jobs <ChevronRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </span>
              <span className="text-xl font-black text-slate-900 mt-1">{contactedJobsCount}</span>
            </button>

            {/* Saved Jobs */}
            <button
              onClick={() => onNavigateTab ? onNavigateTab('saved') : onCancel()}
              className="p-3.5 bg-white border border-gray-200 rounded-2xl flex flex-col justify-between text-left shadow-2xs hover:border-orange-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <span className="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 flex items-center justify-between">
                Saved Jobs <ChevronRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </span>
              <span className="text-xl font-black text-slate-900 mt-1">{savedJobsCount}</span>
            </button>

            {/* Profile Completion */}
            <div className="col-span-2 sm:col-span-1 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col justify-between text-left shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" /> Status
              </span>
              <span className="text-xs font-black text-emerald-900 mt-1">Ready for Dispatch</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. MAIN CONTENT GRID (2-Column Web Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols wide on desktop): "About Me" & Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">About Me & Candidate Details</h3>
                  <p className="text-xs text-slate-500">Personal details, driver assets, and job category info.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Details
              </button>
            </div>

            {/* 2-Column Responsive Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
              
              {/* Full Name */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Full Name</span>
                <span className="text-sm font-black text-slate-900">{fullName || 'Sathya'}</span>
              </div>

              {/* Mobile Number */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Mobile Number</span>
                <span className="text-sm font-black text-slate-900">{mobile || '7892939485'}</span>
              </div>

              {/* Age */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Age</span>
                <span className="text-sm font-black text-slate-900">{age ? `${age} Years` : '30 Years'}</span>
              </div>

              {/* Gender */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Gender</span>
                <span className="text-sm font-black text-slate-900">{gender || 'Male'}</span>
              </div>

              {/* Education Level */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Education Level</span>
                <span className="text-sm font-black text-slate-900">{education || 'Below 10th'}</span>
              </div>

              {/* Work Experience */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Work Experience</span>
                <span className="text-sm font-black text-slate-900">{experience || 'Less than 1 year'}</span>
              </div>

              {/* Recent Applied Category */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Recent Applied Category</span>
                <span className="text-sm font-black text-slate-900">{recentCategory || 'Last-Mile Delivery'}</span>
              </div>

              {/* Current/Last Job Role */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Current / Last Job Role</span>
                <span className="text-sm font-black text-slate-900">{currentJobRole || 'Delivery Partner'}</span>
              </div>

              {/* Chosen Locality / City */}
              <div className="sm:col-span-2 p-3 bg-slate-50/70 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Preferred Locality / City</span>
                <span className="text-sm font-black text-slate-900">{locality || '100 Feet Road, Bengaluru'}</span>
              </div>

              {/* Vehicle & Driving License Badges */}
              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bike className="w-5 h-5 text-orange-600" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Owns Two Wheeler / Bike</span>
                    <span className="text-xs font-black text-slate-900">{bikeAvailable ? 'Yes (Available for shifts)' : 'No'}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${bikeAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                  {bikeAvailable ? 'YES' : 'NO'}
                </span>
              </div>

              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Driving License (DL)</span>
                    <span className="text-xs font-black text-slate-900">{drivingLicenseAvailable ? 'Yes (Valid Commercial/Personal DL)' : 'No'}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${drivingLicenseAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                  {drivingLicenseAvailable ? 'YES' : 'NO'}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column (1 Col wide on desktop): Verification Documents & Quick Actions */}
        <div className="space-y-6">
          
          {/* Verification Documents Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Verification Documents</h3>
                <p className="text-xs text-slate-500">Upload CV, resume, and profile photos.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Current CV / Resume */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-orange-600 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-xs font-bold text-slate-900 block truncate">Current CV / Resume</span>
                    <span className="text-[10px] text-slate-500 block truncate">{resumeFileName || 'Not uploaded yet'}</span>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => resumeInputRef.current?.click()}
                    disabled={uploadingDoc === 'resume'}
                    className="px-3.5 py-1.5 bg-white hover:bg-orange-50 border border-orange-500 text-orange-600 font-black text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    {uploadingDoc === 'resume' ? 'Uploading...' : 'Upload'}
                  </button>
                  <input 
                    type="file" 
                    ref={resumeInputRef} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload('resume', e.target.files[0]);
                    }} 
                  />
                </div>
              </div>

              {/* Profile Photo (JPEG / PNG) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-orange-600 shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-xs font-bold text-slate-900 block truncate">Profile Photo</span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {profilePhoto ? (profilePhoto.startsWith('data:') ? `Attached (${formatByteSize(getBase64ByteSize(profilePhoto))}) • ≤50KB` : 'Attached • ≤50KB') : 'Max 50KB • Auto-compressed'}
                    </span>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingDoc === 'photo'}
                    className="px-3.5 py-1.5 bg-white hover:bg-orange-50 border border-orange-500 text-orange-600 font-black text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    {uploadingDoc === 'photo' ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Job Search Promo Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-black tracking-tight mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-400" /> Find Matching Openings
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Recruiters are actively hiring candidates matching your role ({recentCategory}) in {locality || 'your area'}.
            </p>
            <button
              onClick={() => onNavigateTab ? onNavigateTab('find_jobs') : onCancel()}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
            >
              <span>Explore Active Jobs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* 4. EDIT PROFILE MODAL DIALOG (Clean Web Popover / Modal with all fields from Screenshot 1) */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8"
              id="edit-profile-modal"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Edit Profile Details</h2>
                  <p className="text-xs text-slate-500">Update your information to match current delivery and courier requirements.</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sathya"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 7892939485"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>

                  {/* Locality / City */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Locality / City
                    </label>
                    <input 
                      type="text"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      placeholder="e.g. 100 Feet Road, Bengaluru"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>

                  {/* Education Level */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Education Level
                    </label>
                    <div className="relative">
                      <select
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
                      >
                        {EDUCATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Work Experience */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Work Experience (Years)
                    </label>
                    <div className="relative">
                      <select
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
                      >
                        {EXPERIENCE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Age
                    </label>
                    <input 
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 30"
                      min="18"
                      max="100"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Recent Applied Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Recent Applied Category
                    </label>
                    <div className="relative">
                      <select
                        value={recentCategory}
                        onChange={(e) => setRecentCategory(e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
                      >
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Current / Last Job Role */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Current / Last Job Role
                    </label>
                    <input 
                      type="text"
                      value={currentJobRole}
                      onChange={(e) => setCurrentJobRole(e.target.value)}
                      placeholder="e.g. Delivery Executive, Rider, Van Driver"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>

                {/* Own a Two Wheeler / Bike? Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Own a Two Wheeler / Bike?</span>
                    <span className="text-[11px] text-slate-500">Recruiters require two-wheelers for fast-track last-mile delivery jobs.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBikeAvailable(!bikeAvailable)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      bikeAvailable ? 'bg-orange-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        bikeAvailable ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Hold Driving License (DL)? Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Hold Driving License (DL)?</span>
                    <span className="text-[11px] text-slate-500">Valid 2-wheeler or 4-wheeler personal or commercial driver's license.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrivingLicenseAvailable(!drivingLicenseAvailable)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      drivingLicenseAvailable ? 'bg-orange-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        drivingLicenseAvailable ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    id="save-profile-changes-btn"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
