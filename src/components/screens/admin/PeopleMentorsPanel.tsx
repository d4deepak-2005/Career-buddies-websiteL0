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
  { key: 'designation', label: 'Designation / Title', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'companyColor', label: 'Company Brand Colour (hex)', type: 'text', placeholder: '#4285F4' },
  {
    key: 'category',
    label: 'Category (drives the public filter)',
    type: 'select',
    options: ['Engineering', 'Product', 'Design', 'Data & AI', 'Marketing & Growth', 'Leadership'],
  },
  { key: 'photoUrl', label: 'Mentor Photo', type: 'image' },
  { key: 'experienceYears', label: 'Experience (years)', type: 'number' },
  { key: 'bio', label: 'Short Bio (shown on cards)', type: 'textarea' },
  { key: 'longBio', label: 'Full Bio (shown in profile)', type: 'textarea' },
  { key: 'expertise', label: 'Expertise / Skills', type: 'tags', placeholder: 'Go, Distributed Systems, Kubernetes' },
  { key: 'topics', label: 'Session Topics', type: 'tags', placeholder: 'System Design, Mock Interviews' },
  { key: 'pastCompanies', label: 'Past Companies', type: 'tags', placeholder: 'Lyft, Amazon' },
  { key: 'linkedIn', label: 'LinkedIn / Profile URL', type: 'text' },
  { key: 'rating', label: 'Rating (0-5)', type: 'number' },
  { key: 'reviewCount', label: 'Number of Reviews', type: 'number' },
  { key: 'sessionsCompleted', label: 'Sessions Completed', type: 'number' },
  { key: 'hourlyRate', label: 'Price per Session (USD)', type: 'number' },
  { key: 'availableNext', label: 'Next Available (text)', type: 'text', placeholder: 'Tomorrow, 2:00 PM' },
  {
    key: 'reviews',
    label: 'Reviews',
    type: 'json',
    placeholder: '[{"id":"r1","author":"","role":"","rating":5,"date":"","comment":""}]',
  },
  { key: 'verified', label: 'Verified mentor badge', type: 'checkbox' },
  { key: 'featured', label: 'Featured', type: 'checkbox' },
  { key: 'superMentor', label: 'Super Mentor', type: 'checkbox' },
];

const MENTOR_EMPTY = {
  name: '',
  designation: '',
  company: '',
  companyColor: '',
  category: 'Engineering',
  photoUrl: '',
  experienceYears: 0,
  bio: '',
  longBio: '',
  expertise: [],
  topics: [],
  pastCompanies: [],
  linkedIn: '',
  rating: 5,
  reviewCount: 0,
  sessionsCompleted: 0,
  hourlyRate: 0,
  availableNext: '',
  reviews: [],
  verified: true,
  featured: false,
  superMentor: false,
};

const SUB_TABS = ['Founder & Co-Founder', 'Leadership', 'Mentors'] as const;
type SubTab = (typeof SUB_TABS)[number];

export const PeopleMentorsPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('Founder & Co-Founder');

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-[#061b3b]">People & Mentors</h2>
        <p className="text-xs text-[#666a76]">
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
          <p className="text-[11px] text-[#666a76] -mt-2">
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
          imageField="photoUrl"
        />
      )}
    </div>
  );
};

export default PeopleMentorsPanel;
