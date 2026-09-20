import React, { useState } from 'react';
import { CandidateProfile, candidateFetch } from '../../utils/candidateAuth';
import { Edit3, Save, CheckCircle2 } from 'lucide-react';
import { COMPLETE_PROFILE, NOT_AVAILABLE, formatDate } from './dashboardShared';

interface ProfileTabProps {
  candidate: CandidateProfile;
  onCandidateUpdate: (candidate: CandidateProfile) => void;
  onLogout: () => void;
  completionPct: number;
  fullName: string;
  initials: string;
  joinedDate: string;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ candidate, onCandidateUpdate, onLogout, completionPct, fullName, initials, joinedDate }) => {
  const candidateProfile = candidate;
  const profileToForm = (c: CandidateProfile) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    mobile: c.mobile,
    alternateNumber: c.alternateNumber,
    alternateEmail: c.alternateEmail,
    currentDesignation: c.currentDesignation,
    totalExperience: c.totalExperience,
    targetRole: c.targetRole,
    linkedinUrl: c.linkedinUrl,
    portfolioUrl: c.portfolioUrl,
    bio: c.bio
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState(() => profileToForm(candidate));
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    try {
      const res = await candidateFetch('/api/candidate/me', {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok || !body.success) {
        setProfileError(body.error || 'Could not save your profile. Please try again.');
        return;
      }
      onCandidateUpdate(body.candidate);
      setIsEditingProfile(false);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 4000);
    } catch {
      setProfileError('Could not save your profile. Please check your connection and try again.');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
        <div>
          <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
            Candidate Profile & Career Credentials
          </h2>
          <p className="text-xs sm:text-sm text-[#434652]">
            Keep your work experience and target roles updated for the profile engineering team.
          </p>
        </div>
        <button
          onClick={() => {
            setEditForm(profileToForm(candidate));
            setProfileError(null);
            setIsEditingProfile(!isEditingProfile);
          }}
          className="px-4 py-2 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isEditingProfile ? 'Cancel Editing' : 'Edit Profile Information'}</span>
        </button>
      </div>

      {profileSaveSuccess && (
        <div className="p-4 bg-[#e8f5e9] border border-[#a5d6a7] text-[#1b5e20] text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Candidate profile updated successfully!</span>
        </div>
      )}

      {profileError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl">
          {profileError}
        </div>
      )}

      {isEditingProfile ? (
        /* Editable Profile Form */
        <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dash-field-1" className="block text-xs font-black text-[#061b3b] mb-1">First Name *</label>
            <input id="dash-field-1"
              type="text"
              required
              value={editForm.firstName}
              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-2" className="block text-xs font-black text-[#061b3b] mb-1">Last Name *</label>
            <input id="dash-field-2"
              type="text"
              required
              value={editForm.lastName}
              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-3" className="block text-xs font-black text-[#061b3b] mb-1">Email Address *</label>
            <input id="dash-field-3"
              type="email"
              value={candidateProfile.email}
              readOnly
              disabled
              className="w-full px-3.5 py-2.5 bg-[#f1f3ff] border border-[#cbdaff] rounded-xl text-xs text-[#666a76]"
            />
          </div>
          <div>
            <label htmlFor="dash-field-4" className="block text-xs font-black text-[#061b3b] mb-1">Mobile Number *</label>
            <input id="dash-field-4"
              type="tel"
              required
              value={editForm.mobile}
              onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-5" className="block text-xs font-medium text-[#434652] mb-1">Alternate Number (Optional)</label>
            <input id="dash-field-5"
              type="tel"
              value={editForm.alternateNumber}
              onChange={(e) => setEditForm({ ...editForm, alternateNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-6" className="block text-xs font-medium text-[#434652] mb-1">Alternate Email ID (Optional)</label>
            <input id="dash-field-6"
              type="email"
              value={editForm.alternateEmail}
              onChange={(e) => setEditForm({ ...editForm, alternateEmail: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-7" className="block text-xs font-black text-[#061b3b] mb-1">Current Designation *</label>
            <input id="dash-field-7"
              type="text"
              required
              value={editForm.currentDesignation}
              onChange={(e) => setEditForm({ ...editForm, currentDesignation: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-8" className="block text-xs font-black text-[#061b3b] mb-1">Target Role *</label>
            <input id="dash-field-8"
              type="text"
              required
              value={editForm.targetRole}
              onChange={(e) => setEditForm({ ...editForm, targetRole: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-9" className="block text-xs font-black text-[#061b3b] mb-1">Total Work Experience *</label>
            <input id="dash-field-9"
              type="text"
              required
              value={editForm.totalExperience}
              onChange={(e) => setEditForm({ ...editForm, totalExperience: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-10" className="block text-xs font-medium text-[#434652] mb-1">LinkedIn Profile Link (Optional)</label>
            <input id="dash-field-10"
              type="url"
              value={editForm.linkedinUrl}
              onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-11" className="block text-xs font-medium text-[#434652] mb-1">Portfolio / GitHub (Optional)</label>
            <input id="dash-field-11"
              type="url"
              value={editForm.portfolioUrl}
              onChange={(e) => setEditForm({ ...editForm, portfolioUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="dash-field-12" className="block text-xs font-black text-[#061b3b] mb-1">Additional Information / Target Goal</label>
            <textarea id="dash-field-12"
              rows={3}
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t border-[#cbdaff]">
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="px-5 py-2.5 border border-[#cbdaff] text-xs font-bold rounded-xl text-[#434652] hover:bg-[#f1f3ff] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save & Update Profile</span>
            </button>
          </div>
        </form>
      ) : (
        /* Static Profile Details Display */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">Full Name</span>
            <strong className="text-sm font-black text-[#061b3b] block mt-0.5">
              {fullName}
            </strong>
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">Registered Email Address</span>
            <strong className="text-xs font-bold text-[#002869] block mt-0.5 break-all">
              {candidateProfile.email}
            </strong>
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">Primary Contact Mobile</span>
            <strong className="text-xs font-bold text-[#061b3b] block mt-0.5">
              {candidateProfile.mobile || 'Not Provided'}
            </strong>
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">Alternate Mobile Number</span>
            <span className="text-xs font-medium text-[#434652] block mt-0.5">
              {candidateProfile.alternateNumber || 'Not Provided'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">Alternate Email ID</span>
            <span className="text-xs font-medium text-[#434652] block mt-0.5 break-all">
              {candidateProfile.alternateEmail || 'Not Provided'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">Current Role & Level</span>
            <strong className="text-xs font-bold text-[#061b3b] block mt-0.5">
              {candidateProfile.currentDesignation || 'Not Provided'}
            </strong>
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">Target Role</span>
            <strong className="text-xs font-bold text-[#061b3b] block mt-0.5">
              {candidateProfile.targetRole || 'Not Provided'}
            </strong>
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">Total Work Experience</span>
            <strong className="text-xs font-bold text-[#061b3b] block mt-0.5">
              {candidateProfile.totalExperience || 'Not Provided'}
            </strong>
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">LinkedIn Profile URL</span>
            {candidateProfile.linkedinUrl ? (
              <a
                href={candidateProfile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#002869] hover:underline block mt-0.5 truncate"
              >
                {candidateProfile.linkedinUrl}
              </a>
            ) : (
              <span className="text-xs font-medium text-[#434652] block mt-0.5">Not Provided</span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
            <span className="text-[#666a76] block text-[11px] font-semibold">Portfolio / Code Repositories</span>
            {candidateProfile.portfolioUrl ? (
              <a
                href={candidateProfile.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#002869] hover:underline block mt-0.5 truncate"
              >
                {candidateProfile.portfolioUrl}
              </a>
            ) : (
              <span className="text-xs font-medium text-[#434652] block mt-0.5">Not Provided</span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff] md:col-span-2 lg:col-span-3">
            <span className="text-[#666a76] block text-[11px] font-semibold">Candidate Target Narrative & Bio</span>
            <p className="text-xs text-[#434652] mt-1 leading-relaxed">
              {candidateProfile.bio || COMPLETE_PROFILE}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
