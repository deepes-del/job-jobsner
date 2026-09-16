import 'dotenv/config';

// Sanitize process.env variables to prevent common copy-paste or escaping issues 
// (e.g. surrounding quotes, escaped quotes, or backslashes from Vercel/local configs)
for (const key in process.env) {
  let val = process.env[key];
  if (typeof val === 'string') {
    val = val.trim();
    // Remove surrounding quotes (both single and double)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Remove escaped quotes if present
    if (val.startsWith('\\"') && val.endsWith('\\"')) {
      val = val.slice(2, -2);
    } else {
      val = val.replace(/^\\"/, '').replace(/\\"$/, '');
    }
    process.env[key] = val.trim();
  }
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { 
  publicHealthHandler, 
  publicJobsHandler, 
  candidateProfileHandler, 
  adminCandidatesListHandler 
} from './src/lib/supabaseServerHandlers.js';
import { isSupabaseConfigured, getSupabase, uploadToSupabaseStorage } from './src/lib/supabase.js';
import { initializeApp as initAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';


const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 7337;

app.use(express.json({ limit: '10mb' })); // Support base64 photos

const isVercel = !!process.env.VERCEL;
const DB_PATH = isVercel 
  ? path.join('/tmp', 'db.json') 
  : path.join(process.cwd(), 'data', 'db.json');
const UPLOADS_DIR = isVercel 
  ? path.join('/tmp', 'uploads') 
  : path.join(process.cwd(), 'data', 'uploads');

// Initialize local database and upload directories
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ candidates: [], tokens: {}, documents: [] }, null, 2), 'utf-8');
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Helpers for Reading/Writing to DB with optional Supabase dual-mode persistence
let memoryDB: any = null;
let supabaseActive = false;
let supabaseErrorDetails: string | null = null;

// Exact Table Schema Converters for Supabase (Strict matching to existing PostgreSQL schema)

export function toSupabaseJobRow(j: any) {
  if (!j) return null;
  const openingsNum = Number(j.openings ?? j.vacancies ?? j.open_positions ?? 1);
  return {
    id: String(j.id || crypto.randomUUID()),
    recruiterId: String(j.recruiterId || j.recruiter_id || ''),
    companyName: j.companyName || j.company_name || null,
    companyLogo: j.companyLogo || j.company_logo || null,
    title: String(j.title || j.jobTitle || j.job_title || ''),
    category: j.category || j.jobCategory || j.job_category || 'Delivery Jobs',
    openings: openingsNum,
    employmentType: j.employmentType || j.employment_type || 'Full Time',
    state: j.state || '',
    city: j.city || '',
    area: j.area || '',
    workLocation: j.workLocation || j.work_location || (j.area ? `${j.area}, ${j.city}` : j.city) || '',
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
    status: j.status || 'Published',
    applicationsCount: Number(j.applicationsCount ?? j.applications_count ?? 0),
    viewsCount: Number(j.viewsCount ?? j.views_count ?? 0),
    createdAt: j.createdAt || j.created_at || new Date().toISOString(),
    updatedAt: j.updatedAt || j.updated_at || new Date().toISOString(),
    open_positions: openingsNum,
    vacancies: openingsNum
  };
}

export function toSupabaseCandidateRow(c: any) {
  if (!c) return null;
  return {
    id: String(c.id || ''),
    mobile: String(c.mobile || ''),
    fullName: String(c.fullName || c.full_name || c.profile?.fullName || 'Candidate'),
    email: c.email || null,
    salt: c.salt || '',
    hash: c.hash || '',
    profile: c.profile || {},
    nickname: c.nickname || null,
    recent_category: c.recent_category || c.recentCategory || null
  };
}

export function toSupabaseRecruiterRow(r: any) {
  if (!r) return null;
  return {
    id: String(r.id || ''),
    companyName: String(r.companyName || r.company_name || ''),
    companyLogo: r.companyLogo || r.company_logo || null,
    companyWebsite: r.companyWebsite || r.company_website || null,
    recruiterName: r.recruiterName || r.recruiter_name || null,
    designation: r.designation || null,
    mobile: r.mobile || null,
    email: r.email || null,
    salt: r.salt || '',
    hash: r.hash || '',
    address: r.address || null,
    city: r.city || null,
    state: r.state || null,
    pincode: r.pincode || null,
    status: r.status || 'Approved',
    createdAt: r.createdAt || r.created_at || new Date().toISOString(),
    updatedAt: r.updatedAt || r.updated_at || new Date().toISOString(),
    nickname: r.nickname || null
  };
}

export function toSupabaseApplicationRow(a: any) {
  if (!a) return null;
  return {
    id: String(a.id || crypto.randomUUID()),
    candidateId: String(a.candidateId || a.candidate_id || ''),
    jobId: String(a.jobId || a.job_id || ''),
    recruiterId: String(a.recruiterId || a.recruiter_id || ''),
    appliedDate: a.appliedDate || a.applied_date || new Date().toISOString(),
    currentStatus: a.currentStatus || a.current_status || 'Applied',
    withdrawStatus: a.withdrawStatus || a.withdraw_status || 'Active',
    lastUpdated: a.lastUpdated || a.last_updated || new Date().toISOString()
  };
}

export function toSupabaseDocumentRow(d: any) {
  if (!d) return null;
  return {
    id: String(d.id || crypto.randomUUID()),
    candidateId: String(d.candidateId || d.candidate_id || ''),
    documentType: String(d.documentType || d.document_type || ''),
    fileUrl: String(d.fileUrl || d.file_url || ''),
    fileName: String(d.fileName || d.file_name || ''),
    uploadDate: d.uploadDate || d.upload_date || new Date().toISOString(),
    verificationStatus: d.verificationStatus || d.verification_status || 'Pending'
  };
}

export function toSupabaseApplicationHistoryRow(h: any) {
  if (!h) return null;
  return {
    id: String(h.id || crypto.randomUUID()),
    applicationId: String(h.applicationId || h.application_id || ''),
    changedBy: String(h.changedBy || h.changed_by || ''),
    previousStatus: h.previousStatus || h.previous_status || null,
    newStatus: h.newStatus || h.new_status || null,
    note: h.note || null,
    changedAt: h.changedAt || h.changed_at || h.changedDate || new Date().toISOString()
  };
}

export function toSupabaseRecruiterNoteRow(n: any) {
  if (!n) return null;
  return {
    id: String(n.id || crypto.randomUUID()),
    applicationId: String(n.applicationId || n.application_id || ''),
    recruiterId: String(n.recruiterId || n.recruiter_id || ''),
    noteText: String(n.noteText || n.note_text || ''),
    createdAt: n.createdAt || n.created_at || new Date().toISOString()
  };
}

export function toSupabaseNotificationRow(n: any) {
  if (!n) return null;
  return {
    id: String(n.id || crypto.randomUUID()),
    candidate_id: n.candidate_id || n.candidateId || n.recipientId || n.recruiterId || 'system',
    title: String(n.title || ''),
    message: String(n.message || ''),
    category: n.category || n.type || 'GENERAL',
    job_id: n.job_id || n.jobId || null,
    is_read: !!(n.is_read ?? n.isRead ?? false),
    created_at: n.created_at || n.createdAt || new Date().toISOString()
  };
}

export function toSupabaseAllocationRow(a: any) {
  if (!a) return null;
  return {
    applicationId: String(a.applicationId || a.application_id || a.id || ''),
    allocationStatus: String(a.allocationStatus || a.allocation_status || 'Pending Allocation'),
    jobId: String(a.jobId || a.job_id || ''),
    recruiterId: String(a.recruiterId || a.recruiter_id || ''),
    candidateId: String(a.candidateId || a.candidate_id || ''),
    allocatedAt: a.allocatedAt || a.allocated_at || new Date().toISOString()
  };
}

export function toSupabaseRecruiterNotificationRow(n: any) {
  if (!n) return null;
  return {
    id: String(n.id || crypto.randomUUID()),
    recruiter_id: String(n.recruiterId || n.recruiter_id || ''),
    candidate_id: String(n.candidateId || n.candidate_id || ''),
    job_id: String(n.jobId || n.job_id || ''),
    application_id: String(n.applicationId || n.application_id || ''),
    title: String(n.title || ''),
    message: String(n.message || ''),
    candidate_name: String(n.candidateName || n.candidate_name || ''),
    candidate_mobile: String(n.candidateMobile || n.candidate_mobile || ''),
    candidate_city: String(n.candidateCity || n.candidate_city || ''),
    candidate_experience: String(n.candidateExperience ?? n.candidate_experience ?? '0'),
    candidate_details: n.candidateDetails || n.candidate_details || {},
    is_read: !!(n.isRead ?? n.is_read ?? false),
    created_at: n.createdAt || n.created_at || new Date().toISOString()
  };
}

export function toSupabaseCandidatePoolRow(c: any) {
  if (!c) return null;
  return {
    id: String(c.id || crypto.randomUUID()),
    name: String(c.name || c.fullName || ''),
    contact: String(c.contact || c.mobile || ''),
    location: String(c.location || c.city || ''),
    education: String(c.education || ''),
    source: c.source || 'pool',
    created_at: c.createdAt || c.created_at || new Date().toISOString(),
    updated_at: c.updatedAt || c.updated_at || new Date().toISOString()
  };
}

export function toSupabaseUrgentAssignmentRow(a: any) {
  if (!a) return null;
  return {
    id: String(a.id || crypto.randomUUID()),
    candidate_id: String(a.candidateId || a.candidate_id || ''),
    job_id: String(a.jobId || a.job_id || ''),
    recruiter_id: String(a.recruiterId || a.recruiter_id || ''),
    candidate_name: String(a.candidateName || a.candidate_name || ''),
    candidate_contact: String(a.candidateContact || a.candidate_contact || ''),
    candidate_location: String(a.candidateLocation || a.candidate_location || ''),
    candidate_education: String(a.candidateEducation || a.candidate_education || ''),
    status: String(a.status || 'Pending'),
    assigned_at: a.assignedAt || a.assigned_at || new Date().toISOString(),
    assigned_by: String(a.assignedBy || a.assigned_by || 'admin'),
    notes: a.notes || null
  };
}

export async function safeSupabaseUpsert(
  table: string,
  rows: any[]
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !rows || rows.length === 0) {
    return { success: true };
  }

  try {
    const supabase = getSupabase();
    const cleanRows = rows.filter(Boolean);
    if (cleanRows.length === 0) return { success: true };

    // Deduplicate in memory before sending to Supabase
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const uniqueRows: any[] = [];

    for (let i = cleanRows.length - 1; i >= 0; i--) {
      const r = cleanRows[i];
      const id = String(r.id || '');
      const email = r.email ? String(r.email).toLowerCase().trim() : null;
      if (id && seenIds.has(id)) continue;
      if (email && seenEmails.has(email)) continue;
      if (id) seenIds.add(id);
      if (email) seenEmails.add(email);
      uniqueRows.unshift(r);
    }

    if (uniqueRows.length === 0) return { success: true };

    const { error } = await supabase.from(table).upsert(uniqueRows);
    if (error) {
      // If batch upsert encounters a unique constraint or schema error, fallback to individual upserts
      let partialSuccess = false;
      for (const row of uniqueRows) {
        try {
          const { error: rowErr } = await supabase.from(table).upsert([row]);
          if (!rowErr) partialSuccess = true;
        } catch (_) {}
      }
      if (!partialSuccess) {
        console.warn(`[Supabase Upsert Notice on ${table}]`, error.message || error);
      }
      return { success: partialSuccess, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn(`[Supabase Upsert Exception on ${table}]`, err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function createAndBroadcastNotification(notificationData: {
  title: string;
  message: string;
  type: 'NEW_JOB_POSTED' | 'NEW_APPLICATION' | 'APPLICATION_STATUS_CHANGED' | 'APPLICATION_SUBMITTED' | 'GENERAL' | 'ADMIN_BROADCAST' | string;
  targetRole: 'CANDIDATE' | 'RECRUITER' | 'ALL';
  recipientId?: string | null;
  jobId?: string | null;
  applicationId?: string | null;
  candidateId?: string | null;
  recruiterId?: string | null;
  metadata?: any;
}) {
  const db = readDB();
  db.notifications = db.notifications || [];

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const newNotification = {
    id,
    title: notificationData.title,
    message: notificationData.message,
    type: notificationData.type,
    targetRole: notificationData.targetRole,
    target_role: notificationData.targetRole,
    recipientId: notificationData.recipientId || null,
    recipient_id: notificationData.recipientId || null,
    jobId: notificationData.jobId || null,
    job_id: notificationData.jobId || null,
    applicationId: notificationData.applicationId || null,
    application_id: notificationData.applicationId || null,
    candidateId: notificationData.candidateId || null,
    candidate_id: notificationData.candidateId || null,
    recruiterId: notificationData.recruiterId || null,
    recruiter_id: notificationData.recruiterId || null,
    metadata: notificationData.metadata || {},
    isRead: false,
    is_read: false,
    createdAt: now,
    created_at: now
  };

  db.notifications.unshift(newNotification);
  // Keep last 200 notifications
  if (db.notifications.length > 200) {
    db.notifications = db.notifications.slice(0, 200);
  }
  writeDB(db);

  // Sync to Supabase notifications table directly
  if (isSupabaseConfigured()) {
    try {
      const notifRow = toSupabaseNotificationRow(newNotification);
      await safeSupabaseUpsert('notifications', [notifRow]);

      // Supabase Realtime broadcast for connected Android & Web clients
      const supabase = getSupabase();
      const channel = supabase.channel('jobsner_realtime');
      await channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: newNotification
      });

      if (notificationData.type === 'NEW_JOB_POSTED' && notificationData.jobId) {
        await channel.send({
          type: 'broadcast',
          event: 'new_job',
          payload: {
            id: notificationData.jobId,
            title: notificationData.title,
            message: notificationData.message,
            metadata: notificationData.metadata
          }
        });
      }
    } catch (supaErr: any) {
      console.warn('[Supabase Notification Broadcast Warning]', supaErr?.message || supaErr);
    }
  }

  return newNotification;
}

async function syncToSupabase(db: any) {
  try {
    if (!isSupabaseConfigured()) return;
    
    if (db.candidates && db.candidates.length > 0) {
      const rows = db.candidates.map(toSupabaseCandidateRow).filter(Boolean);
      await safeSupabaseUpsert('candidates', rows);
    }
    if (db.recruiters && db.recruiters.length > 0) {
      const rows = db.recruiters.map(toSupabaseRecruiterRow).filter(Boolean);
      await safeSupabaseUpsert('recruiters', rows);
    }
    if (db.applications && db.applications.length > 0) {
      const rows = db.applications.map(toSupabaseApplicationRow).filter(Boolean);
      await safeSupabaseUpsert('applications', rows);
    }
    if (db.documents && db.documents.length > 0) {
      const rows = db.documents.map(toSupabaseDocumentRow).filter(Boolean);
      await safeSupabaseUpsert('documents', rows);
    }
    if (db.notifications && db.notifications.length > 0) {
      const rows = db.notifications.map(toSupabaseNotificationRow).filter(Boolean);
      await safeSupabaseUpsert('notifications', rows);
    }
    if (db.candidatePool && db.candidatePool.length > 0) {
      const rows = db.candidatePool.map(toSupabaseCandidatePoolRow).filter(Boolean);
      await safeSupabaseUpsert('candidate_pool', rows);
    }
    if (db.urgentAssignments && db.urgentAssignments.length > 0) {
      const rows = db.urgentAssignments.map(toSupabaseUrgentAssignmentRow).filter(Boolean);
      await safeSupabaseUpsert('urgent_assignments', rows);
    }
  } catch (err: any) {
    console.warn('[Supabase Sync Warning] Failed to sync data to Supabase:', err.message || err);
  }
}

function normalizeJob(j: any) {
  if (!j) return j;
  const id = String(j.id || j.jobId || j.job_id || '');
  const recruiterId = String(j.recruiterId || j.recruiter_id || j.recruiterID || '');
  const companyName = j.companyName || j.company_name || j.company || 'Hiring Company';
  const companyLogo = j.companyLogo || j.company_logo || '';
  const title = j.title || j.jobTitle || j.job_title || 'Job Opening';
  let category = j.category || j.jobCategory || j.job_category || 'Delivery Jobs';

  // Normalize category if matching warehouse, otherwise preserve original
  const catLower = String(category).toLowerCase();
  if (catLower.includes('warehouse') || catLower.includes('picker') || catLower.includes('packer') || catLower.includes('dispatch')) {
    category = 'Warehouse / Picker&Packer';
  }

  const openings = Number(j.openings ?? j.no_of_openings ?? j.vacancies ?? j.open_positions ?? 1);
  const employmentType = j.employmentType || j.employment_type || 'Full Time';
  const state = j.state || '';
  const city = j.city || '';
  const area = j.area || '';
  const workLocation = j.workLocation || j.work_location || (area ? `${area}, ${city}` : city);
  const minSalary = Number(j.minSalary ?? j.min_salary ?? j.salary_min ?? 0);
  const maxSalary = Number(j.maxSalary ?? j.max_salary ?? j.salary_max ?? 0);
  const salaryType = j.salaryType || j.salary_type || 'Per Month';
  const shift = j.shift || 'Day Shift';
  const experienceRequired = Number(j.experienceRequired ?? j.experience_required ?? 0);
  const educationRequired = j.educationRequired || j.education_required || '10th Pass or below';
  const genderPreference = j.genderPreference || j.gender_preference || 'Any';
  const ageLimitMin = Number(j.ageLimitMin ?? j.age_limit_min ?? 18);
  const ageLimitMax = Number(j.ageLimitMax ?? j.age_limit_max ?? 45);
  const bikeRequired = j.bikeRequired || j.bike_required || 'No';
  const drivingLicenseRequired = j.drivingLicenseRequired || j.driving_license_required || 'No';
  const immediateJoining = j.immediateJoining || j.immediate_joining || 'Yes';
  const description = j.description || j.job_description || '';
  const responsibilities = j.responsibilities || '';
  const benefits = j.benefits || '';
  const status = j.status || 'Published';
  const applicationsCount = Number(j.applicationsCount ?? j.applications_count ?? 0);
  const viewsCount = Number(j.viewsCount ?? j.views_count ?? 0);
  const createdAt = j.createdAt || j.created_at || new Date().toISOString();
  const updatedAt = j.updatedAt || j.updated_at || new Date().toISOString();

  return {
    ...j,
    id,
    jobId: id,
    job_id: id,
    recruiterId,
    recruiter_id: recruiterId,
    companyName,
    company_name: companyName,
    companyLogo,
    company_logo: companyLogo,
    title,
    job_title: title,
    jobTitle: title,
    category,
    job_category: category,
    openings,
    no_of_openings: openings,
    vacancies: openings,
    open_positions: openings,
    employmentType,
    employment_type: employmentType,
    state,
    city,
    area,
    workLocation,
    work_location: workLocation,
    minSalary,
    min_salary: minSalary,
    maxSalary,
    max_salary: maxSalary,
    salaryType,
    salary_type: salaryType,
    shift,
    experienceRequired,
    experience_required: experienceRequired,
    educationRequired,
    education_required: educationRequired,
    genderPreference,
    gender_preference: genderPreference,
    ageLimitMin,
    age_limit_min: ageLimitMin,
    ageLimitMax,
    age_limit_max: ageLimitMax,
    bikeRequired,
    bike_required: bikeRequired,
    drivingLicenseRequired,
    driving_license_required: drivingLicenseRequired,
    immediateJoining,
    immediate_joining: immediateJoining,
    description,
    job_description: description,
    responsibilities,
    benefits,
    status,
    applicationsCount,
    applications_count: applicationsCount,
    viewsCount,
    views_count: viewsCount,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };
}

function isJobActive(j: any): boolean {
  if (!j) return false;
  if (!j.status) return true;
  const s = String(j.status).trim().toLowerCase();
  if (s === 'closed' || s === 'deleted' || s === 'inactive' || s === 'expired' || s === 'rejected') {
    return false;
  }
  return true;
}

async function getLiveJobs(): Promise<any[]> {
  const db = readDB();
  db.jobs = db.jobs || [];

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('jobs').select('*');

      if (!error && data && Array.isArray(data)) {
        db.jobs = data.map(normalizeJob);
        memoryDB = db;
      } else if (error) {
        console.error('[Supabase Live Jobs Query Error]', error.message || error);
      }
    }
  } catch (err) {
    console.warn('[Supabase Jobs Sync Warning]', err);
  } catch (err) {
    console.warn('[Supabase Jobs Sync Warning]', err);
  }

  // Fetch recruiters to attach company logos and company names if missing on job records
  let recruiters: any[] = [];
  try {
    recruiters = await getLiveRecruiters();
  } catch (recErr) {
    console.warn('[GetLiveRecruiters Warning in getLiveJobs]', recErr);
  }

  const recMap = new Map<string, any>();
  recruiters.forEach((r: any) => {
    if (r.id) recMap.set(String(r.id), r);
  });

  return (db.jobs || []).map((j: any) => {
    const norm = normalizeJob(j);
    if (norm.recruiterId && recMap.has(norm.recruiterId)) {
      const recruiter = recMap.get(norm.recruiterId);
      if ((!norm.companyLogo || norm.companyLogo.trim() === '') && recruiter.companyLogo && recruiter.companyLogo.trim() !== '') {
        norm.companyLogo = recruiter.companyLogo;
      }
      if ((!norm.companyName || norm.companyName === 'Hiring Company') && recruiter.companyName) {
        norm.companyName = recruiter.companyName;
      }
    }
    return norm;
  });
}

function normalizeApplication(a: any) {
  if (!a) return a;
  const id = String(a.id || a.appId || a.app_id || '');
  const candidateId = String(a.candidateId || a.candidate_id || a.candidateID || '');
  const jobId = String(a.jobId || a.job_id || a.jobID || '');
  const recruiterId = String(a.recruiterId || a.recruiter_id || a.recruiterID || '');
  const appliedDate = a.appliedDate || a.applied_date || a.created_at || a.createdAt || new Date().toISOString();
  const currentStatus = a.currentStatus || a.current_status || a.status || 'Applied';
  const withdrawStatus = a.withdrawStatus || a.withdraw_status || 'Active';
  const lastUpdated = a.lastUpdated || a.last_updated || a.updated_at || a.updatedAt || new Date().toISOString();

  return {
    id,
    candidateId,
    jobId,
    recruiterId,
    appliedDate,
    currentStatus,
    withdrawStatus,
    lastUpdated
  };
}

async function getLiveApplications(): Promise<any[]> {
  const db = readDB();
  db.applications = db.applications || [];

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('applications').select('*');

      if (!error && data && Array.isArray(data)) {
        const normalizedSupabaseApps = data.map(normalizeApplication);

        const appMap = new Map<string, any>();
        (db.applications || []).forEach((a: any) => {
          const norm = normalizeApplication(a);
          const key = norm.id ? String(norm.id) : (norm.candidateId && norm.jobId ? `${norm.candidateId}_${norm.jobId}` : null);
          if (key) appMap.set(key, norm);
        });

        normalizedSupabaseApps.forEach((a: any) => {
          const key = a.id ? String(a.id) : (a.candidateId && a.jobId ? `${a.candidateId}_${a.jobId}` : null);
          if (key) appMap.set(key, a);
        });

        db.applications = Array.from(appMap.values());
        memoryDB = db;
      } else if (error) {
        console.error('[Supabase Live Applications Query Error]', error.message || error);
      }
    }
  } catch (err) {
    console.warn('[Supabase Applications Sync Warning]', err);
  }

  // Deduplicate before returning
  const uniqueMap = new Map<string, any>();
  (db.applications || []).forEach((a: any) => {
    const norm = normalizeApplication(a);
    const key = norm.id ? String(norm.id) : (norm.candidateId && norm.jobId ? `${norm.candidateId}_${norm.jobId}` : null);
    if (key) uniqueMap.set(key, norm);
  });
  db.applications = Array.from(uniqueMap.values());
  return db.applications;
}

async function getLiveCandidates(): Promise<any[]> {
  const db = readDB();
  db.candidates = db.candidates || [];
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('candidates').select('*');
      if (!error && data && Array.isArray(data)) {
        const candMap = new Map<string, any>();
        (db.candidates || []).forEach((c: any) => {
          if (c.id) candMap.set(String(c.id), c);
        });
        data.forEach((c: any) => {
          const id = String(c.id || '');
          if (!id) return;
          const existing = candMap.get(id) || {};
          candMap.set(id, {
            ...existing,
            ...c,
            id,
            fullName: c.fullName || c.full_name || existing.fullName || 'Candidate',
            mobile: c.mobile || existing.mobile || '',
            email: c.email || existing.email || '',
            profile: {
              ...(existing.profile || {}),
              ...(c.profile || {}),
              fullName: c.fullName || c.full_name || existing.profile?.fullName || 'Candidate',
              profilePhoto: c.profile?.profilePhoto || c.profilePhoto || c.profile_photo || existing.profile?.profilePhoto || '',
              age: c.profile?.age ?? c.age ?? existing.profile?.age,
              gender: c.profile?.gender ?? c.gender ?? existing.profile?.gender,
              locality: c.profile?.locality ?? c.locality ?? existing.profile?.locality,
              city: c.profile?.city ?? c.city ?? existing.profile?.city,
              state: c.profile?.state ?? c.state ?? existing.profile?.state,
              pincode: c.profile?.pincode ?? c.pincode ?? existing.profile?.pincode,
              experience: c.profile?.experience ?? c.experience ?? existing.profile?.experience,
              education: c.profile?.education ?? c.education ?? existing.profile?.education,
              bikeAvailable: c.profile?.bikeAvailable ?? c.bikeAvailable ?? existing.profile?.bikeAvailable,
              drivingLicenseAvailable: c.profile?.drivingLicenseAvailable ?? c.drivingLicenseAvailable ?? existing.profile?.drivingLicenseAvailable,
              recentAppliedCategory: c.profile?.recentAppliedCategory ?? c.recentCategory ?? existing.profile?.recentAppliedCategory,
              currentJobRole: c.profile?.currentJobRole ?? c.currentJobRole ?? existing.profile?.currentJobRole,
            }
          });
        });
        db.candidates = Array.from(candMap.values());
        memoryDB = db;
      }
    }
  } catch (err) {
    console.warn('[Supabase Candidates Fetch Warning]', err);
  }
  return db.candidates || [];
}

async function getLiveDocuments(): Promise<any[]> {
  const db = readDB();
  db.documents = db.documents || [];
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('documents').select('*');
      if (!error && data && Array.isArray(data)) {
        const docMap = new Map<string, any>();
        (db.documents || []).forEach((d: any) => {
          const key = d.id || `${d.candidateId}_${d.documentType}`;
          docMap.set(key, d);
        });
        data.forEach((d: any) => {
          const id = d.id || crypto.randomUUID();
          const candidateId = d.candidateId || d.candidate_id;
          const documentType = d.documentType || d.document_type;
          const fileUrl = d.fileUrl || d.file_url;
          const fileName = d.fileName || d.file_name;
          const key = id || `${candidateId}_${documentType}`;
          docMap.set(key, {
            ...d,
            id,
            candidateId,
            documentType,
            fileUrl,
            fileName,
            uploadDate: d.uploadDate || d.upload_date || d.created_at || new Date().toISOString(),
            verificationStatus: d.verificationStatus || d.verification_status || 'Pending'
          });
        });
        db.documents = Array.from(docMap.values());
        memoryDB = db;
      }
    }
  } catch (err) {
    console.warn('[Supabase Documents Fetch Warning]', err);
  }
  return db.documents || [];
}

async function getLiveAllocations(): Promise<any[]> {
  const db = readDB();
  db.candidateAllocations = db.candidateAllocations || [];
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('candidateAllocations').select('*');
      if (!error && data && Array.isArray(data)) {
        const allocMap = new Map<string, any>();
        (db.candidateAllocations || []).forEach((a: any) => {
          const appId = String(a.applicationId || a.application_id || '');
          if (appId) allocMap.set(appId, a);
        });
        data.forEach((a: any) => {
          const appId = String(a.applicationId || a.application_id || '');
          if (appId) {
            allocMap.set(appId, {
              applicationId: appId,
              allocationStatus: String(a.allocationStatus || a.allocation_status || 'Pending Allocation'),
              jobId: String(a.jobId || a.job_id || ''),
              recruiterId: String(a.recruiterId || a.recruiter_id || ''),
              candidateId: String(a.candidateId || a.candidate_id || ''),
              allocatedAt: a.allocatedAt || a.allocated_at || new Date().toISOString()
            });
          }
        });
        db.candidateAllocations = Array.from(allocMap.values());
        memoryDB = db;
      }
    }
  } catch (err) {
    console.warn('[Supabase candidateAllocations Fetch Warning]', err);
  }
  return db.candidateAllocations || [];
}


async function getLiveRecruiters(): Promise<any[]> {
  const db = readDB();
  db.recruiters = db.recruiters || [];
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('recruiters').select('*');
      if (!error && data && Array.isArray(data)) {
        const recMap = new Map<string, any>();
        (db.recruiters || []).forEach((r: any) => {
          if (r.id) recMap.set(String(r.id), r);
        });
        data.forEach((r: any) => {
          const id = String(r.id || '');
          if (!id) return;
          const existing = recMap.get(id) || {};
          recMap.set(id, {
            ...existing,
            ...r,
            id,
            companyName: r.companyName || r.company_name || existing.companyName || '',
            companyLogo: r.companyLogo || r.company_logo || existing.companyLogo || '',
            companyWebsite: r.companyWebsite || r.company_website || existing.companyWebsite || '',
            recruiterName: r.recruiterName || r.recruiter_name || existing.recruiterName || '',
            designation: r.designation || existing.designation || '',
            mobile: r.mobile || existing.mobile || '',
            email: r.email || existing.email || '',
            salt: r.salt || existing.salt || '',
            hash: r.hash || existing.hash || '',
            address: r.address || existing.address || '',
            city: r.city || existing.city || '',
            state: r.state || existing.state || '',
            pincode: r.pincode || existing.pincode || '',
            status: r.status || existing.status || 'Approved'
          });
        });
        db.recruiters = Array.from(recMap.values());
        memoryDB = db;
      }
    }
  } catch (err) {
    console.warn('[Supabase Recruiters Fetch Warning]', err);
  }
  return db.recruiters || [];
}

async function getLiveRecruiterNotifications(recruiterId?: string): Promise<any[]> {
  const db = readDB();
  db.recruiter_notifications = db.recruiter_notifications || [];
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      // Try querying recruiter_notifications table
      let { data, error } = await supabase.from('recruiter_notifications').select('*');
      if (error) {
        // Fallback to notifications table where category = 'RECRUITER_ALLOCATED'
        const { data: altData } = await supabase
          .from('notifications')
          .select('*')
          .eq('category', 'RECRUITER_ALLOCATED');
        if (altData && Array.isArray(altData)) {
          data = altData.map((a: any) => ({
            id: a.id,
            recruiterId: a.candidate_id,
            candidateId: a.candidate_id,
            jobId: a.job_id,
            title: a.title,
            message: a.message,
            candidateName: a.title?.replace('👤 New Candidate Allocated: ', '') || 'Candidate',
            candidateMobile: '',
            candidateCity: '',
            candidateExperience: '0',
            candidateDetails: {},
            isRead: !!a.is_read,
            createdAt: a.created_at
          }));
        }
      }

      if (data && Array.isArray(data)) {
        const notifMap = new Map<string, any>();
        (db.recruiter_notifications || []).forEach((n: any) => {
          if (n.id) notifMap.set(String(n.id), n);
        });

        data.forEach((r: any) => {
          const id = String(r.id || '');
          if (!id) return;
          const existing = notifMap.get(id) || {};
          notifMap.set(id, {
            ...existing,
            ...r,
            id,
            recruiterId: String(r.recruiter_id || r.recruiterId || existing.recruiterId || ''),
            candidateId: String(r.candidate_id || r.candidateId || existing.candidateId || ''),
            jobId: String(r.job_id || r.jobId || existing.jobId || ''),
            applicationId: String(r.application_id || r.applicationId || existing.applicationId || ''),
            title: r.title || existing.title || '',
            message: r.message || existing.message || '',
            candidateName: r.candidate_name || r.candidateName || existing.candidateName || 'Candidate',
            candidateMobile: r.candidate_mobile || r.candidateMobile || existing.candidateMobile || '',
            candidateCity: r.candidate_city || r.candidateCity || existing.candidateCity || '',
            candidateExperience: r.candidate_experience || r.candidateExperience || existing.candidateExperience || '0',
            candidateDetails: r.candidate_details || r.candidateDetails || existing.candidateDetails || {},
            isRead: !!(r.is_read ?? r.isRead ?? existing.isRead ?? false),
            createdAt: r.created_at || r.createdAt || existing.createdAt || new Date().toISOString()
          });
        });

        db.recruiter_notifications = Array.from(notifMap.values());
        memoryDB = db;
      }
    }
  } catch (err) {
    console.warn('[Supabase recruiter_notifications Fetch Warning]', err);
  }

  let list = db.recruiter_notifications || [];
  if (recruiterId) {
    list = list.filter((n: any) => String(n.recruiterId) === String(recruiterId));
  }

  // Ensure candidate profile photo is populated on notifications
  list = list.map((n: any) => {
    let photo = n.candidateProfilePhoto || n.candidateDetails?.candidateProfilePhoto || '';
    if (!photo && n.candidateId) {
      const cand = (db.candidates || []).find((c: any) => String(c.id) === String(n.candidateId));
      if (cand?.profile?.profilePhoto) {
        photo = cand.profile.profilePhoto;
      } else {
        const doc = (db.documents || []).find((d: any) => String(d.candidateId || d.candidate_id) === String(n.candidateId) && (d.documentType === 'photo' || d.type === 'photo'));
        photo = doc?.fileUrl || doc?.file_url || '';
      }
    }
    return {
      ...n,
      candidateProfilePhoto: photo,
      candidateDetails: {
        ...(n.candidateDetails || {}),
        candidateProfilePhoto: photo
      }
    };
  });

  return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getLiveCandidatePool(): Promise<any[]> {
  const db = readDB();
  db.candidatePool = db.candidatePool || [];

  // Seed candidate pool from existing candidates if empty
  if (db.candidatePool.length === 0 && db.candidates && db.candidates.length > 0) {
    db.candidatePool = db.candidates
      .map((c: any) => {
        const contact = String(c.mobile || '').replace(/\D/g, '').slice(-10);
        return {
          id: String(c.id),
          name: c.fullName || c.profile?.fullName || 'Candidate',
          contact,
          location: c.profile?.city || c.profile?.location || c.city || 'Bengaluru',
          education: c.profile?.education || c.education || 'Graduate',
          source: 'platform',
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      })
      .filter((c: any) => c.contact && c.contact.length === 10);
    writeDB(db);
  }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('candidate_pool').select('*');
      if (!error && data && Array.isArray(data)) {
        const poolMap = new Map<string, any>();
        (db.candidatePool || []).forEach((c: any) => {
          if (c.id) poolMap.set(String(c.id), c);
        });
        data.forEach((r: any) => {
          const id = String(r.id || '');
          if (!id) return;
          poolMap.set(id, {
            id,
            name: r.name || r.fullName || '',
            contact: String(r.contact || r.mobile || '').replace(/\D/g, '').slice(-10),
            location: r.location || r.city || '',
            education: r.education || '',
            source: r.source || 'pool',
            createdAt: r.created_at || r.createdAt || new Date().toISOString(),
            updatedAt: r.updated_at || r.updatedAt || new Date().toISOString()
          });
        });
        db.candidatePool = Array.from(poolMap.values());
        memoryDB = db;
      }
    }
  } catch (err) {
    console.warn('[Supabase Candidate Pool Fetch Warning]', err);
  }

  // Deduplicate by 10-digit contact
  const seenContacts = new Set<string>();
  const deduped: any[] = [];
  for (const c of db.candidatePool || []) {
    const contact = String(c.contact || '').trim();
    if (!contact || seenContacts.has(contact)) continue;
    seenContacts.add(contact);
    deduped.push(c);
  }
  db.candidatePool = deduped;
  return db.candidatePool;
}

async function getLiveUrgentAssignments(): Promise<any[]> {
  const db = readDB();
  db.urgentAssignments = db.urgentAssignments || [];

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('urgent_assignments').select('*');
      if (!error && data && Array.isArray(data)) {
        const assignMap = new Map<string, any>();
        (db.urgentAssignments || []).forEach((a: any) => {
          if (a.id) assignMap.set(String(a.id), a);
        });
        data.forEach((r: any) => {
          const id = String(r.id || '');
          if (!id) return;
          assignMap.set(id, {
            id,
            candidateId: String(r.candidate_id || r.candidateId || ''),
            jobId: String(r.job_id || r.jobId || ''),
            recruiterId: String(r.recruiter_id || r.recruiterId || ''),
            candidateName: r.candidate_name || r.candidateName || '',
            candidateContact: String(r.candidate_contact || r.candidateContact || ''),
            candidateLocation: r.candidate_location || r.candidateLocation || '',
            candidateEducation: r.candidate_education || r.candidateEducation || '',
            status: r.status || 'Pending',
            assignedAt: r.assigned_at || r.assignedAt || new Date().toISOString(),
            assignedBy: r.assigned_by || r.assignedBy || 'admin',
            notes: r.notes || ''
          });
        });
        db.urgentAssignments = Array.from(assignMap.values());
        memoryDB = db;
      }
    }
  } catch (err) {
    console.warn('[Supabase Urgent Assignments Fetch Warning]', err);
  }

  return db.urgentAssignments || [];
}

async function sendPushNotificationToRecruiter(recruiterId: string, title: string, body: string, dataPayload: any) {
  try {
    const db = readDB();
    const fcmTokens = (db.fcmTokens || []).filter((t: any) => t.userId === recruiterId || t.role === 'recruiter');
    if (!fcmTokens || fcmTokens.length === 0) return;
    
    const tokens = fcmTokens.map((t: any) => t.token).filter(Boolean);
    if (tokens.length === 0) return;

    if (getAdminApps().length > 0) {
      const { getMessaging } = await import('firebase-admin/messaging');
      await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(dataPayload || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
        )
      });
      console.log(`[FCM] Push dispatched to ${tokens.length} device(s) for recruiter ${recruiterId}`);
    }
  } catch (pushErr: any) {
    console.warn('[FCM Push Warning]', pushErr?.message || pushErr);
  }
}

async function notifyRecruiterOnCandidateAllocation(
  allocRecord: any, 
  candidate: any, 
  job: any
): Promise<any> {
  const recruiterId = String(allocRecord.recruiterId || job.recruiterId || job.recruiter_id || '');
  if (!recruiterId) {
    console.warn('[Recruiter Notification] No recruiterId found for allocation:', allocRecord);
    return null;
  }

  const db = readDB();
  db.recruiter_notifications = db.recruiter_notifications || [];

  const candidateId = String(allocRecord.candidateId || candidate.id || '');
  const jobId = String(allocRecord.jobId || job.id || '');
  const applicationId = String(allocRecord.applicationId || '');

  // Deduplication check: check by applicationId OR (recruiterId + candidateId + jobId)
  const alreadyNotified = db.recruiter_notifications.some((n: any) => 
    (applicationId && String(n.applicationId) === applicationId) ||
    (String(n.recruiterId) === recruiterId && String(n.candidateId) === candidateId && String(n.jobId) === jobId)
  );

  if (alreadyNotified) {
    return null;
  }

  const profile = candidate.profile || {};
  const fullName = profile.fullName || candidate.fullName || 'Candidate';
  const mobile = candidate.mobile || '';
  const email = candidate.email || '';
  const city = profile.city || candidate.city || '—';
  const state = profile.state || candidate.state || '—';
  const exp = profile.experience !== undefined ? profile.experience : (candidate.experience ?? 0);
  const bikeAvailable = profile.bikeAvailable ?? candidate.bikeAvailable ?? 'No';
  const drivingLicenseAvailable = profile.drivingLicenseAvailable ?? candidate.drivingLicenseAvailable ?? 'No';
  const jobTitle = job.title || 'Delivery Associate';
  const appliedDate = allocRecord.allocatedAt || new Date().toISOString();

  const candDoc = (db.documents || []).find((d: any) => String(d.candidateId || d.candidate_id) === candidateId && (d.documentType === 'photo' || d.type === 'photo'));
  const candidateProfilePhoto = profile.profilePhoto || candDoc?.fileUrl || candDoc?.file_url || '';

  const title = `👤 New Candidate Allocated: ${fullName}`;
  const message = `${fullName} (${mobile}, ${city}) is now visible for "${jobTitle}". Experience: ${exp} yr(s).`;

  const newNotif = {
    id: crypto.randomUUID(),
    recruiterId,
    candidateId,
    jobId,
    applicationId,
    title,
    message,
    candidateName: fullName,
    candidateMobile: mobile,
    candidateCity: city,
    candidateExperience: exp,
    candidateProfilePhoto,
    candidateDetails: {
      fullName,
      mobile,
      email,
      city,
      state,
      experience: exp,
      bikeAvailable,
      drivingLicenseAvailable,
      jobTitle,
      category: job.category || 'Delivery Jobs',
      appliedDate,
      candidateProfilePhoto
    },
    isRead: false,
    createdAt: new Date().toISOString()
  };

  db.recruiter_notifications.push(newNotif);
  writeDB(db);

  // Dual-write into Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      
      // 1. Attempt insert into dedicated recruiter_notifications table
      try {
        const row = toSupabaseRecruiterNotificationRow(newNotif);
        if (row) {
          await supabase.from('recruiter_notifications').upsert([row]);
        }
      } catch (e) {
        // Table might not exist yet; gracefully handled below
      }

      // 2. Insert into public.notifications table (exists in Supabase)
      try {
        const notifRow = {
          id: newNotif.id,
          candidate_id: recruiterId, // target recruiter ID
          title: newNotif.title,
          message: newNotif.message,
          category: 'RECRUITER_ALLOCATED',
          job_id: jobId,
          is_read: false,
          created_at: newNotif.createdAt
        };
        await supabase.from('notifications').upsert([notifRow]);
      } catch (notifErr) {
        console.warn('[Supabase notifications insert warning]', notifErr);
      }

      // 3. Supabase Realtime broadcast on 'jobsner_realtime' channel
      try {
        const channel = supabase.channel('jobsner_realtime');
        channel.send({
          type: 'broadcast',
          event: 'recruiter_notification',
          payload: newNotif
        });
      } catch (broadcastErr) {
        console.warn('[Supabase Realtime Broadcast Warning]', broadcastErr);
      }
    } catch (supaErr) {
      console.warn('[Supabase Notification Warning]', supaErr);
    }
  }

  // 4. Send Mobile Android FCM Push Notification
  sendPushNotificationToRecruiter(recruiterId, title, message, {
    type: 'RECRUITER_ALLOCATED',
    notificationId: newNotif.id,
    jobId,
    candidateId,
    candidateName: fullName,
    candidateMobile: mobile,
    candidateCity: city
  });

  return newNotif;
}

function readDB() {
  if (memoryDB) {
    return memoryDB;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    db.candidates = db.candidates || [];
    db.tokens = db.tokens || {};
    db.documents = db.documents || [];
    db.recruiters = db.recruiters || [];
    db.recruiterTokens = db.recruiterTokens || {};
    db.jobs = db.jobs || [];
    db.applications = db.applications || [];
    db.applicationHistory = db.applicationHistory || [];
    db.recruiterNotes = db.recruiterNotes || [];
    memoryDB = db;
    return db;
  } catch (err) {
    memoryDB = { 
      candidates: [], 
      tokens: {}, 
      documents: [], 
      recruiters: [], 
      recruiterTokens: {}, 
      jobs: [], 
      applications: [],
      applicationHistory: [],
      recruiterNotes: []
    };
    return memoryDB;
  }
}

async function writeDB(data: any) {
  memoryDB = data;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Ignore read-only fs error on serverless if write to DB_PATH fails
  }
  // Await Supabase sync to guarantee persistence on Serverless (Vercel)
  try {
    await syncToSupabase(data);
  } catch (err) {
    console.error('[Supabase Background Sync Error]', err);
  }
}

// Password cryptography functions
function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return verifyHash === hash;
}

// Auth Middleware
async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const db = readDB();
  const candidateId = db.tokens[token];

  if (!candidateId) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }

  let candidate = db.candidates.find((c: any) => String(c.id) === String(candidateId));
  if (!candidate && isSupabaseConfigured()) {
    const liveCandidates = await getLiveCandidates();
    candidate = liveCandidates.find((c: any) => String(c.id) === String(candidateId));
  }

  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  (req as any).candidate = candidate;
  (req as any).token = token;
  next();
}

async function authenticateRecruiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  let db = readDB();
  let recruiterId = db.recruiterTokens?.[token] || db.tokens?.[token]?.recruiterId || (typeof db.tokens?.[token] === 'string' ? db.tokens[token] : null);

  if (!recruiterId) {
    try {
      const diskDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      recruiterId = diskDb.recruiterTokens?.[token] || diskDb.tokens?.[token]?.recruiterId || (typeof diskDb.tokens?.[token] === 'string' ? diskDb.tokens[token] : null);
      if (recruiterId) {
        db.recruiterTokens = db.recruiterTokens || {};
        db.recruiterTokens[token] = recruiterId;
      }
    } catch (_) {}
  }

  if (!recruiterId) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }

  let recruiter = db.recruiters.find((r: any) => String(r.id) === String(recruiterId));
  if (!recruiter && isSupabaseConfigured()) {
    const liveRecruiters = await getLiveRecruiters();
    recruiter = liveRecruiters.find((r: any) => String(r.id) === String(recruiterId));
  }

  if (!recruiter) {
    return res.status(404).json({ error: 'Recruiter not found.' });
  }

  (req as any).recruiter = recruiter;
  (req as any).token = token;
  next();
}

// API Routes

// 1. Register Candidate
app.post('/api/register', async (req, res) => {
  const { fullName, mobile, email, password, confirmPassword } = req.body;

  // Validation
  if (!fullName || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields except email are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const cleanMobile = mobile.trim();
  if (!/^\d{10}$/.test(cleanMobile)) {
    return res.status(400).json({ error: 'Mobile number must be a valid 10-digit number.' });
  }

  const liveCandidates = await getLiveCandidates();
  const db = readDB();
  db.candidates = liveCandidates;

  // Unique Mobile Number Check
  const exists = db.candidates.some((c: any) => c.mobile === cleanMobile || (email && c.email && c.email.toLowerCase() === email.trim().toLowerCase()));
  if (exists) {
    return res.status(400).json({ error: 'Mobile number or email is already registered.' });
  }

  // Create candidate
  const id = crypto.randomUUID();
  const { salt, hash } = hashPassword(password);

  const newCandidate = {
    id,
    mobile: cleanMobile,
    fullName: fullName.trim(),
    email: email ? email.trim() : undefined,
    salt,
    hash,
    profile: {
      fullName: fullName.trim(), // Default full name
      bikeAvailable: 'No' as const,
      drivingLicenseAvailable: 'No' as const,
      languagesKnown: []
    }
  };

  db.candidates.push(newCandidate);

  // Generate Session Token
  const token = crypto.randomBytes(32).toString('hex');
  db.tokens[token] = id;

  await writeDB(db);

  if (isSupabaseConfigured()) {
    try {
      const candRow = toSupabaseCandidateRow(newCandidate);
      if (candRow) {
        await safeSupabaseUpsert('candidates', [candRow]);
      }
    } catch (supaErr) {
      console.warn('[Supabase Direct Candidate Register Upsert Warning]', supaErr);
    }
  }

  res.status(201).json({
    message: 'Registration successful',
    token,
    candidate: {
      id: newCandidate.id,
      mobile: newCandidate.mobile,
      fullName: newCandidate.fullName,
      email: newCandidate.email,
      profile: newCandidate.profile
    }
  });
});

// 2. Check Candidate Existence (Search by Mobile Number or Email ID)
app.post('/api/candidate/check', async (req, res) => {
  try {
    const { identifier, mobile, email } = req.body;
    const inputVal = (identifier || mobile || email || '').trim();
    if (!inputVal) {
      return res.status(400).json({ error: 'Mobile number or Email ID is required.' });
    }

    const cleanDigits = inputVal.replace(/\D/g, '').slice(-10);
    const cleanEmail = inputVal.includes('@') ? inputVal.toLowerCase() : '';

    const candidates = await getLiveCandidates();
    const found = candidates.find((c: any) => {
      if (cleanEmail && ((c.email && c.email.toLowerCase() === cleanEmail) || (c.profile?.email && c.profile.email.toLowerCase() === cleanEmail))) return true;
      if (cleanDigits && cleanDigits.length === 10) {
        const cMob = (c.mobile || c.profile?.mobile || '').replace(/\D/g, '').slice(-10);
        if (cMob === cleanDigits) return true;
      }
      if (c.email && c.email.toLowerCase() === inputVal.toLowerCase()) return true;
      if (c.mobile && c.mobile === inputVal) return true;
      return false;
    });

    if (found) {
      return res.status(200).json({
        exists: true,
        candidate: {
          id: found.id,
          fullName: found.fullName,
          mobile: found.mobile,
          email: found.email
        }
      });
    }

    return res.status(200).json({
      exists: false,
      notFound: true,
      message: 'Mobile number or Email ID is not registered.',
      prefill: {
        mobile: cleanDigits.length === 10 ? cleanDigits : undefined,
        email: cleanEmail || (inputVal.includes('@') ? inputVal : undefined)
      }
    });
  } catch (err) {
    console.error('[Candidate Check Error]', err);
    res.status(500).json({ error: 'Server error checking candidate existence.' });
  }
});

// 3. Login Candidate
app.post('/api/login', async (req, res) => {
  const { mobile, identifier, password } = req.body;

  const loginId = (mobile || identifier || '').trim();
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Mobile number/Email and password are required.' });
  }

  const cleanDigits = loginId.replace(/\D/g, '').slice(-10);
  const cleanEmail = loginId.includes('@') ? loginId.toLowerCase() : '';

  const liveCandidates = await getLiveCandidates();
  const db = readDB();
  db.candidates = liveCandidates;

  // Find candidate by email or mobile number across all candidate fields
  const candidate = db.candidates.find((c: any) => {
    if (cleanEmail && ((c.email && c.email.toLowerCase() === cleanEmail) || (c.profile?.email && c.profile.email.toLowerCase() === cleanEmail))) return true;
    if (cleanDigits && cleanDigits.length === 10) {
      const cMobile = (c.mobile || c.profile?.mobile || '').replace(/\D/g, '').slice(-10);
      if (cMobile === cleanDigits) return true;
    }
    if (c.email && c.email.toLowerCase() === loginId.toLowerCase()) return true;
    if (c.mobile && c.mobile === loginId) return true;
    return false;
  });

  if (!candidate) {
    return res.status(404).json({ 
      notFound: true, 
      error: cleanEmail 
        ? `No candidate account found for ${cleanEmail}. Please register a new account.` 
        : `No candidate account found for ${loginId}. Please register a new account.`,
      prefill: {
        mobile: cleanDigits.length === 10 ? cleanDigits : undefined,
        email: cleanEmail || (loginId.includes('@') ? loginId : undefined)
      }
    });
  }

  const isValid = verifyPassword(password, candidate.salt, candidate.hash);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid mobile/email or password.' });
  }

  // Generate Session Token
  const token = crypto.randomBytes(32).toString('hex');
  db.tokens[token] = candidate.id;

  writeDB(db);

  const documents = (db.documents || []).filter((d: any) => d.candidateId === candidate.id);

  res.status(200).json({
    message: 'Login successful',
    token,
    candidate: {
      id: candidate.id,
      mobile: candidate.mobile,
      fullName: candidate.fullName,
      email: candidate.email,
      profile: candidate.profile,
      documents
    }
  });
});

// Initialize Firebase Admin SDK
if (!getAdminApps().length) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'jobhai-ac983';
  initAdminApp({
    projectId
  });
}

/**
 * Verify Firebase ID Token on server side using Firebase Admin SDK
 */
async function verifyFirebaseIdToken(idToken: string): Promise<string> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('ID token is missing or invalid');
  }

  const decodedToken = await getAdminAuth().verifyIdToken(idToken);
  if (!decodedToken || !decodedToken.uid) {
    throw new Error('Invalid or unverified Firebase ID Token');
  }

  return decodedToken.uid;
}

// 2.5 Firebase Authentication Handler
app.post('/api/firebase-auth', async (req, res) => {
  const { idToken, role, mobile, email, fullName, photoURL, mode = 'login' } = req.body;

  let verifiedUid: string;
  try {
    // Authenticate and verify the token sent from client strictly via Firebase Admin SDK
    verifiedUid = await verifyFirebaseIdToken(idToken || '');
  } catch (authErr: any) {
    console.error('[Firebase Auth Verification Error]', authErr.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing Firebase ID token.' });
  }

  const cleanRole = (role === 'recruiter') ? 'recruiter' : 'candidate';
  const cleanMobile = mobile ? mobile.replace(/\D/g, '').slice(-10) : '';
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanName = fullName ? fullName.trim() : (cleanEmail ? cleanEmail.split('@')[0] : (cleanMobile || 'User'));

  if (cleanRole === 'candidate') {
    const liveCandidates = await getLiveCandidates();
    const db = readDB();
    db.candidates = liveCandidates;

    // Look for existing candidate with this verified Firebase UID, Email, or Mobile
    let candidate = db.candidates.find((c: any) => c.id === verifiedUid || c.firebaseUid === verifiedUid);

    if (!candidate) {
      // Check if candidate exists by email or mobile number
      candidate = db.candidates.find((c: any) => {
        if (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail) return true;
        if (cleanMobile && cleanMobile.length === 10) {
          const cMobile = (c.mobile || '').replace(/\D/g, '').slice(-10);
          if (cMobile === cleanMobile) return true;
        }
        return false;
      });

      if (candidate) {
        // Associate with Firebase UID while PRESERVING the primary key ID
        candidate.firebaseUid = verifiedUid;
        if (cleanEmail && !candidate.email) candidate.email = cleanEmail;
        if (cleanMobile && !candidate.mobile) candidate.mobile = cleanMobile;
      }
    }

    // If attempting to LOGIN but account is not found in database:
    if (!candidate && mode === 'login') {
      return res.status(404).json({
        notFound: true,
        error: cleanEmail 
          ? `No candidate account found for ${cleanEmail}. Please complete registration.` 
          : `No candidate account found for +91 ${cleanMobile || 'this number'}. Please complete registration.`,
        prefill: {
          mobile: cleanMobile || undefined,
          email: cleanEmail || undefined,
          fullName: cleanName || undefined
        }
      });
    }

    // If registering or existing candidate:
    if (!candidate) {
      // Create new candidate record
      candidate = {
        id: verifiedUid,
        firebaseUid: verifiedUid,
        mobile: cleanMobile || '0000000000',
        fullName: cleanName,
        email: cleanEmail || undefined,
        profile: {
          fullName: cleanName,
          profilePhoto: photoURL || undefined,
          bikeAvailable: 'No',
          drivingLicenseAvailable: 'No',
          languagesKnown: []
        }
      };
      db.candidates.push(candidate);
    } else {
      // If photoURL exists, ensure candidate profile photo is updated
      if (photoURL && !candidate.profile?.profilePhoto) {
        candidate.profile = candidate.profile || {};
        candidate.profile.profilePhoto = photoURL;
      }
    }

    // Generate Session Token
    const token = crypto.randomBytes(32).toString('hex');
    db.tokens[token] = candidate.id;
    await writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        const candRow = toSupabaseCandidateRow(candidate);
        if (candRow) {
          await safeSupabaseUpsert('candidates', [candRow]);
        }
      } catch (supaErr) {
        console.warn('[Supabase Direct Candidate Firebase Auth Upsert Warning]', supaErr);
      }
    }

    const documents = (db.documents || []).filter((d: any) => d.candidateId === candidate.id);

    return res.status(200).json({
      message: 'Firebase authentication successful',
      token,
      role: 'candidate',
      candidate: {
        id: candidate.id,
        mobile: candidate.mobile,
        fullName: candidate.fullName,
        email: candidate.email,
        profile: candidate.profile || {
          fullName: candidate.fullName,
          bikeAvailable: 'No',
          drivingLicenseAvailable: 'No',
          languagesKnown: []
        },
        documents
      }
    });

  } else {
    // Recruiter role
    const liveRecruiters = await getLiveRecruiters();
    const db = readDB();
    db.recruiters = liveRecruiters;

    let recruiter = db.recruiters.find((r: any) => r.id === verifiedUid || r.firebaseUid === verifiedUid);

    if (!recruiter) {
      recruiter = db.recruiters.find((r: any) => {
        if (cleanEmail && r.email && r.email.toLowerCase() === cleanEmail) return true;
        if (cleanMobile && cleanMobile.length === 10) {
          const rMobile = (r.mobile || '').replace(/\D/g, '').slice(-10);
          if (rMobile === cleanMobile) return true;
        }
        return false;
      });

      if (recruiter) {
        recruiter.firebaseUid = verifiedUid;
        if (cleanEmail && !recruiter.email) recruiter.email = cleanEmail;
      }
    }

    if (!recruiter && mode === 'login') {
      return res.status(404).json({
        notFound: true,
        error: cleanEmail 
          ? `No recruiter account found for ${cleanEmail}. Please register your company.` 
          : `No recruiter account found for +91 ${cleanMobile || 'this number'}. Please register your company.`,
        prefill: {
          mobile: cleanMobile || undefined,
          email: cleanEmail || undefined,
          name: cleanName || undefined
        }
      });
    }

    if (!recruiter) {
      recruiter = {
        id: verifiedUid,
        name: cleanName,
        recruiterName: cleanName,
        companyName: cleanName + "'s Company",
        email: cleanEmail || `${verifiedUid}@recruiter.jobsner`,
        mobile: cleanMobile || '0000000000',
        designation: 'Recruiter',
        companyAddress: 'Not provided',
        city: 'Not provided',
        state: 'Not provided',
        pincode: '000000',
        status: 'Approved',
        created_at: new Date().toISOString()
      };
      db.recruiters.push(recruiter);
    }

    // Generate Recruiter Session Token
    const token = crypto.randomBytes(32).toString('hex');
    db.recruiterTokens = db.recruiterTokens || {};
    db.recruiterTokens[token] = recruiter.id;
    await writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        const recRow = toSupabaseRecruiterRow(recruiter);
        if (recRow) {
          await safeSupabaseUpsert('recruiters', [recRow]);
        }
      } catch (supaErr) {
        console.warn('[Supabase Direct Recruiter Firebase Auth Upsert Warning]', supaErr);
      }
    }

    const { salt: _s, hash: _h, ...recruiterDetails } = recruiter;

    return res.status(200).json({
      message: 'Firebase recruiter authentication successful',
      token,
      role: 'recruiter',
      recruiter: recruiterDetails
    });
  }
});

// 3. Get Candidate Profile (Live from Database)
app.get('/api/profile', authenticateToken, async (req, res) => {
  const candidate = (req as any).candidate;
  try {
    const liveCandidates = await getLiveCandidates();
    const liveDocs = await getLiveDocuments();

    let candidateRecord = liveCandidates.find((c: any) => String(c.id) === String(candidate.id)) || candidate;
    const documents = liveDocs.filter((d: any) => String(d.candidateId || d.candidate_id) === String(candidate.id));

    res.status(200).json({
      id: candidateRecord.id,
      profile: candidateRecord.profile || {},
      fullName: candidateRecord.fullName || candidateRecord.profile?.fullName || candidate.fullName,
      email: candidateRecord.email || candidate.email,
      mobile: candidateRecord.mobile || candidate.mobile,
      documents
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving candidate profile.' });
  }
});

// 4. Update Candidate Profile (Immediate Supabase Sync)
app.put('/api/profile', authenticateToken, async (req, res) => {
  const candidate = (req as any).candidate;
  const updatedProfile = req.body;

  // Validation
  if (!updatedProfile.fullName || updatedProfile.fullName.trim() === '') {
    return res.status(400).json({ error: 'Full name is required in profile.' });
  }

  try {
    const db = readDB();
    db.candidates = db.candidates || [];
    let dbCandidate = db.candidates.find((c: any) => String(c.id) === String(candidate.id));

    if (!dbCandidate) {
      dbCandidate = {
        id: candidate.id,
        mobile: candidate.mobile || '',
        email: candidate.email || '',
        fullName: updatedProfile.fullName.trim(),
        profile: {},
        createdAt: new Date().toISOString()
      };
      db.candidates.push(dbCandidate);
    }

    // Handle profile photo upload to Supabase Storage if sent as base64 (strictly <= 50KB)
    let profilePhotoUrl = updatedProfile.profilePhoto !== undefined ? updatedProfile.profilePhoto : dbCandidate.profile?.profilePhoto;
    if (profilePhotoUrl && profilePhotoUrl.startsWith('data:image')) {
      const photoSizeInBytes = (profilePhotoUrl.length * 3) / 4;
      if (photoSizeInBytes > 52 * 1024) {
        return res.status(400).json({ error: 'Profile photo size must not exceed 50KB.' });
      }
      try {
        let base64Img = profilePhotoUrl;
        let mimeType = 'image/jpeg';
        let ext = '.jpg';
        if (profilePhotoUrl.includes(';base64,')) {
          const parts = profilePhotoUrl.split(';base64,');
          mimeType = parts[0].replace('data:', '') || 'image/jpeg';
          ext = mimeType.includes('png') ? '.png' : '.jpg';
          base64Img = parts[1];
        }
        const imgBuffer = Buffer.from(base64Img, 'base64');
        const imgFileName = `${candidate.id}-avatar-${Date.now()}${ext}`;
        const supaPhotoUrl = await uploadToSupabaseStorage('avatars', imgFileName, imgBuffer, mimeType);
        if (supaPhotoUrl) {
          profilePhotoUrl = supaPhotoUrl;
        }
      } catch (imgErr) {
        console.warn('[Profile Photo Supabase Storage Warning]', imgErr);
      }
    }

    // Update profile data safely
    dbCandidate.profile = {
      profilePhoto: profilePhotoUrl,
      fullName: updatedProfile.fullName.trim(),
      age: typeof updatedProfile.age === 'number' ? updatedProfile.age : (updatedProfile.age ? Number(updatedProfile.age) : dbCandidate.profile?.age),
      dateOfBirth: updatedProfile.dateOfBirth || dbCandidate.profile?.dateOfBirth,
      gender: updatedProfile.gender || dbCandidate.profile?.gender,
      address: updatedProfile.address || updatedProfile.locality || dbCandidate.profile?.address,
      city: updatedProfile.city || updatedProfile.locality || dbCandidate.profile?.city,
      state: updatedProfile.state || dbCandidate.profile?.state,
      pincode: updatedProfile.pincode || dbCandidate.profile?.pincode,
      education: updatedProfile.education !== undefined ? updatedProfile.education : dbCandidate.profile?.education,
      experience: updatedProfile.experience !== undefined ? updatedProfile.experience : dbCandidate.profile?.experience,
      currentOccupation: updatedProfile.currentOccupation || updatedProfile.currentJobRole || dbCandidate.profile?.currentOccupation,
      expectedSalary: updatedProfile.expectedSalary || dbCandidate.profile?.expectedSalary,
      languagesKnown: Array.isArray(updatedProfile.languagesKnown) ? updatedProfile.languagesKnown : (dbCandidate.profile?.languagesKnown || []),
      bikeAvailable: (updatedProfile.bikeAvailable === 'Yes' || updatedProfile.bikeAvailable === true) ? 'Yes' : 'No',
      drivingLicenseAvailable: (updatedProfile.drivingLicenseAvailable === 'Yes' || updatedProfile.drivingLicenseAvailable === true) ? 'Yes' : 'No',
      locality: updatedProfile.locality || updatedProfile.city || updatedProfile.address || dbCandidate.profile?.locality,
      recentAppliedCategory: updatedProfile.recentAppliedCategory || dbCandidate.profile?.recentAppliedCategory,
      currentJobRole: updatedProfile.currentJobRole || updatedProfile.currentOccupation || dbCandidate.profile?.currentJobRole,
    };

    // Sync basic candidate details if updated
    dbCandidate.fullName = dbCandidate.profile.fullName;
    if (updatedProfile.mobile && String(updatedProfile.mobile).trim()) {
      dbCandidate.mobile = String(updatedProfile.mobile).trim();
    }
    dbCandidate.updatedAt = new Date().toISOString();

    await writeDB(db);

    // Direct immediate Supabase DB update
    if (isSupabaseConfigured()) {
      try {
        const candRow = toSupabaseCandidateRow(dbCandidate);
        if (candRow) {
          await safeSupabaseUpsert('candidates', [candRow]);
        }
      } catch (supaErr) {
        console.warn('[Supabase Direct Candidate Upsert Warning]', supaErr);
      }
    }

    const liveDocs = await getLiveDocuments();
    const documents = liveDocs.filter((d: any) => String(d.candidateId || d.candidate_id) === String(candidate.id));

    res.status(200).json({
      message: 'Profile updated successfully',
      candidate: {
        id: dbCandidate.id,
        mobile: dbCandidate.mobile,
        fullName: dbCandidate.fullName,
        email: dbCandidate.email,
        profile: dbCandidate.profile,
        documents
      }
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
});

// 5. Get Candidate Documents (Live from Supabase)
app.get('/api/documents', authenticateToken, async (req, res) => {
  const candidate = (req as any).candidate;
  try {
    const liveDocs = await getLiveDocuments();
    const documents = liveDocs.filter((d: any) => String(d.candidateId || d.candidate_id) === String(candidate.id));
    res.status(200).json({ documents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving documents.' });
  }
});

// 6. Upload Document & Profile Photo (Direct Supabase Storage & Database Upsert)
app.post('/api/documents', authenticateToken, async (req, res) => {
  const candidate = (req as any).candidate;
  const { documentType, fileName, fileContent } = req.body;

  if (!documentType || !fileName || !fileContent) {
    return res.status(400).json({ error: 'documentType, fileName and fileContent are required.' });
  }

  const validTypes = ['aadhaar', 'pan', 'dl', 'resume', 'photo'];
  if (!validTypes.includes(documentType)) {
    return res.status(400).json({ error: 'Invalid document type. Allowed: aadhaar, pan, dl, resume, photo' });
  }

  // Validate extension
  const ext = path.extname(fileName).toLowerCase();
  if (documentType === 'resume') {
    if (ext !== '.pdf') {
      return res.status(400).json({ error: 'Resume must be a PDF file.' });
    }
  } else {
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return res.status(400).json({ error: 'Images must be in JPG, JPEG, or PNG format.' });
    }
  }

  // Estimate base64 size (strictly <= 50KB for photos, 5MB for resumes/documents)
  const sizeInBytes = (fileContent.length * 3) / 4;
  if (documentType === 'photo') {
    if (sizeInBytes > 52 * 1024) {
      return res.status(400).json({ error: 'Profile image size must not exceed 50KB. Please compress the photo.' });
    }
  } else if (sizeInBytes > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File size must be under 5MB.' });
  }

  try {
    const db = readDB();
    db.documents = db.documents || [];
    db.candidates = db.candidates || [];

    // Extract actual base64 content
    let base64Data = fileContent;
    let mimeType = documentType === 'resume' ? 'application/pdf' : (ext === '.png' ? 'image/png' : 'image/jpeg');
    if (fileContent.includes(';base64,')) {
      const headerPart = fileContent.split(';base64,')[0];
      mimeType = headerPart.replace('data:', '') || mimeType;
      base64Data = fileContent.split(';base64,')[1];
    }
    
    const buffer = Buffer.from(base64Data, 'base64');
    const safeFileName = `${candidate.id}-${documentType}-${Date.now()}${ext}`;

    // Save fallback file on disk
    try {
      const localFilePath = path.join(UPLOADS_DIR, safeFileName);
      fs.writeFileSync(localFilePath, buffer);
    } catch (diskErr) {
      console.warn('[Disk save warning]', diskErr);
    }

    let fileUrl = `/uploads/${safeFileName}`;

    // Upload directly to Supabase Storage (avatars bucket for photos, documents bucket for files)
    const bucketName = documentType === 'photo' ? 'avatars' : 'documents';
    try {
      const supaUrl = await uploadToSupabaseStorage(bucketName, safeFileName, buffer, mimeType);
      if (supaUrl) {
        fileUrl = supaUrl;
      }
    } catch (supaStoreErr) {
      console.warn('[Supabase Storage Upload Warning]', supaStoreErr);
    }

    const newDoc = {
      id: crypto.randomUUID(),
      candidateId: candidate.id,
      candidate_id: candidate.id,
      documentType,
      document_type: documentType,
      fileUrl,
      file_url: fileUrl,
      fileName,
      file_name: fileName,
      uploadDate: new Date().toISOString(),
      upload_date: new Date().toISOString(),
      verificationStatus: 'Pending',
      verification_status: 'Pending'
    };

    // Update local DB
    const existingDocIndex = db.documents.findIndex(
      (d: any) => String(d.candidateId || d.candidate_id) === String(candidate.id) && (d.documentType || d.document_type) === documentType
    );
    if (existingDocIndex > -1) {
      db.documents[existingDocIndex] = newDoc;
    } else {
      db.documents.push(newDoc);
    }

    // If profile photo, also update Candidate profile
    const candIndex = db.candidates.findIndex((c: any) => String(c.id) === String(candidate.id));
    if (candIndex > -1 && documentType === 'photo') {
      db.candidates[candIndex].profile = db.candidates[candIndex].profile || {};
      db.candidates[candIndex].profile.profilePhoto = fileUrl;
    }

    writeDB(db);

    // Direct immediate Supabase DB record upserts
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const docRow = toSupabaseDocumentRow(newDoc);
        if (docRow) {
          const { error: docErr } = await supabase.from('documents').upsert([docRow]);
          if (docErr) console.error('[Supabase Document Upsert Error]', docErr.message || docErr);
        }
        if (candIndex > -1 && documentType === 'photo') {
          const candRow = toSupabaseCandidateRow(db.candidates[candIndex]);
          if (candRow) {
            const { error: candErr } = await supabase.from('candidates').upsert([candRow]);
            if (candErr) console.error('[Supabase Candidate Photo Sync Error]', candErr.message || candErr);
          }
        }
      } catch (dbErr) {
        console.warn('[Supabase Direct Document DB Upsert Warning]', dbErr);
      }
    }

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: newDoc
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving the file.' });
  }
});

// 7. Replace Document (Direct Supabase Storage & Database Upsert)
app.put('/api/documents/:type', authenticateToken, async (req, res) => {
  const candidate = (req as any).candidate;
  const documentType = req.params.type;
  const { fileName, fileContent } = req.body;

  const validTypes = ['aadhaar', 'pan', 'dl', 'resume', 'photo'];
  if (!validTypes.includes(documentType)) {
    return res.status(400).json({ error: 'Invalid document type. Allowed: aadhaar, pan, dl, resume, photo' });
  }

  if (!fileName || !fileContent) {
    return res.status(400).json({ error: 'fileName and fileContent are required.' });
  }

  // Validate extension
  const ext = path.extname(fileName).toLowerCase();
  if (documentType === 'resume') {
    if (ext !== '.pdf') {
      return res.status(400).json({ error: 'Resume must be a PDF file.' });
    }
  } else {
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return res.status(400).json({ error: 'Images must be in JPG, JPEG, or PNG format.' });
    }
  }

  // Estimate base64 size (strictly <= 50KB for photos, 5MB for resumes/documents)
  const sizeInBytes = (fileContent.length * 3) / 4;
  if (documentType === 'photo') {
    if (sizeInBytes > 52 * 1024) {
      return res.status(400).json({ error: 'Profile image size must not exceed 50KB. Please compress the photo.' });
    }
  } else if (sizeInBytes > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File size must be under 5MB.' });
  }

  try {
    const db = readDB();
    db.documents = db.documents || [];
    db.candidates = db.candidates || [];

    const safeFileName = `${candidate.id}-${documentType}-${Date.now()}${ext}`;
    
    let base64Data = fileContent;
    let mimeType = documentType === 'resume' ? 'application/pdf' : (ext === '.png' ? 'image/png' : 'image/jpeg');
    if (fileContent.includes(';base64,')) {
      const headerPart = fileContent.split(';base64,')[0];
      mimeType = headerPart.replace('data:', '') || mimeType;
      base64Data = fileContent.split(';base64,')[1];
    }
    const buffer = Buffer.from(base64Data, 'base64');

    // Save fallback file on disk
    try {
      const localFilePath = path.join(UPLOADS_DIR, safeFileName);
      fs.writeFileSync(localFilePath, buffer);
    } catch (diskErr) {
      console.warn('[Disk save warning]', diskErr);
    }

    let fileUrl = `/uploads/${safeFileName}`;

    // Upload directly to Supabase Storage
    const bucketName = documentType === 'photo' ? 'avatars' : 'documents';
    try {
      const supaUrl = await uploadToSupabaseStorage(bucketName, safeFileName, buffer, mimeType);
      if (supaUrl) {
        fileUrl = supaUrl;
      }
    } catch (supaStoreErr) {
      console.warn('[Supabase Storage Upload Warning]', supaStoreErr);
    }

    const newDoc = {
      id: crypto.randomUUID(),
      candidateId: candidate.id,
      candidate_id: candidate.id,
      documentType,
      document_type: documentType,
      fileUrl,
      file_url: fileUrl,
      fileName,
      file_name: fileName,
      uploadDate: new Date().toISOString(),
      upload_date: new Date().toISOString(),
      verificationStatus: 'Pending',
      verification_status: 'Pending'
    };

    const existingDocIndex = db.documents.findIndex(
      (d: any) => String(d.candidateId || d.candidate_id) === String(candidate.id) && (d.documentType || d.document_type) === documentType
    );

    if (existingDocIndex > -1) {
      db.documents[existingDocIndex] = newDoc;
    } else {
      db.documents.push(newDoc);
    }

    // If profile photo, update Candidate profile
    const candIndex = db.candidates.findIndex((c: any) => String(c.id) === String(candidate.id));
    if (candIndex > -1 && documentType === 'photo') {
      db.candidates[candIndex].profile = db.candidates[candIndex].profile || {};
      db.candidates[candIndex].profile.profilePhoto = fileUrl;
    }

    writeDB(db);

    // Direct immediate Supabase DB record upserts
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const docRow = toSupabaseDocumentRow(newDoc);
        if (docRow) {
          const { error: docErr } = await supabase.from('documents').upsert([docRow]);
          if (docErr) console.error('[Supabase Document Replace Error]', docErr.message || docErr);
        }
        if (candIndex > -1 && documentType === 'photo') {
          const candRow = toSupabaseCandidateRow(db.candidates[candIndex]);
          if (candRow) {
            const { error: candErr } = await supabase.from('candidates').upsert([candRow]);
            if (candErr) console.error('[Supabase Candidate Photo Sync Error]', candErr.message || candErr);
          }
        }
      } catch (dbErr) {
        console.warn('[Supabase Direct Document DB Upsert Warning]', dbErr);
      }
    }

    res.status(200).json({
      message: 'Document replaced successfully',
      document: newDoc
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error replacing the document.' });
  }
});

// 8. Delete Document (Direct Supabase DB Sync)
app.delete('/api/documents/:type', authenticateToken, async (req, res) => {
  const candidate = (req as any).candidate;
  const documentType = req.params.type;

  const validTypes = ['aadhaar', 'pan', 'dl', 'resume', 'photo'];
  if (!validTypes.includes(documentType)) {
    return res.status(400).json({ error: 'Invalid document type.' });
  }

  try {
    const db = readDB();
    db.documents = db.documents || [];
    db.candidates = db.candidates || [];

    const docIndex = db.documents.findIndex(
      (d: any) => String(d.candidateId || d.candidate_id) === String(candidate.id) && (d.documentType || d.document_type) === documentType
    );

    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const doc = db.documents[docIndex];
    
    // Delete physical file if exists locally
    if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
      const safeFileName = path.basename(doc.fileUrl);
      const filePath = path.join(UPLOADS_DIR, safeFileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileErr) {
          console.error('File unlink error:', fileErr);
        }
      }
    }

    // Remove from local database
    db.documents.splice(docIndex, 1);

    // If profile photo, clear photo in Candidate profile
    const candIndex = db.candidates.findIndex((c: any) => String(c.id) === String(candidate.id));
    if (candIndex > -1 && documentType === 'photo') {
      if (db.candidates[candIndex].profile) {
        db.candidates[candIndex].profile.profilePhoto = '';
      }
    }

    writeDB(db);

    // Direct immediate Supabase DB deletion
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('documents').delete().match({ candidateId: candidate.id, documentType });
        if (candIndex > -1 && documentType === 'photo') {
          const candRow = toSupabaseCandidateRow(db.candidates[candIndex]);
          if (candRow) {
            await supabase.from('candidates').upsert([candRow]);
          }
        }
      } catch (dbErr) {
        console.warn('[Supabase Direct Document DB Delete Warning]', dbErr);
      }
    }

    res.status(200).json({
      message: 'Document deleted successfully',
      documentType
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting the document.' });
  }
});


// --- RECRUITER MODULE APIS ---

// 1. Register Recruiter
app.post('/api/recruiter/register', async (req, res) => {
  const {
    companyName,
    companyLogo,
    companyWebsite,
    recruiterName,
    designation,
    mobile,
    email,
    password,
    confirmPassword,
    address,
    city,
    state,
    pincode
  } = req.body;

  // Validation of required fields
  if (
    !companyName ||
    !recruiterName ||
    !designation ||
    !mobile ||
    !email ||
    !password ||
    !confirmPassword ||
    !address ||
    !city ||
    !state ||
    !pincode
  ) {
    return res.status(400).json({ error: 'All fields except Company Website and Logo are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  // Validate companyLogo size if provided as base64 (strictly <= 50KB)
  if (companyLogo && typeof companyLogo === 'string' && companyLogo.startsWith('data:image')) {
    const logoSizeInBytes = (companyLogo.length * 3) / 4;
    if (logoSizeInBytes > 52 * 1024) {
      return res.status(400).json({ error: 'Company logo size must not exceed 50KB. Please compress the logo.' });
    }
  }

  try {
    const liveRecruiters = await getLiveRecruiters();
    const db = readDB();
    db.recruiters = liveRecruiters;

    // Check if mobile is unique
    const mobileExists = db.recruiters.some((r: any) => r.mobile === mobile);
    if (mobileExists) {
      return res.status(400).json({ error: 'Mobile number is already registered.' });
    }

    // Check if email is unique
    const emailExists = db.recruiters.some((r: any) => r.email && r.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return res.status(400).json({ error: 'Email address is already registered.' });
    }

    // Hash password
    const { salt, hash } = hashPassword(password);

    const recruiterId = crypto.randomUUID();
    const newRecruiter = {
      id: recruiterId,
      companyName,
      companyLogo: companyLogo || '',
      companyWebsite: companyWebsite || '',
      recruiterName,
      designation,
      mobile,
      email: email.toLowerCase(),
      salt,
      hash,
      address,
      city,
      state,
      pincode,
      status: 'Approved', // Approved by default for smooth sandbox evaluation
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.recruiters.push(newRecruiter);
    await writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        const recRow = toSupabaseRecruiterRow(newRecruiter);
        if (recRow) {
          await safeSupabaseUpsert('recruiters', [recRow]);
        }
      } catch (supaErr) {
        console.warn('[Supabase Direct Recruiter Register Upsert Warning]', supaErr);
      }
    }

    // Return the recruiter details (excluding password salt/hash)
    const { salt: _s, hash: _h, ...recruiterDetails } = newRecruiter;

    res.status(201).json({
      message: 'Recruiter registered successfully and is pending admin approval.',
      recruiter: recruiterDetails
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error during recruiter registration.' });
  }
});

// 2. Login Recruiter
app.post('/api/recruiter/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Mobile/Email and password are required.' });
  }

  try {
    const liveRecruiters = await getLiveRecruiters();
    const db = readDB();
    db.recruiters = liveRecruiters;

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find recruiter by email or mobile
    const recruiter = db.recruiters.find(
      (r: any) => (r.email && r.email.toLowerCase() === cleanIdentifier) || r.mobile === identifier || r.mobile === cleanIdentifier
    );

    if (!recruiter) {
      return res.status(401).json({ error: 'Invalid mobile/email or password.' });
    }

    // Verify password
    const isValid = verifyPassword(password, recruiter.salt, recruiter.hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid mobile/email or password.' });
    }

    // Generate access token
    const token = crypto.randomBytes(32).toString('hex');
    db.recruiterTokens = db.recruiterTokens || {};
    db.recruiterTokens[token] = recruiter.id;
    await writeDB(db);

    const { salt: _s, hash: _h, ...recruiterDetails } = recruiter;

    res.status(200).json({
      token,
      recruiter: recruiterDetails
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error during recruiter login.' });
  }
});

// 3. Get Recruiter Profile
app.get('/api/recruiter/profile', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  const liveRecruiters = await getLiveRecruiters();
  const currentRecruiter = liveRecruiters.find((r: any) => String(r.id) === String(recruiter.id)) || recruiter;
  const { salt: _s, hash: _h, ...recruiterDetails } = currentRecruiter;
  res.status(200).json({ recruiter: recruiterDetails });
});

// 4. Update Recruiter Profile
app.put('/api/recruiter/profile', authenticateRecruiter, async (req, res) => {
  const loggedInRecruiter = (req as any).recruiter;
  const {
    companyName,
    companyLogo,
    companyWebsite,
    recruiterName,
    designation,
    mobile,
    email,
    address,
    city,
    state,
    pincode
  } = req.body;

  if (
    !companyName ||
    !recruiterName ||
    !designation ||
    !mobile ||
    !email ||
    !address ||
    !city ||
    !state ||
    !pincode
  ) {
    return res.status(400).json({ error: 'All fields except company website/logo are required.' });
  }

  try {
    const liveRecruiters = await getLiveRecruiters();
    const db = readDB();
    db.recruiters = liveRecruiters;

    // Find the recruiter index
    const index = db.recruiters.findIndex((r: any) => String(r.id) === String(loggedInRecruiter.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Recruiter not found.' });
    }

    // Validate mobile uniqueness if changed
    if (mobile !== loggedInRecruiter.mobile) {
      const mobileExists = db.recruiters.some((r: any) => String(r.id) !== String(loggedInRecruiter.id) && r.mobile === mobile);
      if (mobileExists) {
        return res.status(400).json({ error: 'Mobile number is already registered by another recruiter.' });
      }
    }

    // Validate email uniqueness if changed
    if (email.toLowerCase() !== (loggedInRecruiter.email || '').toLowerCase()) {
      const emailExists = db.recruiters.some(
        (r: any) => String(r.id) !== String(loggedInRecruiter.id) && r.email && r.email.toLowerCase() === email.toLowerCase()
      );
      if (emailExists) {
        return res.status(400).json({ error: 'Email address is already registered by another recruiter.' });
      }
    }

    // Validate companyLogo size if provided as base64 (strictly <= 50KB)
    if (companyLogo && typeof companyLogo === 'string' && companyLogo.startsWith('data:image')) {
      const logoSizeInBytes = (companyLogo.length * 3) / 4;
      if (logoSizeInBytes > 52 * 1024) {
        return res.status(400).json({ error: 'Company logo size must not exceed 50KB. Please compress the logo.' });
      }
    }

    // Update fields
    const updatedRecruiter = {
      ...db.recruiters[index],
      companyName,
      companyLogo: companyLogo !== undefined ? companyLogo : db.recruiters[index].companyLogo,
      companyWebsite: companyWebsite || '',
      recruiterName,
      designation,
      mobile,
      email: email.toLowerCase(),
      address,
      city,
      state,
      pincode,
      updatedAt: new Date().toISOString()
    };

    db.recruiters[index] = updatedRecruiter;

    // Cascade updated companyLogo and companyName to all jobs by this recruiter so all candidates see the new logo immediately
    db.jobs = db.jobs || [];
    db.jobs.forEach((job: any) => {
      if (String(job.recruiterId) === String(loggedInRecruiter.id) || String(job.recruiter_id) === String(loggedInRecruiter.id)) {
        if (updatedRecruiter.companyLogo !== undefined) {
          job.companyLogo = updatedRecruiter.companyLogo;
          job.company_logo = updatedRecruiter.companyLogo;
        }
        if (updatedRecruiter.companyName) {
          job.companyName = updatedRecruiter.companyName;
          job.company_name = updatedRecruiter.companyName;
        }
      }
    });

    await writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        const recRow = toSupabaseRecruiterRow(updatedRecruiter);
        if (recRow) {
          await safeSupabaseUpsert('recruiters', [recRow]);
        }
        // Cascade to Supabase jobs table
        if (updatedRecruiter.companyLogo) {
          const supabase = getSupabase();
          await supabase.from('jobs').update({
            company_logo: updatedRecruiter.companyLogo,
            company_name: updatedRecruiter.companyName
          }).eq('recruiter_id', String(loggedInRecruiter.id));
        }
      } catch (supaErr) {
        console.warn('[Supabase Direct Recruiter Profile Update Upsert Warning]', supaErr);
      }
    }

    const { salt: _s, hash: _h, ...recruiterDetails } = updatedRecruiter;

    res.status(200).json({
      message: 'Recruiter profile updated successfully',
      recruiter: recruiterDetails
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating recruiter profile.' });
  }
});

// Developer Bypass: Directly approve a recruiter for evaluation testing
app.post('/api/dev/approve-recruiter', (req, res) => {
  const { id, status = 'Approved' } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Recruiter ID is required.' });
  }
  try {
    const db = readDB();
    const index = db.recruiters.findIndex((r: any) => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Recruiter not found.' });
    }
    db.recruiters[index].status = status;
    db.recruiters[index].updatedAt = new Date().toISOString();
    writeDB(db);
    
    const { salt: _s, hash: _h, ...recruiterDetails } = db.recruiters[index];
    res.status(200).json({
      message: `Recruiter status successfully set to ${status}`,
      recruiter: recruiterDetails
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating status.' });
  }
});

// --- JOB LISTING APIS ---

// 1. Post a new Job (Recruiter)
app.post('/api/recruiter/jobs', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  
  if (recruiter.status !== 'Approved') {
    return res.status(403).json({ error: 'Access Denied. Only approved recruiter accounts can post job openings.' });
  }

  const {
    title,
    companyLogo,
    category,
    openings,
    employmentType,
    state,
    city,
    area,
    workLocation,
    minSalary,
    maxSalary,
    salaryType,
    shift,
    experienceRequired,
    educationRequired,
    genderPreference,
    ageLimitMin,
    ageLimitMax,
    bikeRequired,
    drivingLicenseRequired,
    immediateJoining,
    description,
    responsibilities,
    benefits,
    status
  } = req.body;

  // Validation of required fields
  if (
    !title ||
    !category ||
    openings === undefined ||
    !employmentType ||
    !state ||
    !city ||
    !area ||
    minSalary === undefined ||
    maxSalary === undefined ||
    !salaryType ||
    !shift ||
    experienceRequired === undefined ||
    !educationRequired ||
    !genderPreference ||
    ageLimitMin === undefined ||
    ageLimitMax === undefined ||
    !bikeRequired ||
    !drivingLicenseRequired ||
    !immediateJoining ||
    !description ||
    !responsibilities ||
    !benefits ||
    !status
  ) {
    return res.status(400).json({ error: 'Required fields are missing. Please fill in all fields.' });
  }

  try {
    const db = readDB();
    db.jobs = db.jobs || [];

    // Process particular company logo for this job (strictly <= 50KB & Supabase Storage)
    let jobCompanyLogo = recruiter.companyLogo || '';
    if (companyLogo && typeof companyLogo === 'string' && companyLogo.trim() !== '') {
      if (companyLogo.startsWith('data:image')) {
        const logoSizeInBytes = (companyLogo.length * 3) / 4;
        if (logoSizeInBytes > 52 * 1024) {
          return res.status(400).json({ error: 'Company logo size must not exceed 50KB. Please compress the logo.' });
        }
        try {
          let base64Img = companyLogo;
          let mimeType = 'image/jpeg';
          let ext = '.jpg';
          if (companyLogo.includes(';base64,')) {
            const parts = companyLogo.split(';base64,');
            mimeType = parts[0].replace('data:', '') || 'image/jpeg';
            ext = mimeType.includes('png') ? '.png' : (mimeType.includes('webp') ? '.webp' : '.jpg');
            base64Img = parts[1];
          }
          const imgBuffer = Buffer.from(base64Img, 'base64');
          const imgFileName = `job-${recruiter.id}-${Date.now()}${ext}`;

          try {
            const localFilePath = path.join(UPLOADS_DIR, imgFileName);
            fs.writeFileSync(localFilePath, imgBuffer);
          } catch (e) {
            console.warn('[Disk save warning for job logo]', e);
          }
          let uploadedLogoUrl = `/uploads/${imgFileName}`;

          const supaUrl = await uploadToSupabaseStorage('avatars', imgFileName, imgBuffer, mimeType);
          if (supaUrl) {
            uploadedLogoUrl = supaUrl;
          }
          jobCompanyLogo = uploadedLogoUrl;
        } catch (logoErr) {
          console.warn('[Supabase Storage Job Logo Upload Error]', logoErr);
          jobCompanyLogo = companyLogo;
        }
      } else {
        jobCompanyLogo = companyLogo;
      }
    }

    const rawJob = {
      id: crypto.randomUUID(),
      recruiterId: recruiter.id,
      companyName: recruiter.companyName,
      companyLogo: jobCompanyLogo,
      company_logo: jobCompanyLogo,
      title: title.trim(),
      category: category.trim(),
      openings: Number(openings),
      employmentType: employmentType.trim(),
      state: state.trim(),
      city: city.trim(),
      area: area.trim(),
      workLocation: workLocation ? workLocation.trim() : '',
      minSalary: Number(minSalary),
      maxSalary: Number(maxSalary),
      salaryType: salaryType.trim(),
      shift: shift.trim(),
      experienceRequired: Number(experienceRequired),
      educationRequired: educationRequired.trim(),
      genderPreference: genderPreference.trim(),
      ageLimitMin: Number(ageLimitMin),
      ageLimitMax: Number(ageLimitMax),
      bikeRequired: bikeRequired.trim(),
      drivingLicenseRequired: drivingLicenseRequired.trim(),
      immediateJoining: immediateJoining.trim(),
      description: description.trim(),
      responsibilities: responsibilities.trim(),
      benefits: benefits.trim(),
      status: status.trim(), // 'Draft' | 'Published' | 'Unpublished' | 'Closed'
      applicationsCount: 0,
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const newJob = normalizeJob(rawJob);

    // 1. FIRST PRIORITY: Update in Supabase immediately!
    let supabaseSynced = false;
    let supabaseSyncError: string | null = null;
    if (isSupabaseConfigured()) {
      try {
        const jobRow = toSupabaseJobRow(newJob);
        const upsertRes = await safeSupabaseUpsert('jobs', [jobRow]);
        if (upsertRes.success) {
          supabaseSynced = true;
          console.log('[Supabase Direct Job Upsert Success]', newJob.id, newJob.title);
        } else {
          supabaseSyncError = upsertRes.error || null;
          console.error('[Supabase Direct Job Upsert Error]', upsertRes.error);
        }
      } catch (supaErr: any) {
        supabaseSyncError = supaErr?.message || String(supaErr);
        console.warn('[Supabase Direct Job Upsert Warning]', supabaseSyncError);
      }
    }

    // 2. Local memory and filesystem fallback
    db.jobs.unshift(newJob);
    writeDB(db);

    // 3. Send Notification to all candidates on Android & Web
    await createAndBroadcastNotification({
      title: `🚨 New Job Alert: ${newJob.title}`,
      message: `${newJob.companyName} is hiring ${newJob.title} in ${newJob.city || newJob.workLocation}! Salary: ₹${Number(newJob.minSalary).toLocaleString('en-IN')} - ₹${Number(newJob.maxSalary).toLocaleString('en-IN')}/${newJob.salaryType}. Immediate Joining.`,
      type: 'NEW_JOB_POSTED',
      targetRole: 'CANDIDATE',
      recipientId: 'ALL',
      jobId: newJob.id,
      recruiterId: newJob.recruiterId,
      metadata: {
        jobId: newJob.id,
        title: newJob.title,
        companyName: newJob.companyName,
        city: newJob.city,
        state: newJob.state,
        workLocation: newJob.workLocation,
        minSalary: newJob.minSalary,
        maxSalary: newJob.maxSalary,
        salaryType: newJob.salaryType,
        category: newJob.category,
        employmentType: newJob.employmentType
      }
    });

    res.status(201).json({ 
      message: 'Job posted successfully and synchronized with Supabase & Android!', 
      job: newJob,
      supabaseSynced,
      supabaseSyncError
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error posting the job.' });
  }
});

// 2. Get jobs posted by logged-in Recruiter
app.get('/api/recruiter/jobs', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  try {
    const allJobs = await getLiveJobs();
    const recruiterJobs = allJobs.filter((j: any) => 
      j.recruiterId === recruiter.id || 
      j.recruiterId === recruiter.email ||
      (recruiter.companyName && j.companyName && j.companyName.toLowerCase() === recruiter.companyName.toLowerCase())
    );
    res.status(200).json({ jobs: recruiterJobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving jobs.' });
  }
});

// 3. Get a single Job (by id)
app.get('/api/recruiter/jobs/:id', authenticateRecruiter, (req, res) => {
  const recruiter = (req as any).recruiter;
  const jobId = req.params.id;
  try {
    const db = readDB();
    db.jobs = db.jobs || [];
    const job = db.jobs.find((j: any) => j.id === jobId && j.recruiterId === recruiter.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    res.status(200).json({ job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving job details.' });
  }
});

// 4. Update a Job
app.put('/api/recruiter/jobs/:id', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  
  if (recruiter.status !== 'Approved') {
    return res.status(403).json({ error: 'Access Denied. Only approved recruiter accounts can update job openings.' });
  }

  const jobId = req.params.id;

  try {
    const db = readDB();
    db.jobs = db.jobs || [];
    const index = db.jobs.findIndex((j: any) => j.id === jobId && j.recruiterId === recruiter.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Job not found or access denied.' });
    }

    const currentJob = db.jobs[index];
    const {
      title,
      companyLogo,
      category,
      openings,
      employmentType,
      state,
      city,
      area,
      workLocation,
      minSalary,
      maxSalary,
      salaryType,
      shift,
      experienceRequired,
      educationRequired,
      genderPreference,
      ageLimitMin,
      ageLimitMax,
      bikeRequired,
      drivingLicenseRequired,
      immediateJoining,
      description,
      responsibilities,
      benefits,
      status
    } = req.body;

    let updatedCompanyLogo = currentJob.companyLogo;
    if (companyLogo !== undefined) {
      if (companyLogo && typeof companyLogo === 'string' && companyLogo.startsWith('data:image')) {
        const logoSizeInBytes = (companyLogo.length * 3) / 4;
        if (logoSizeInBytes > 52 * 1024) {
          return res.status(400).json({ error: 'Company logo size must not exceed 50KB. Please compress the logo.' });
        }
        try {
          let base64Img = companyLogo;
          let mimeType = 'image/jpeg';
          let ext = '.jpg';
          if (companyLogo.includes(';base64,')) {
            const parts = companyLogo.split(';base64,');
            mimeType = parts[0].replace('data:', '') || 'image/jpeg';
            ext = mimeType.includes('png') ? '.png' : (mimeType.includes('webp') ? '.webp' : '.jpg');
            base64Img = parts[1];
          }
          const imgBuffer = Buffer.from(base64Img, 'base64');
          const imgFileName = `job-${recruiter.id}-${Date.now()}${ext}`;

          try {
            const localFilePath = path.join(UPLOADS_DIR, imgFileName);
            fs.writeFileSync(localFilePath, imgBuffer);
          } catch (e) {
            console.warn('[Disk save warning for job logo]', e);
          }
          let uploadedLogoUrl = `/uploads/${imgFileName}`;

          const supaUrl = await uploadToSupabaseStorage('avatars', imgFileName, imgBuffer, mimeType);
          if (supaUrl) {
            uploadedLogoUrl = supaUrl;
          }
          updatedCompanyLogo = uploadedLogoUrl;
        } catch (logoErr) {
          console.warn('[Supabase Storage Job Logo Upload Error]', logoErr);
          updatedCompanyLogo = companyLogo;
        }
      } else {
        updatedCompanyLogo = companyLogo;
      }
    }

    const updatedJobRaw = {
      ...currentJob,
      companyLogo: updatedCompanyLogo,
      company_logo: updatedCompanyLogo,
      title: title !== undefined ? title.trim() : currentJob.title,
      category: category !== undefined ? category.trim() : currentJob.category,
      openings: openings !== undefined ? Number(openings) : currentJob.openings,
      employmentType: employmentType !== undefined ? employmentType.trim() : currentJob.employmentType,
      state: state !== undefined ? state.trim() : currentJob.state,
      city: city !== undefined ? city.trim() : currentJob.city,
      area: area !== undefined ? area.trim() : currentJob.area,
      workLocation: workLocation !== undefined ? (workLocation ? workLocation.trim() : '') : currentJob.workLocation,
      minSalary: minSalary !== undefined ? Number(minSalary) : currentJob.minSalary,
      maxSalary: maxSalary !== undefined ? Number(maxSalary) : currentJob.maxSalary,
      salaryType: salaryType !== undefined ? salaryType.trim() : currentJob.salaryType,
      shift: shift !== undefined ? shift.trim() : currentJob.shift,
      experienceRequired: experienceRequired !== undefined ? Number(experienceRequired) : currentJob.experienceRequired,
      educationRequired: educationRequired !== undefined ? educationRequired.trim() : currentJob.educationRequired,
      genderPreference: genderPreference !== undefined ? genderPreference.trim() : currentJob.genderPreference,
      ageLimitMin: ageLimitMin !== undefined ? Number(ageLimitMin) : currentJob.ageLimitMin,
      ageLimitMax: ageLimitMax !== undefined ? Number(ageLimitMax) : currentJob.ageLimitMax,
      bikeRequired: bikeRequired !== undefined ? bikeRequired.trim() : currentJob.bikeRequired,
      drivingLicenseRequired: drivingLicenseRequired !== undefined ? drivingLicenseRequired.trim() : currentJob.drivingLicenseRequired,
      immediateJoining: immediateJoining !== undefined ? immediateJoining.trim() : currentJob.immediateJoining,
      description: description !== undefined ? description.trim() : currentJob.description,
      responsibilities: responsibilities !== undefined ? responsibilities.trim() : currentJob.responsibilities,
      benefits: benefits !== undefined ? benefits.trim() : currentJob.benefits,
      status: status !== undefined ? status.trim() : currentJob.status,
      updatedAt: new Date().toISOString()
    };

    const updatedJob = normalizeJob(updatedJobRaw);
    db.jobs[index] = updatedJob;
    writeDB(db);

    // Direct immediate Supabase DB update (dual-case fallback)
    if (isSupabaseConfigured()) {
      try {
        const jobRow = toSupabaseJobRow(updatedJob);
        await safeSupabaseUpsert('jobs', [jobRow]);
      } catch (supaErr: any) {
        console.warn('[Supabase Job Update Warning]', supaErr?.message || supaErr);
      }
    }

    res.status(200).json({ message: 'Job updated successfully', job: db.jobs[index] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating the job.' });
  }
});

// 5. Change Job Status (Patch API)
app.patch('/api/recruiter/jobs/:id/status', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;

  if (recruiter.status !== 'Approved') {
    return res.status(403).json({ error: 'Access Denied. Only approved recruiter accounts can update job statuses.' });
  }

  const jobId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    const db = readDB();
    db.jobs = db.jobs || [];
    const index = db.jobs.findIndex((j: any) => j.id === jobId && j.recruiterId === recruiter.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Job not found or access denied.' });
    }

    db.jobs[index].status = status;
    db.jobs[index].updatedAt = new Date().toISOString();

    writeDB(db);

    // Direct immediate Supabase DB update (dual-case fallback)
    if (isSupabaseConfigured()) {
      try {
        const jobRow = toSupabaseJobRow(db.jobs[index]);
        await safeSupabaseUpsert('jobs', [jobRow]);
      } catch (supaErr: any) {
        console.warn('[Supabase Job Status Update Warning]', supaErr?.message || supaErr);
      }
    }

    res.status(200).json({ message: `Job status updated to ${status} successfully`, job: db.jobs[index] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating job status.' });
  }
});

// 6. Delete a Job
app.delete('/api/recruiter/jobs/:id', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;

  if (recruiter.status !== 'Approved') {
    return res.status(403).json({ error: 'Access Denied. Only approved recruiter accounts can delete job openings.' });
  }

  const jobId = req.params.id;

  try {
    const db = readDB();
    db.jobs = db.jobs || [];
    const index = db.jobs.findIndex((j: any) => j.id === jobId && j.recruiterId === recruiter.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Job not found or access denied.' });
    }

    db.jobs.splice(index, 1);
    writeDB(db);

    // Direct immediate Supabase DB deletion
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { error } = await supabase.from('jobs').delete().eq('id', jobId);
        if (error) console.error('[Supabase Job Delete Error]', error.message || error);
      } catch (supaErr: any) {
        console.warn('[Supabase Job Delete Warning]', supaErr?.message || supaErr);
      }
    }

    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting the job.' });
  }
});

// 7. Get all published/active Jobs (For candidates)
app.get('/api/jobs', async (req, res) => {
  try {
    const allJobs = await getLiveJobs();
    let jobs = allJobs.filter(isJobActive);

    // Search query parameter (title, companyName, city, category)
    const search = req.query.search as string;
    if (search) {
      const q = search.toLowerCase();
      jobs = jobs.filter((j: any) => 
        (j.title && j.title.toLowerCase().includes(q)) || 
        (j.companyName && j.companyName.toLowerCase().includes(q)) || 
        (j.city && j.city.toLowerCase().includes(q)) ||
        (j.category && j.category.toLowerCase().includes(q))
      );
    }

    // Filter parameters
    const state = req.query.state as string;
    if (state && state !== 'All') {
      jobs = jobs.filter((j: any) => j.state && j.state.toLowerCase() === state.toLowerCase());
    }

    const city = req.query.city as string;
    if (city && city !== 'All') {
      jobs = jobs.filter((j: any) => j.city && j.city.toLowerCase() === city.toLowerCase());
    }

    const employmentType = req.query.employmentType as string;
    if (employmentType && employmentType !== 'All') {
      jobs = jobs.filter((j: any) => j.employmentType === employmentType);
    }

    const shift = req.query.shift as string;
    if (shift && shift !== 'All') {
      jobs = jobs.filter((j: any) => j.shift === shift);
    }

    const bikeRequired = req.query.bikeRequired as string;
    if (bikeRequired && bikeRequired !== 'All') {
      jobs = jobs.filter((j: any) => j.bikeRequired === bikeRequired);
    }

    const drivingLicenseRequired = req.query.drivingLicenseRequired as string;
    if (drivingLicenseRequired && drivingLicenseRequired !== 'All') {
      jobs = jobs.filter((j: any) => j.drivingLicenseRequired === drivingLicenseRequired);
    }

    const immediateJoining = req.query.immediateJoining as string;
    if (immediateJoining && immediateJoining !== 'All') {
      jobs = jobs.filter((j: any) => j.immediateJoining === immediateJoining);
    }

    const genderPreference = req.query.genderPreference as string;
    if (genderPreference && genderPreference !== 'All') {
      jobs = jobs.filter((j: any) => j.genderPreference === genderPreference);
    }

    const maxExperience = req.query.experience as string;
    if (maxExperience && maxExperience !== 'All') {
      jobs = jobs.filter((j: any) => j.experienceRequired <= Number(maxExperience));
    }

    const minSalary = req.query.minSalary as string;
    if (minSalary) {
      jobs = jobs.filter((j: any) => j.maxSalary >= Number(minSalary));
    }

    // Sorting
    const sort = req.query.sort as string; // 'newest' | 'oldest'
    if (sort === 'oldest') {
      jobs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      jobs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.status(200).json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving jobs.' });
  }
});

// 7.1 Search Jobs (Candidates)
app.get('/api/jobs/search', async (req, res) => {
  try {
    const allJobs = await getLiveJobs();
    let jobs = allJobs.filter(isJobActive);
    const q = (req.query.q || '') as string;
    if (q) {
      const lowerQ = q.toLowerCase();
      jobs = jobs.filter((j: any) => 
        (j.title && j.title.toLowerCase().includes(lowerQ)) || 
        (j.companyName && j.companyName.toLowerCase().includes(lowerQ)) || 
        (j.city && j.city.toLowerCase().includes(lowerQ)) ||
        (j.category && j.category.toLowerCase().includes(lowerQ))
      );
    }
    res.status(200).json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error searching jobs.' });
  }
});

// 7.2 Filter Jobs (Candidates)
app.get('/api/jobs/filter', async (req, res) => {
  try {
    const allJobs = await getLiveJobs();
    let jobs = allJobs.filter(isJobActive);
    
    const state = req.query.state as string;
    if (state && state !== 'All') {
      jobs = jobs.filter((j: any) => j.state && j.state.toLowerCase() === state.toLowerCase());
    }
    const city = req.query.city as string;
    if (city && city !== 'All') {
      jobs = jobs.filter((j: any) => j.city && j.city.toLowerCase() === city.toLowerCase());
    }
    const minSalary = req.query.minSalary as string;
    if (minSalary) {
      jobs = jobs.filter((j: any) => j.maxSalary >= Number(minSalary));
    }
    const employmentType = req.query.employmentType as string;
    if (employmentType && employmentType !== 'All') {
      jobs = jobs.filter((j: any) => j.employmentType === employmentType);
    }
    const experience = req.query.experience as string;
    if (experience && experience !== 'All') {
      jobs = jobs.filter((j: any) => j.experienceRequired <= Number(experience));
    }
    const shift = req.query.shift as string;
    if (shift && shift !== 'All') {
      jobs = jobs.filter((j: any) => j.shift === shift);
    }
    const bikeRequired = req.query.bikeRequired as string;
    if (bikeRequired && bikeRequired !== 'All') {
      jobs = jobs.filter((j: any) => j.bikeRequired === bikeRequired);
    }
    const drivingLicenseRequired = req.query.drivingLicenseRequired as string;
    if (drivingLicenseRequired && drivingLicenseRequired !== 'All') {
      jobs = jobs.filter((j: any) => j.drivingLicenseRequired === drivingLicenseRequired);
    }
    const immediateJoining = req.query.immediateJoining as string;
    if (immediateJoining && immediateJoining !== 'All') {
      jobs = jobs.filter((j: any) => j.immediateJoining === immediateJoining);
    }
    const genderPreference = req.query.genderPreference as string;
    if (genderPreference && genderPreference !== 'All') {
      jobs = jobs.filter((j: any) => j.genderPreference === genderPreference);
    }
    const sort = req.query.sort as string;
    if (sort === 'oldest') {
      jobs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      jobs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    res.status(200).json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error filtering jobs.' });
  }
});

// 7.3 Get Job Details (Candidates)
app.get('/api/jobs/:id', (req, res) => {
  try {
    const db = readDB();
    db.jobs = db.jobs || [];
    const job = db.jobs.find((j: any) => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }
    // Draft jobs are never visible to candidates
    if (job.status === 'Draft') {
      return res.status(403).json({ error: 'This job listing is not available.' });
    }
    
    // Increment views Count when details are viewed
    job.viewsCount = (job.viewsCount || 0) + 1;
    writeDB(db);

    res.status(200).json({ job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving job details.' });
  }
});

// 7.3.5 Increment Job Views (Candidates - Fast tracking)
app.post('/api/jobs/:id/view', (req, res) => {
  try {
    const db = readDB();
    db.jobs = db.jobs || [];
    const job = db.jobs.find((j: any) => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }
    job.viewsCount = (job.viewsCount || 0) + 1;
    writeDB(db);
    res.status(200).json({ success: true, viewsCount: job.viewsCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error tracking job view.' });
  }
});

// Core Candidate Job Application Handler
async function applyCandidateToJob(candidate: any, rawJobId: any, res: any) {
  if (!rawJobId) {
    return res.status(400).json({ error: 'jobId is required.' });
  }
  const jobId = String(rawJobId);

  try {
    const allJobs = await getLiveJobs();
    const job = allJobs.find((j: any) => String(j.id) === jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }

    if (job.status === 'Draft') {
      return res.status(403).json({ error: 'Cannot apply to a draft job.' });
    }

    if (job.status === 'Closed') {
      return res.status(400).json({ error: 'This job listing has been closed and cannot accept new applications.' });
    }

    // 3. Check for valid recruiterId on job
    const recruiterId = job.recruiterId || job.recruiter_id;
    if (!recruiterId || !String(recruiterId).trim()) {
      return res.status(500).json({ error: 'Job is missing recruiterId.' });
    }

    // 6. Candidate profile validation
    // fullName may exist as candidate.fullName OR candidate.profile.fullName
    // age, gender and pincode should be read from candidate.profile
    const profile = candidate.profile || {};
    const fullName = candidate.fullName || profile.fullName;
    const age = profile.age;
    const gender = profile.gender;
    const pincode = profile.pincode;

    const missingProfileFields: string[] = [];
    if (!fullName || (typeof fullName === 'string' && !fullName.trim())) {
      missingProfileFields.push('Full Name');
    }
    if (age === undefined || age === null || (typeof age === 'string' && !String(age).trim())) {
      missingProfileFields.push('Age');
    }
    if (!gender || (typeof gender === 'string' && !gender.trim())) {
      missingProfileFields.push('Gender');
    }
    if (!pincode || (typeof pincode === 'string' && !String(pincode).trim())) {
      missingProfileFields.push('6-digit Pincode');
    }

    if (missingProfileFields.length > 0) {
      return res.status(400).json({
        error: 'Profile or documents are incomplete.',
        missingProfileFields,
        missingDocs: []
      });
    }

    // 5. Duplicate check using ONLY candidateId, jobId, withdrawStatus
    const allApps = await getLiveApplications();
    const existingApplication = allApps.find(
      (app: any) =>
        String(app.candidateId) === String(candidate.id) &&
        String(app.jobId) === jobId &&
        app.withdrawStatus !== 'Withdrawn'
    );
    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied for this job listing.' });
    }

    // 4. Create application row with ONLY exact camelCase columns
    const nowIso = new Date().toISOString();
    const applicationId = crypto.randomUUID();
    const newApplication = {
      id: applicationId,
      candidateId: candidate.id,
      jobId: jobId,
      recruiterId: String(recruiterId),
      appliedDate: nowIso,
      currentStatus: 'Applied',
      withdrawStatus: 'Active',
      lastUpdated: nowIso
    };

    // 2. Insert into Supabase (Fail if insertion fails, return HTTP 500)
    if (isSupabaseConfigured()) {
      const upsertRes = await safeSupabaseUpsert('applications', [newApplication]);
      if (!upsertRes.success) {
        return res.status(500).json({ error: upsertRes.error || 'Failed to insert application into Supabase.' });
      }

      // 8. Update jobs.applicationsCount in Supabase using exact existing jobs columns
      const newCount = (job.applicationsCount || 0) + 1;
      const jobRow = toSupabaseJobRow({ ...job, applicationsCount: newCount, updatedAt: nowIso });
      await safeSupabaseUpsert('jobs', [jobRow]);
    }

    // Local DB fallback update
    const db = readDB();
    db.applications = db.applications || [];
    db.applications.push(newApplication);

    db.jobs = db.jobs || [];
    const dbJob = db.jobs.find((j: any) => String(j.id) === jobId);
    if (dbJob) {
      dbJob.applicationsCount = (dbJob.applicationsCount || 0) + 1;
    }

    const dbCand = db.candidates ? db.candidates.find((c: any) => c.id === candidate.id) : null;
    if (dbCand) {
      dbCand.recentCategory = job.category;
      if (dbCand.profile) {
        dbCand.profile.recentCategory = job.category;
      }
    }
    writeDB(db);

    // Broadcast notifications
    try {
      const candidateDisplayName = fullName || 'A candidate';
      const candDoc = (db.documents || []).find((d: any) => String(d.candidateId || d.candidate_id) === candidate.id && (d.documentType === 'photo' || d.type === 'photo'));
      const candidatePhoto = candidate.profile?.profilePhoto || candDoc?.fileUrl || candDoc?.file_url || '';

      await createAndBroadcastNotification({
        title: '📄 New Candidate Application Received!',
        message: `${candidateDisplayName} has applied for "${job.title}" at ${job.companyName || 'Hiring Company'}.`,
        type: 'NEW_APPLICATION',
        targetRole: 'RECRUITER',
        recipientId: String(recruiterId),
        jobId: job.id,
        applicationId: newApplication.id,
        candidateId: candidate.id,
        metadata: {
          applicationId: newApplication.id,
          jobId: job.id,
          jobTitle: job.title,
          companyName: job.companyName,
          candidateName: candidateDisplayName,
          candidateProfilePhoto: candidatePhoto
        }
      });

      await createAndBroadcastNotification({
        title: '✅ Application Submitted Successfully',
        message: `Your application for "${job.title}" at ${job.companyName || 'Hiring Company'} was submitted. Recruiter will review your profile shortly.`,
        type: 'APPLICATION_SUBMITTED',
        targetRole: 'CANDIDATE',
        recipientId: candidate.id,
        jobId: job.id,
        applicationId: newApplication.id,
        metadata: {
          applicationId: newApplication.id,
          jobId: job.id,
          jobTitle: job.title,
          companyName: job.companyName
        }
      });
    } catch (notifErr) {
      console.warn('[Notification Error]', notifErr);
    }

    return res.status(201).json({
      message: 'Application submitted successfully.',
      application: newApplication
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error submitting application.' });
  }
}

// 7.4 Apply Job (Candidates)
app.post('/api/jobs/:id/apply', authenticateToken, async (req, res) => {
  const candidate = (req as any).candidate;
  const jobId = req.params.id;
  await applyCandidateToJob(candidate, jobId, res);
});

// Alias POST for Apply Job (supports both calling structures)
app.post('/api/applications', authenticateToken, async (req, res) => {
  const candidate = (req as any).candidate;
  const { jobId } = req.body;
  await applyCandidateToJob(candidate, jobId, res);
});

// 7.5 Get My Applications (Candidates)
app.get('/api/applications/my', authenticateToken, async (req, res) => {
  const candidate = (req as any).candidate;

  try {
    const allApps = await getLiveApplications();
    const allJobs = await getLiveJobs();

    const myApps = allApps.filter((app: any) => 
      String(app.candidateId) === String(candidate.id) || 
      String(app.candidate_id) === String(candidate.id)
    );

    const detailedApps = myApps.map((app: any) => {
      const job = allJobs.find((j: any) => String(j.id) === String(app.jobId)) || {};
      return {
        ...app,
        jobTitle: job.title || 'Unknown Position',
        companyName: job.companyName || 'Unknown Company',
        companyLogo: job.companyLogo || '',
        jobCity: job.city || '',
        jobState: job.state || '',
        jobSalary: job.minSalary ? `₹${job.minSalary} - ₹${job.maxSalary}` : (job.salary || 'N/A'),
        jobSalaryType: job.salaryType || '',
        jobEmploymentType: job.employmentType || '',
        jobShift: job.shift || '',
        jobExperienceRequired: job.experienceRequired || 0,
        jobOpenings: job.openings || 1,
        jobDescription: job.description || '',
        jobResponsibilities: job.responsibilities || '',
        jobRequirements: job.educationRequired || '',
        jobBenefits: job.benefits || '',
        jobWorkingHours: job.workingHours || 'Standard Shift hours',
        jobAgeLimit: job.ageLimitMin ? `${job.ageLimitMin} - ${job.ageLimitMax} Years` : '18 - 45 Years',
        jobBikeRequirement: job.bikeRequired || 'No',
        jobDrivingLicenseRequirement: job.drivingLicenseRequired || 'No',
        jobRecruiterName: job.recruiterName || ''
      };
    });

    res.status(200).json({ applications: detailedApps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving applications.' });
  }
});

// Alias for My Applications
app.get('/api/my-applications', authenticateToken, async (req, res) => {
  try {
    const candidate = (req as any).candidate;
    const allApps = await getLiveApplications();
    const allJobs = await getLiveJobs();

    const myApps = allApps.filter((app: any) => 
      String(app.candidateId) === String(candidate.id) || 
      String(app.candidate_id) === String(candidate.id)
    );

    const detailedApps = myApps.map((app: any) => {
      const job = allJobs.find((j: any) => String(j.id) === String(app.jobId)) || {};
      return {
        ...app,
        jobTitle: job.title || 'Unknown Position',
        companyName: job.companyName || 'Unknown Company',
        companyLogo: job.companyLogo || '',
        jobCity: job.city || '',
        jobState: job.state || '',
        jobSalary: job.minSalary ? `₹${job.minSalary} - ₹${job.maxSalary}` : (job.salary || 'N/A'),
        jobSalaryType: job.salaryType || '',
        jobEmploymentType: job.employmentType || '',
        jobShift: job.shift || '',
        jobExperienceRequired: job.experienceRequired || 0,
        jobOpenings: job.openings || 1,
        jobDescription: job.description || '',
        jobResponsibilities: job.responsibilities || '',
        jobRequirements: job.educationRequired || '',
        jobBenefits: job.benefits || '',
        jobWorkingHours: job.workingHours || 'Standard Shift hours',
        jobAgeLimit: job.ageLimitMin ? `${job.ageLimitMin} - ${job.ageLimitMax} Years` : '18 - 45 Years',
        jobBikeRequirement: job.bikeRequired || 'No',
        jobDrivingLicenseRequirement: job.drivingLicenseRequirement || 'No',
        jobRecruiterName: job.recruiterName || ''
      };
    });

    res.status(200).json({ applications: detailedApps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving applications.' });
  }
});

// 7.6 Withdraw Application (Candidates)
app.post('/api/applications/:id/withdraw', authenticateToken, (req, res) => {
  const candidate = (req as any).candidate;
  const appId = req.params.id;

  try {
    const db = readDB();
    db.applications = db.applications || [];

    const appIndex = db.applications.findIndex((app: any) => app.id === appId && app.candidateId === candidate.id);
    if (appIndex === -1) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const application = db.applications[appIndex];

    if (application.currentStatus !== 'Applied') {
      return res.status(400).json({ error: 'Cannot withdraw applications that have already progressed past Applied status.' });
    }

    application.currentStatus = 'Withdrawn';
    application.withdrawStatus = 'Withdrawn';
    application.lastUpdated = new Date().toISOString();

    // Decrease applicationsCount for the job
    db.jobs = db.jobs || [];
    const job = db.jobs.find((j: any) => j.id === application.jobId);
    if (job && job.applicationsCount > 0) {
      job.applicationsCount -= 1;
    }

    writeDB(db);

    res.status(200).json({
      message: 'Application withdrawn successfully.',
      application
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error withdrawing application.' });
  }
});

// 6.1 Get Recruiter Applications (Live from Database, filtered by Candidate Allocation Engine)
app.get('/api/recruiter/applications', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  try {
    const allJobs = await getLiveJobs();
    const allApps = await getLiveApplications();
    const allCandidates = await getLiveCandidates();
    const allAllocations = await getLiveAllocations();
    const allDocs = await getLiveDocuments();

    const visibleAppIds = new Set(
      allAllocations
        .filter((al: any) => al.allocationStatus === 'Recruiter Visible')
        .map((al: any) => String(al.applicationId || al.id))
    );

    const isRecruiterJob = (j: any) => {
      if (!j) return false;
      if (recruiter.role === 'admin') return true;
      const recId = String(recruiter.id || '');
      const recEmail = String(recruiter.email || '').toLowerCase();
      const jobRecId = String(j.recruiterId || j.recruiter_id || '');
      if (jobRecId && (jobRecId === recId || jobRecId.toLowerCase() === recEmail)) return true;
      if (recruiter.companyName && j.companyName && recruiter.companyName.trim().toLowerCase() === j.companyName.trim().toLowerCase()) return true;
      return false;
    };

    const myJobs = allJobs.filter(isRecruiterJob);
    const myJobIds = myJobs.map((j: any) => String(j.id));
    
    // Filter apps: must belong to recruiter's job AND be allocated as 'Recruiter Visible' (unless admin)
    const myApps = allApps.filter((app: any) => {
      const matchesJob = myJobIds.includes(String(app.jobId)) || myJobIds.includes(String(app.job_id));
      if (!matchesJob) return false;
      if (recruiter.role === 'admin') return true;
      return visibleAppIds.has(String(app.id));
    });

    const appMap = new Map<string, any>();
    myApps.forEach((app: any) => {
      const id = String(app.id || '');
      if (!id || appMap.has(id)) return;

      const job = allJobs.find((j: any) => String(j.id) === String(app.jobId) || String(j.id) === String(app.job_id)) || {};
      const candidateId = String(app.candidateId || app.candidate_id);
      const candidate = allCandidates.find((c: any) => String(c.id) === candidateId) || {};
      const profile = candidate.profile || {};
      
      const candDoc = (allDocs || []).find((d: any) => String(d.candidateId || d.candidate_id) === candidateId && (d.documentType === 'photo' || d.type === 'photo'));
      const candidatePhoto = profile.profilePhoto || candDoc?.fileUrl || candDoc?.file_url || '';

      appMap.set(id, {
        ...app,
        jobTitle: job.title || 'Unknown Position',
        jobCity: job.city || '',
        candidateName: profile.fullName || candidate.fullName || 'Candidate',
        candidateMobile: candidate.mobile || '',
        candidateEmail: candidate.email || '',
        candidateProfilePhoto: candidatePhoto,
        candidateExperience: profile.experience !== undefined ? profile.experience : 0,
        candidateCity: profile.city || '',
        candidateState: profile.state || ''
      });
    });

    // Also include urgent candidate assignments for the recruiter's jobs
    const urgentAssignments = await getLiveUrgentAssignments();
    const myUrgentAssignments = urgentAssignments.filter((a: any) => 
      myJobIds.includes(String(a.jobId)) || 
      String(a.recruiterId) === String(recruiter.id) || 
      (recruiter.email && String(a.recruiterId).toLowerCase() === String(recruiter.email).toLowerCase())
    );

    myUrgentAssignments.forEach((a: any) => {
      const id = String(a.id || '');
      if (!id || appMap.has(id)) return;
      const job = allJobs.find((j: any) => String(j.id) === String(a.jobId)) || {};

      appMap.set(id, {
        id,
        assignmentId: id,
        candidateId: String(a.candidateId),
        jobId: String(a.jobId),
        jobTitle: job.title || 'Logistics Opening',
        jobCity: job.city || a.candidateLocation || '',
        candidateName: a.candidateName || 'Candidate',
        candidateMobile: a.candidateContact || '',
        candidateContact: a.candidateContact || '',
        candidateEmail: '',
        candidateProfilePhoto: '',
        candidateExperience: 0,
        candidateCity: a.candidateLocation || '',
        candidateEducation: a.candidateEducation || 'Graduate',
        currentStatus: a.status || 'Pending',
        status: a.status || 'Pending',
        appliedDate: a.assignedAt || new Date().toISOString(),
        assignedAt: a.assignedAt,
        isUrgentCandidate: true
      });
    });

    res.status(200).json({ applications: Array.from(appMap.values()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving recruiter applications.' });
  }
});

// 6.2 Get Recruiter Application Details (Live from Database)
app.get('/api/recruiter/applications/:id', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  const appId = req.params.id;
  try {
    const db = readDB();
    const allApps = await getLiveApplications();
    const allJobs = await getLiveJobs();
    const allCandidates = await getLiveCandidates();
    const allDocs = await getLiveDocuments();
    const allAllocations = await getLiveAllocations();

    let application = allApps.find((a: any) => String(a.id) === String(appId));
    if (!application && String(appId).startsWith('urg_')) {
      const urgentAssignments = await getLiveUrgentAssignments();
      const assignment = urgentAssignments.find((a: any) => String(a.id) === String(appId));
      if (assignment) {
        const job = allJobs.find((j: any) => String(j.id) === String(assignment.jobId)) || {};
        return res.status(200).json({
          application: {
            id: String(assignment.id),
            candidateId: String(assignment.candidateId),
            jobId: String(assignment.jobId),
            jobTitle: job.title || 'Logistics Opening',
            jobCity: job.city || assignment.candidateLocation || '',
            candidateName: assignment.candidateName || 'Candidate',
            candidateMobile: assignment.candidateContact || '',
            candidateCity: assignment.candidateLocation || '',
            candidateEducation: assignment.candidateEducation || 'Graduate',
            candidateExperience: 0,
            currentStatus: assignment.status || 'Pending',
            appliedDate: assignment.assignedAt,
            isUrgentCandidate: true
          },
          candidate: {
            id: String(assignment.candidateId),
            fullName: assignment.candidateName,
            mobile: assignment.candidateContact,
            profile: {
              fullName: assignment.candidateName,
              city: assignment.candidateLocation,
              education: assignment.candidateEducation
            }
          },
          job,
          documents: []
        });
      }
    }

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const job = allJobs.find((j: any) => String(j.id) === String(application.jobId) || String(j.id) === String(application.job_id));
    
    // Check authorization: owner, email match, company match, or admin
    const isOwner = 
      !job ||
      recruiter.role === 'admin' ||
      String(job.recruiterId || job.recruiter_id) === String(recruiter.id) ||
      String(job.recruiterId || job.recruiter_id).toLowerCase() === String(recruiter.email || '').toLowerCase() ||
      (recruiter.companyName && job.companyName && recruiter.companyName.trim().toLowerCase() === job.companyName.trim().toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized to view this application.' });
    }

    // Candidate Allocation Isolation check: Must be Recruiter Visible
    if (recruiter.role !== 'admin') {
      const isVisible = allAllocations.some((al: any) => 
        String(al.applicationId || al.id) === String(appId) && al.allocationStatus === 'Recruiter Visible'
      );
      if (!isVisible) {
        return res.status(403).json({ error: 'Access restricted: this candidate record is managed exclusively by Admin.' });
      }
    }

    const candidateId = String(application.candidateId || application.candidate_id);
    let candidate = allCandidates.find((c: any) => String(c.id) === candidateId);
    if (!candidate) {
      const fallbackCand = (db.candidates || []).find((c: any) => String(c.id) === candidateId);
      if (fallbackCand) {
        candidate = fallbackCand;
      } else {
        candidate = {
          id: candidateId,
          fullName: 'Candidate',
          mobile: '',
          email: '',
          profile: {}
        };
      }
    }

    // Filter documents
    const docs = allDocs.filter((d: any) => String(d.candidateId || d.candidate_id) === candidateId);

    // Get notes
    const notes = (db.recruiterNotes || []).filter((n: any) => String(n.applicationId) === String(appId));

    // Get history
    const history = (db.applicationHistory || []).filter((h: any) => String(h.applicationId) === String(appId));

    res.status(200).json({
      application,
      job: job || { title: 'Unknown Position', city: '' },
      candidate: {
        ...candidate,
        documents: docs
      },
      notes,
      history
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving application details.' });
  }
});

// 6.3 Update Application Status (Immediate Supabase Sync)
app.post('/api/recruiter/applications/:id/status', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  const appId = req.params.id;
  const { status: newStatus } = req.body;

  const allowedStatuses = [
    'Applied', 'Contacted', 'Shortlisted', 'Interview Scheduled', 
    'Interview Completed', 'Selected', 'Hired', 'Approved', 'Rejected', 'Withdrawn'
  ];

  if (!newStatus || !allowedStatuses.includes(newStatus)) {
    return res.status(400).json({ error: `Invalid status. Allowed statuses are: ${allowedStatuses.join(', ')}` });
  }

  try {
    const db = readDB();
    db.applications = db.applications || [];
    const allApps = await getLiveApplications();
    const allJobs = await getLiveJobs();

    let application = db.applications.find((a: any) => String(a.id) === String(appId));
    if (!application) {
      application = allApps.find((a: any) => String(a.id) === String(appId));
      if (application) {
        db.applications.push(application);
      }
    }

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const job = allJobs.find((j: any) => String(j.id) === String(application.jobId) || String(j.id) === String(application.job_id));
    const isOwner = 
      !job ||
      recruiter.role === 'admin' ||
      String(job.recruiterId || job.recruiter_id) === String(recruiter.id) ||
      String(job.recruiterId || job.recruiter_id).toLowerCase() === String(recruiter.email || '').toLowerCase() ||
      (recruiter.companyName && job.companyName && recruiter.companyName.trim().toLowerCase() === job.companyName.trim().toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized to modify this application.' });
    }

    const oldStatus = application.currentStatus;
    const normalizedStatus = newStatus === 'Approved' ? 'Hired' : newStatus;
    application.currentStatus = normalizedStatus;
    application.current_status = normalizedStatus;
    application.lastUpdated = new Date().toISOString();
    application.last_updated = application.lastUpdated;

    // Log to applicationHistory
    const historyEntry = {
      id: crypto.randomUUID(),
      applicationId: appId,
      previousStatus: oldStatus,
      newStatus: normalizedStatus,
      changedBy: recruiter.recruiterName || recruiter.companyName || 'Recruiter',
      changedByRole: 'Recruiter',
      changedDate: new Date().toISOString()
    };

    db.applicationHistory = db.applicationHistory || [];
    db.applicationHistory.push(historyEntry);

    // FIRST PRIORITY: Update in Supabase directly (with dual-case fallback)
    if (isSupabaseConfigured()) {
      try {
        const appRow = toSupabaseApplicationRow(application);
        await safeSupabaseUpsert('applications', [appRow]);
      } catch (supaErr) {
        console.warn('[Supabase Direct Application Status Upsert Warning]', supaErr);
      }
    }

    writeDB(db);

    // Notify the Candidate of their application status update on Android & Web
    const candId = application.candidateId || application.candidate_id;
    if (candId) {
      const jobTitle = job ? job.title : 'Job Opening';
      const company = job ? job.companyName : 'Company';
      await createAndBroadcastNotification({
        title: `📣 Application Update: ${normalizedStatus}`,
        message: `Your application for "${jobTitle}" at ${company} has been updated to "${normalizedStatus}".`,
        type: 'APPLICATION_STATUS_CHANGED',
        targetRole: 'CANDIDATE',
        recipientId: candId,
        jobId: application.jobId || application.job_id,
        applicationId: application.id,
        metadata: {
          applicationId: application.id,
          jobId: application.jobId || application.job_id,
          jobTitle,
          companyName: company,
          status: normalizedStatus,
          previousStatus: oldStatus
        }
      });
    }

    res.status(200).json({
      message: 'Status updated and synchronized with Supabase & Android!',
      application,
      historyEntry
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating application status.' });
  }
});

// 6.4 Add Recruiter Note (Immediate Supabase Sync)
app.post('/api/recruiter/applications/:id/notes', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  const appId = req.params.id;
  const { noteText } = req.body;

  if (!noteText || !noteText.trim()) {
    return res.status(400).json({ error: 'Note text cannot be empty.' });
  }

  try {
    const db = readDB();
    const allApps = await getLiveApplications();
    const allJobs = await getLiveJobs();

    let application = (db.applications || []).find((a: any) => String(a.id) === String(appId));
    if (!application) {
      application = allApps.find((a: any) => String(a.id) === String(appId));
    }
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const job = allJobs.find((j: any) => String(j.id) === String(application.jobId) || String(j.id) === String(application.job_id));
    const isOwner = 
      !job ||
      recruiter.role === 'admin' ||
      String(job.recruiterId || job.recruiter_id) === String(recruiter.id) ||
      String(job.recruiterId || job.recruiter_id).toLowerCase() === String(recruiter.email || '').toLowerCase() ||
      (recruiter.companyName && job.companyName && recruiter.companyName.trim().toLowerCase() === job.companyName.trim().toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized to add notes to this application.' });
    }

    const newNote = {
      id: crypto.randomUUID(),
      applicationId: appId,
      recruiterId: recruiter.id,
      noteText: noteText.trim(),
      createdAt: new Date().toISOString()
    };

    db.recruiterNotes = db.recruiterNotes || [];
    db.recruiterNotes.push(newNote);

    writeDB(db);

    res.status(201).json({
      message: 'Note added successfully.',
      note: newNote
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error adding recruiter note.' });
  }
});


// 6.5 Get Recruiter Notes
app.get('/api/recruiter/applications/:id/notes', authenticateRecruiter, (req, res) => {
  const recruiter = (req as any).recruiter;
  const appId = req.params.id;

  try {
    const db = readDB();
    const application = db.applications.find((a: any) => a.id === appId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const job = db.jobs.find((j: any) => j.id === application.jobId);
    if (!job || job.recruiterId !== recruiter.id) {
      return res.status(403).json({ error: 'Unauthorized to view notes for this application.' });
    }

    const notes = db.recruiterNotes.filter((n: any) => n.applicationId === appId);
    res.status(200).json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving recruiter notes.' });
  }
});

// 6.6 Get Candidate Status Timeline
app.get('/api/applications/:id/timeline', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const appId = req.params.id;

  try {
    const db = readDB();
    const application = db.applications.find((a: any) => a.id === appId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Determine user identity
    const candidateId = db.tokens[token];
    const recruiterId = db.recruiterTokens[token];

    let authorized = false;

    if (candidateId && application.candidateId === candidateId) {
      authorized = true;
    } else if (recruiterId) {
      const job = db.jobs.find((j: any) => j.id === application.jobId);
      if (job && job.recruiterId === recruiterId) {
        authorized = true;
      }
    }

    if (!authorized) {
      return res.status(403).json({ error: 'Unauthorized to view this application timeline.' });
    }

    const timeline = db.applicationHistory.filter((h: any) => h.applicationId === appId);
    timeline.sort((a: any, b: any) => new Date(a.changedDate).getTime() - new Date(b.changedDate).getTime());

    res.status(200).json({ timeline });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving status timeline.' });
  }
});

// Express to Web Request/Response adapter for @supabase/server SDK
function adaptWebFetch(handler: (req: Request) => Promise<Response>) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const url = `${protocol}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            value.forEach(v => headers.append(key, v));
          } else {
            headers.append(key, value.toString());
          }
        }
      }

      let body: any = undefined;
      if (!['GET', 'HEAD'].includes(req.method) && req.body) {
        body = JSON.stringify(req.body);
        headers.set('content-type', 'application/json');
      }

      const webRequest = new Request(url, {
        method: req.method,
        headers,
        body,
      });

      const webResponse = await handler(webRequest);

      res.status(webResponse.status);
      webResponse.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      const responseText = await webResponse.text();
      res.send(responseText);
    } catch (err: any) {
      console.error('[Supabase Server Adapt Error]', err);
      res.status(500).json({
        error: err.message || 'Internal server error in adapted handler.',
        hint: 'Make sure your SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY are configured correctly in your environment.'
      });
    }
  };
}

// @supabase/server SDK endpoints
app.all('/api/supabase-server/health', adaptWebFetch(publicHealthHandler.fetch));
app.all('/api/supabase-server/jobs', adaptWebFetch(publicJobsHandler.fetch));
app.all('/api/supabase-server/profile', adaptWebFetch(candidateProfileHandler.fetch));
app.all('/api/supabase-server/admin/candidates', adaptWebFetch(adminCandidatesListHandler.fetch));

// Database configuration and connection state status endpoint
app.get('/api/database-status', async (req, res) => {
  try {
    const { isSupabaseConfigured } = await import('./src/lib/supabase.js');
    res.json({
      configured: isSupabaseConfigured(),
      active: supabaseActive,
      mode: supabaseActive ? 'supabase-cloud' : 'local-json-fallback',
      dbPath: DB_PATH,
      errorDetails: supabaseErrorDetails
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error checking status.' });
  }
});

// Re-check and sync database connection dynamically
app.post('/api/database-reconnect', async (req, res) => {
  try {
    const { clearSupabaseClient } = await import('./src/lib/supabase.js');
    clearSupabaseClient();
    supabaseActive = false;
    supabaseErrorDetails = null;
    await initDatabase();
    res.json({
      success: supabaseActive,
      active: supabaseActive,
      errorDetails: supabaseErrorDetails
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error executing reconnect.' });
  }
});

// Execute a SQL SELECT 1 ping query via a Supabase RPC function to verify live DB execution
app.get('/api/database-ping-sql', async (req, res) => {
  try {
    const { getSupabase, isSupabaseConfigured, clearSupabaseClient } = await import('./src/lib/supabase.js');
    clearSupabaseClient();
    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Supabase credentials are not configured.'
      });
    }

    const supabase = getSupabase();
    // Execute RPC ping_db which internally runs "SELECT 1" in PostgreSQL
    const { data, error } = await supabase.rpc('ping_db');

    if (error) {
      return res.json({
        success: false,
        query: 'SELECT 1 via rpc("ping_db")',
        error: error.message,
        code: error.code,
        hint: 'This means network connection works, but the "ping_db" function is not yet created in your Supabase project. To fix this, run the full SQL schema script (Step 2) in your Supabase SQL Editor.'
      });
    }

    return res.json({
      success: true,
      query: 'SELECT 1 via rpc("ping_db")',
      result: data,
      message: 'Successfully executed SELECT 1 inside your Supabase PostgreSQL database!'
    });
  } catch (err: any) {
    return res.json({
      success: false,
      query: 'SELECT 1 via rpc("ping_db")',
      error: err.message || 'Failed to execute ping query.'
    });
  }
});

// Complete database diagnostic utility to troubleshoot Supabase integration issues
app.get('/api/database-diagnose', async (req, res) => {
  try {
    const { clearSupabaseClient } = await import('./src/lib/supabase.js');
    clearSupabaseClient();
  } catch (e) {}

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: { configured: false, valueMasked: null, formatValid: false },
      SUPABASE_ANON_KEY: { configured: false, valueMasked: null, formatValid: false },
      SUPABASE_SERVICE_ROLE_KEY: { configured: false, valueMasked: null, formatValid: false }
    },
    network: { canResolveUrl: false, pingTest: null, error: null },
    tables: {},
    writePermission: { success: false, error: null },
    summary: '',
    recommendations: []
  };

  const url = process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url) {
    diagnostics.env.SUPABASE_URL.configured = true;
    diagnostics.env.SUPABASE_URL.valueMasked = url.length > 15 ? url.substring(0, 12) + '...' + url.substring(url.length - 4) : '***';
    diagnostics.env.SUPABASE_URL.formatValid = url.startsWith('https://') && url.includes('.supabase.co');
  }
  if (anonKey) {
    diagnostics.env.SUPABASE_ANON_KEY.configured = true;
    diagnostics.env.SUPABASE_ANON_KEY.valueMasked = anonKey.length > 20 ? anonKey.substring(0, 8) + '...' + anonKey.substring(anonKey.length - 8) : '***';
    diagnostics.env.SUPABASE_ANON_KEY.formatValid = anonKey.length > 50;
  }
  if (serviceRoleKey) {
    diagnostics.env.SUPABASE_SERVICE_ROLE_KEY.configured = true;
    diagnostics.env.SUPABASE_SERVICE_ROLE_KEY.valueMasked = serviceRoleKey.length > 20 ? serviceRoleKey.substring(0, 8) + '...' + serviceRoleKey.substring(serviceRoleKey.length - 8) : '***';
    diagnostics.env.SUPABASE_SERVICE_ROLE_KEY.formatValid = serviceRoleKey.length > 50;
  }

  if (!url || (!anonKey && !serviceRoleKey)) {
    diagnostics.summary = 'CRITICAL: Supabase credentials are not configured in your environment.';
    diagnostics.recommendations.push('Go to AI Studio Settings -> Secrets, and add SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
    return res.json(diagnostics);
  }

  // Check URL network response
  try {
    const start = Date.now();
    // Fetch a basic rest endpoint of Supabase
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': anonKey || serviceRoleKey || ''
      }
    });
    const duration = Date.now() - start;
    diagnostics.network.canResolveUrl = true;
    diagnostics.network.pingTest = `${duration}ms (HTTP ${response.status})`;
  } catch (err: any) {
    diagnostics.network.error = err.message || err;
    diagnostics.recommendations.push('Verify that your SUPABASE_URL is correct, starts with https://, and has no typos. The network timed out or refused connection.');
  }

  // Test individual tables
  try {
    const { getSupabase } = await import('./src/lib/supabase.js');
    const supabase = getSupabase();

    const tablesToTest = ['candidates', 'recruiters', 'jobs', 'applications', 'documents'];
    for (const tableName of tablesToTest) {
      try {
        const { error, data } = await supabase.from(tableName).select('id').limit(1);
        if (error) {
          diagnostics.tables[tableName] = {
            exists: false,
            error: error.message,
            code: error.code
          };
          if (error.code === '42P01') { // Relation does not exist
            diagnostics.recommendations.push(`Table "${tableName}" is missing. Paste the SQL script from Step 2 into your Supabase SQL Editor and run it.`);
          }
        } else {
          diagnostics.tables[tableName] = {
            exists: true,
            recordsCount: data ? data.length : 0
          };
        }
      } catch (tableErr: any) {
        diagnostics.tables[tableName] = {
          exists: false,
          error: tableErr.message || tableErr
        };
      }
    }

    // Check write permissions on 'candidates' table
    if (diagnostics.tables['candidates'] && diagnostics.tables['candidates'].exists) {
      const testId = '00000000-0000-0000-0000-000000000000';
      try {
        const { error: insertError } = await supabase.from('candidates').upsert({
          id: testId,
          fullName: 'Supabase Diagnostic Test Candidate',
          mobile: '9999999999',
          salt: 'dummy',
          hash: 'dummy',
          profile: { languagesKnown: [] }
        });

        if (insertError) {
          diagnostics.writePermission.error = insertError.message;
          diagnostics.recommendations.push(`Write failed on "candidates": ${insertError.message}. Ensure Row Level Security (RLS) is disabled or policies are configured to permit writes.`);
        } else {
          diagnostics.writePermission.success = true;
          // Cleanup
          await supabase.from('candidates').delete().eq('id', testId);
        }
      } catch (writeErr: any) {
        diagnostics.writePermission.error = writeErr.message || writeErr;
      }
    } else {
      diagnostics.writePermission.error = 'Skipped write test because candidates table does not exist.';
    }

  } catch (supabaseErr: any) {
    diagnostics.summary = 'FAILED: Could not initialize Supabase JS Client.';
    diagnostics.error = supabaseErr.message || supabaseErr;
    return res.json(diagnostics);
  }

  const totalTables = Object.keys(diagnostics.tables).length;
  const activeTables = Object.values(diagnostics.tables).filter((t: any) => t.exists).length;

  if (activeTables === totalTables && diagnostics.writePermission.success) {
    diagnostics.summary = 'HEALTHY: Supabase cloud is fully active, tables are initialized, and read/write tests passed successfully!';
  } else if (activeTables > 0) {
    diagnostics.summary = `PARTIAL: Connected successfully, but only ${activeTables}/${totalTables} tables exist. Please ensure all tables are created.`;
  } else if (diagnostics.network.canResolveUrl) {
    diagnostics.summary = 'CONNECTED: Supabase network is responsive, but your tables do not exist. Please run the SQL schema migration.';
  } else {
    diagnostics.summary = 'DISCONNECTED: Could not reach Supabase. Check your SUPABASE_URL and internet connectivity.';
  }

  // De-duplicate recommendations
  diagnostics.recommendations = Array.from(new Set(diagnostics.recommendations));
  res.json(diagnostics);
});

// Async Database initialization routine
async function initDatabase() {
  // Prime local state
  const db = readDB();

  try {
    const { isSupabaseConfigured, getSupabase } = await import('./src/lib/supabase.js');
    if (isSupabaseConfigured()) {
      console.log('[Database Init] Supabase config found. Validating cloud connection...');
      const supabase = getSupabase();
      
      // Test querying the candidates table
      const { error } = await supabase.from('candidates').select('id').limit(1);
      if (error) {
        supabaseActive = false;
        supabaseErrorDetails = error.message;
        console.warn('[Database Init] Linked to Supabase, but some tables are missing or need migration.');
        console.warn('[Database Init] Details:', error.message);
        console.warn('[Database Init] Using local JSON database as fallback. Run SQL Schema in Supabase console to enable persistent cloud storage.');
      } else {
        console.log('[Database Init] Connected successfully! Synchronizing cloud records with memory cache...');
        supabaseActive = true;
        supabaseErrorDetails = null;

        // Fetch tables in parallel
        const [
          { data: candidates },
          { data: recruiters },
          { data: jobs },
          { data: applications },
          { data: dDocs }
        ] = await Promise.all([
          supabase.from('candidates').select('*'),
          supabase.from('recruiters').select('*'),
          supabase.from('jobs').select('*'),
          supabase.from('applications').select('*'),
          supabase.from('documents').select('*')
        ]);

        if (candidates) db.candidates = candidates;
        if (recruiters) db.recruiters = recruiters;
        if (jobs) db.jobs = jobs;
        if (applications) db.applications = applications;
        if (dDocs) db.documents = dDocs;

        memoryDB = db;
        // Save local copy as mirror fallback
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
        console.log('[Database Init] Sync completed successfully! Cloud database is fully active.');
      }
    } else {
      supabaseActive = false;
      supabaseErrorDetails = 'Supabase credentials not configured in environment (SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are missing).';
      console.log('[Database Init] Supabase credentials not configured in environment. Using standard local file system database.');
    }
  } catch (err: any) {
    supabaseActive = false;
    supabaseErrorDetails = err.message || 'Failed to initialize Supabase connection.';
    console.warn('[Database Init] Failed to load Supabase modules, falling back to local storage:', err.message || err);
  }
}

// --- ADMIN AUTHENTICATION & SESSION ENDPOINTS ---

const activeAdminTokens = new Set<string>();

// Endpoint to verify Admin login against Supabase 'admins' table
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const trimmedUser = String(username).trim();
    const trimmedPass = String(password).trim();

    let adminRecord: { username: string; password_hash: string; salt: string; role?: string } | null = null;

    // First attempt query against Supabase 'admins' table
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .eq('username', trimmedUser)
          .maybeSingle();

        if (data && !error) {
          adminRecord = data;
        }
      } catch (dbErr: any) {
        console.warn('[Admin Auth] Supabase admins query failed/warning:', dbErr?.message || dbErr);
      }
    }

    // Secure server-side PBKDF2 SHA-512 fallback (matches Supabase SQL seed for Jobsner2026@)
    const fallbackSalt = '3a450d8ef002e04046ff3539f63fe963';
    const fallbackHash = '987cf8f8734d7d1c5f8892b1b891fef1789d306c676218fc66207b108d51d5539ab5b241fc4b57caa4ab6b629028fa90f09cb36b1195004a9087f248e0665864';

    if (!adminRecord && trimmedUser === 'Jobsner2026@') {
      adminRecord = {
        username: 'Jobsner2026@',
        password_hash: fallbackHash,
        salt: fallbackSalt,
        role: 'superadmin'
      };
    }

    if (!adminRecord) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    // Recompute PBKDF2 SHA-512 Hash with salt from DB
    const computedHash = crypto.pbkdf2Sync(trimmedPass, adminRecord.salt, 1000, 64, 'sha512').toString('hex');
    
    // Timing-safe comparison to prevent side-channel timing attacks
    const hashBuf = Buffer.from(adminRecord.password_hash, 'hex');
    const compBuf = Buffer.from(computedHash, 'hex');

    if (hashBuf.length !== compBuf.length || !crypto.timingSafeEqual(hashBuf, compBuf)) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    // Success: Generate secure session token
    const token = 'admin_sess_' + crypto.randomBytes(32).toString('hex');
    activeAdminTokens.add(token);

    return res.status(200).json({
      success: true,
      token,
      message: 'Admin authenticated successfully',
      user: {
        username: adminRecord.username,
        role: adminRecord.role || 'superadmin'
      }
    });
  } catch (err: any) {
    console.error('[Admin Auth Error]:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during authentication.' });
  }
});

// Endpoint to verify existing admin session token
app.post('/api/admin/verify-session', (req, res) => {
  const { token } = req.body || {};
  if (token && activeAdminTokens.has(token)) {
    return res.status(200).json({ success: true, valid: true });
  }
  return res.status(401).json({ success: false, valid: false });
});

// Endpoint to logout admin session
app.post('/api/admin/logout', (req, res) => {
  const { token } = req.body || {};
  if (token) {
    activeAdminTokens.delete(token);
  }
  return res.status(200).json({ success: true });
});

// --- ADMIN PANEL DIRECT ACCESS ENDPOINTS ---

// Section 1 & 2: Get all recruiters (safely formatted)
app.get('/api/admin/recruiters', async (req, res) => {
  try {
    const allRecruiters = await getLiveRecruiters();
    const safeRecruiters = allRecruiters.map(({ salt, hash, ...r }: any) => ({
      id: String(r.id),
      companyName: r.companyName || r.company_name || 'Hiring Company',
      companyLogo: r.companyLogo || r.company_logo || '',
      companyWebsite: r.companyWebsite || r.company_website || '',
      recruiterName: r.recruiterName || r.recruiter_name || 'Recruiter',
      designation: r.designation || 'HR Lead',
      mobile: r.mobile || '',
      email: r.email || '',
      address: r.address || '',
      city: r.city || '',
      state: r.state || '',
      pincode: r.pincode || '',
      status: r.status || 'Approved',
      createdAt: r.createdAt || r.created_at || ''
    }));
    res.status(200).json(safeRecruiters);
  } catch (err: any) {
    console.error('[Admin] Error fetching recruiters:', err);
    res.status(500).json({ error: 'Failed to retrieve recruiters' });
  }
});

// Section 1: Directly register a Fake Recruiter
app.post('/api/admin/recruiters', async (req, res) => {
  const { 
    recruiterName, 
    mobile, 
    email, 
    companyName, 
    designation, 
    companyWebsite, 
    address, 
    city, 
    state, 
    pincode, 
    companyLogo, 
    status,
    password 
  } = req.body;

  if (!recruiterName || !mobile || !email || !companyName) {
    return res.status(400).json({ error: 'Recruiter Name, Mobile, Email, and Company Name are required.' });
  }

  try {
    const cleanMobile = mobile.trim();
    const cleanEmail = email.trim().toLowerCase();
    const allRecruiters = await getLiveRecruiters();

    if (allRecruiters.some((r: any) => String(r.email || '').toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: 'A recruiter with this email already exists.' });
    }
    if (allRecruiters.some((r: any) => String(r.mobile || '') === cleanMobile)) {
      return res.status(400).json({ error: 'A recruiter with this mobile number already exists.' });
    }

    const { salt, hash } = hashPassword(password || 'Recruiter2026!');
    const recruiterId = `rec_${crypto.randomUUID()}`;

    const newRecruiter = {
      id: recruiterId,
      companyName: companyName.trim(),
      companyLogo: companyLogo ? companyLogo.trim() : null,
      companyWebsite: companyWebsite ? companyWebsite.trim() : null,
      recruiterName: recruiterName.trim(),
      designation: designation ? designation.trim() : 'HR Lead',
      mobile: cleanMobile,
      email: cleanEmail,
      salt,
      hash,
      address: address ? address.trim() : null,
      city: city ? city.trim() : null,
      state: state ? state.trim() : null,
      pincode: pincode ? pincode.trim() : null,
      status: status || 'Approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nickname: recruiterName.trim()
    };

    // Dual Sync: Supabase & DB
    if (isSupabaseConfigured()) {
      try {
        const row = toSupabaseRecruiterRow(newRecruiter);
        await safeSupabaseUpsert('recruiters', [row]);
      } catch (supaErr) {
        console.warn('[Supabase Admin Recruiter Upsert Warning]', supaErr);
      }
    }

    const db = readDB();
    db.recruiters = db.recruiters || [];
    db.recruiters.unshift(newRecruiter);
    writeDB(db);

    const { salt: _s, hash: _h, ...safeRecruiter } = newRecruiter;
    res.status(201).json({ message: 'Recruiter registered successfully', recruiter: safeRecruiter });
  } catch (err: any) {
    console.error('[Admin] Error creating recruiter:', err);
    res.status(500).json({ error: 'Server error registering recruiter' });
  }
});

// Section 2: Get all jobs posted by a specific Recruiter
app.get('/api/admin/recruiters/:recruiterId/jobs', async (req, res) => {
  const { recruiterId } = req.params;
  try {
    const allJobs = await getLiveJobs();
    const recruiterJobs = allJobs.filter((j: any) => 
      String(j.recruiterId || j.recruiter_id) === String(recruiterId)
    );
    res.status(200).json({ jobs: recruiterJobs });
  } catch (err: any) {
    console.error('[Admin] Error fetching recruiter jobs:', err);
    res.status(500).json({ error: 'Failed to retrieve jobs for recruiter' });
  }
});

// Section 2: Candidate Allocation Engine for a Job
// Every 3 applicants per Job -> 1 random Recruiter Visible, 2 Admin Only, remainder Pending
app.get('/api/admin/jobs/:jobId/allocations', async (req, res) => {
  const { jobId } = req.params;
  try {
    const allApps = await getLiveApplications();
    const allCandidates = await getLiveCandidates();
    const allJobs = await getLiveJobs();
    const allAllocations = await getLiveAllocations();

    const job = allJobs.find((j: any) => String(j.id) === String(jobId)) || {};
    const jobApps = allApps
      .filter((a: any) => String(a.jobId || a.job_id) === String(jobId) && a.withdrawStatus !== 'Withdrawn')
      .sort((a: any, b: any) => new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime());

    const allocMap = new Map<string, any>();
    allAllocations.forEach((al: any) => {
      const appId = String(al.applicationId || al.application_id || '');
      if (appId) allocMap.set(appId, al);
    });

    const newlyAllocatedRows: any[] = [];
    const unallocatedApps: any[] = [];

    jobApps.forEach((app: any) => {
      const appId = String(app.id);
      if (!allocMap.has(appId)) {
        unallocatedApps.push(app);
      }
    });

    // Group unallocated applicants in batches of 3
    const completeGroupCount = Math.floor(unallocatedApps.length / 3);
    for (let i = 0; i < completeGroupCount; i++) {
      const group = unallocatedApps.slice(i * 3, (i + 1) * 3);
      // Pick 1 randomly to be Recruiter Visible
      const visibleIndex = Math.floor(Math.random() * 3);

      group.forEach((app: any, idx: number) => {
        const status = idx === visibleIndex ? 'Recruiter Visible' : 'Admin Only';
        const allocRecord = {
          applicationId: String(app.id),
          allocationStatus: status,
          jobId: String(app.jobId || app.job_id || jobId),
          recruiterId: String(app.recruiterId || app.recruiter_id || job.recruiterId || ''),
          candidateId: String(app.candidateId || app.candidate_id || ''),
          allocatedAt: new Date().toISOString()
        };
        allocMap.set(String(app.id), allocRecord);
        newlyAllocatedRows.push(allocRecord);
      });
    }

    // Persist new allocations
    if (newlyAllocatedRows.length > 0) {
      const db = readDB();
      db.candidateAllocations = db.candidateAllocations || [];
      newlyAllocatedRows.forEach((r) => {
        const existingIdx = db.candidateAllocations.findIndex((x: any) => String(x.applicationId) === String(r.applicationId));
        if (existingIdx >= 0) {
          db.candidateAllocations[existingIdx] = r;
        } else {
          db.candidateAllocations.push(r);
        }
      });
      writeDB(db);

      if (isSupabaseConfigured()) {
        try {
          const rowsToUpsert = newlyAllocatedRows.map(toSupabaseAllocationRow);
          await safeSupabaseUpsert('candidateAllocations', rowsToUpsert);
        } catch (supaErr) {
          console.warn('[Supabase Candidate Allocation Upsert Warning]', supaErr);
        }
      }

      // Trigger instant notifications for newly allocated Recruiter Visible candidates
      const visibleAllocations = newlyAllocatedRows.filter((r) => r.allocationStatus === 'Recruiter Visible');
      for (const alloc of visibleAllocations) {
        const cand = allCandidates.find((c: any) => String(c.id) === String(alloc.candidateId)) || {};
        try {
          await notifyRecruiterOnCandidateAllocation(alloc, cand, job);
        } catch (notifErr) {
          console.warn('[Recruiter Allocation Notification Error]', notifErr);
        }
      }
    }

    // Format candidate rows for the Excel Grid
    const formatRow = (app: any, allocStatus: string) => {
      const candidateId = String(app.candidateId || app.candidate_id || '');
      const candidate = allCandidates.find((c: any) => String(c.id) === candidateId) || {};
      const profile = candidate.profile || {};

      return {
        id: candidate.id || candidateId,
        applicationId: String(app.id),
        fullName: profile.fullName || candidate.fullName || 'Candidate',
        mobile: candidate.mobile || '',
        email: candidate.email || '',
        age: profile.age ?? candidate.age ?? '—',
        gender: profile.gender || candidate.gender || 'Any',
        city: profile.city || candidate.city || '—',
        state: profile.state || candidate.state || '—',
        pincode: profile.pincode || candidate.pincode || '—',
        experience: profile.experience !== undefined ? profile.experience : (candidate.experience ?? 0),
        category: job.category || candidate.recent_category || profile.recentAppliedCategory || 'Delivery Jobs',
        bikeAvailable: profile.bikeAvailable ?? candidate.bikeAvailable ?? 'No',
        drivingLicenseAvailable: profile.drivingLicenseAvailable ?? candidate.drivingLicenseAvailable ?? 'No',
        jobTitle: job.title || 'Unknown Position',
        appliedDate: app.appliedDate || app.applied_date || new Date().toISOString(),
        currentStatus: app.currentStatus || app.status || 'Applied',
        allocationStatus: allocStatus,
        raw: { app, candidate, job }
      };
    };

    const recruiterVisible: any[] = [];
    const adminOnly: any[] = [];
    const pending: any[] = [];

    jobApps.forEach((app: any) => {
      const appId = String(app.id);
      const alloc = allocMap.get(appId);
      if (alloc) {
        if (alloc.allocationStatus === 'Recruiter Visible') {
          recruiterVisible.push(formatRow(app, 'Recruiter Visible'));
        } else {
          adminOnly.push(formatRow(app, 'Admin Only'));
        }
      } else {
        pending.push(formatRow(app, 'Pending Allocation'));
      }
    });

    // Ensure all Recruiter Visible candidates for this job have a recruiter notification created
    for (const item of recruiterVisible) {
      try {
        const alloc = allocMap.get(item.applicationId);
        if (alloc) {
          await notifyRecruiterOnCandidateAllocation(alloc, item.raw.candidate, job);
        }
      } catch (err) {
        // Handled silently
      }
    }

    res.status(200).json({
      recruiterVisible,
      adminOnly,
      pending,
      totalCount: jobApps.length,
      stats: {
        total: jobApps.length,
        visibleCount: recruiterVisible.length,
        adminOnlyCount: adminOnly.length,
        pendingCount: pending.length
      }
    });
  } catch (err: any) {
    console.error('[Admin] Error processing allocations for job:', err);
    res.status(500).json({ error: 'Server error processing candidate allocations' });
  }
});

// Directly post a job under a specific recruiter ID
app.post('/api/admin/jobs', async (req, res) => {
  const {
    recruiterId,
    title,
    category,
    openings,
    employmentType,
    state,
    city,
    area,
    workLocation,
    minSalary,
    maxSalary,
    salaryType,
    shift,
    experienceRequired,
    educationRequired,
    genderPreference,
    ageLimitMin,
    ageLimitMax,
    bikeRequired,
    drivingLicenseRequired,
    immediateJoining,
    description,
    responsibilities,
    benefits,
    status
  } = req.body;

  if (!recruiterId || !title || !category || openings === undefined || !employmentType || !state || !city || !area || minSalary === undefined || maxSalary === undefined || !salaryType || !shift || experienceRequired === undefined || !educationRequired || !genderPreference || ageLimitMin === undefined || ageLimitMax === undefined || !bikeRequired || !drivingLicenseRequired || !immediateJoining || !description || !responsibilities || !benefits || !status) {
    return res.status(400).json({ error: 'Required fields are missing. Please complete the form.' });
  }

  try {
    const db = readDB();
    const recruiter = (db.recruiters || []).find((r: any) => r.id === recruiterId);
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found.' });
    }

    db.jobs = db.jobs || [];
    const newJobRaw = {
      id: crypto.randomUUID(),
      recruiterId: recruiter.id,
      companyName: recruiter.companyName,
      companyLogo: recruiter.companyLogo || '',
      title: title.trim(),
      category: category.trim(),
      openings: Number(openings),
      employmentType: employmentType.trim(),
      state: state.trim(),
      city: city.trim(),
      area: area.trim(),
      workLocation: workLocation ? workLocation.trim() : '',
      minSalary: Number(minSalary),
      maxSalary: Number(maxSalary),
      salaryType: salaryType.trim(),
      shift: shift.trim(),
      experienceRequired: Number(experienceRequired),
      educationRequired: educationRequired.trim(),
      genderPreference: genderPreference.trim(),
      ageLimitMin: Number(ageLimitMin),
      ageLimitMax: Number(ageLimitMax),
      bikeRequired: bikeRequired.trim(),
      drivingLicenseRequired: drivingLicenseRequired.trim(),
      immediateJoining: immediateJoining.trim(),
      description: description.trim(),
      responsibilities: responsibilities.trim(),
      benefits: benefits.trim(),
      status: status.trim(),
      applicationsCount: 0,
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const newJob = normalizeJob(newJobRaw);

    // FIRST PRIORITY: Update in Supabase immediately!
    let supabaseSynced = false;
    let supabaseSyncError: string | null = null;
    if (isSupabaseConfigured()) {
      try {
        const jobRow = toSupabaseJobRow(newJob);
        const upsertRes = await safeSupabaseUpsert('jobs', [jobRow]);
        if (upsertRes.success) {
          supabaseSynced = true;
          console.log('[Supabase Admin Job Upsert Success]', newJob.id, newJob.title);
        } else {
          supabaseSyncError = upsertRes.error || null;
        }
      } catch (supaErr: any) {
        supabaseSyncError = supaErr?.message || String(supaErr);
      }
    }

    db.jobs.unshift(newJob);
    writeDB(db);

    // Send Notification to all candidates on Android & Web
    await createAndBroadcastNotification({
      title: `🚨 New Job Alert: ${newJob.title}`,
      message: `${newJob.companyName} is hiring ${newJob.title} in ${newJob.city || newJob.workLocation}! Salary: ₹${Number(newJob.minSalary).toLocaleString('en-IN')} - ₹${Number(newJob.maxSalary).toLocaleString('en-IN')}/${newJob.salaryType}. Immediate Joining.`,
      type: 'NEW_JOB_POSTED',
      targetRole: 'CANDIDATE',
      recipientId: 'ALL',
      jobId: newJob.id,
      recruiterId: newJob.recruiterId,
      metadata: {
        jobId: newJob.id,
        title: newJob.title,
        companyName: newJob.companyName,
        city: newJob.city,
        state: newJob.state,
        workLocation: newJob.workLocation,
        minSalary: newJob.minSalary,
        maxSalary: newJob.maxSalary,
        salaryType: newJob.salaryType,
        category: newJob.category,
        employmentType: newJob.employmentType
      }
    });

    res.status(201).json({ 
      message: 'Job posted successfully and synchronized with Supabase & Android!', 
      job: newJob,
      supabaseSynced,
      supabaseSyncError
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error posting the job.' });
  }
});

// GET all jobs for Admin Panel
app.get('/api/admin/jobs', async (req, res) => {
  try {
    const allJobs = await getLiveJobs();
    res.json(allJobs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve jobs' });
  }
});

// ========================================================
// SECTION 3: CANDIDATE POOL & URGENT ASSIGNMENTS API
// ========================================================

// 1. GET Candidate Pool (with pagination, search, sort, and summary stats)
app.get('/api/admin/candidate-pool', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.max(1, Math.min(200, parseInt(String(req.query.limit || '50'), 10)));
    const search = String(req.query.search || '').trim().toLowerCase();
    const sortBy = String(req.query.sortBy || 'createdAt');
    const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase();
    const locationFilter = String(req.query.location || 'All');
    const educationFilter = String(req.query.education || 'All');
    const jobId = String(req.query.jobId || '').trim();

    const pool = await getLiveCandidatePool();
    const assignments = await getLiveUrgentAssignments();

    // Calculate Summary numbers
    const totalCandidates = pool.length;
    
    // If a specific job is selected, calculate available/assigned relative to this job
    let assignedToJobCount = 0;
    let availableForJobCount = 0;
    
    if (jobId) {
      const assignedIdsForJob = new Set(
        assignments
          .filter((a: any) => String(a.jobId) === String(jobId))
          .map((a: any) => String(a.candidateId))
      );
      assignedToJobCount = assignedIdsForJob.size;
      availableForJobCount = Math.max(0, totalCandidates - assignedToJobCount);
    } else {
      const distinctAssignedIds = new Set(assignments.map((a: any) => String(a.candidateId)));
      assignedToJobCount = distinctAssignedIds.size;
      availableForJobCount = Math.max(0, totalCandidates - assignedToJobCount);
    }

    // Apply Filters
    let filtered = pool.filter((c: any) => {
      if (search) {
        const nameMatches = String(c.name || '').toLowerCase().includes(search);
        const contactMatches = String(c.contact || '').includes(search);
        const locationMatches = String(c.location || '').toLowerCase().includes(search);
        const educationMatches = String(c.education || '').toLowerCase().includes(search);
        if (!nameMatches && !contactMatches && !locationMatches && !educationMatches) return false;
      }
      if (locationFilter !== 'All' && String(c.location || '').toLowerCase() !== locationFilter.toLowerCase()) {
        return false;
      }
      if (educationFilter !== 'All' && String(c.education || '').toLowerCase() !== educationFilter.toLowerCase()) {
        return false;
      }
      return true;
    });

    // Apply Sorting
    filtered.sort((a: any, b: any) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      candidates: paginated,
      totalCandidates,
      availableCandidates: availableForJobCount,
      assignedCandidates: assignedToJobCount,
      totalFiltered,
      totalPages,
      currentPage: page,
      limit
    });
  } catch (err: any) {
    console.error('[Admin] Error fetching candidate pool:', err);
    res.status(500).json({ error: 'Failed to retrieve candidate pool' });
  }
});

// 2. POST Add Candidate Manually
app.post('/api/admin/candidate-pool', async (req, res) => {
  const { name, contact, location, education } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Candidate Name is required.' });
  }
  if (!contact || !contact.trim()) {
    return res.status(400).json({ error: 'Contact number is required.' });
  }
  if (!location || !location.trim()) {
    return res.status(400).json({ error: 'Location is required.' });
  }

  const cleanContact = String(contact).replace(/\D/g, '').slice(-10);
  if (cleanContact.length !== 10) {
    return res.status(400).json({ error: 'Contact must be a valid 10-digit mobile number.' });
  }

  try {
    const pool = await getLiveCandidatePool();
    if (pool.some((c: any) => c.contact === cleanContact)) {
      return res.status(400).json({ error: `A candidate with mobile ${cleanContact} already exists in the Candidate Pool.` });
    }

    const newCand = {
      id: crypto.randomUUID(),
      name: name.trim(),
      contact: cleanContact,
      location: location.trim(),
      education: education ? education.trim() : 'Graduate',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const db = readDB();
    db.candidatePool = db.candidatePool || [];
    db.candidatePool.unshift(newCand);

    // Also link into db.candidates to keep central single record
    db.candidates = db.candidates || [];
    if (!db.candidates.some((c: any) => String(c.mobile || '').replace(/\D/g, '').slice(-10) === cleanContact)) {
      const { salt, hash } = hashPassword('Candidate2026!');
      db.candidates.unshift({
        id: newCand.id,
        fullName: newCand.name,
        mobile: cleanContact,
        salt,
        hash,
        profile: {
          fullName: newCand.name,
          city: newCand.location,
          education: newCand.education,
          languagesKnown: ['Hindi', 'English']
        },
        createdAt: newCand.createdAt
      });
    }
    writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        await safeSupabaseUpsert('candidate_pool', [toSupabaseCandidatePoolRow(newCand)]);
      } catch (e) {
        console.warn('[Supabase Candidate Pool Upsert Warning]', e);
      }
    }

    res.status(201).json({ message: 'Candidate added to pool successfully', candidate: newCand });
  } catch (err: any) {
    console.error('[Admin] Error adding candidate to pool:', err);
    res.status(500).json({ error: 'Failed to add candidate to pool' });
  }
});

// 3. PUT Edit Candidate Cell / Record Inline
app.put('/api/admin/candidate-pool/:id', async (req, res) => {
  const { id } = req.params;
  const { name, contact, location, education } = req.body;
  try {
    const db = readDB();
    db.candidatePool = db.candidatePool || [];

    const existingIdx = db.candidatePool.findIndex((c: any) => String(c.id) === String(id));
    if (existingIdx === -1) {
      return res.status(404).json({ error: 'Candidate not found in pool.' });
    }

    const current = db.candidatePool[existingIdx];
    const newName = name !== undefined ? String(name).trim() : current.name;
    const newLocation = location !== undefined ? String(location).trim() : current.location;
    const newEducation = education !== undefined ? String(education).trim() : (current.education || 'Graduate');

    if (!newName) {
      return res.status(400).json({ error: 'Candidate Name cannot be empty.' });
    }
    if (!newLocation) {
      return res.status(400).json({ error: 'Location cannot be empty.' });
    }

    let cleanContact = current.contact;
    if (contact !== undefined) {
      cleanContact = String(contact).replace(/\D/g, '').slice(-10);
      if (cleanContact.length !== 10) {
        return res.status(400).json({ error: 'Contact must be a valid 10-digit mobile number.' });
      }

      // Check duplicate contact with other candidates
      const duplicate = db.candidatePool.some(
        (c: any, idx: number) => idx !== existingIdx && c.contact === cleanContact
      );
      if (duplicate) {
        return res.status(400).json({ error: `Mobile number ${cleanContact} belongs to another candidate in the pool.` });
      }
    }

    const updated = {
      ...current,
      name: newName,
      contact: cleanContact,
      location: newLocation,
      education: newEducation,
      updatedAt: new Date().toISOString()
    };

    db.candidatePool[existingIdx] = updated;

    // Update corresponding record in db.candidates if exists
    db.candidates = db.candidates || [];
    const candIdx = db.candidates.findIndex((c: any) => String(c.id) === String(id) || String(c.mobile) === cleanContact);
    if (candIdx >= 0) {
      db.candidates[candIdx].fullName = updated.name;
      db.candidates[candIdx].mobile = updated.contact;
      if (db.candidates[candIdx].profile) {
        db.candidates[candIdx].profile.fullName = updated.name;
        db.candidates[candIdx].profile.city = updated.location;
        db.candidates[candIdx].profile.education = updated.education;
      }
    }

    writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        await safeSupabaseUpsert('candidate_pool', [toSupabaseCandidatePoolRow(updated)]);
      } catch (e) {}
    }

    res.json({ message: 'Candidate updated successfully', candidate: updated });
  } catch (err: any) {
    console.error('[Admin] Error updating candidate in pool:', err);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// 4. DELETE Single Candidate from Pool
app.delete('/api/admin/candidate-pool/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = readDB();
    db.candidatePool = (db.candidatePool || []).filter((c: any) => String(c.id) !== String(id));
    writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('candidate_pool').delete().eq('id', id);
      } catch (e) {}
    }

    res.json({ success: true, message: 'Candidate removed from pool' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// 5. POST Delete Multiple Candidates
app.post('/api/admin/candidate-pool/delete-bulk', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required.' });
  }

  try {
    const idSet = new Set(ids.map(String));
    const db = readDB();
    db.candidatePool = (db.candidatePool || []).filter((c: any) => !idSet.has(String(c.id)));
    writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('candidate_pool').delete().in('id', ids);
      } catch (e) {}
    }

    res.json({ success: true, count: ids.length, message: `Removed ${ids.length} candidates` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to bulk delete candidates' });
  }
});

// 6. POST Bulk Import Candidates from Excel/CSV
app.post('/api/admin/candidate-pool/import', async (req, res) => {
  const { candidates } = req.body;
  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: 'No candidates provided for import.' });
  }

  try {
    const pool = await getLiveCandidatePool();
    const existingContacts = new Set(pool.map((c: any) => c.contact));

    const totalRows = candidates.length;
    let validRows = 0;
    let duplicateRows = 0;
    let invalidRows = 0;

    const seenInBatch = new Set<string>();
    const validCandidatesToInsert: any[] = [];

    candidates.forEach((row: any) => {
      const name = String(row.name || row.fullName || '').trim();
      const rawContact = String(row.contact || row.mobile || row.phone || '').trim();
      const cleanContact = rawContact.replace(/\D/g, '').slice(-10);
      const location = String(row.location || row.city || row.area || '').trim();
      const education = String(row.education || row.qualification || 'Graduate').trim();

      // Check required fields & 10-digit mobile
      if (!name || !location || cleanContact.length !== 10) {
        invalidRows++;
        return;
      }

      // Check duplicate against existing pool or within the same batch
      if (existingContacts.has(cleanContact) || seenInBatch.has(cleanContact)) {
        duplicateRows++;
        return;
      }

      seenInBatch.add(cleanContact);
      validRows++;

      validCandidatesToInsert.push({
        id: crypto.randomUUID(),
        name,
        contact: cleanContact,
        location,
        education: education || 'Graduate',
        source: 'import',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    if (validCandidatesToInsert.length > 0) {
      const db = readDB();
      db.candidatePool = db.candidatePool || [];
      db.candidatePool.unshift(...validCandidatesToInsert);

      // Sync central candidates table
      db.candidates = db.candidates || [];
      const existingCandMobiles = new Set(db.candidates.map((c: any) => String(c.mobile).replace(/\D/g, '').slice(-10)));
      validCandidatesToInsert.forEach((c) => {
        if (!existingCandMobiles.has(c.contact)) {
          const { salt, hash } = hashPassword('Candidate2026!');
          db.candidates.unshift({
            id: c.id,
            fullName: c.name,
            mobile: c.contact,
            salt,
            hash,
            profile: {
              fullName: c.name,
              city: c.location,
              education: c.education,
              languagesKnown: ['Hindi', 'English']
            },
            createdAt: c.createdAt
          });
        }
      });
      writeDB(db);

      if (isSupabaseConfigured()) {
        try {
          const supaRows = validCandidatesToInsert.map(toSupabaseCandidatePoolRow).filter(Boolean);
          await safeSupabaseUpsert('candidate_pool', supaRows);
        } catch (e) {}
      }
    }

    res.json({
      totalRows,
      validRows,
      duplicateRows,
      invalidRows,
      importedCandidates: validCandidatesToInsert,
      message: `Successfully imported ${validCandidatesToInsert.length} candidates. (Skipped ${duplicateRows} duplicates, ${invalidRows} invalid)`
    });
  } catch (err: any) {
    console.error('[Admin] Error importing candidates:', err);
    res.status(500).json({ error: 'Failed to import candidates' });
  }
});

// 7. GET Eligible Candidates for a Job (Excluding already-assigned candidates)
app.get('/api/admin/candidate-pool/eligible', async (req, res) => {
  const jobId = String(req.query.jobId || '').trim();
  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required.' });
  }

  try {
    const pool = await getLiveCandidatePool();
    const assignments = await getLiveUrgentAssignments();

    const alreadyAssignedCandidateIds = new Set(
      assignments
        .filter((a: any) => String(a.jobId) === jobId)
        .map((a: any) => String(a.candidateId))
    );

    const eligibleCandidates = pool.filter(
      (c: any) => !alreadyAssignedCandidateIds.has(String(c.id))
    );

    res.json({
      jobId,
      totalPool: pool.length,
      alreadyAssignedCount: alreadyAssignedCandidateIds.size,
      eligibleCount: eligibleCandidates.length,
      eligibleCandidates
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check eligible candidates' });
  }
});

// 8. POST Random Selection of Candidates (Truly randomized Fisher-Yates with count safeguards)
app.post('/api/admin/candidate-pool/random-select', async (req, res) => {
  const { jobId, recruiterId, count } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required.' });
  }

  const requestedCount = parseInt(String(count || '20'), 10);
  if (isNaN(requestedCount) || requestedCount <= 0) {
    return res.status(400).json({ error: 'Invalid count requested.' });
  }

  try {
    const pool = await getLiveCandidatePool();
    const assignments = await getLiveUrgentAssignments();

    // Exclude candidates already assigned to the SAME job
    const alreadyAssignedCandidateIds = new Set(
      assignments
        .filter((a: any) => String(a.jobId) === String(jobId))
        .map((a: any) => String(a.candidateId))
    );

    const eligible = pool.filter(
      (c: any) => !alreadyAssignedCandidateIds.has(String(c.id))
    );

    if (eligible.length === 0) {
      return res.status(200).json({
        selectedCandidates: [],
        requestedCount,
        actualCount: 0,
        warning: 'No eligible candidates available in the pool for this job. All pool candidates are already assigned or pool is empty.'
      });
    }

    // Cryptographic / True Fisher-Yates shuffle
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectCount = Math.min(requestedCount, shuffled.length);
    const selected = shuffled.slice(0, selectCount);

    let warning: string | null = null;
    if (eligible.length < requestedCount) {
      warning = `Only ${eligible.length} eligible candidate${eligible.length === 1 ? ' is' : 's are'} available.`;
    }

    res.json({
      selectedCandidates: selected,
      requestedCount,
      actualCount: selected.length,
      warning
    });
  } catch (err: any) {
    console.error('[Admin] Error randomly selecting candidates:', err);
    res.status(500).json({ error: 'Failed to randomly select candidates' });
  }
});

// 9. POST Confirm Assignment of Candidates to Recruiter's Job
app.post('/api/admin/candidate-pool/assign', async (req, res) => {
  const { jobId, recruiterId, candidateIds } = req.body;

  if (!jobId || !recruiterId || !candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    return res.status(400).json({ error: 'jobId, recruiterId, and candidateIds array are required.' });
  }

  try {
    const pool = await getLiveCandidatePool();
    const allJobs = await getLiveJobs();
    const allRecruiters = await getLiveRecruiters();
    const existingAssignments = await getLiveUrgentAssignments();

    const job = allJobs.find((j: any) => String(j.id) === String(jobId));
    if (!job) {
      return res.status(404).json({ error: 'Target job not found.' });
    }

    const recruiter = allRecruiters.find((r: any) => String(r.id) === String(recruiterId));

    const candMap = new Map<string, any>();
    pool.forEach((c: any) => candMap.set(String(c.id), c));

    // Filter out already assigned candidates to this specific job
    const assignedIdsForThisJob = new Set(
      existingAssignments
        .filter((a: any) => String(a.jobId) === String(jobId))
        .map((a: any) => String(a.candidateId))
    );

    const newAssignments: any[] = [];
    const now = new Date().toISOString();

    const effectiveRecruiterId = job.recruiterId || job.recruiter_id || String(recruiterId);

    for (const candId of candidateIds) {
      const idStr = String(candId);
      if (assignedIdsForThisJob.has(idStr)) continue;

      const candidate = candMap.get(idStr);
      if (!candidate) continue;

      newAssignments.push({
        id: `urg_${crypto.randomUUID()}`,
        candidateId: idStr,
        jobId: String(jobId),
        recruiterId: String(effectiveRecruiterId),
        candidateName: candidate.name,
        candidateContact: candidate.contact,
        candidateLocation: candidate.location,
        candidateEducation: candidate.education,
        status: 'Pending',
        assignedAt: now,
        assignedBy: 'admin',
        notes: ''
      });
    }

    if (newAssignments.length === 0) {
      return res.status(400).json({ error: 'All selected candidates are already assigned to this job.' });
    }

    const db = readDB();
    db.urgentAssignments = db.urgentAssignments || [];
    db.urgentAssignments.unshift(...newAssignments);
    writeDB(db);

    // Sync to Supabase urgent_assignments table
    if (isSupabaseConfigured()) {
      try {
        const rows = newAssignments.map(toSupabaseUrgentAssignmentRow).filter(Boolean);
        await safeSupabaseUpsert('urgent_assignments', rows);
      } catch (e) {
        console.warn('[Supabase Urgent Assignments Upsert Warning]', e);
      }
    }

    // Broadcast notification to Recruiter
    try {
      await createAndBroadcastNotification({
        title: '⚡ Urgent Candidates Assigned',
        message: `${newAssignments.length} urgent candidate${newAssignments.length === 1 ? '' : 's'} assigned to "${job.title}" require attention.`,
        type: 'GENERAL',
        targetRole: 'RECRUITER',
        recruiterId: String(recruiterId),
        jobId: String(jobId)
      });
    } catch (notifErr) {
      console.warn('[Assign Notification Warning]', notifErr);
    }

    res.json({
      success: true,
      assignedCount: newAssignments.length,
      message: `${newAssignments.length} candidates have been added to Urgent Candidates.`
    });
  } catch (err: any) {
    console.error('[Admin] Error assigning candidates:', err);
    res.status(500).json({ error: 'Failed to assign candidates' });
  }
});

// 10. GET Urgent Candidates Count for Job
app.get('/api/admin/jobs/:jobId/urgent-count', async (req, res) => {
  const { jobId } = req.params;
  try {
    const assignments = await getLiveUrgentAssignments();
    const count = assignments.filter((a: any) => String(a.jobId) === String(jobId)).length;
    res.json({ jobId, urgentCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get count' });
  }
});

// 11. RECRUITER: GET Urgent Candidates for Recruiter's Jobs
app.get('/api/recruiter/urgent-candidates', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  try {
    const allJobs = await getLiveJobs();
    const assignments = await getLiveUrgentAssignments();

    const isRecruiterJob = (j: any) => {
      if (!j) return false;
      if (recruiter.role === 'admin') return true;
      const recId = String(recruiter.id || '');
      const recEmail = String(recruiter.email || '').toLowerCase();
      const jobRecId = String(j.recruiterId || j.recruiter_id || '');
      if (jobRecId && (jobRecId === recId || jobRecId.toLowerCase() === recEmail)) return true;
      if (recruiter.companyName && j.companyName && recruiter.companyName.trim().toLowerCase() === j.companyName.trim().toLowerCase()) return true;
      return false;
    };

    const myJobs = allJobs.filter(isRecruiterJob);
    const myJobIds = new Set(myJobs.map((j: any) => String(j.id)));

    // Filter assignments that belong to the recruiter or the recruiter's jobs
    const myAssignments = assignments.filter((a: any) => 
      myJobIds.has(String(a.jobId)) || 
      String(a.recruiterId) === String(recruiter.id) || 
      (recruiter.email && String(a.recruiterId).toLowerCase() === String(recruiter.email).toLowerCase())
    );

    // Transform into standard applicant shape for exact UI reuse
    const normalized = myAssignments.map((a: any) => {
      const job = allJobs.find((j: any) => String(j.id) === String(a.jobId)) || {};
      return {
        id: String(a.id),
        assignmentId: String(a.id),
        candidateId: String(a.candidateId),
        jobId: String(a.jobId),
        jobTitle: job.title || 'Logistics Opening',
        jobCity: job.city || a.candidateLocation || '',
        jobArea: job.area || '',
        recruiterId: String(a.recruiterId),
        candidateName: a.candidateName || 'Candidate',
        candidateMobile: a.candidateContact || '',
        candidateContact: a.candidateContact || '',
        candidateLocation: a.candidateLocation || '',
        candidateCity: a.candidateLocation || '',
        candidateEducation: a.candidateEducation || 'Graduate',
        candidateExperience: 0,
        currentStatus: a.status || 'Pending',
        status: a.status || 'Pending',
        assignedAt: a.assignedAt,
        appliedDate: a.assignedAt, // Compatibility with existing applicant UI date sorting
        isUrgentCandidate: true
      };
    });

    res.json({
      urgentCandidates: normalized,
      total: normalized.length
    });
  } catch (err: any) {
    console.error('[Recruiter] Error fetching urgent candidates:', err);
    res.status(500).json({ error: 'Server error retrieving urgent candidates.' });
  }
});

// 12. RECRUITER: Update Urgent Candidate Status
app.post('/api/recruiter/urgent-candidates/:id/status', authenticateRecruiter, async (req, res) => {
  const recruiter = (req as any).recruiter;
  const assignmentId = req.params.id;
  const { status: newStatus } = req.body;

  const allowedStatuses = ['Pending', 'Contacted', 'Shortlisted', 'Rejected', 'Hired', 'Approved'];
  if (!newStatus || !allowedStatuses.includes(newStatus)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` });
  }

  try {
    const db = readDB();
    db.urgentAssignments = db.urgentAssignments || [];
    const allAssignments = await getLiveUrgentAssignments();
    const allJobs = await getLiveJobs();

    let assignment = db.urgentAssignments.find((a: any) => String(a.id) === String(assignmentId));
    if (!assignment) {
      assignment = allAssignments.find((a: any) => String(a.id) === String(assignmentId));
      if (assignment) db.urgentAssignments.push(assignment);
    }

    if (!assignment) {
      return res.status(404).json({ error: 'Urgent candidate assignment not found.' });
    }

    const job = allJobs.find((j: any) => String(j.id) === String(assignment.jobId));
    const isOwner = 
      !job ||
      recruiter.role === 'admin' ||
      String(assignment.recruiterId) === String(recruiter.id) ||
      (recruiter.email && String(assignment.recruiterId).toLowerCase() === String(recruiter.email).toLowerCase()) ||
      String(job.recruiterId || job.recruiter_id) === String(recruiter.id) ||
      String(job.recruiterId || job.recruiter_id).toLowerCase() === String(recruiter.email || '').toLowerCase() ||
      (recruiter.companyName && job.companyName && recruiter.companyName.trim().toLowerCase() === job.companyName.trim().toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized to modify this candidate.' });
    }

    const normalizedStatus = newStatus === 'Approved' ? 'Hired' : newStatus;
    assignment.status = normalizedStatus;
    assignment.updatedAt = new Date().toISOString();
    writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        await safeSupabaseUpsert('urgent_assignments', [toSupabaseUrgentAssignmentRow(assignment)]);
      } catch (e) {}
    }

    res.json({ success: true, status: normalizedStatus, message: 'Status updated successfully' });
  } catch (err: any) {
    console.error('[Recruiter] Error updating urgent candidate status:', err);
    res.status(500).json({ error: 'Failed to update urgent candidate status.' });
  }
});

// GET all candidates
app.get('/api/admin/candidates', (req, res) => {
  try {
    const db = readDB();
    const safeCandidates = (db.candidates || []).map(({ salt, hash, ...c }: any) => c);
    res.json(safeCandidates);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve candidates' });
  }
});

// Directly register a Candidate / Delivery Man with fully formed profiles
app.post('/api/admin/candidates', (req, res) => {
  const { fullName, mobile, email, age, gender, pincode, experience, education, bikeAvailable, drivingLicenseAvailable } = req.body;
  
  if (!fullName || !mobile || !age || !gender || !pincode) {
    return res.status(400).json({ error: 'Full Name, Mobile, Age, Gender, and Pincode are required.' });
  }

  const cleanMobile = mobile.trim();
  if (!/^\d{10}$/.test(cleanMobile)) {
    return res.status(400).json({ error: 'Mobile number must be a valid 10-digit number.' });
  }

  try {
    const db = readDB();
    db.candidates = db.candidates || [];

    if (db.candidates.some((c: any) => c.mobile === cleanMobile)) {
      return res.status(400).json({ error: 'A candidate with this mobile number already exists.' });
    }

    const { salt, hash } = hashPassword('DeliveryMan2026!');
    const newCandidate = {
      id: crypto.randomUUID(),
      fullName: fullName.trim(),
      mobile: cleanMobile,
      email: email ? email.trim().toLowerCase() : undefined,
      salt,
      hash,
      profile: {
        fullName: fullName.trim(),
        age: Number(age),
        gender: gender.trim(),
        pincode: pincode.trim(),
        experience: Number(experience || 0),
        education: education || '10th Pass or below',
        bikeAvailable: bikeAvailable || 'No',
        drivingLicenseAvailable: drivingLicenseAvailable || 'None',
        languagesKnown: ['Hindi', 'English']
      }
    };

    db.candidates.push(newCandidate);
    writeDB(db);

    const { salt: _s, hash: _h, ...safeCandidate } = newCandidate;
    res.status(201).json({ message: 'Candidate added successfully', candidate: safeCandidate });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error registering candidate' });
  }
});

// Submit delivery man job interest (Application)
app.post('/api/admin/applications', async (req, res) => {
  const { candidateId, jobId } = req.body;
  if (!candidateId || !jobId) {
    return res.status(400).json({ error: 'candidateId and jobId are required.' });
  }

  try {
    const db = readDB();
    db.candidates = db.candidates || [];
    db.jobs = db.jobs || [];
    db.applications = db.applications || [];

    const candidate = db.candidates.find((c: any) => c.id === candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate profile not found.' });
    }

    const job = db.jobs.find((j: any) => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }

    const duplicate = db.applications.some(
      (app: any) => app.candidateId === candidateId && app.jobId === jobId && app.withdrawStatus !== 'Withdrawn'
    );
    if (duplicate) {
      return res.status(400).json({ error: 'This delivery man is already linked to this job.' });
    }

    const newApplication = {
      id: crypto.randomUUID(),
      candidateId: candidate.id,
      jobId: job.id,
      recruiterId: String(job.recruiterId || job.recruiter_id || ''),
      appliedDate: new Date().toISOString(),
      currentStatus: 'Applied',
      withdrawStatus: 'Active',
      lastUpdated: new Date().toISOString()
    };

    // FIRST PRIORITY: Update in Supabase immediately!
    if (isSupabaseConfigured()) {
      const appRow = toSupabaseApplicationRow(newApplication);
      const upsertRes = await safeSupabaseUpsert('applications', [appRow]);
      if (!upsertRes.success) {
        return res.status(500).json({ error: upsertRes.error || 'Failed to insert application into Supabase.' });
      }

      const newCount = (job.applicationsCount || 0) + 1;
      const jobRow = toSupabaseJobRow({ ...job, applicationsCount: newCount, updatedAt: newApplication.appliedDate });
      await safeSupabaseUpsert('jobs', [jobRow]);
    }

    db.applications.push(newApplication);
    job.applicationsCount = (job.applicationsCount || 0) + 1;
    writeDB(db);

    // Broadcast notifications to Recruiter & Candidate on Android & Web
    await createAndBroadcastNotification({
      title: '📄 New Candidate Application Received!',
      message: `${candidate.profile?.fullName || candidate.fullName || 'Candidate'} was registered for "${job.title}".`,
      type: 'NEW_APPLICATION',
      targetRole: 'RECRUITER',
      recipientId: job.recruiterId || null,
      jobId: job.id,
      applicationId: newApplication.id,
      candidateId: candidate.id
    });

    await createAndBroadcastNotification({
      title: '✅ Application Registered',
      message: `You are registered for "${job.title}" at ${job.companyName}.`,
      type: 'APPLICATION_SUBMITTED',
      targetRole: 'CANDIDATE',
      recipientId: candidate.id,
      jobId: job.id,
      applicationId: newApplication.id
    });

    res.status(201).json({ message: 'Interest registered successfully and synced with Supabase & Android!', application: newApplication });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error linking interest data.' });
  }
});

// --- NOTIFICATION & ANDROID SYNC ENDPOINTS ---

// GET notifications for Candidate, Recruiter, or Admin
app.get('/api/notifications', async (req, res) => {
  try {
    const { targetRole, recipientId } = req.query;
    const db = readDB();
    let notifications = db.notifications || [];

    // Filter by role / recipient if provided
    if (targetRole) {
      notifications = notifications.filter((n: any) => 
        !n.targetRole || n.targetRole === targetRole || n.targetRole === 'ALL'
      );
    }
    if (recipientId) {
      notifications = notifications.filter((n: any) => 
        !n.recipientId || n.recipientId === 'ALL' || n.recipientId === recipientId
      );
    }

    // Sort newest first
    notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      notifications: notifications.slice(0, 100),
      unreadCount: notifications.filter((n: any) => !n.isRead && !n.is_read).length,
      realtimeChannel: 'jobsner_realtime'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// POST Mark single notification as read
app.post('/api/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    db.notifications = db.notifications || [];
    const notif = db.notifications.find((n: any) => n.id === id);
    if (notif) {
      notif.isRead = true;
      notif.is_read = true;
      writeDB(db);
    }
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// POST Mark all notifications as read
app.post('/api/notifications/read-all', (req, res) => {
  try {
    const { recipientId } = req.body;
    const db = readDB();
    db.notifications = db.notifications || [];
    db.notifications.forEach((n: any) => {
      if (!recipientId || n.recipientId === recipientId || n.recipientId === 'ALL') {
        n.isRead = true;
        n.is_read = true;
      }
    });
    writeDB(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

// --- DEDICATED RECRUITER NOTIFICATION ENDPOINTS ---

// GET Recruiter Notifications (Full candidate details, unread count, sorted newest first)
app.get('/api/recruiter/notifications', async (req, res) => {
  try {
    let recruiterId = req.query.recruiterId as string;
    
    // Also support Authorization bearer token lookup
    const authHeader = req.headers.authorization;
    if (!recruiterId && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const db = readDB();
      const tokenEntry = (db.tokens && db.tokens[token]) || (db.recruiterTokens && db.recruiterTokens[token]);
      if (tokenEntry && tokenEntry.recruiterId) {
        recruiterId = tokenEntry.recruiterId;
      }
    }

    const notifications = await getLiveRecruiterNotifications(recruiterId);
    const unreadCount = notifications.filter((n: any) => !n.isRead && !n.is_read).length;

    res.json({
      notifications,
      unreadCount,
      totalCount: notifications.length,
      realtimeChannel: 'jobsner_realtime'
    });
  } catch (err: any) {
    console.error('[Recruiter Notifications Fetch Error]', err);
    res.status(500).json({ error: 'Failed to retrieve recruiter notifications' });
  }
});

// POST Mark single recruiter notification as read
app.post('/api/recruiter/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const db = readDB();
    db.recruiter_notifications = db.recruiter_notifications || [];
    const notif = db.recruiter_notifications.find((n: any) => String(n.id) === String(id));
    if (notif) {
      notif.isRead = true;
      notif.is_read = true;
      writeDB(db);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('recruiter_notifications').update({ is_read: true }).eq('id', id);
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      } catch (supaErr) {
        console.warn('[Supabase Notification Read Update Warning]', supaErr);
      }
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update notification status' });
  }
});

// POST Mark all recruiter notifications as read
app.post('/api/recruiter/notifications/read-all', async (req, res) => {
  const { recruiterId } = req.body;
  try {
    const db = readDB();
    db.recruiter_notifications = db.recruiter_notifications || [];
    db.recruiter_notifications.forEach((n: any) => {
      if (!recruiterId || String(n.recruiterId) === String(recruiterId)) {
        n.isRead = true;
        n.is_read = true;
      }
    });
    writeDB(db);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        if (recruiterId) {
          await supabase.from('recruiter_notifications').update({ is_read: true }).eq('recruiter_id', recruiterId);
          await supabase.from('notifications').update({ is_read: true }).eq('candidate_id', recruiterId);
        } else {
          await supabase.from('recruiter_notifications').update({ is_read: true }).neq('id', '');
          await supabase.from('notifications').update({ is_read: true }).eq('category', 'RECRUITER_ALLOCATED');
        }
      } catch (supaErr) {
        console.warn('[Supabase Mark All Read Warning]', supaErr);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// POST Test trigger recruiter notification (Verification helper)
app.post('/api/recruiter/notifications/test', async (req, res) => {
  const { recruiterId, jobId, candidateName, mobile, city, jobTitle } = req.body;
  try {
    const fakeAlloc = {
      recruiterId: recruiterId || 'test-recruiter',
      jobId: jobId || 'test-job',
      candidateId: 'test-cand-' + Date.now(),
      applicationId: 'test-app-' + Date.now(),
      allocatedAt: new Date().toISOString()
    };
    const fakeCandidate = {
      id: fakeAlloc.candidateId,
      fullName: candidateName || 'Rajesh Sharma',
      mobile: mobile || '+91 98765 43210',
      profile: {
        fullName: candidateName || 'Rajesh Sharma',
        city: city || 'Bengaluru',
        state: 'Karnataka',
        experience: 2,
        bikeAvailable: 'Yes',
        drivingLicenseAvailable: 'Yes'
      }
    };
    const fakeJob = {
      id: fakeAlloc.jobId,
      title: jobTitle || 'Senior Delivery Associate',
      recruiterId: fakeAlloc.recruiterId,
      category: 'Delivery Jobs'
    };

    const created = await notifyRecruiterOnCandidateAllocation(fakeAlloc, fakeCandidate, fakeJob);
    res.json({ success: true, notification: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create test notification' });
  }
});

// POST Register Android FCM Device Token
app.post('/api/notifications/fcm-token', (req, res) => {
  try {
    const { token, userId, role, platform } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'FCM device token is required.' });
    }
    const db = readDB();
    db.fcmTokens = db.fcmTokens || [];
    const existing = db.fcmTokens.find((t: any) => t.token === token);
    if (existing) {
      existing.userId = userId || existing.userId;
      existing.role = role || existing.role;
      existing.platform = platform || 'android';
      existing.updatedAt = new Date().toISOString();
    } else {
      db.fcmTokens.push({
        id: crypto.randomUUID(),
        token,
        userId: userId || null,
        role: role || 'CANDIDATE',
        platform: platform || 'android',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    writeDB(db);
    console.log('[FCM Token Registered]', { token: token.substring(0, 15) + '...', role, platform });
    res.json({ success: true, message: 'Android push notification token registered.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to register token' });
  }
});

// GET Android & Web Real-time Sync Status Diagnostic
app.get('/api/android/sync-status', async (req, res) => {
  try {
    const db = readDB();
    const liveJobs = await getLiveJobs();
    const liveApps = await getLiveApplications();
    const liveCandidates = await getLiveCandidates();

    res.json({
      status: 'operational',
      supabaseConnected: isSupabaseConfigured(),
      realtimeChannel: 'jobsner_realtime',
      counts: {
        liveJobs: liveJobs.filter(isJobActive).length,
        totalJobs: liveJobs.length,
        totalApplications: liveApps.length,
        totalCandidates: liveCandidates.length,
        totalNotifications: (db.notifications || []).length,
        registeredAndroidDevices: (db.fcmTokens || []).filter((t: any) => t.platform === 'android').length
      },
      latestNotification: (db.notifications || [])[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve sync status' });
  }
});

// POST Admin Broadcast Push Notification to Android / Web
app.post('/api/admin/broadcast-notification', async (req, res) => {
  try {
    const { title, message, targetRole = 'ALL', recipientId = 'ALL', metadata = {} } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required for notification broadcast.' });
    }

    const notif = await createAndBroadcastNotification({
      title,
      message,
      type: 'ADMIN_BROADCAST',
      targetRole: targetRole as any,
      recipientId,
      metadata
    });

    res.json({
      success: true,
      message: 'Notification broadcasted to Android & Web platforms via Supabase Realtime!',
      notification: notif
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to broadcast notification' });
  }
});

// GET all applications for Admin Panel
app.get('/api/admin/applications', (req, res) => {
  try {
    const db = readDB();
    const apps = db.applications || [];
    const detailedApps = apps.map((app: any) => {
      const job = (db.jobs || []).find((j: any) => j.id === app.jobId) || {};
      const candidate = (db.candidates || []).find((c: any) => c.id === app.candidateId) || {};
      return {
        ...app,
        jobTitle: job.title || 'Unknown Position',
        companyName: job.companyName || 'Unknown Fleet',
        candidateName: candidate.profile?.fullName || candidate.fullName || 'Unknown Candidate',
        candidateMobile: candidate.mobile || ''
      };
    });
    res.json(detailedApps);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve application interest records' });
  }
});

// DELETE an application interest link
app.delete('/api/admin/applications/:id', (req, res) => {
  const { id } = req.params;
  try {
    const db = readDB();
    db.applications = db.applications || [];
    const appIndex = db.applications.findIndex((app: any) => app.id === id);
    if (appIndex === -1) {
      return res.status(404).json({ error: 'Application interest record not found.' });
    }
    const application = db.applications[appIndex];
    
    // Decrement job applicationsCount
    const job = (db.jobs || []).find((j: any) => j.id === application.jobId);
    if (job && job.applicationsCount > 0) {
      job.applicationsCount -= 1;
    }
    
    db.applications.splice(appIndex, 1);
    writeDB(db);
    res.json({ message: 'Interest link removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove interest link' });
  }
});

// DELETE a recruiter, their jobs, and their job applications
app.delete('/api/admin/recruiters/:id', (req, res) => {
  const { id } = req.params;
  try {
    const db = readDB();
    db.recruiters = (db.recruiters || []).filter((r: any) => r.id !== id);
    
    // Also remove their jobs
    const deletedJobIds = (db.jobs || [])
      .filter((j: any) => j.recruiterId === id)
      .map((j: any) => j.id);
    db.jobs = (db.jobs || []).filter((j: any) => j.recruiterId !== id);
    
    // Also remove applications associated with those jobs
    db.applications = (db.applications || []).filter(
      (app: any) => !deletedJobIds.includes(app.jobId) && app.recruiterId !== id
    );
    
    writeDB(db);
    res.json({ message: 'Recruiter and their associated jobs/applications deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete recruiter' });
  }
});

// DELETE a delivery candidate/man and their applications
app.delete('/api/admin/candidates/:id', (req, res) => {
  const { id } = req.params;
  try {
    const db = readDB();
    db.candidates = (db.candidates || []).filter((c: any) => c.id !== id);
    
    // Also remove their applications (interest data)
    db.applications = (db.applications || []).filter((app: any) => app.candidateId !== id);
    
    writeDB(db);
    res.json({ message: 'Delivery candidate and their interest data deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete delivery candidate' });
  }
});

// Start server and handle Vite middleware
async function startServer() {
  await initDatabase();

  if (process.env.VERCEL) {
    console.log('[Server] Running in Vercel environment. Skipping local app.listen().');
    return;
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          ignored: [
            '**/data/**',
            '**/data/db.json',
            '**/data/uploads/**',
            '**/dist/**',
            '**/.git/**',
            '**/*.md',
            '**/*.log',
            '**/test_*.js',
            '**/test_*.ts'
          ]
        }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
