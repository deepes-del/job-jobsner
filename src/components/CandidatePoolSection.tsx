import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Plus, 
  Search, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Building2, 
  Briefcase, 
  Shuffle, 
  Copy, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  Sparkles, 
  UserCheck, 
  Users, 
  MapPin, 
  GraduationCap, 
  Phone, 
  User 
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface PoolCandidate {
  id: string;
  name: string;
  contact: string;
  location: string;
  education: string;
  createdAt?: string;
  updatedAt?: string;
  source?: string;
}

interface RecruiterOption {
  id: string;
  companyName: string;
  recruiterName: string;
  mobile?: string;
  email?: string;
}

interface JobOption {
  id: string;
  recruiterId: string;
  title: string;
  city: string;
  minSalary?: number;
  maxSalary?: number;
  salaryType?: string;
  category?: string;
  openings?: number;
}

interface CandidatePoolSectionProps {
  recruiters?: RecruiterOption[];
  onAssignmentComplete?: () => void;
}

export const CandidatePoolSection: React.FC<CandidatePoolSectionProps> = ({ 
  recruiters: propRecruiters,
  onAssignmentComplete 
}) => {
  // Recruiters & Jobs selection
  const [recruiters, setRecruiters] = useState<RecruiterOption[]>(propRecruiters || []);
  const [loadingRecruiters, setLoadingRecruiters] = useState(false);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>('');
  const [recruiterSearchQuery, setRecruiterSearchQuery] = useState<string>('');
  const [isRecruiterDropdownOpen, setIsRecruiterDropdownOpen] = useState(false);

  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jobSearchQuery, setJobSearchQuery] = useState<string>('');
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);

  // Pool data
  const [candidates, setCandidates] = useState<PoolCandidate[]>([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [availableCandidates, setAvailableCandidates] = useState(0);
  const [assignedCandidates, setAssignedCandidates] = useState(0);
  const [loadingPool, setLoadingPool] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);

  // Table filtering, sorting, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [educationFilter, setEducationFilter] = useState('All');
  const [sortField, setSortField] = useState<'name' | 'contact' | 'location' | 'education'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Row selection
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Inline cell editing state: { rowId, field }
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: 'name' | 'contact' | 'location' | 'education' } | null>(null);
  const [editCellValue, setEditCellValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Inline Add New Row at top
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState({ name: '', contact: '', location: '', education: 'Graduate' });
  const [addingRowError, setAddingRowError] = useState<string | null>(null);

  // Random Selection Feature
  const [randomSelectionCount, setRandomSelectionCount] = useState<number | null>(null);
  const [randomSelectedCandidates, setRandomSelectedCandidates] = useState<PoolCandidate[]>([]);
  const [randomWarning, setRandomWarning] = useState<string | null>(null);
  const [selectingRandom, setSelectingRandom] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Import Excel/CSV 6-Step Wizard Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [rawParsedData, setRawParsedData] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    name: '',
    contact: '',
    location: '',
    education: ''
  });
  const [importStats, setImportStats] = useState<{
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
    validCandidates: any[];
  } | null>(null);
  const [importingCandidates, setImportingCandidates] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Copy toast
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const recruiterDropdownRef = useRef<HTMLDivElement>(null);
  const jobDropdownRef = useRef<HTMLDivElement>(null);

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
      console.error('Error fetching recruiters for candidate pool:', err);
    } finally {
      setLoadingRecruiters(false);
    }
  };

  // Fetch Jobs for selected recruiter
  const fetchJobs = async (recId: string) => {
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
        const list = Array.isArray(data) ? data : (data.jobs || []);
        setJobs(list);
        if (list.length > 0) {
          setSelectedJobId(list[0].id);
        } else {
          setSelectedJobId('');
        }
      }
    } catch (err) {
      console.error('Error fetching jobs for recruiter:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Fetch Candidate Pool
  const fetchCandidatePool = async () => {
    setLoadingPool(true);
    setPoolError(null);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '2000', // Fetch comprehensive pool for client-side Excel manipulation
        jobId: selectedJobId || ''
      });
      const res = await fetch(`/api/admin/candidate-pool?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        setTotalCandidates(data.totalCandidates || 0);
        setAvailableCandidates(data.availableCandidates || 0);
        setAssignedCandidates(data.assignedCandidates || 0);
      } else {
        const err = await res.json();
        setPoolError(err.error || 'Failed to fetch candidate pool');
      }
    } catch (err: any) {
      setPoolError('Network error fetching candidate pool');
    } finally {
      setLoadingPool(false);
    }
  };

  useEffect(() => {
    if (!propRecruiters || propRecruiters.length === 0) {
      fetchRecruiters();
    } else {
      setRecruiters(propRecruiters);
      if (propRecruiters.length > 0 && !selectedRecruiterId) {
        setSelectedRecruiterId(propRecruiters[0].id);
      }
    }
  }, [propRecruiters]);

  useEffect(() => {
    if (selectedRecruiterId) {
      fetchJobs(selectedRecruiterId);
    }
  }, [selectedRecruiterId]);

  useEffect(() => {
    fetchCandidatePool();
  }, [selectedJobId]);

  // Handle outside click for custom dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (recruiterDropdownRef.current && !recruiterDropdownRef.current.contains(e.target as Node)) {
        setIsRecruiterDropdownOpen(false);
      }
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(e.target as Node)) {
        setIsJobDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const showCopyNotice = (msg: string) => {
    setCopiedNotice(msg);
    setTimeout(() => setCopiedNotice(null), 2000);
  };

  // Selected Recruiter & Job objects
  const selectedRecruiter = useMemo(() => {
    return recruiters.find((r) => String(r.id) === String(selectedRecruiterId));
  }, [recruiters, selectedRecruiterId]);

  const selectedJob = useMemo(() => {
    return jobs.find((j) => String(j.id) === String(selectedJobId));
  }, [jobs, selectedJobId]);

  // Distinct Filter values
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      if (c.location && c.location.trim()) set.add(c.location.trim());
    });
    return Array.from(set).sort();
  }, [candidates]);

  const uniqueEducations = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      if (c.education && c.education.trim()) set.add(c.education.trim());
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Filtered & Sorted candidates
  const processedCandidates = useMemo(() => {
    return candidates
      .filter((c) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            c.name.toLowerCase().includes(q) ||
            c.contact.includes(q) ||
            c.location.toLowerCase().includes(q) ||
            c.education.toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (locationFilter !== 'All' && c.location.toLowerCase() !== locationFilter.toLowerCase()) {
          return false;
        }
        if (educationFilter !== 'All' && c.education.toLowerCase() !== educationFilter.toLowerCase()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const valA = (a[sortField] || '').toLowerCase();
        const valB = (b[sortField] || '').toLowerCase();
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [candidates, searchQuery, locationFilter, educationFilter, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(processedCandidates.length / pageSize) || 1;
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedCandidates.slice(start, start + pageSize);
  }, [processedCandidates, currentPage, pageSize]);

  // Sorting helper
  const handleSort = (field: 'name' | 'contact' | 'location' | 'education') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === paginatedCandidates.length && paginatedCandidates.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      const newSet = new Set(selectedRowIds);
      paginatedCandidates.forEach((c) => newSet.add(c.id));
      setSelectedRowIds(newSet);
    }
  };

  const handleToggleRowSelect = (id: string) => {
    const newSet = new Set(selectedRowIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRowIds(newSet);
  };

  // Inline Cell Editing
  const startEditing = (rowId: string, field: 'name' | 'contact' | 'location' | 'education', initialVal: string) => {
    setEditingCell({ rowId, field });
    setEditCellValue(initialVal);
  };

  const saveInlineEdit = async () => {
    if (!editingCell) return;
    const { rowId, field } = editingCell;
    const cand = candidates.find((c) => c.id === rowId);
    if (!cand) {
      setEditingCell(null);
      return;
    }

    const updated = {
      name: field === 'name' ? editCellValue.trim() : cand.name,
      contact: field === 'contact' ? editCellValue.replace(/\D/g, '').slice(-10) : cand.contact,
      location: field === 'location' ? editCellValue.trim() : cand.location,
      education: field === 'education' ? editCellValue.trim() : cand.education
    };

    if (!updated.name || !updated.location || updated.contact.length !== 10) {
      alert('Name, 10-digit Contact, and Location are required.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/candidate-pool/${rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === rowId ? { ...c, ...updated } : c))
        );
        setEditingCell(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update cell');
      }
    } catch (e) {
      alert('Error updating cell');
    } finally {
      setSavingEdit(false);
    }
  };

  // Add Row Manually
  const handleAddNewRow = async () => {
    setAddingRowError(null);
    if (!newRowData.name.trim()) {
      setAddingRowError('Name is required');
      return;
    }
    const cleanContact = newRowData.contact.replace(/\D/g, '').slice(-10);
    if (cleanContact.length !== 10) {
      setAddingRowError('A valid 10-digit mobile number is required');
      return;
    }
    if (!newRowData.location.trim()) {
      setAddingRowError('Location is required');
      return;
    }

    try {
      const res = await fetch('/api/admin/candidate-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRowData.name.trim(),
          contact: cleanContact,
          location: newRowData.location.trim(),
          education: newRowData.education.trim() || 'Graduate'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCandidates((prev) => [data.candidate, ...prev]);
        setTotalCandidates((prev) => prev + 1);
        setAvailableCandidates((prev) => prev + 1);
        setIsAddingRow(false);
        setNewRowData({ name: '', contact: '', location: '', education: 'Graduate' });
        showToast('Candidate added to pool successfully!');
      } else {
        setAddingRowError(data.error || 'Failed to add candidate');
      }
    } catch (e) {
      setAddingRowError('Server error adding candidate');
    }
  };

  // Delete Single Row
  const handleDeleteRow = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the candidate pool?`)) return;
    try {
      const res = await fetch(`/api/admin/candidate-pool/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCandidates((prev) => prev.filter((c) => c.id !== id));
        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setTotalCandidates((prev) => Math.max(0, prev - 1));
        showToast('Candidate removed from pool.');
      }
    } catch (e) {
      alert('Failed to delete candidate');
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedRowIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedRowIds.size} selected candidates?`)) return;

    try {
      const res = await fetch('/api/admin/candidate-pool/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedRowIds) })
      });
      if (res.ok) {
        setCandidates((prev) => prev.filter((c) => !selectedRowIds.has(c.id)));
        setTotalCandidates((prev) => Math.max(0, prev - selectedRowIds.size));
        setSelectedRowIds(new Set());
        showToast('Selected candidates removed from pool.');
      }
    } catch (e) {
      alert('Failed to delete selected candidates');
    }
  };

  // Copy cell or selected rows
  const handleCopyCell = (text: string) => {
    navigator.clipboard.writeText(text);
    showCopyNotice(`Copied: "${text}"`);
  };

  const handleCopySelectedRows = () => {
    if (selectedRowIds.size === 0) return;
    const rows = candidates.filter((c) => selectedRowIds.has(c.id));
    const header = 'Name\tContact\tLocation\tEducation';
    const body = rows.map((r) => `${r.name}\t${r.contact}\t${r.location}\t${r.education}`).join('\n');
    navigator.clipboard.writeText(`${header}\n${body}`);
    showCopyNotice(`Copied ${rows.length} rows to clipboard!`);
  };

  // RANDOM CANDIDATE SELECTION
  const handleQuickSelect = async (count: number) => {
    if (!selectedRecruiterId || !selectedJobId) {
      alert('Please select both a Recruiter and an Active Job first.');
      return;
    }

    setSelectingRandom(true);
    setRandomWarning(null);
    setRandomSelectionCount(count);

    try {
      const res = await fetch('/api/admin/candidate-pool/random-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJobId,
          recruiterId: selectedRecruiterId,
          count
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRandomSelectedCandidates(data.selectedCandidates || []);
        setRandomWarning(data.warning || null);
        setShowPreviewModal(true);
      } else {
        alert(data.error || 'Failed to select candidates');
      }
    } catch (e) {
      alert('Error during random selection');
    } finally {
      setSelectingRandom(false);
    }
  };

  // Regenerate random selection
  const handleRegenerateSelection = () => {
    if (randomSelectionCount) {
      handleQuickSelect(randomSelectionCount);
    }
  };

  // Remove candidate from random preview selection
  const handleRemoveFromPreview = (id: string) => {
    setRandomSelectedCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  // Confirm Assignment
  const handleExecuteAssignment = async () => {
    if (!selectedJobId || !selectedRecruiterId || randomSelectedCandidates.length === 0) return;

    setAssigning(true);
    try {
      const res = await fetch('/api/admin/candidate-pool/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJobId,
          recruiterId: selectedRecruiterId,
          candidateIds: randomSelectedCandidates.map((c) => c.id)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowConfirmModal(false);
        setShowPreviewModal(false);
        setRandomSelectedCandidates([]);
        setRandomSelectionCount(null);
        showToast(data.message || `${randomSelectedCandidates.length} candidates have been added to Urgent Candidates.`);
        fetchCandidatePool();
        if (onAssignmentComplete) onAssignmentComplete();
      } else {
        alert(data.error || 'Assignment failed');
      }
    } catch (e) {
      alert('Server error executing assignment');
    } finally {
      setAssigning(false);
    }
  };

  // ========================================================
  // EXCEL / CSV IMPORT WORKFLOW (6 STEPS)
  // ========================================================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv') {
      setImportError('Please select a valid .xlsx or .csv file.');
      return;
    }

    setImportFile(file);
    setImportError(null);
    setImportStep(2);

    // Read file via SheetJS
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setImportError('The uploaded file is empty or contains no records.');
          setImportStep(1);
          return;
        }

        setRawParsedData(rawJson);
        const headers = Object.keys(rawJson[0]);
        setDetectedHeaders(headers);

        // Step 4 auto mapping logic:
        const findMatch = (keys: string[]) => {
          return headers.find((h) => keys.includes(h.trim().toLowerCase())) || '';
        };

        const autoMapped = {
          name: findMatch(['name', 'full name', 'fullname', 'candidate name', 'candidate']),
          contact: findMatch(['contact', 'phone', 'mobile', 'mobile number', 'contact number', 'phone number', 'whatsapp']),
          location: findMatch(['location', 'city', 'area', 'current city', 'place', 'address']),
          education: findMatch(['education', 'qualification', 'degree', 'highest qualification'])
        };

        setColumnMapping({
          name: autoMapped.name || headers[0] || '',
          contact: autoMapped.contact || headers[1] || '',
          location: autoMapped.location || headers[2] || '',
          education: autoMapped.education || headers[3] || ''
        });

        setImportStep(3);
      } catch (readErr) {
        setImportError('Failed to parse spreadsheet. Please ensure it is a valid Excel/CSV.');
        setImportStep(1);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Step 5: Validate mapped rows
  const handleValidateImport = () => {
    if (!columnMapping.name || !columnMapping.contact || !columnMapping.location) {
      setImportError('Name, Contact, and Location must be mapped to valid columns.');
      return;
    }

    setImportError(null);
    const existingContacts = new Set(candidates.map((c) => c.contact));
    const seenInBatch = new Set<string>();

    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    const validRows: any[] = [];

    rawParsedData.forEach((row) => {
      const name = String(row[columnMapping.name] || '').trim();
      const rawContact = String(row[columnMapping.contact] || '').trim();
      const cleanContact = rawContact.replace(/\D/g, '').slice(-10);
      const location = String(row[columnMapping.location] || '').trim();
      const education = columnMapping.education ? String(row[columnMapping.education] || '').trim() : 'Graduate';

      if (!name || !location || cleanContact.length !== 10) {
        invalidCount++;
        return;
      }

      if (existingContacts.has(cleanContact) || seenInBatch.has(cleanContact)) {
        duplicateCount++;
        return;
      }

      seenInBatch.add(cleanContact);
      validCount++;
      validRows.push({
        name,
        contact: cleanContact,
        location,
        education: education || 'Graduate'
      });
    });

    setImportStats({
      total: rawParsedData.length,
      valid: validCount,
      duplicate: duplicateCount,
      invalid: invalidCount,
      validCandidates: validRows
    });

    setImportStep(6);
  };

  // Step 6: Final Import Submit
  const handleConfirmImport = async () => {
    if (!importStats || importStats.validCandidates.length === 0) return;

    setImportingCandidates(true);
    try {
      const res = await fetch('/api/admin/candidate-pool/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: importStats.validCandidates })
      });
      const data = await res.json();
      if (res.ok) {
        setShowImportModal(false);
        setImportStep(1);
        setImportFile(null);
        setRawParsedData([]);
        setImportStats(null);
        showToast(data.message || `Successfully imported ${data.importedCandidates?.length || 0} candidates!`);
        fetchCandidatePool();
      } else {
        setImportError(data.error || 'Import failed on server');
      }
    } catch (e) {
      setImportError('Server error importing candidates');
    } finally {
      setImportingCandidates(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 animate-fade-in" id="section-3-candidate-pool">
      
      {/* Toast notifications */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-fade-in border border-emerald-500">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {copiedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium animate-fade-in border border-slate-700">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* TOP HEADER & KPI SUMMARY */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  Candidate Pool
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Section 3
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage central candidate repository and assign candidates to recruiter jobs.
                </p>
              </div>
            </div>
          </div>

          {/* Useful Summary Numbers & Top Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* KPI Cards */}
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-sans">
                  Total Candidates
                </span>
                <span className="text-sm font-black text-white font-mono">{totalCandidates}</span>
              </div>

              <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block font-sans">
                  Available Candidates
                </span>
                <span className="text-sm font-black text-emerald-300 font-mono">{availableCandidates}</span>
              </div>

              <div className="px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 block font-sans">
                  Assigned Candidates
                </span>
                <span className="text-sm font-black text-blue-300 font-mono">{assignedCandidates}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto lg:ml-0">
              <button
                onClick={() => {
                  setImportStep(1);
                  setImportError(null);
                  setImportFile(null);
                  setShowImportModal(true);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Upload className="w-3.5 h-3.5 text-orange-400" />
                Import Excel / CSV
              </button>

              <button
                onClick={() => {
                  setIsAddingRow(true);
                  setAddingRowError(null);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-950/40 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                + Add Candidate
              </button>
            </div>

          </div>

        </div>

        {/* RECRUITER & JOB SELECTORS (Searchable Dropdowns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800/80">
          
          {/* 1. SELECT RECRUITER */}
          <div className="space-y-1.5 relative" ref={recruiterDropdownRef}>
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-400" />
                Select Recruiter
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {recruiters.length} Active Recruiters
              </span>
            </label>

            <button
              type="button"
              onClick={() => setIsRecruiterDropdownOpen(!isRecruiterDropdownOpen)}
              className="w-full text-left px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 hover:border-orange-500/60 rounded-xl text-xs text-white transition flex items-center justify-between"
            >
              {selectedRecruiter ? (
                <div className="truncate">
                  <span className="font-bold text-white block truncate">{selectedRecruiter.recruiterName}</span>
                  <span className="text-[10px] text-orange-400 truncate block">{selectedRecruiter.companyName}</span>
                </div>
              ) : (
                <span className="text-slate-500">Choose a recruiter...</span>
              )}
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isRecruiterDropdownOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isRecruiterDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden max-h-60 flex flex-col">
                <div className="p-2 border-b border-slate-800">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search recruiter name or company..."
                      value={recruiterSearchQuery}
                      onChange={(e) => setRecruiterSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-800/60">
                  {recruiters
                    .filter((r) =>
                      r.recruiterName.toLowerCase().includes(recruiterSearchQuery.toLowerCase()) ||
                      r.companyName.toLowerCase().includes(recruiterSearchQuery.toLowerCase())
                    )
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedRecruiterId(r.id);
                          setIsRecruiterDropdownOpen(false);
                          setRecruiterSearchQuery('');
                        }}
                        className={`w-full text-left p-2.5 hover:bg-slate-800/80 transition flex items-center justify-between ${
                          selectedRecruiterId === r.id ? 'bg-orange-500/10 text-orange-400' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{r.recruiterName}</p>
                          <p className="text-[11px] text-slate-400">{r.companyName}</p>
                        </div>
                        {selectedRecruiterId === r.id && <Check className="w-4 h-4 text-orange-400" />}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. SELECT JOB */}
          <div className="space-y-1.5 relative" ref={jobDropdownRef}>
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                Select Job
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {jobs.length} Jobs Posted
              </span>
            </label>

            <button
              type="button"
              disabled={jobs.length === 0}
              onClick={() => setIsJobDropdownOpen(!isJobDropdownOpen)}
              className="w-full text-left px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 hover:border-blue-500/60 rounded-xl text-xs text-white transition flex items-center justify-between disabled:opacity-50"
            >
              {selectedJob ? (
                <div className="truncate">
                  <span className="font-bold text-white block truncate">{selectedJob.title}</span>
                  <span className="text-[10px] text-blue-400 truncate block">
                    {selectedJob.city} • ₹{selectedJob.minSalary?.toLocaleString('en-IN') || 0} - ₹{selectedJob.maxSalary?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
              ) : (
                <span className="text-slate-500">
                  {jobs.length === 0 ? 'No jobs found for this recruiter' : 'Choose a job...'}
                </span>
              )}
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isJobDropdownOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isJobDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden max-h-60 flex flex-col">
                <div className="p-2 border-b border-slate-800">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search job title or city..."
                      value={jobSearchQuery}
                      onChange={(e) => setJobSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-800/60">
                  {jobs
                    .filter((j) =>
                      j.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
                      j.city.toLowerCase().includes(jobSearchQuery.toLowerCase())
                    )
                    .map((j) => (
                      <button
                        key={j.id}
                        onClick={() => {
                          setSelectedJobId(j.id);
                          setIsJobDropdownOpen(false);
                          setJobSearchQuery('');
                        }}
                        className={`w-full text-left p-2.5 hover:bg-slate-800/80 transition flex items-center justify-between ${
                          selectedJobId === j.id ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{j.title}</p>
                          <p className="text-[11px] text-slate-400">
                            {j.city} • ₹{j.minSalary?.toLocaleString('en-IN') || 0} - ₹{j.maxSalary?.toLocaleString('en-IN') || 0}
                          </p>
                        </div>
                        {selectedJobId === j.id && <Check className="w-4 h-4 text-blue-400" />}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* QUICK SELECT CANDIDATES BAR (Visible when Recruiter & Job Selected) */}
      {selectedRecruiter && selectedJob && (
        <div className="bg-gradient-to-r from-orange-500/15 via-slate-900 to-blue-500/10 border border-orange-500/30 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block">
              Quick Select Candidates
            </span>
            <p className="text-xs text-slate-300 mt-0.5">
              Randomly pick eligible candidates for <strong className="text-white">{selectedJob.title}</strong> at <strong className="text-white">{selectedRecruiter.companyName}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[20, 50, 100, 200, 500, 1000].map((num) => (
              <button
                key={num}
                onClick={() => handleQuickSelect(num)}
                disabled={selectingRandom || availableCandidates === 0}
                className="px-3.5 py-2 bg-slate-900 hover:bg-orange-500 hover:text-white text-orange-400 border border-orange-500/40 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                [{num}]
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SPREADSHEET TOOLBAR: Search, Filters, Bulk Delete, Copy, Pagination */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Search & Filter dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search candidate name, mobile, city..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="All">All Locations</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {/* Education Filter */}
          <select
            value={educationFilter}
            onChange={(e) => {
              setEducationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="All">All Education</option>
            {uniqueEducations.map((edu) => (
              <option key={edu} value={edu}>{edu}</option>
            ))}
          </select>
        </div>

        {/* Right: Actions & Selected count */}
        <div className="flex items-center gap-2">
          {selectedRowIds.size > 0 && (
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-lg">
              <span className="text-xs font-bold text-orange-400">
                {selectedRowIds.size} Selected
              </span>
              <button
                onClick={handleCopySelectedRows}
                title="Copy Selected Rows"
                className="p-1 hover:bg-orange-500/20 rounded text-slate-300 hover:text-white transition"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleBulkDelete}
                title="Delete Selected Rows"
                className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <span className="text-[11px] text-slate-400 font-mono">
            Page {currentPage} of {totalPages} ({processedCandidates.length} total)
          </span>

          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>

      </div>

      {/* ========================================================
          4. EXCEL-LIKE CANDIDATE TABLE (EXACTLY FOUR DATA COLUMNS)
          ======================================================== */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[400px]">
        
        {/* Table Container with Sticky Header & Horizontal Scroll */}
        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full border-collapse text-left text-xs">
            
            {/* Sticky Header */}
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 border-b border-slate-800 select-none">
              <tr>
                {/* Row Selection Checkbox column */}
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedCandidates.length > 0 && paginatedCandidates.every((c) => selectedRowIds.has(c.id))}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-700 text-orange-500 focus:ring-0 cursor-pointer"
                  />
                </th>

                {/* EXACTLY COLUMN 1: Name */}
                <th 
                  onClick={() => handleSort('name')}
                  className="px-4 py-3.5 font-bold text-slate-300 uppercase tracking-wider text-[11px] cursor-pointer hover:text-orange-400 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Name</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-400" /> : <ArrowDown className="w-3 h-3 text-orange-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>

                {/* EXACTLY COLUMN 2: Contact */}
                <th 
                  onClick={() => handleSort('contact')}
                  className="px-4 py-3.5 font-bold text-slate-300 uppercase tracking-wider text-[11px] cursor-pointer hover:text-orange-400 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Contact</span>
                    {sortField === 'contact' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-400" /> : <ArrowDown className="w-3 h-3 text-orange-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>

                {/* EXACTLY COLUMN 3: Location */}
                <th 
                  onClick={() => handleSort('location')}
                  className="px-4 py-3.5 font-bold text-slate-300 uppercase tracking-wider text-[11px] cursor-pointer hover:text-orange-400 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Location</span>
                    {sortField === 'location' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-400" /> : <ArrowDown className="w-3 h-3 text-orange-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>

                {/* EXACTLY COLUMN 4: Education */}
                <th 
                  onClick={() => handleSort('education')}
                  className="px-4 py-3.5 font-bold text-slate-300 uppercase tracking-wider text-[11px] cursor-pointer hover:text-orange-400 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Education</span>
                    {sortField === 'education' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-400" /> : <ArrowDown className="w-3 h-3 text-orange-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>

                {/* Inline Action Controls (Delete / Copy) */}
                <th className="w-20 px-4 py-3.5 text-right font-medium text-slate-500 uppercase tracking-wider text-[10px]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-medium">
              
              {/* Inline Add Row Form */}
              {isAddingRow && (
                <tr className="bg-orange-500/10 border-b-2 border-orange-500/40 animate-fade-in">
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-[10px] font-bold text-orange-400 uppercase">NEW</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="Candidate Name *"
                      autoFocus
                      value={newRowData.name}
                      onChange={(e) => setNewRowData({ ...newRowData, name: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="10-digit Mobile *"
                      value={newRowData.contact}
                      onChange={(e) => setNewRowData({ ...newRowData, contact: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="City / Area *"
                      value={newRowData.location}
                      onChange={(e) => setNewRowData({ ...newRowData, location: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="Education (e.g. B.Com, PUC)"
                      value={newRowData.education}
                      onChange={(e) => setNewRowData({ ...newRowData, education: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={handleAddNewRow}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
                        title="Save Candidate"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsAddingRow(false)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {addingRowError && (
                <tr className="bg-red-500/10 text-red-400 text-xs">
                  <td colSpan={6} className="px-4 py-1.5 font-bold">
                    ⚠️ {addingRowError}
                  </td>
                </tr>
              )}

              {/* Empty / Loading State */}
              {loadingPool ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                    <span>Loading candidate pool records...</span>
                  </td>
                </tr>
              ) : paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-500">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-slate-400">No candidate records found.</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click "+ Add Candidate" or "Import Excel / CSV" to populate the pool.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((c) => {
                  const isSelected = selectedRowIds.has(c.id);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-900/60 transition group ${
                        isSelected ? 'bg-orange-500/5' : ''
                      }`}
                    >
                      {/* Selection checkbox */}
                      <td className="w-12 px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRowSelect(c.id)}
                          className="rounded border-slate-700 text-orange-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* CELL 1: Name (Editable on double-click/click) */}
                      <td 
                        className="px-4 py-2.5 text-slate-200 cursor-pointer relative"
                        onDoubleClick={() => startEditing(c.id, 'name', c.name)}
                      >
                        {editingCell?.rowId === c.id && editingCell?.field === 'name' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full px-2 py-0.5 bg-slate-900 border border-orange-500 rounded text-xs text-white focus:outline-none"
                            />
                            <button onClick={saveInlineEdit} className="text-emerald-400 p-0.5 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingCell(null)} className="text-slate-500 p-0.5 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group/cell">
                            <span className="font-bold text-white">{c.name}</span>
                            <button 
                              onClick={() => handleCopyCell(c.name)} 
                              className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                              title="Copy Name"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* CELL 2: Contact (Editable) */}
                      <td 
                        className="px-4 py-2.5 text-slate-300 font-mono cursor-pointer"
                        onDoubleClick={() => startEditing(c.id, 'contact', c.contact)}
                      >
                        {editingCell?.rowId === c.id && editingCell?.field === 'contact' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full px-2 py-0.5 bg-slate-900 border border-orange-500 rounded text-xs text-white focus:outline-none font-mono"
                            />
                            <button onClick={saveInlineEdit} className="text-emerald-400 p-0.5 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingCell(null)} className="text-slate-500 p-0.5 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group/cell">
                            <span>{c.contact}</span>
                            <button 
                              onClick={() => handleCopyCell(c.contact)} 
                              className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                              title="Copy Contact"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* CELL 3: Location (Editable) */}
                      <td 
                        className="px-4 py-2.5 text-slate-300 cursor-pointer"
                        onDoubleClick={() => startEditing(c.id, 'location', c.location)}
                      >
                        {editingCell?.rowId === c.id && editingCell?.field === 'location' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full px-2 py-0.5 bg-slate-900 border border-orange-500 rounded text-xs text-white focus:outline-none"
                            />
                            <button onClick={saveInlineEdit} className="text-emerald-400 p-0.5 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingCell(null)} className="text-slate-500 p-0.5 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group/cell">
                            <span>{c.location}</span>
                            <button 
                              onClick={() => handleCopyCell(c.location)} 
                              className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                              title="Copy Location"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* CELL 4: Education (Editable) */}
                      <td 
                        className="px-4 py-2.5 text-slate-300 cursor-pointer"
                        onDoubleClick={() => startEditing(c.id, 'education', c.education)}
                      >
                        {editingCell?.rowId === c.id && editingCell?.field === 'education' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full px-2 py-0.5 bg-slate-900 border border-orange-500 rounded text-xs text-white focus:outline-none"
                            />
                            <button onClick={saveInlineEdit} className="text-emerald-400 p-0.5 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingCell(null)} className="text-slate-500 p-0.5 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group/cell">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[11px]">
                              {c.education}
                            </span>
                            <button 
                              onClick={() => handleCopyCell(c.education)} 
                              className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                              title="Copy Education"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="w-20 px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteRow(c.id, c.name)}
                          className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                          title="Delete candidate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Pagination Bar */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between select-none">
          <div className="text-[11px] text-slate-500">
            Showing <strong className="text-slate-300">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-300">{Math.min(currentPage * pageSize, processedCandidates.length)}</strong> of{' '}
            <strong className="text-slate-300">{processedCandidates.length}</strong> candidates
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-30 disabled:hover:bg-slate-800 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-2.5 py-1 rounded bg-slate-950 text-xs font-mono text-white border border-slate-800">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-30 disabled:hover:bg-slate-800 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================
          10. SELECTED CANDIDATE PREVIEW MODAL
          ======================================================== */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  {randomSelectedCandidates.length} Candidates Selected
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target: <strong className="text-white">{selectedJob?.title}</strong> ({selectedRecruiter?.companyName})
                </p>
              </div>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {randomWarning && (
              <div className="p-3 mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{randomWarning}</span>
              </div>
            )}

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto mt-4 border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-3.5 py-2.5">Name</th>
                    <th className="px-3.5 py-2.5">Contact</th>
                    <th className="px-3.5 py-2.5">Location</th>
                    <th className="px-3.5 py-2.5">Education</th>
                    <th className="px-3.5 py-2.5 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {randomSelectedCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/50">
                      <td className="px-3.5 py-2 font-bold text-white">{c.name}</td>
                      <td className="px-3.5 py-2 font-mono text-slate-300">{c.contact}</td>
                      <td className="px-3.5 py-2 text-slate-300">{c.location}</td>
                      <td className="px-3.5 py-2 text-slate-300">{c.education}</td>
                      <td className="px-3.5 py-2 text-right">
                        <button
                          onClick={() => handleRemoveFromPreview(c.id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer"
                          title="Remove candidate"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 mt-4">
              <button
                onClick={handleRegenerateSelection}
                disabled={selectingRandom}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5 text-orange-400" />
                Regenerate Selection
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(true);
                  }}
                  disabled={randomSelectedCandidates.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black transition shadow-lg shadow-orange-950/40 disabled:opacity-50 cursor-pointer"
                >
                  Assign Candidates ({randomSelectedCandidates.length})
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          11. CONFIRM ASSIGNMENT MODAL
          ======================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Assign Candidates</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to assign these candidates to this job?
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Recruiter:</span>
                <span className="font-bold text-white">{selectedRecruiter?.recruiterName} ({selectedRecruiter?.companyName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Job:</span>
                <span className="font-bold text-orange-400">{selectedJob?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Candidates:</span>
                <span className="font-mono font-black text-emerald-400">{randomSelectedCandidates.length}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 border border-slate-800 hover:bg-slate-900 text-slate-400 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAssignment}
                disabled={assigning}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-xl transition shadow-lg shadow-orange-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {assigning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm Assignment
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          7. IMPORT EXCEL / CSV 6-STEP MODAL
          ======================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Import Candidates from Excel / CSV</h3>
                  <p className="text-[11px] text-slate-400">Step {importStep} of 6</p>
                </div>
              </div>

              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importError && (
              <div className="p-3 my-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* STEP 1: Upload File */}
            {importStep === 1 && (
              <div className="py-8 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <FileSpreadsheet className="w-8 h-8 text-orange-400" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-bold text-white">Upload .xlsx or .csv file</h4>
                  <p className="text-xs text-slate-400 mt-1">Supports standard Microsoft Excel and comma-separated CSV files.</p>
                </div>

                <label className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md">
                  Browse File
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* STEP 2: Reading File */}
            {importStep === 2 && (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500" />
                <p className="text-xs font-bold text-white">Reading file and parsing candidate records...</p>
              </div>
            )}

            {/* STEP 3 & 4: Preview Rows & Map Columns */}
            {(importStep === 3 || importStep === 4) && (
              <div className="py-4 space-y-4 overflow-y-auto">
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                  <span>File: <strong className="text-white">{importFile?.name}</strong></span>
                  <span className="font-mono text-orange-400 font-bold">{rawParsedData.length} Total Rows</span>
                </div>

                {/* Column Mapping Section */}
                <div className="space-y-3 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">Step 4: Map Columns to 4 Candidate Fields</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">1. Candidate Name <span className="text-orange-400">*</span></label>
                      <select
                        value={columnMapping.name}
                        onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="">Select column...</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">2. Contact / Mobile <span className="text-orange-400">*</span></label>
                      <select
                        value={columnMapping.contact}
                        onChange={(e) => setColumnMapping({ ...columnMapping, contact: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="">Select column...</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">3. Location / City <span className="text-orange-400">*</span></label>
                      <select
                        value={columnMapping.location}
                        onChange={(e) => setColumnMapping({ ...columnMapping, location: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="">Select column...</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">4. Education (Optional)</label>
                      <select
                        value={columnMapping.education}
                        onChange={(e) => setColumnMapping({ ...columnMapping, education: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="">None / Default Graduate</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Preview 3 sample rows */}
                <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-900 px-3.5 py-2 font-bold text-slate-400 text-[10px] uppercase">
                    Step 3: Sample Preview (First 3 rows)
                  </div>
                  <div className="divide-y divide-slate-800">
                    {rawParsedData.slice(0, 3).map((r, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950/60 flex flex-wrap gap-4 text-slate-300 text-[11px]">
                        <span><strong>Name:</strong> {r[columnMapping.name] || 'N/A'}</span>
                        <span><strong>Contact:</strong> {r[columnMapping.contact] || 'N/A'}</span>
                        <span><strong>Location:</strong> {r[columnMapping.location] || 'N/A'}</span>
                        <span><strong>Education:</strong> {r[columnMapping.education] || 'Graduate'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleValidateImport}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Validate Data & Next →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5 & 6: Validation Stats & Confirm */}
            {importStep === 6 && importStats && (
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Rows</span>
                    <span className="text-base font-black text-white font-mono">{importStats.total}</span>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">Valid Rows</span>
                    <span className="text-base font-black text-emerald-300 font-mono">{importStats.valid}</span>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <span className="text-[10px] text-amber-400 uppercase font-bold block">Duplicate Rows</span>
                    <span className="text-base font-black text-amber-300 font-mono">{importStats.duplicate}</span>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <span className="text-[10px] text-red-400 uppercase font-bold block">Invalid Rows</span>
                    <span className="text-base font-black text-red-300 font-mono">{importStats.invalid}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed text-center">
                  Only <strong className="text-emerald-400 font-bold">{importStats.valid} valid candidate records</strong> with valid 10-digit mobile numbers and non-duplicate phone numbers will be added to the Candidate Pool.
                </p>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setImportStep(4)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    ← Back to Mapping
                  </button>

                  <button
                    onClick={handleConfirmImport}
                    disabled={importingCandidates || importStats.valid === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black transition shadow-lg shadow-orange-950/40 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {importingCandidates ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Import Valid Candidates ({importStats.valid})
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default CandidatePoolSection;
