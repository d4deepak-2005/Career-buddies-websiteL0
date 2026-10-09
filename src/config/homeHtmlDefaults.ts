import { HomeSectionId } from './homeSections';
import { DEFAULT_HOME_FAQ } from './homeFaq';
import { DEFAULT_HOME_JOURNEY } from './homeJourney';
import { DEFAULT_HOME_MASTERCLASSES, DEFAULT_HOME_CHECK_IN } from './homeMasterclasses';
import { DEFAULT_HOME_NEXT_STEP } from './homeNextStep';
import { DEFAULT_HOME_SERVICES } from './homeServices';
import { DEFAULT_HOME_TRUST } from './homeTrust';
import { LEADERSHIP_SECTION_HEADER } from './leadershipData';

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const wrap = (bg: string, inner: string) =>
  `<section style="width:100%;padding:72px 24px;background:${bg};box-sizing:border-box;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
  <div style="max-width:1280px;margin:0 auto;">
${inner}
  </div>
</section>`;

const badge = (text: string, dark = false) =>
  `<div style="display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;background:${dark ? 'rgba(255,255,255,0.12)' : '#dae2ff'};color:${dark ? '#79fd8d' : '#001947'};margin-bottom:12px;">${esc(text)}</div>`;

const heading = (text: string, color = '#061b3b') =>
  `<h2 style="margin:0 0 10px;font-size:30px;line-height:1.2;font-weight:800;color:${color};">${esc(text)}</h2>`;

const sub = (text: string, color = '#434652') =>
  `<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${color};max-width:720px;">${esc(text)}</p>`;

const btn = (text: string, fill = true) =>
  fill
    ? `<a href="#webinars" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#002869;color:#fff;font-size:12px;font-weight:700;text-decoration:none;">${esc(text)}</a>`
    : `<a href="#plans" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#f0f5ff;border:1px solid #cbdaff;color:#002869;font-size:12px;font-weight:700;text-decoration:none;">${esc(text)}</a>`;

const card = (title: string, body: string, extra = '') =>
  `<div style="background:#fff;border:1px solid #cbdaff;border-radius:24px;padding:22px;box-sizing:border-box;">
    ${extra}
    <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#061b3b;">${esc(title)}</h3>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#434652;">${esc(body)}</p>
  </div>`;

function grid(items: string[], cols = 4) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(${cols > 3 ? '220px' : '240px'},1fr));gap:18px;">${items.join('')}</div>`;
}

const nextCards = DEFAULT_HOME_NEXT_STEP.cards.map(
  (item) =>
    `<div style="background:#fff;border:1px solid ${item.color === 'green' ? '#a6f5b7' : '#cbdaff'};border-radius:24px;padding:22px;">
      <div style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${item.color === 'green' ? '#d9ffe3' : '#dae2ff'};color:${item.color === 'green' ? '#00531d' : '#001947'};margin-bottom:12px;">${esc(item.badge)}</div>
      <h3 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#061b3b;">${esc(item.title)}</h3>
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#666a76;">${esc(item.subtitle)}</p>
      <p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#434652;">${esc(item.description)}</p>
      <div style="padding-top:12px;border-top:1px solid #f1f1f1;font-size:12px;font-weight:700;color:${item.color === 'green' ? '#006e29' : '#002869'};">${esc(item.ctaText)} →</div>
    </div>`
);

const journeyCards = DEFAULT_HOME_JOURNEY.stages.map(
  (stage, index) =>
    `<div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);border-radius:20px;padding:20px;color:#fff;">
      <div style="font-size:11px;font-weight:700;color:#79fd8d;margin-bottom:8px;">${String(index + 1).padStart(2, '0')} · ${esc(stage.badge)}</div>
      <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;">${esc(stage.title)}</h3>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#dae2ff;">${esc(stage.desc)}</p>
    </div>`
);

const faqCards = DEFAULT_HOME_FAQ.items
  .map(
    (item) =>
      `<div style="background:#fff;border:1px solid #cbdaff;border-radius:16px;padding:16px 20px;margin-bottom:10px;">
        <div style="font-size:15px;font-weight:700;color:#061b3b;margin-bottom:8px;">${esc(item.question)}</div>
        <div style="font-size:13px;line-height:1.6;color:#434652;">${esc(item.answer)}</div>
      </div>`
  )
  .join('\n');

const trustCards = DEFAULT_HOME_TRUST.points
  .map((item) => card(item.title, item.description))
  .join('');

export const DEFAULT_HOME_SECTION_HTML: Record<HomeSectionId, string> = {
  hero: `<section style="width:100%;padding:64px 24px 80px;background:#002869;color:#fff;box-sizing:border-box;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,0.8fr);gap:40px;align-items:center;">
    <div>
      ${badge('Bridging the gap between aspiration and achievement', true)}
      <h1 style="margin:0 0 14px;font-size:40px;line-height:1.15;font-weight:800;">Accelerate Your Career with Structured Practitioner Guidance</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#dae2ff;max-width:640px;">Join live mentor masterclasses, get matched with a Career Advisor, and follow a clear plan from diagnosis to 1:1 guidance.</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;">
        ${btn('Connect with Our Advisor')}
        <a href="#webinars" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#79fd8d;color:#002869;font-size:12px;font-weight:800;text-decoration:none;">Join Live Webinar</a>
      </div>
    </div>
    <div style="display:grid;gap:12px;">
      ${['Career Direction', 'Interview Readiness', 'Leadership Track'].map((label, i) => `<div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);border-radius:18px;padding:16px;"><div style="font-size:11px;color:#79fd8d;font-weight:700;margin-bottom:4px;">0${i + 1}</div><div style="font-size:16px;font-weight:700;">${label}</div></div>`).join('')}
    </div>
  </div>
</section>`,

  nextStep: wrap(
    '#f9f9ff',
    `${badge(DEFAULT_HOME_NEXT_STEP.eyebrow)}
    ${heading(DEFAULT_HOME_NEXT_STEP.title)}
    ${sub(DEFAULT_HOME_NEXT_STEP.description)}
    ${grid(nextCards)}`
  ),

  journey: wrap(
    '#002869',
    `${badge(DEFAULT_HOME_JOURNEY.eyebrow, true)}
    ${heading(DEFAULT_HOME_JOURNEY.title, '#fff')}
    ${sub(DEFAULT_HOME_JOURNEY.description, '#dae2ff')}
    ${grid(journeyCards)}
    <div style="margin-top:28px;padding:22px;border-radius:20px;background:rgba(255,255,255,0.08);">
      <div style="color:#79fd8d;font-size:11px;font-weight:700;margin-bottom:8px;">${esc(DEFAULT_HOME_JOURNEY.ctaEyebrow)}</div>
      ${heading(DEFAULT_HOME_JOURNEY.ctaTitle, '#fff')}
      ${sub(DEFAULT_HOME_JOURNEY.ctaDescription, '#dae2ff')}
      ${btn(DEFAULT_HOME_JOURNEY.moreText)}
    </div>`
  ),

  plans: wrap(
    '#f1f3ff',
    `${badge('Career Plans')}
    ${heading('Choose the Right CareerBuddies Plan for Your Stage')}
    ${sub('Your Career Advisor will match you with a structured plan. Dedicated profile work begins immediately upon enrolment.')}
    ${grid(
      ['Explore Plan', 'Elevate Plan', 'Executive & Premium Plan'].map((name) =>
        card(name, '1:1 guidance, profile work, and a clear next-step roadmap for this stage.', `<div style="font-size:11px;font-weight:700;color:#002869;margin-bottom:8px;">Plan</div>`)
      ),
      3
    )}`
  ),

  masterclasses: wrap(
    '#f9f9ff',
    `${badge(DEFAULT_HOME_MASTERCLASSES.eyebrow)}
    ${heading(DEFAULT_HOME_MASTERCLASSES.title)}
    ${sub(DEFAULT_HOME_MASTERCLASSES.description)}
    ${btn(DEFAULT_HOME_MASTERCLASSES.buttonText)}`
  ),

  checkIn: `<section style="width:100%;padding:56px 24px;background:#f1f3ff;box-sizing:border-box;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
  <div style="max-width:1280px;margin:0 auto;background:#002869;color:#fff;border-radius:28px;padding:48px 40px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:24px;">
    <div style="max-width:680px;">
      ${badge(DEFAULT_HOME_CHECK_IN.eyebrow, true)}
      ${heading(DEFAULT_HOME_CHECK_IN.title, '#fff')}
      ${sub(DEFAULT_HOME_CHECK_IN.description, '#dae2ff')}
    </div>
    <a href="#career-check-in" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#79fd8d;color:#002869;font-size:13px;font-weight:800;text-decoration:none;">${esc(DEFAULT_HOME_CHECK_IN.buttonText)}</a>
  </div>
</section>`,

  services: wrap(
    '#fff',
    `${badge(DEFAULT_HOME_SERVICES.eyebrow)}
    ${heading(DEFAULT_HOME_SERVICES.title)}
    ${sub(DEFAULT_HOME_SERVICES.description)}
    ${grid(
      ['Engineering', 'Product', 'Data & AI'].map((name) => card(name, 'A structured track with practitioner guidance for this career path.')),
      3
    )}`
  ),

  mentors: wrap(
    '#fff',
    `${badge('Top Senior Mentors')}
    ${heading('Learn Directly from Industry Leaders')}
    ${sub('Learn directly from verified practitioners who have scaled systems, led high-output teams, and conducted hundreds of hiring rounds.')}
    ${grid(
      ['Mentor 1', 'Mentor 2', 'Mentor 3'].map((name) =>
        card(name, 'Senior practitioner. Add your own mentor copy, photo, and link here.')
      ),
      3
    )}`
  ),

  leadership: wrap(
    '#fff',
    `${badge(LEADERSHIP_SECTION_HEADER.eyebrow)}
    ${heading(LEADERSHIP_SECTION_HEADER.headline)}
    ${sub(LEADERSHIP_SECTION_HEADER.supportingText)}
    ${grid(
      ['Founder', 'Co-Founder', 'Leadership'].map((name) => card(name, 'Short bio and role at CareerBuddies. Replace with your leadership copy.')),
      3
    )}`
  ),

  story: wrap(
    '#fff',
    `<div style="background:#f9f9ff;border:1px solid #cbdaff;border-radius:28px;padding:40px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:24px;align-items:center;">
      <div style="max-width:680px;">
        ${badge('Authentic Brand Story')}
        ${heading('"Career decisions often become more difficult when people have to make them alone."')}
        ${sub('Started in 2022, CareerBuddies has grown into a structured technology-enabled ecosystem connecting ambitious learners with verified mentors, masterclasses, and actionable playbooks.')}
      </div>
      ${btn('Read Our Journey (2022–2026)')}
    </div>`
  ),

  trust: wrap(
    '#fff',
    `${badge(DEFAULT_HOME_TRUST.eyebrow)}
    ${heading(DEFAULT_HOME_TRUST.title)}
    ${sub(DEFAULT_HOME_TRUST.description)}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-bottom:24px;">${trustCards}</div>
    <div style="background:#f9f9ff;border:1px solid #cbdaff;border-radius:20px;padding:22px;">
      ${heading(DEFAULT_HOME_TRUST.commitmentTitle)}
      ${sub(DEFAULT_HOME_TRUST.commitmentDescription)}
      <div style="font-size:12px;font-weight:700;color:#006e29;">${esc(DEFAULT_HOME_TRUST.commitmentNote)}</div>
    </div>`
  ),

  faq: wrap(
    '#f9f9ff',
    `${badge(DEFAULT_HOME_FAQ.eyebrow)}
    ${heading(DEFAULT_HOME_FAQ.title)}
    ${sub(DEFAULT_HOME_FAQ.description)}
    ${faqCards}`
  ),

  cta: wrap(
    '#fff',
    `<div style="text-align:center;max-width:720px;margin:0 auto;">
      ${heading('Start Your Structured Career Journey Today')}
      ${sub('Connect with a dedicated Career Advisor and accelerate with our proven career plans.')}
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
        ${btn('Join Live Mentor Webinar')}
        ${btn('Explore Career Plans', false)}
      </div>
    </div>`
  ),
};
