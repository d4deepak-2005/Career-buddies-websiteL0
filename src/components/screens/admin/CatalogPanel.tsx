import React, { useState } from 'react';
import { RecordListEditor, FieldConfig } from './RecordListEditor';

// Field lists mirror what each public screen actually renders, plus the
// admin-facing fields requested (featured flag, CTA text/link, etc.).

export const PROGRAMME_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Programme Name' },
  { key: 'institution', label: 'Institution' },
  { key: 'category', label: 'Category (drives public filter)' },
  { key: 'badge', label: 'Badge' },
  { key: 'tagline', label: 'Tagline / Title', type: 'textarea' },
  { key: 'shortDescription', label: 'Short Description', type: 'textarea' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'imageUrl', label: 'Logo / Image URL or path' },
  { key: 'duration', label: 'Duration' },
  { key: 'eligibility', label: 'Eligibility' },
  { key: 'cohortStartDate', label: 'Cohort Start Date' },
  { key: 'feeINR', label: 'Fee (INR)', type: 'number' },
  { key: 'originalFeeINR', label: 'Original Fee (INR, strikethrough)', type: 'number' },
  { key: 'mentorName', label: 'Lead Mentor Name' },
  { key: 'mentorRole', label: 'Lead Mentor Role' },
  { key: 'mentorCompany', label: 'Lead Mentor Company' },
  { key: 'mentorAvatar', label: 'Lead Mentor Photo URL or path' },
  { key: 'highlights', label: 'Highlights', type: 'tags' },
  {
    key: 'curriculum',
    label: 'Curriculum',
    type: 'json',
    placeholder: '[{"week":"Week 1","topic":"...","description":"..."}]',
  },
  { key: 'ctaText', label: 'CTA Text' },
  { key: 'ctaLink', label: 'CTA Link' },
  { key: 'brochureUrl', label: 'Brochure URL' },
  { key: 'dodoProductId', label: 'Dodo Payments Product ID (enables online payment)' },
  { key: 'featured', label: 'Featured', type: 'checkbox' },
];

export const WEBINAR_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category (drives public filter)' },
  { key: 'tagline', label: 'Tagline', type: 'textarea' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'speakerName', label: 'Speaker Name' },
  { key: 'speakerDesignation', label: 'Speaker Designation' },
  { key: 'speakerCompany', label: 'Speaker Company' },
  { key: 'speakerPhotoUrl', label: 'Speaker Photo URL or path' },
  { key: 'speakerBio', label: 'Speaker Bio', type: 'textarea' },
  { key: 'whatYouWillLearn', label: 'What You Will Learn', type: 'tags' },
  { key: 'targetAudience', label: 'Target Audience', type: 'tags' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'priceINR', label: 'Price (INR)', type: 'number' },
  { key: 'registrationLink', label: 'Registration Link' },
  { key: 'dodoProductId', label: 'Dodo Payments Product ID (blank = standard webinar pass)' },
  { key: 'imageUrl', label: 'Image URL or path' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['upcoming', 'filling_fast', 'housefull', 'completed'],
  },
  { key: 'featured', label: 'Featured', type: 'checkbox' },
];

export const TESTIMONIAL_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Person Name' },
  { key: 'photoUrl', label: 'Photo URL or path' },
  { key: 'role', label: 'Designation (current role)' },
  { key: 'company', label: 'Company' },
  { key: 'previousRole', label: 'Previous Role' },
  { key: 'previousCompany', label: 'Previous Company' },
  { key: 'testimonial', label: 'Testimonial', type: 'textarea' },
  { key: 'outcomeMetric', label: 'Outcome Metric' },
  {
    key: 'outcomeType',
    label: 'Outcome Type (drives public filter)',
    type: 'select',
    options: ['transition', 'promotion', 'clarity', 'hike'],
  },
  { key: 'rating', label: 'Rating (1-5)', type: 'number' },
  { key: 'mentorName', label: 'Mentor Name' },
  { key: 'serviceUsed', label: 'Service Used' },
];

export const SERVICE_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Service Name' },
  { key: 'category', label: 'Category (drives public filter)' },
  { key: 'shortDescription', label: 'Short Description', type: 'textarea' },
  { key: 'fullDescription', label: 'Full Description', type: 'textarea' },
  { key: 'iconName', label: 'Icon name (e.g. Compass, Rocket)' },
  { key: 'iconUrl', label: 'Icon / Image URL or path (overrides icon name)' },
  { key: 'deliverables', label: 'Deliverables', type: 'tags' },
  { key: 'idealFor', label: 'Ideal For', type: 'tags' },
  { key: 'keyOutcome', label: 'Key Outcome' },
  { key: 'duration', label: 'Duration' },
  { key: 'badge', label: 'Badge' },
  { key: 'ctaText', label: 'CTA Text' },
  { key: 'ctaLink', label: 'CTA Link' },
  { key: 'featured', label: 'Featured / Popular', type: 'checkbox' },
];

export const PLAN_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Plan Name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'badge', label: 'Badge' },
  { key: 'priceINR', label: 'Price (INR text, e.g. ₹14,999)' },
  { key: 'priceUSD', label: 'Price (USD text)' },
  { key: 'period', label: 'Period (e.g. per 3-month program)' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'sessionsCount', label: 'Sessions (e.g. 6 Dedicated 1:1 Sessions)' },
  { key: 'supportType', label: 'Support Type' },
  { key: 'bestFor', label: 'Best For' },
  {
    key: 'features',
    label: 'Features',
    type: 'json',
    placeholder: '[{"title":"...","included":true,"detail":""}]',
  },
  { key: 'customPricingNote', label: 'Custom Pricing Note', type: 'textarea' },
  { key: 'ctaText', label: 'CTA Text' },
  { key: 'dodoProductId', label: 'Dodo Payments Product ID (enables online payment)' },
  { key: 'isRecommended', label: 'Recommended / Most Popular', type: 'checkbox' },
  { key: 'isCustomPricing', label: 'Custom pricing (no fixed price)', type: 'checkbox' },
];

const SUB_TABS = ['Programmes', 'Testimonials', 'Services', 'Plans'] as const;
type SubTab = (typeof SUB_TABS)[number];

export const CatalogPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('Programmes');

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-[#061b3b]">Programmes, Stories, Services & Plans</h2>
        <p className="text-xs text-[#666a76]">
          Manage the repeatable catalogue content. Hidden records disappear from
          the public site; if a collection is empty the site keeps showing its
          built-in content.
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

      {subTab === 'Programmes' && (
        <RecordListEditor
          apiBase="/api/programmes"
          labelSingular="Programme"
          fields={PROGRAMME_FIELDS}
          emptyRecord={{ name: '', highlights: [], curriculum: [], feeINR: 0, featured: false }}
          titleField="name"
          subtitleField="category"
        />
      )}
      {subTab === 'Testimonials' && (
        <RecordListEditor
          apiBase="/api/testimonials"
          labelSingular="Story"
          fields={TESTIMONIAL_FIELDS}
          emptyRecord={{ name: '', outcomeType: 'clarity', rating: 5 }}
          titleField="name"
          subtitleField="role"
        />
      )}
      {subTab === 'Services' && (
        <RecordListEditor
          apiBase="/api/services"
          labelSingular="Service"
          fields={SERVICE_FIELDS}
          emptyRecord={{ title: '', deliverables: [], featured: false }}
          titleField="title"
          subtitleField="category"
        />
      )}
      {subTab === 'Plans' && (
        <RecordListEditor
          apiBase="/api/plans"
          labelSingular="Plan"
          fields={PLAN_FIELDS}
          emptyRecord={{ name: '', features: [], isRecommended: false, isCustomPricing: false }}
          titleField="name"
          subtitleField="priceINR"
        />
      )}
    </div>
  );
};

export default CatalogPanel;
