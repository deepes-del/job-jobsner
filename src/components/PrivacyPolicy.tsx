import React from 'react';
import { X, Shield, ChevronRight, ExternalLink } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

const SECTIONS = [
  {
    id: '1',
    title: '1. Introduction',
    content: (
      <>
        <p>Welcome to <strong>JOBSner</strong>.</p>
        <br />
        <p>JOBSner is a job search and recruitment platform that helps candidates discover job opportunities, create profiles, apply for jobs, save jobs, and communicate with recruiters.</p>
        <br />
        <p>This Privacy Policy explains how JOBSner collects, uses, stores, and protects your information when you use the JOBSner mobile application and related services.</p>
        <br />
        <p>By using JOBSner, you agree to the practices described in this Privacy Policy.</p>
      </>
    ),
  },
  {
    id: '2',
    title: '2. Information We Collect',
    content: (
      <>
        <p className="font-bold text-slate-800 mb-1">2.1 Account Information</p>
        <p>When you create an account, we may collect:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
          <li>Full name</li>
          <li>Mobile phone number</li>
          <li>Email address</li>
          <li>Password / authentication information</li>
          <li>Profile photo</li>
          <li>Account and authentication identifiers</li>
        </ul>
        <p className="mt-2 text-slate-500 italic text-xs">JOBSner may use authentication services such as Firebase Authentication to securely authenticate users.</p>

        <br />
        <p className="font-bold text-slate-800 mb-1">2.2 Profile Information</p>
        <p>Depending on the information you choose to provide, your profile may contain:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
          <li>Name</li>
          <li>Contact information</li>
          <li>Location</li>
          <li>Education</li>
          <li>Work experience</li>
          <li>Skills</li>
          <li>Job preferences</li>
          <li>Resume / CV</li>
          <li>Driving license details (for logistics / driver roles)</li>
          <li>Vehicle information</li>
        </ul>

        <br />
        <p className="font-bold text-slate-800 mb-1">2.3 Usage Data</p>
        <p>We automatically collect data about how you interact with our app:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
          <li>Jobs viewed, saved, and applied for</li>
          <li>Search terms and filter preferences</li>
          <li>Device type, operating system, and app version</li>
          <li>IP address and approximate location</li>
          <li>Timestamps of activity</li>
        </ul>

        <br />
        <p className="font-bold text-slate-800 mb-1">2.4 Communication Data</p>
        <p>If you contact us or use in-app messaging, we collect the content of those communications.</p>

        <br />
        <p className="font-bold text-slate-800 mb-1">2.5 Document Uploads</p>
        <p>Users may upload documents such as:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
          <li>Driving license</li>
          <li>ID proofs</li>
          <li>Vehicle registration documents</li>
          <li>Other compliance documents</li>
        </ul>
        <p className="mt-2 text-slate-500 italic text-xs">These are stored securely and shared only with recruiters as part of your job application process.</p>
      </>
    ),
  },
  {
    id: '3',
    title: '3. How We Use Your Information',
    content: (
      <>
        <p>We use your information to:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
          <li>Create and manage your account</li>
          <li>Match you with relevant job opportunities</li>
          <li>Allow recruiters to view your profile and application</li>
          <li>Send you job alerts, notifications, and updates</li>
          <li>Improve our platform, features, and user experience</li>
          <li>Ensure compliance with legal obligations</li>
          <li>Prevent fraud and maintain platform security</li>
          <li>Respond to your inquiries and support requests</li>
        </ul>
      </>
    ),
  },
  {
    id: '4',
    title: '4. How We Share Your Information',
    content: (
      <>
        <p>We do <strong>not</strong> sell your personal data. We may share your information with:</p>
        <br />
        <p className="font-bold text-slate-800 mb-1">4.1 Recruiters & Employers</p>
        <p>When you apply for a job, your profile, resume, and relevant documents are shared with the recruiter or employer who posted the job.</p>
        <br />
        <p className="font-bold text-slate-800 mb-1">4.2 Service Providers</p>
        <p>We work with trusted third-party services for:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
          <li>Cloud storage (Supabase)</li>
          <li>Authentication (Firebase)</li>
          <li>Analytics and performance monitoring</li>
          <li>Push notifications</li>
        </ul>
        <br />
        <p className="font-bold text-slate-800 mb-1">4.3 Legal Requirements</p>
        <p>We may disclose your information if required by law, court order, or governmental authority.</p>
        <br />
        <p className="font-bold text-slate-800 mb-1">4.4 Business Transfers</p>
        <p>In the event of a merger, acquisition, or sale of assets, your data may be transferred to the successor entity.</p>
      </>
    ),
  },
  {
    id: '5',
    title: '5. Data Storage & Security',
    content: (
      <>
        <p>Your data is stored securely using industry-standard encryption and security practices. We use:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
          <li>Encrypted connections (HTTPS/TLS)</li>
          <li>Secure cloud databases (Supabase / PostgreSQL)</li>
          <li>Firebase Authentication for secure sign-in</li>
          <li>Row-level security policies for data access control</li>
        </ul>
        <br />
        <p>While we implement strong security measures, no system is 100% immune to breaches. We encourage you to use strong passwords and not share your credentials with others.</p>
      </>
    ),
  },
  {
    id: '6',
    title: '6. Data Retention',
    content: (
      <>
        <p>We retain your data for as long as your account is active or as needed to provide our services. You may request account deletion at any time.</p>
        <br />
        <p>Upon deletion:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
          <li>Your profile and personal information will be removed</li>
          <li>Application history may be retained for legal compliance purposes for a limited period</li>
          <li>Anonymized analytics data may be retained indefinitely</li>
        </ul>
      </>
    ),
  },
  {
    id: '7',
    title: '7. Your Rights',
    content: (
      <>
        <p>You have the right to:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
          <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
          <li><strong>Correction</strong> — Update or correct inaccurate information</li>
          <li><strong>Deletion</strong> — Request deletion of your account and associated data</li>
          <li><strong>Portability</strong> — Request your data in a portable format</li>
          <li><strong>Objection</strong> — Object to certain types of data processing</li>
          <li><strong>Withdrawal</strong> — Withdraw consent for optional data uses at any time</li>
        </ul>
        <br />
        <p>To exercise any of these rights, please contact us at <a href="mailto:privacy@jobsner.com" className="text-[#1D61F2] underline">privacy@jobsner.com</a>.</p>
      </>
    ),
  },
  {
    id: '8',
    title: '8. Cookies & Tracking Technologies',
    content: (
      <>
        <p>JOBSner may use local storage, session storage, and similar technologies to:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
          <li>Keep you signed in across sessions</li>
          <li>Remember your preferences and settings</li>
          <li>Analyze usage patterns to improve our platform</li>
        </ul>
        <br />
        <p>You can clear local storage through your browser or device settings, which will sign you out of JOBSner.</p>
      </>
    ),
  },
  {
    id: '9',
    title: "9. Children's Privacy",
    content: (
      <>
        <p>JOBSner is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with their information, please contact us immediately.</p>
      </>
    ),
  },
  {
    id: '10',
    title: '10. Third-Party Links',
    content: (
      <>
        <p>Our platform may contain links to external websites or services. We are not responsible for the privacy practices of those third parties and encourage you to review their privacy policies.</p>
      </>
    ),
  },
  {
    id: '11',
    title: '11. Changes to This Policy',
    content: (
      <>
        <p>We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this page and notify you through the app or via email.</p>
        <br />
        <p>Your continued use of JOBSner after changes are posted constitutes your acceptance of the updated policy.</p>
      </>
    ),
  },
  {
    id: '12',
    title: '12. Contact Us',
    content: (
      <>
        <p>If you have any questions, concerns, or requests regarding this Privacy Policy or the data we hold about you, please contact us:</p>
        <br />
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-1 text-sm">
          <p className="font-black text-slate-800">JOBSner Privacy Team</p>
          <p className="text-slate-600">📧 <a href="mailto:privacy@jobsner.com" className="text-[#1D61F2] underline">privacy@jobsner.com</a></p>
          <p className="text-slate-600">🌐 <a href="https://jobsner.com" target="_blank" rel="noopener noreferrer" className="text-[#1D61F2] underline">www.jobsner.com</a></p>
        </div>
      </>
    ),
  },
];

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = React.useState<string | null>('1');

  // Push /privacy-policy to URL bar so it becomes shareable
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevUrl = window.location.href;
    window.history.pushState({ privacyPolicy: true }, 'JOBSner Privacy Policy', '/privacy-policy');
    document.title = 'Privacy Policy | JOBSner';
    return () => {
      window.history.replaceState({}, prevTitle, '/');
      document.title = prevTitle;
    };
  }, []);

  // Allow Escape key to close
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const directLink = typeof window !== 'undefined'
    ? window.location.origin + '/privacy-policy'
    : '/privacy-policy';

  const copyLink = () => {
    navigator.clipboard?.writeText(directLink).then(() => {
      alert('Link copied: ' + directLink);
    }).catch(() => {
      prompt('Copy this link:', directLink);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      id="privacy-policy-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full sm:max-w-3xl max-h-[96dvh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-[#1D61F2]/5 to-blue-50/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1D61F2]/10 border border-[#1D61F2]/20 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-[#1D61F2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">JOBSner Privacy Policy</h2>
              <p className="text-[10px] text-slate-400 font-semibold">Last Updated: September 21, 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Copy shareable link button */}
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1D61F2] border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors border-none"
              title="Copy direct link to Privacy Policy"
              id="privacy-copy-link-btn"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Copy Link</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 border-none"
              aria-label="Close Privacy Policy"
              id="privacy-policy-close-btn"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Direct URL bar */}
        <div className="px-5 sm:px-7 py-2.5 bg-slate-50 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Direct Link:</span>
            <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 min-w-0">
              <code className="text-[11px] text-[#1D61F2] font-mono truncate">{directLink}</code>
              <button
                onClick={copyLink}
                className="text-[10px] font-black text-[#1D61F2] hover:text-blue-700 cursor-pointer border-none bg-transparent shrink-0"
                id="privacy-inline-copy-btn"
              >
                COPY
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-7 py-5 space-y-2.5">
          {/* Intro banner */}
          <div className="bg-gradient-to-r from-[#1D61F2]/8 to-blue-50/50 border border-[#1D61F2]/15 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed font-medium">
            This policy governs the collection, use, and protection of your information when you use the <strong>JOBSner</strong> platform. Please read it carefully.
          </div>

          {/* Accordion sections */}
          {SECTIONS.map((section) => {
            const isOpen = activeSection === section.id;
            return (
              <div
                key={section.id}
                className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                  isOpen ? 'border-[#1D61F2]/30 bg-blue-50/20 shadow-sm' : 'border-gray-150 bg-white hover:border-gray-200'
                }`}
              >
                <button
                  onClick={() => setActiveSection(isOpen ? null : section.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer transition-colors border-none bg-transparent"
                  id={`privacy-section-${section.id}`}
                >
                  <span className={`text-sm font-black leading-snug ${isOpen ? 'text-[#1D61F2]' : 'text-slate-800'}`}>
                    {section.title}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-90 text-[#1D61F2]' : 'text-slate-400'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-[#1D61F2]/10">
                    <div className="mt-3">
                      {section.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="text-center text-[10px] text-slate-400 py-3">
            © 2026 JOBSner · All rights reserved · <a href="mailto:privacy@jobsner.com" className="text-[#1D61F2] underline">privacy@jobsner.com</a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 sm:px-7 py-3.5 shrink-0 bg-white flex items-center gap-3">
          <button
            onClick={copyLink}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-black text-xs rounded-xl cursor-pointer transition-all shadow-xs border-none flex items-center justify-center gap-1.5"
            id="privacy-copy-footer-btn"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Share Link
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-[#1D61F2] hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xs rounded-xl cursor-pointer transition-all shadow-xs border-none"
            id="privacy-policy-close-footer-btn"
          >
            I Understand — Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PrivacyPolicy;
