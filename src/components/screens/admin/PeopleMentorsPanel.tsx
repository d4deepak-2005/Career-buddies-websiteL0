import React, { useState } from 'react';
import { RecordListEditor, FieldConfig } from './RecordListEditor';

const PERSON_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  {
    key: 'role',
    label: 'Role',
    type: 'select',
    options: ['founder', 'co-founder', 'leadership'],
  },
  { key: 'title', label: 'Designation', type: 'text', placeholder: 'e.g. Founder, CareerBuddies' },
  { key: 'photoUrl', label: 'Photo URL / path', type: 'text', placeholder: '/assets/team/nishant-sharma.jpg' },
  { key: 'yearsOfExperience', label: 'Experience Badge', type: 'text', placeholder: 'e.g. 10+ Years of Professional Experience' },
  { key: 'shortBio', label: 'Short Bio', type: 'textarea' },
  { key: 'longBio', label: 'Long Bio', type: 'textarea' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'linkedIn', label: 'LinkedIn URL', type: 'text' },
  { key: 'expertise', label: 'Expertise', type: 'tags', placeholder: 'Career Development, Business Strategy' },
];

const PERSON_EMPTY = {
  name: '',
  role: 'leadership',
  title: '',
  photoUrl: '',
  yearsOfExperience: '',
  shortBio: '',
  longBio: '',
  email: '',
  linkedIn: '',
  expertise: [],
};

const MENTOR_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'designation', label: 'Designation', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'photoUrl', label: 'Photo URL', type: 'text' },
  { key: 'experienceYears', label: 'Experience (years)', type: 'number' },
  { key: 'bio', label: 'Profile / Bio', type: 'textarea' },
  { key: 'expertise', label: 'Expertise', type: 'tags', placeholder: 'System Design, Leadership' },
  { key: 'linkedIn', label: 'LinkedIn URL', type: 'text' },
];

const MENTOR_EMPTY = {
  name: '',
  designation: '',
  company: '',
  photoUrl: '',
  experienceYears: 0,
  bio: '',
  expertise: [],
  linkedIn: '',
};

const SUB_TABS = ['Founder & Co-Founder', 'Leadership', 'Mentors'] as const;
type SubTab = (typeof SUB_TABS)[number];

export const PeopleMentorsPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('Founder & Co-Founder');

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-bold text-[#061b3b]">People & Mentors</h3>
        <p className="text-xs text-[#747783]">
          Manage Founder/Co-Founder profiles, additional Leadership entries,
          and Mentors. Changes appear on the public website immediately —
          hidden or empty sections keep showing the site's existing content.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              subTab === tab
                ? 'bg-[#002869] text-white'
                : 'bg-white text-[#434652] hover:bg-[#e0e8ff] border border-[#cbdaff]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTab === 'Founder & Co-Founder' && (
        <RecordListEditor
          apiBase="/api/people"
          labelSingular="Person"
          fields={PERSON_FIELDS.map((f) =>
            f.key === 'role'
              ? { ...f, options: ['founder', 'co-founder'] }
              : f
          )}
          emptyRecord={{ ...PERSON_EMPTY, role: 'founder' }}
          titleField="name"
          subtitleField="title"
        />
      )}

      {subTab === 'Leadership' && (
        <>
          <p className="text-[11px] text-[#747783] -mt-2">
            Additional leadership profiles beyond Founder/Co-Founder (not
            currently rendered on a dedicated public section — saved here
            for future use).
          </p>
          <RecordListEditor
            apiBase="/api/people"
            labelSingular="Leader"
            fields={PERSON_FIELDS.filter((f) => f.key !== 'role')}
            emptyRecord={PERSON_EMPTY}
            filter={{ role: 'leadership' }}
            titleField="name"
            subtitleField="title"
          />
        </>
      )}

      {subTab === 'Mentors' && (
        <RecordListEditor
          apiBase="/api/mentors"
          labelSingular="Mentor"
          fields={MENTOR_FIELDS}
          emptyRecord={MENTOR_EMPTY}
          titleField="name"
          subtitleField="designation"
        />
      )}
    </div>
  );
};

export default PeopleMentorsPanel;
