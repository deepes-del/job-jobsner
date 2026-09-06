import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  Filter, 
  CheckSquare, 
  Square,
  Bike,
  ShieldCheck,
  Briefcase,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';

export interface CandidateGridRow {
  id: string;
  applicationId: string;
  fullName: string;
  mobile: string;
  email: string;
  age: number | string;
  gender: string;
  city: string;
  state: string;
  pincode: string;
  experience: number | string;
  category: string;
  bikeAvailable: string | boolean;
  drivingLicenseAvailable: string | boolean;
  jobTitle: string;
  appliedDate: string;
  currentStatus: string;
  allocationStatus?: string;
  raw?: any;
}

interface ExcelCandidateGridProps {
  candidates: CandidateGridRow[];
  title?: string;
  badgeColor?: 'emerald' | 'amber' | 'blue' | 'purple' | 'slate';
  emptyMessage?: string;
}

export const ExcelCandidateGrid: React.FC<ExcelCandidateGridProps> = ({
  candidates,
  title,
  badgeColor = 'blue',
  emptyMessage = 'No candidate records found in this view.'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof CandidateGridRow>('appliedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Filters
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedBike, setSelectedBike] = useState<string>('All');
  const [selectedLicense, setSelectedLicense] = useState<string>('All');

  // Row selection
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Copy Feedback
  const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);
  const [copyFeedbackMsg, setCopyFeedbackMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setCopyFeedbackMsg(msg);
    setTimeout(() => {
      setCopyFeedbackMsg(null);
    }, 2500);
  };

  // Distinct Filter Options
  const cities = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort();
  }, [candidates]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      if (c.currentStatus && c.currentStatus.trim()) set.add(c.currentStatus.trim());
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Filtered & Sorted Data
  const processedData = useMemo(() => {
    return candidates
      .filter((row) => {
        // Search Term Filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matches =
            (row.fullName && row.fullName.toLowerCase().includes(q)) ||
            (row.mobile && row.mobile.toLowerCase().includes(q)) ||
            (row.email && row.email.toLowerCase().includes(q)) ||
            (row.city && row.city.toLowerCase().includes(q)) ||
            (row.state && row.state.toLowerCase().includes(q)) ||
            (row.category && row.category.toLowerCase().includes(q)) ||
            (row.jobTitle && row.jobTitle.toLowerCase().includes(q)) ||
            (row.currentStatus && row.currentStatus.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Gender Filter
        if (selectedGender !== 'All' && row.gender) {
          if (row.gender.toLowerCase() !== selectedGender.toLowerCase()) return false;
        }

        // City Filter
        if (selectedCity !== 'All' && row.city) {
          if (row.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
        }

        // Status Filter
        if (selectedStatus !== 'All' && row.currentStatus) {
          if (row.currentStatus.toLowerCase() !== selectedStatus.toLowerCase()) return false;
        }

        // Bike Filter
        if (selectedBike !== 'All') {
          const hasBike = String(row.bikeAvailable).toLowerCase() === 'yes' || row.bikeAvailable === true;
          if (selectedBike === 'Yes' && !hasBike) return false;
          if (selectedBike === 'No' && hasBike) return false;
        }

        // License Filter
        if (selectedLicense !== 'All') {
          const hasLic = String(row.drivingLicenseAvailable).toLowerCase() === 'yes' || row.drivingLicenseAvailable === true;
          if (selectedLicense === 'Yes' && !hasLic) return false;
          if (selectedLicense === 'No' && hasLic) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? '';
        const valB = b[sortField] ?? '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [
    candidates,
    searchTerm,
    selectedGender,
    selectedCity,
    selectedStatus,
    selectedBike,
    selectedLicense,
    sortField,
    sortDirection
  ]);

  const handleSort = (field: keyof CandidateGridRow) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Row Selection Handlers
  const handleSelectAll = () => {
    if (selectedRowIds.size === processedData.length && processedData.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(processedData.map(r => r.applicationId || r.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRowIds(next);
  };

  // Copy Cell Value
  const handleCopyCell = (key: string, value: string | number | boolean | undefined) => {
    const text = String(value ?? '').trim();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCellKey(key);
    showToast(`Copied: "${text.length > 25 ? text.slice(0, 22) + '...' : text}"`);
    setTimeout(() => {
      setCopiedCellKey(null);
    }, 1500);
  };

  // Format data as Excel Tab-Separated String
  const formatRowsAsTSV = (rows: CandidateGridRow[]): string => {
    const headers = [
      'Name',
      'Mobile',
      'Email',
      'Age',
      'Gender',
      'City',
      'State',
      'Pincode',
      'Experience',
      'Category',
      'Bike Available',
      'Driving License',
      'Job Title',
      'Application Date',
      'Application Status'
    ];

    const lines = [headers.join('\t')];

    rows.forEach(r => {
      const bike = String(r.bikeAvailable).toLowerCase() === 'yes' || r.bikeAvailable === true ? 'Yes' : 'No';
      const license = String(r.drivingLicenseAvailable).toLowerCase() === 'yes' || r.drivingLicenseAvailable === true ? 'Yes' : 'No';
      const exp = typeof r.experience === 'number' ? `${r.experience} Years` : (r.experience || 'Fresher');
      
      const rowVals = [
        r.fullName || '',
        r.mobile || '',
        r.email || '',
        r.age || '',
        r.gender || '',
        r.city || '',
        r.state || '',
        r.pincode || '',
        exp,
        r.category || '',
        bike,
        license,
        r.jobTitle || '',
        r.appliedDate ? new Date(r.appliedDate).toLocaleDateString('en-IN') : '',
        r.currentStatus || 'Applied'
      ];
      lines.push(rowVals.map(v => String(v).replace(/[\t\r\n]/g, ' ')).join('\t'));
    });

    return lines.join('\r\n');
  };

  // COPY ALL to Clipboard
  const handleCopyAll = () => {
    if (processedData.length === 0) {
      showToast('No candidates available to copy.');
      return;
    }
    const tsvData = formatRowsAsTSV(processedData);
    navigator.clipboard.writeText(tsvData).then(() => {
      showToast(`Success! Copied all ${processedData.length} candidate rows (formatted for Excel/Sheets paste).`);
    }).catch(() => {
      showToast('Error copying to clipboard.');
    });
  };

  // COPY SELECTED to Clipboard
  const handleCopySelected = () => {
    const selectedRows = processedData.filter(r => selectedRowIds.has(r.applicationId || r.id));
    if (selectedRows.length === 0) {
      showToast('Please select at least one row to copy.');
      return;
    }
    const tsvData = formatRowsAsTSV(selectedRows);
    navigator.clipboard.writeText(tsvData).then(() => {
      showToast(`Copied ${selectedRows.length} selected row(s) (formatted for Excel/Sheets paste).`);
    }).catch(() => {
      showToast('Error copying to clipboard.');
    });
  };

  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'amber':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'purple':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'slate':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      case 'blue':
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Toast Notification Banner */}
      {copyFeedbackMsg && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-md transition-all animate-fade-in z-50">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{copyFeedbackMsg}</span>
          </div>
          <span className="text-[10px] text-emerald-100 font-mono">Ready to paste (Ctrl+V / ⌘+V)</span>
        </div>
      )}

      {/* Header & Controls Toolbar */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {title && (
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                {title}
              </h3>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getBadgeStyle()}`}>
              {processedData.length} {processedData.length === 1 ? 'Candidate' : 'Candidates'}
            </span>
            {selectedRowIds.size > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                {selectedRowIds.size} Selected
              </span>
            )}
          </div>

          {/* Action Buttons: COPY ALL & COPY SELECTED */}
          <div className="flex items-center gap-2">
            {selectedRowIds.size > 0 && (
              <button
                onClick={handleCopySelected}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition shadow-sm active:scale-95"
                title="Copy selected rows in TSV format for Excel/Sheets"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                Copy Selected ({selectedRowIds.size})
              </button>
            )}

            <button
              onClick={handleCopyAll}
              disabled={processedData.length === 0}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md active:scale-95 ${
                processedData.length > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer shadow-emerald-950/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
              title="Copy entire grid as tab-separated data for Excel / Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>COPY ALL (Excel / Sheets)</span>
            </button>
          </div>
        </div>

        {/* Search and Filters Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-1">
          {/* Instant Search Bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, mobile, email, city, category..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Filter: Gender */}
          <div className="md:col-span-2">
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">Gender: All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Quick Filter: City */}
          <div className="md:col-span-2">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">City: All ({cities.length})</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Quick Filter: Bike */}
          <div className="md:col-span-2">
            <select
              value={selectedBike}
              onChange={(e) => setSelectedBike(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">Bike: All</option>
              <option value="Yes">Bike: Yes</option>
              <option value="No">Bike: No</option>
            </select>
          </div>

          {/* Quick Filter: License */}
          <div className="md:col-span-2">
            <select
              value={selectedLicense}
              onChange={(e) => setSelectedLicense(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">License: All</option>
              <option value="Yes">License: Yes</option>
              <option value="No">License: No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Excel Table View */}
      <div className="flex-1 overflow-auto relative max-h-[600px] border-b border-slate-800">
        <table className="w-full border-collapse text-left text-xs font-normal">
          {/* Sticky Excel Table Header */}
          <thead className="sticky top-0 z-20 bg-slate-950 text-slate-300 font-semibold border-b border-slate-700 shadow-sm select-none">
            <tr>
              {/* Row Checkbox / Index */}
              <th className="p-2.5 w-12 text-center bg-slate-950 border-r border-slate-800">
                <button
                  onClick={handleSelectAll}
                  className="text-slate-400 hover:text-white transition inline-flex items-center justify-center"
                  title="Select / Deselect all visible rows"
                >
                  {processedData.length > 0 && selectedRowIds.size === processedData.length ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>

              {/* 1. Name */}
              <th
                onClick={() => handleSort('fullName')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>1. Name</span>
                  {sortField === 'fullName' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  )}
                </div>
              </th>

              {/* 2. Mobile */}
              <th
                onClick={() => handleSort('mobile')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>2. Mobile</span>
                  {sortField === 'mobile' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  )}
                </div>
              </th>

              {/* 3. Email */}
              <th
                onClick={() => handleSort('email')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>3. Email</span>
                  {sortField === 'email' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  )}
                </div>
              </th>

              {/* 4. Age */}
              <th
                onClick={() => handleSort('age')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 text-center whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>4. Age</span>
                  {sortField === 'age' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>

              {/* 5. Gender */}
              <th
                onClick={() => handleSort('gender')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 text-center whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>5. Gender</span>
                  {sortField === 'gender' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>

              {/* 6. City */}
              <th
                onClick={() => handleSort('city')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>6. City</span>
                  {sortField === 'city' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>

              {/* 7. State */}
              <th
                onClick={() => handleSort('state')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>7. State</span>
                  {sortField === 'state' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>

              {/* 8. Pincode */}
              <th
                onClick={() => handleSort('pincode')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 text-center whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>8. Pincode</span>
                  {sortField === 'pincode' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>

              {/* 9. Experience */}
              <th
                onClick={() => handleSort('experience')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>9. Experience</span>
                  {sortField === 'experience' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>

              {/* 10. Category */}
              <th
                onClick={() => handleSort('category')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>10. Category</span>
                  {sortField === 'category' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>

              {/* 11. Bike */}
              <th className="p-2.5 text-center border-r border-slate-800 whitespace-nowrap">
                <span>11. Bike</span>
              </th>

              {/* 12. Driving License */}
              <th className="p-2.5 text-center border-r border-slate-800 whitespace-nowrap">
                <span>12. License</span>
              </th>

              {/* 13. Job */}
              <th
                onClick={() => handleSort('jobTitle')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>13. Applied Job</span>
                  {sortField === 'jobTitle' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>

              {/* 14. Application Date */}
              <th
                onClick={() => handleSort('appliedDate')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 border-r border-slate-800 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>14. Applied Date</span>
                  {sortField === 'appliedDate' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>

              {/* 15. Status */}
              <th
                onClick={() => handleSort('currentStatus')}
                className="p-2.5 cursor-pointer hover:bg-slate-900 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>15. Status</span>
                  {sortField === 'currentStatus' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] text-slate-300">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={16} className="py-12 text-center text-slate-500 font-sans">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">{emptyMessage}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {searchTerm ? 'Try adjusting your search or filters.' : 'Waiting for new applications to arrive.'}
                  </p>
                </td>
              </tr>
            ) : (
              processedData.map((row, idx) => {
                const rowKey = row.applicationId || row.id || `row-${idx}`;
                const isSelected = selectedRowIds.has(rowKey);
                const hasBike = String(row.bikeAvailable).toLowerCase() === 'yes' || row.bikeAvailable === true;
                const hasLicense = String(row.drivingLicenseAvailable).toLowerCase() === 'yes' || row.drivingLicenseAvailable === true;

                return (
                  <tr
                    key={rowKey}
                    className={`transition group ${
                      isSelected 
                        ? 'bg-indigo-950/40 hover:bg-indigo-950/60' 
                        : idx % 2 === 0 
                          ? 'bg-slate-900/50 hover:bg-slate-800/60' 
                          : 'bg-slate-950/30 hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Row Select Checkbox & Index */}
                    <td className="p-2 text-center border-r border-slate-800/80 select-none">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleToggleRow(rowKey)}
                          className="text-slate-500 hover:text-indigo-400 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="text-[10px] text-slate-600 w-4 text-right">{idx + 1}</span>
                      </div>
                    </td>

                    {/* 1. Name */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-name`, row.fullName)}
                      className="p-2 border-r border-slate-800/80 font-sans font-semibold text-slate-100 hover:bg-emerald-950/30 hover:text-emerald-300 cursor-pointer transition max-w-[160px] truncate"
                      title="Click to copy name"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{row.fullName || '—'}</span>
                        {copiedCellKey === `${rowKey}-name` ? (
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* 2. Mobile */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-mobile`, row.mobile)}
                      className="p-2 border-r border-slate-800/80 text-emerald-400 hover:bg-emerald-950/30 cursor-pointer transition whitespace-nowrap"
                      title="Click to copy mobile number"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{row.mobile || '—'}</span>
                        {copiedCellKey === `${rowKey}-mobile` ? (
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* 3. Email */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-email`, row.email)}
                      className="p-2 border-r border-slate-800/80 text-slate-300 hover:bg-emerald-950/30 hover:text-emerald-300 cursor-pointer transition max-w-[180px] truncate"
                      title="Click to copy email"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{row.email || '—'}</span>
                        {copiedCellKey === `${rowKey}-email` ? (
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* 4. Age */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-age`, row.age)}
                      className="p-2 border-r border-slate-800/80 text-center hover:bg-emerald-950/30 cursor-pointer transition"
                      title="Click to copy age"
                    >
                      {row.age || '—'}
                    </td>

                    {/* 5. Gender */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-gender`, row.gender)}
                      className="p-2 border-r border-slate-800/80 text-center hover:bg-emerald-950/30 cursor-pointer transition font-sans"
                      title="Click to copy gender"
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        row.gender === 'Female' 
                          ? 'bg-pink-500/10 text-pink-300 border border-pink-500/20' 
                          : row.gender === 'Male'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {row.gender || 'Any'}
                      </span>
                    </td>

                    {/* 6. City */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-city`, row.city)}
                      className="p-2 border-r border-slate-800/80 hover:bg-emerald-950/30 hover:text-emerald-300 cursor-pointer transition max-w-[120px] truncate font-sans"
                      title="Click to copy city"
                    >
                      {row.city || '—'}
                    </td>

                    {/* 7. State */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-state`, row.state)}
                      className="p-2 border-r border-slate-800/80 hover:bg-emerald-950/30 hover:text-emerald-300 cursor-pointer transition max-w-[120px] truncate font-sans"
                      title="Click to copy state"
                    >
                      {row.state || '—'}
                    </td>

                    {/* 8. Pincode */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-pincode`, row.pincode)}
                      className="p-2 border-r border-slate-800/80 text-center hover:bg-emerald-950/30 cursor-pointer transition"
                      title="Click to copy pincode"
                    >
                      {row.pincode || '—'}
                    </td>

                    {/* 9. Experience */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-exp`, row.experience)}
                      className="p-2 border-r border-slate-800/80 hover:bg-emerald-950/30 cursor-pointer transition font-sans"
                      title="Click to copy experience"
                    >
                      {typeof row.experience === 'number'
                        ? `${row.experience} Yr${row.experience === 1 ? '' : 's'}`
                        : (row.experience || 'Fresher')}
                    </td>

                    {/* 10. Category */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-cat`, row.category)}
                      className="p-2 border-r border-slate-800/80 hover:bg-emerald-950/30 hover:text-emerald-300 cursor-pointer transition max-w-[140px] truncate font-sans"
                      title="Click to copy category"
                    >
                      {row.category || '—'}
                    </td>

                    {/* 11. Bike */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-bike`, hasBike ? 'Yes' : 'No')}
                      className="p-2 border-r border-slate-800/80 text-center hover:bg-emerald-950/30 cursor-pointer transition"
                      title="Click to copy bike status"
                    >
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold ${
                        hasBike
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800/50 text-slate-500'
                      }`}>
                        {hasBike ? 'Yes' : 'No'}
                      </span>
                    </td>

                    {/* 12. License */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-lic`, hasLicense ? 'Yes' : 'No')}
                      className="p-2 border-r border-slate-800/80 text-center hover:bg-emerald-950/30 cursor-pointer transition"
                      title="Click to copy license status"
                    >
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold ${
                        hasLicense
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800/50 text-slate-500'
                      }`}>
                        {hasLicense ? 'Yes' : 'No'}
                      </span>
                    </td>

                    {/* 13. Job Title */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-job`, row.jobTitle)}
                      className="p-2 border-r border-slate-800/80 hover:bg-emerald-950/30 hover:text-emerald-300 cursor-pointer transition max-w-[160px] truncate font-sans"
                      title="Click to copy job title"
                    >
                      {row.jobTitle || '—'}
                    </td>

                    {/* 14. Application Date */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-date`, row.appliedDate)}
                      className="p-2 border-r border-slate-800/80 hover:bg-emerald-950/30 cursor-pointer transition whitespace-nowrap text-slate-400"
                      title="Click to copy applied date"
                    >
                      {row.appliedDate ? new Date(row.appliedDate).toLocaleDateString('en-IN') : '—'}
                    </td>

                    {/* 15. Status */}
                    <td
                      onClick={() => handleCopyCell(`${rowKey}-status`, row.currentStatus)}
                      className="p-2 hover:bg-emerald-950/30 cursor-pointer transition font-sans"
                      title="Click to copy status"
                    >
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        row.currentStatus === 'Hired' || row.currentStatus === 'Selected'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : row.currentStatus === 'Shortlisted' || row.currentStatus === 'Interviewing'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : row.currentStatus === 'Rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {row.currentStatus || 'Applied'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info & Quick Instructions */}
      <div className="p-3 bg-slate-950 text-slate-400 text-[11px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span>💡 <strong>Tip:</strong> Click any cell to copy its text instantly.</span>
          <span>📋 <strong>Paste:</strong> Directly formatted for Excel / Google Sheets via Tab-Separated Values.</span>
        </div>
        <div>
          Showing {processedData.length} of {candidates.length} records
        </div>
      </div>
    </div>
  );
};
