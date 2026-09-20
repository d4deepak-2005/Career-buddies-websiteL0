// Server-side validation for public lead submissions. It only ever accepts what
// the visitor actually typed: nothing is invented for missing fields (no default
// phone number, email, experience or industry).
export interface LeadInput {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  currentRole: string;
  experience: string;
  industry: string;
  requirement: string;
  planInterest: string;
  source: string;
  alternateNumber?: string;
  alternateEmail?: string;
  linkedinUrl?: string;
  notes: string;
}

// (A plain shape rather than a discriminated union: the project doesn't enable strict null checks.)
export interface LeadValidation {
  ok: boolean;
  data?: LeadInput;
  error?: string;
  fields?: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

function read(v: unknown, max: number, errors: Record<string, string>, field: string): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') {
    errors[field] = 'Invalid value.';
    return '';
  }
  const t = v.trim();
  if (t.length > max) {
    errors[field] = `Too long (maximum ${max} characters).`;
    return t.slice(0, max);
  }
  return t;
}

function validPhone(raw: string): boolean {
  if (!/^\+?[\d\s\-().]+$/.test(raw)) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Existing behaviour: a bare 10-digit number is treated as an Indian mobile.
  return !raw.startsWith('+') && digits.length === 10 ? `+91 ${digits}` : raw;
}

export function validateLead(body: any): LeadValidation {
  const b = body && typeof body === 'object' ? body : {};
  const errors: Record<string, string> = {};

  const fullName = read(b.name, 200, errors, 'name');
  let firstName = read(b.firstName, 100, errors, 'firstName');
  let lastName = read(b.lastName, 100, errors, 'lastName');
  if (!firstName && fullName) {
    const [first, ...rest] = fullName.split(/\s+/);
    firstName = first;
    if (!lastName) lastName = rest.join(' ');
  }
  if (!firstName && !errors.firstName && !errors.name) errors.firstName = 'Please enter your name.';

  const mobileRaw = read(b.mobile, 30, errors, 'mobile');
  if (!errors.mobile) {
    if (!mobileRaw) errors.mobile = 'Please enter your mobile number.';
    else if (!validPhone(mobileRaw)) errors.mobile = 'Please enter a valid mobile number.';
  }

  const emailRaw = read(b.email, 254, errors, 'email').toLowerCase();
  if (emailRaw && !errors.email && !EMAIL_RE.test(emailRaw)) errors.email = 'Please enter a valid email address.';

  const altNumber = read(b.alternateNumber, 30, errors, 'alternateNumber');
  if (altNumber && !errors.alternateNumber && !validPhone(altNumber)) errors.alternateNumber = 'Please enter a valid alternate number.';

  const altEmail = read(b.alternateEmail, 254, errors, 'alternateEmail').toLowerCase();
  if (altEmail && !errors.alternateEmail && !EMAIL_RE.test(altEmail)) errors.alternateEmail = 'Please enter a valid alternate email address.';

  const linkedin = read(b.linkedinUrl, 300, errors, 'linkedinUrl');
  if (linkedin && !errors.linkedinUrl && !/^https?:\/\/\S+$/i.test(linkedin)) errors.linkedinUrl = 'Please enter a valid link starting with http:// or https://.';

  const currentRole = read(b.currentRole, 150, errors, 'currentRole');
  const experience = read(b.experience, 100, errors, 'experience');
  const industry = read(b.industry, 100, errors, 'industry');
  const notes = read(b.notes, 3000, errors, 'notes');
  const serviceInterested = read(b.serviceInterested, 200, errors, 'serviceInterested');
  const requirement = read(b.requirement, 2000, errors, 'requirement') || serviceInterested || notes;
  const planInterest = read(b.planInterest, 200, errors, 'planInterest') || serviceInterested || 'General Counselling';
  const source = read(b.source, 100, errors, 'source') || 'Website Intake';

  // Cheap spam guard: real enquiries rarely contain several links.
  const links = (`${requirement} ${notes}`.match(/https?:\/\//gi) || []).length;
  if (links > 3 && !errors.requirement) errors.requirement = 'Please remove links from your message.';

  const first = Object.values(errors)[0];
  if (first) return { ok: false, error: first, fields: errors };

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      mobile: normalisePhone(mobileRaw),
      email: emailRaw,
      currentRole: currentRole || 'Not specified',
      experience: experience || 'Not specified',
      industry: industry || 'Not specified',
      requirement: requirement || 'Not specified',
      planInterest,
      source,
      alternateNumber: altNumber ? normalisePhone(altNumber) : undefined,
      alternateEmail: altEmail || undefined,
      linkedinUrl: linkedin || undefined,
      notes,
    },
  };
}
