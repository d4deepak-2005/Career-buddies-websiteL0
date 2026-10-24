import './server/loadEnv.ts';
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import { connectDatabase } from './server/config/database.ts';
import { Lead } from './server/models/Lead.ts';
import {
  createAdminToken,
  readAdminSession,
  requireAdminAuth,
  resolveAdminLogin,
} from './server/middleware/adminAuth.ts';
import { createCrudRouter } from './server/routes/crudFactory.ts';
import siteSettingsRouter from './server/routes/siteSettings.ts';
import { Person } from './server/models/Person.ts';
import { Mentor } from './server/models/Mentor.ts';
import { Programme } from './server/models/Programme.ts';
import { Webinar } from './server/models/Webinar.ts';
import { Testimonial } from './server/models/Testimonial.ts';
import { Service } from './server/models/Service.ts';
import { Plan } from './server/models/Plan.ts';
import { Resource } from './server/models/Resource.ts';
import { paymentsRouter, paymentsWebhookHandler } from './server/routes/payments.ts';
import { adminPaymentsRouter } from './server/routes/adminPayments.ts';
import mediaRouter from './server/routes/media.ts';
import candidateRouter from './server/routes/candidate.ts';
import { aiChatHandler } from './server/ai/assistant.ts';
import { candidateItemsRouter, adminCandidateItemsRouter } from './server/routes/candidateItems.ts';
import { listAdminCandidates, getAdminCandidate } from './server/routes/adminCandidates.ts';
import { listAdminNotifications, streamAdminNotifications } from './server/routes/adminNotifications.ts';
import {
  createAdminTeamUser,
  deleteAdminTeamUser,
  listAdminTeam,
  updateAdminTeamUser,
} from './server/routes/adminTeam.ts';
import { notifyLead } from './server/services/adminNotify.ts';
import { actorFromReq, recordAdminAudit } from './server/services/adminAudit.ts';
import { listAdminLogs } from './server/routes/adminLogs.ts';
import { getMailInboxMessage, getMailStatus, listMailInbox, listMailRecipients, listSentMail, sendAdminMail, sendBulkMail } from './server/routes/adminMail.ts';
import { getAnalyticsReport, recordPageView } from './server/routes/analytics.ts';
import { inviteMentor, listMentorAccounts, sendMentorInviteInternal } from './server/routes/adminMentorAccounts.ts';
import { Candidate } from './server/models/Candidate.ts';
import oauthRouter from './server/routes/oauth.ts';
import { createRateLimiter } from './server/middleware/rateLimit.ts';
import { getPublicBaseUrl } from './server/config/baseUrl.ts';
import { securityHeaders } from './server/middleware/securityHeaders.ts';
import { validateLead } from './server/utils/leadValidation.ts';

const app = express();

// Behind a reverse proxy (Render, Cloudflare tunnel) every request reaches us from the
// proxy's address. `trust proxy` = number of proxy hops we own, so req.ip becomes the
// real client address (from the LAST hop's X-Forwarded-For entry) and a client cannot
// spoof it by sending its own header. Override with TRUST_PROXY_HOPS if the hosting
// setup has a different number of hops; 0 disables (direct connections / local dev).
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const TRUST_PROXY_HOPS =
  process.env.TRUST_PROXY_HOPS !== undefined && process.env.TRUST_PROXY_HOPS !== ''
    ? Math.max(0, Math.min(5, Number(process.env.TRUST_PROXY_HOPS) || 0))
    : IS_PRODUCTION ? 1 : 0;
app.set('trust proxy', TRUST_PROXY_HOPS);
app.disable('x-powered-by');
app.use(securityHeaders(IS_PRODUCTION));

// API responses are never cached by shared caches. Anything private (accounts, admin, leads,
// payments, sign-in, AI) or sent with credentials is `no-store`; public content endpoints are
// `no-cache` (browsers may keep a copy but must revalidate it).
const PRIVATE_API = /^\/api\/(candidate|admin|leads|payments|auth|ai|media)(\/|$)/;
app.use('/api', (req: Request, res: Response, next: express.NextFunction) => {
  const isPrivate = PRIVATE_API.test(req.originalUrl.split('?')[0]) || !!req.headers.authorization || (req.method !== 'GET' && req.method !== 'HEAD');
  res.setHeader('Cache-Control', isPrivate ? 'no-store' : 'no-cache');
  next();
});

// Independent rate-limit buckets (never shared between endpoints).
const leadsBurstLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 6, message: 'Too many submissions from your connection. Please wait a few minutes and try again.' });
const leadsDailyLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 25, message: 'Daily submission limit reached. Please contact us on WhatsApp instead.' });
const aiBurstLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20, message: 'You are sending messages too quickly. Please wait a few minutes and try again.' });
const aiDailyLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 200, message: 'Daily assistant limit reached. Please try again tomorrow.' });
const adminLoginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many failed attempts. Please try again later.' });
const analyticsLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 80, message: 'Too many requests.' });
const PORT = Number(process.env.PORT) || 3000;

// Razorpay webhook — needs the RAW body for signature verification,
// so it is registered before the JSON body parser.
app.post(
  '/api/payments/webhook',
  express.raw({ type: '*/*', limit: '1mb' }),
  paymentsWebhookHandler
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Interface for Lead (API response shape — backed by MongoDB, not stored in-memory)
export interface ServerLead {
  id: string;
  serialNumber: number;
  createdAt: string;
  timestampIST: string;
  firstName: string;
  lastName: string;
  fullName: string;
  mobile: string;
  email: string;
  currentRole: string;
  experience: string;
  industry: string;
  requirement: string;
  planInterest?: string;
  source:
  | 'Counselling Form'
  | 'Contact Form'
  | 'Plan Enquiry'
  | 'Sign Up'
  | 'Mentor Registration'
  | 'Direct Consultation'
  | string;
  status: 'new' | 'contacted' | 'scheduled' | 'converted' | 'cancelled';
  notes?: {
    id: string;
    text: string;
    author: string;
    createdAt: string;
  }[];
  sheetSynced?: boolean;
  whatsAppNotified?: boolean;
  mentorId?: string;
  mentorName?: string;
  bookingDate?: string;
  bookingSlot?: string;
  bookingTopic?: string;
}

// Function to format a Date in Indian Standard Time (IST)
function toISTTimestamp(date: Date): string {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

// Maps a MongoDB Lead document to the API/UI-facing ServerLead shape.
// MongoDB is the single source of truth: nothing here is cached in-memory,
// so leads and their status/notes survive server restarts.
// `serialNumber` is not stored — it reflects the document's position by
// creation order, passed in by the caller (see computeSerialNumber below).
function serializeLead(doc: any, serialNumber: number): ServerLead {
  const createdAt: Date = doc.createdAt ? new Date(doc.createdAt) : new Date();

  return {
    id: doc._id.toString(),
    serialNumber,
    createdAt: createdAt.toISOString(),
    timestampIST: toISTTimestamp(createdAt),
    firstName: doc.firstName,
    lastName: doc.lastName || '',
    fullName: `${doc.firstName} ${doc.lastName || ''}`.trim(),
    mobile: doc.mobile,
    email: doc.email,
    currentRole: doc.currentRole || 'Professional',
    experience: doc.experience || 'Not specified',
    industry: doc.industry || 'Technology',
    requirement: doc.requirement,
    planInterest: doc.planInterest || 'General Counselling',
    source: doc.source,
    status: doc.status || 'new',
    notes: (doc.notes || []).map((note: any) => ({
      id: note.id,
      text: note.text,
      author: note.author,
      createdAt:
        note.createdAt instanceof Date
          ? note.createdAt.toISOString()
          : note.createdAt,
    })),
    sheetSynced: true,
    whatsAppNotified: true,
    mentorId: doc.mentorId ? doc.mentorId.toString() : undefined,
    mentorName: doc.mentorName || undefined,
    bookingDate: doc.bookingDate || undefined,
    bookingSlot: doc.bookingSlot || undefined,
    bookingTopic: doc.bookingTopic || undefined,
  };
}

// Serial number = how many leads were created at or before this one.
// Used for single-document responses (create/update); the list endpoint
// computes these in bulk instead of running one query per lead.
async function computeSerialNumber(doc: any): Promise<number> {
  return Lead.countDocuments({ createdAt: { $lte: doc.createdAt } });
}

// Function to dispatch WhatsApp notifications to configured numbers safely
async function notifyWhatsAppAdmins(
  lead: ServerLead
): Promise<boolean> {
  const recipients = (
    process.env.NOTIFY_WHATSAPP_NUMBERS ||
    '+918890790077,+919310288270'
  )
    .split(',')
    .map((num) => num.trim())
    .filter(Boolean);

  const messageText =
    `🔔 *New CareerBuddies Lead Notification*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `*S.No:* #${lead.serialNumber}\n` +
    `*Name:* ${lead.fullName}\n` +
    `*Mobile:* ${lead.mobile}\n` +
    `*Email:* ${lead.email}\n` +
    `*Current Role:* ${lead.currentRole || 'N/A'}\n` +
    `*Experience:* ${lead.experience || 'N/A'}\n` +
    `*Industry:* ${lead.industry || 'N/A'}\n` +
    `*Plan Interest:* ${lead.planInterest || 'General Counselling'
    }\n` +
    `*Goal / Requirement:* ${lead.requirement}\n` +
    `*Source:* ${lead.source}\n` +
    `*Time (IST):* ${lead.timestampIST}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `_Action required: Review in CareerBuddies Lead Dashboard or connect directly._`;

  console.log(
    `[Lead Processing] Stored Lead #${lead.serialNumber} from ${lead.source}`
  );

  // Optional WhatsApp Business API integration
  if (
    process.env.WHATSAPP_API_URL &&
    process.env.WHATSAPP_API_TOKEN
  ) {
    try {
      console.log(
        `[WhatsApp Dispatch] Dispatched lead #${lead.serialNumber} to configured admin recipients.`
      );

      for (const phone of recipients) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');

        if (!cleanPhone) continue;

        await fetch(process.env.WHATSAPP_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: {
              body: messageText,
            },
          }),
        }).catch((e) =>
          console.log(
            '[WhatsApp API Request Notice]:',
            e.message
          )
        );
      }

      return true;
    } catch (err) {
      console.log('[WhatsApp Dispatch Notice]:', err);
    }
  } else {
    console.log(
      `[WhatsApp Dispatch] WhatsApp environment variables are unconfigured. Lead safely captured in local server store.`
    );
  }

  // Optional Google Apps Script webhook integration
  if (process.env.APPS_SCRIPT_WEBHOOK_URL) {
    try {
      await fetch(process.env.APPS_SCRIPT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lead),
      }).catch((e) =>
        console.log(
          '[Google Sheets Webhook Notice]:',
          e.message
        )
      );

      console.log(
        `[Google Sheets Webhook] Synced lead #${lead.serialNumber} to external sheet.`
      );
    } catch (err) {
      console.log(
        '[Google Sheets Webhook Notice]:',
        err
      );
    }
  }

  return true;
}

// ----------------- API ENDPOINTS -----------------

const VALID_STATUSES = ['new', 'contacted', 'scheduled', 'converted', 'cancelled'];

// 1. Health check - status only; no business or database counts are exposed publicly.
app.get(
  '/api/health',
  (req: Request, res: Response) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded' });
  }
);

// 1b. Admin login — issues a signed session token for the leads dashboard/admin screen
app.post(
  '/api/admin/login',
  async (req: Request, res: Response) => {
    const key = req.ip || 'unknown';

    // Failed attempts are counted per client; once blocked, even the right password
    // is refused until the window ends (no guess-through). Own bucket, separate from
    // candidate login/signup.
    if (adminLoginLimiter.isBlocked(key)) {
      const wait = adminLoginLimiter.retryAfterSeconds(key);
      res.setHeader('Retry-After', String(wait));
      res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please try again later.',
        retryAfterSeconds: wait,
      });
      return;
    }

    const { password } = (req.body || {}) as { password?: string };

    const actor = await resolveAdminLogin(password);
    if (!actor) {
      adminLoginLimiter.fail(key);
      res.status(401).json({
        success: false,
        error: 'Incorrect password.',
      });
      return;
    }

    try {
      const { token, expiresAt } = createAdminToken(actor);
      adminLoginLimiter.reset(key);
      recordAdminAudit(null, {
        action: 'login',
        entity: 'session',
        summary: `${actor.name} signed in`,
        actor,
      });
      res.json({
        success: true,
        token,
        expiresAt,
        name: actor.name,
        source: actor.source,
      });
    } catch (error) {
      // ADMIN_SESSION_SECRET missing/too short: fail closed.
      console.error('[Admin] Session signing is not configured.');
      res.status(503).json({
        success: false,
        error: 'Admin login is temporarily unavailable.',
      });
    }
  }
);

// 2. Create Lead (public - used by the site's lead-capture forms)
// Success is returned ONLY after the lead has really been stored. Invalid input is a
// 400 with a structured error; a storage failure is a 500. Nothing is invented for
// fields the visitor did not provide.
app.post(
  '/api/leads',
  leadsBurstLimiter.middleware,
  leadsDailyLimiter.middleware,
  async (req: Request, res: Response) => {
    const result = validateLead(req.body);

    if (!result.ok) {
      res.status(400).json({
        success: false,
        error: result.error,
        fields: result.fields,
      });
      return;
    }

    const input = result.data as NonNullable<typeof result.data>;
    const initialNotes: {
      id: string;
      text: string;
      author: string;
      createdAt: string;
    }[] = [];

    if (input.notes) {
      initialNotes.push({
        id: `note-${Date.now()}`,
        text: input.notes,
        author: 'System Intake',
        createdAt: new Date().toISOString(),
      });
    }

    // Duplicate & slot collision check for 1:1 mentor bookings
    if (input.mentorId && input.bookingDate && input.bookingSlot) {
      // 1. Time slot collision check: has this mentor already been booked for this slot?
      const slotConflict = await Lead.findOne({
        mentorId: input.mentorId,
        bookingDate: input.bookingDate,
        bookingSlot: input.bookingSlot,
        status: { $ne: 'cancelled' },
      });

      if (slotConflict) {
        res.status(409).json({
          success: false,
          error: 'This time slot is already booked for this mentor. Please choose another slot.',
        });
        return;
      }

      // 2. Same-user duplicate check: does this candidate already have an active request on this date?
      const userConditions: any[] = [];
      if (input.email) userConditions.push({ email: input.email.toLowerCase() });
      if (input.mobile) userConditions.push({ mobile: input.mobile });

      if (userConditions.length > 0) {
        const userDuplicate = await Lead.findOne({
          mentorId: input.mentorId,
          bookingDate: input.bookingDate,
          $or: userConditions,
          status: { $in: ['new', 'scheduled', 'contacted'] },
        });

        if (userDuplicate) {
          res.status(409).json({
            success: false,
            error: 'You already have an active session booking with this mentor on this date.',
          });
          return;
        }
      }
    }

    try {
      const doc = await Lead.create({
        firstName: input.firstName,
        lastName: input.lastName,
        mobile: input.mobile,
        email: input.email,
        currentRole: input.currentRole,
        experience: input.experience,
        industry: input.industry,
        requirement: input.requirement,
        planInterest: input.planInterest,
        source: input.source,
        alternateNumber: input.alternateNumber,
        alternateEmail: input.alternateEmail,
        linkedinUrl: input.linkedinUrl,
        mentorId: input.mentorId ? input.mentorId : undefined,
        mentorName: input.mentorName || '',
        bookingDate: input.bookingDate || '',
        bookingSlot: input.bookingSlot || '',
        bookingTopic: input.bookingTopic || '',
        status: 'new',
        notes: initialNotes,
      });

      // No personal details in the log line.
      console.log(`[Lead] Saved new lead from "${input.source}".`);
      notifyLead(doc);

      try {
        const newLead = serializeLead(doc, await computeSerialNumber(doc));
        // Notifications run in the background and never affect the response.
        notifyWhatsAppAdmins(newLead).catch((err) =>
          console.log('WhatsApp notification notice:', err?.message || 'failed')
        );
      } catch {
        // The lead is already saved; a notification problem must not turn it into an error.
      }

      res.status(201).json({
        success: true,
        message: 'Thank you. Your details have been submitted successfully.',
      });
    } catch (error: any) {
      console.error('Error creating lead:', error?.name || 'error');

      if (error?.name === 'ValidationError') {
        res.status(400).json({
          success: false,
          error: 'Some of the details could not be accepted. Please check them and try again.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'We could not save your details right now. Please try again in a moment.',
      });
    }
  }
);

// 3. Get all leads (admin-only — reads straight from MongoDB)
app.get(
  '/api/leads',
  requireAdminAuth,
  async (req: Request, res: Response) => {
    try {
      // Sort ascending to assign serial numbers cheaply, then reverse for
      // newest-first display (matches the previous in-memory `unshift` order).
      const docs = await Lead.find().sort({ createdAt: 1 });
      const leads = docs
        .map((doc, index) => serializeLead(doc, index + 1))
        .reverse();

      res.json({
        success: true,
        total: leads.length,
        leads,
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leads.',
      });
    }
  }
);

// 4. Update Lead Status (admin-only, supports both PATCH and PUT)
const handleUpdateLeadStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({
      success: false,
      error: 'Invalid status value.',
    });
    return;
  }

  try {
    const doc = await Lead.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: 'after' }
    );

    if (!doc) {
      res.status(404).json({
        success: false,
        error: 'Lead not found.',
      });
      return;
    }

    recordAdminAudit(req, {
      action: 'status',
      entity: 'lead',
      entityId: String(doc._id),
      summary: `${actorFromReq(req).name} set lead status to ${status} for ${doc.firstName || 'lead'}`,
    });
    res.json({
      success: true,
      lead: serializeLead(doc, await computeSerialNumber(doc)),
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(400).json({
      success: false,
      error: 'Unable to update lead status.',
    });
  }
};

app.patch('/api/leads/:id/status', requireAdminAuth, handleUpdateLeadStatus);
app.put('/api/leads/:id/status', requireAdminAuth, handleUpdateLeadStatus);

// 4b. Generic lead update (admin-only) — status and/or a full notes-blob replace,
// matching how the Leads Dashboard's notes textarea edits all notes as one field.
app.patch(
  '/api/leads/:id',
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body as {
      status?: string;
      notes?: string;
    };

    const update: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status value.',
        });
        return;
      }
      update.status = status;
    }

    if (notes !== undefined) {
      update.notes = notes.trim()
        ? [
          {
            id: `note-${Date.now()}`,
            text: notes.trim(),
            author: 'Team Member',
            createdAt: new Date(),
          },
        ]
        : [];
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({
        success: false,
        error: 'Nothing to update.',
      });
      return;
    }

    try {
      const doc = await Lead.findByIdAndUpdate(id, update, { returnDocument: 'after' });

      if (!doc) {
        res.status(404).json({
          success: false,
          error: 'Lead not found.',
        });
        return;
      }

      recordAdminAudit(req, {
        action: 'update',
        entity: 'lead',
        entityId: String(doc._id),
        summary: `${actorFromReq(req).name} updated lead ${doc.firstName || ''}`.trim(),
        details: { fields: Object.keys(update) },
      });
      res.json({
        success: true,
        lead: serializeLead(doc, await computeSerialNumber(doc)),
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(400).json({
        success: false,
        error: 'Unable to update lead.',
      });
    }
  }
);

// 5. Add Note to Lead (admin-only, append-style; kept for compatibility)
app.post(
  '/api/leads/:id/notes',
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { text, author } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({
        success: false,
        error: 'Note text cannot be empty.',
      });
      return;
    }

    const newNote = {
      id: `note-${Date.now()}`,
      text: text.trim(),
      author: author ? author.trim() : 'Team Member',
      createdAt: new Date(),
    };

    try {
      const doc = await Lead.findByIdAndUpdate(
        id,
        { $push: { notes: newNote } },
        { returnDocument: 'after' }
      );

      if (!doc) {
        res.status(404).json({
          success: false,
          error: 'Lead not found.',
        });
        return;
      }

      recordAdminAudit(req, {
        action: 'update',
        entity: 'lead',
        entityId: String(doc._id),
        summary: `${actorFromReq(req).name} added a note on lead ${doc.firstName || ''}`.trim(),
      });
      res.json({
        success: true,
        lead: serializeLead(doc, await computeSerialNumber(doc)),
        note: {
          ...newNote,
          createdAt: newNote.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error adding note:', error);
      res.status(400).json({
        success: false,
        error: 'Unable to add note.',
      });
    }
  }
);

// 6. Delete Lead / Booking (admin-only)
app.delete(
  '/api/leads/:id',
  requireAdminAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const doc = await Lead.findByIdAndDelete(id);
      if (!doc) {
        res.status(404).json({ success: false, error: 'Booking not found.' });
        return;
      }
      recordAdminAudit(req, {
        action: 'delete',
        entity: 'lead',
        entityId: String(doc._id),
        summary: `${actorFromReq(req).name} deleted booking / lead ${doc.firstName || ''}`.trim(),
      });
      res.json({ success: true, message: 'Booking removed successfully.' });
    } catch (err: any) {
      console.error('Error deleting lead:', err);
      res.status(500).json({ success: false, error: 'Failed to delete booking.' });
    }
  }
);

// 7. Get Booked Slots for a Mentor (public - used to disable booked slots in BookingModal)
app.get(
  '/api/mentors/:mentorId/booked-slots',
  async (req: Request, res: Response) => {
    try {
      const { mentorId } = req.params;
      const mentorDoc = await Mentor.findById(mentorId).select('name');
      const query: any = {
        status: { $ne: 'cancelled' },
        bookingDate: { $exists: true, $ne: '' },
        bookingSlot: { $exists: true, $ne: '' },
      };
      if (mentorDoc?.name) {
        query.$or = [
          { mentorId },
          { mentorName: mentorDoc.name },
          { requirement: `1:1 Session with ${mentorDoc.name}` },
          { planInterest: `Mentor Booking - ${mentorDoc.name}` }
        ];
      } else {
        query.mentorId = mentorId;
      }
      const activeBookings = await Lead.find(query).select('bookingDate bookingSlot status');
      const bookedSlots = activeBookings.map((b) => ({
        date: b.bookingDate,
        slot: b.bookingSlot,
        status: b.status,
      }));
      res.json({ success: true, bookedSlots });
    } catch (err: any) {
      console.error('[Booked Slots Error]', err);
      res.json({ success: true, bookedSlots: [] });
    }
  }
);

// Leadership image routes
app.get(
  [
    '/NishantFounderfinalPhoto(1).png',
    '/NishantFounderfinalPhoto.png',
    '/NishantFounderfinalPhoto.svg',
    '/assets/nishant.png',
    '/assets/nishant.svg',
  ],
  (req, res) => {
    const p1 = path.join(
      process.cwd(),
      'public',
      'NishantFounderfinalPhoto(1).png'
    );

    const pngPath = path.join(
      process.cwd(),
      'public',
      'NishantFounderfinalPhoto.png'
    );

    const svgPath = path.join(
      process.cwd(),
      'public',
      'NishantFounderfinalPhoto.svg'
    );

    if (fs.existsSync(p1)) {
      res.sendFile(p1);
    } else if (fs.existsSync(pngPath)) {
      res.sendFile(pngPath);
    } else {
      res.setHeader(
        'Content-Type',
        'image/svg+xml'
      );
      res.sendFile(svgPath);
    }
  }
);

app.get(
  [
    '/Deepakcofounderfinal(1).png',
    '/Deepakcofounderfinal.png',
    '/Deepakcofounderfinal.svg',
    '/assets/deepak.png',
    '/assets/deepak.svg',
  ],
  (req, res) => {
    const p1 = path.join(
      process.cwd(),
      'public',
      'Deepakcofounderfinal(1).png'
    );

    const pngPath = path.join(
      process.cwd(),
      'public',
      'Deepakcofounderfinal.png'
    );

    const svgPath = path.join(
      process.cwd(),
      'public',
      'Deepakcofounderfinal.svg'
    );

    if (fs.existsSync(p1)) {
      res.sendFile(p1);
    } else if (fs.existsSync(pngPath)) {
      res.sendFile(pngPath);
    } else {
      res.setHeader(
        'Content-Type',
        'image/svg+xml'
      );
      res.sendFile(svgPath);
    }
  }
);

app.get(
  [
    '/Divyanshu%20cofounder(1).png',
    '/Divyanshu cofounder(1).png',
    '/Divyanshucofounder(1).png',
    '/Divyanshu%20cofounder.png',
    '/Divyanshu cofounder.png',
    '/Divyanshucofounder.png',
    '/Divyanshucofounder.svg',
    '/assets/divyanshu.png',
    '/assets/divyanshu.svg',
  ],
  (req, res) => {
    const p1 = path.join(
      process.cwd(),
      'public',
      'Divyanshucofounder(1).png'
    );

    const pngPath = path.join(
      process.cwd(),
      'public',
      'Divyanshucofounder.png'
    );

    const svgPath = path.join(
      process.cwd(),
      'public',
      'Divyanshucofounder.svg'
    );

    if (fs.existsSync(p1)) {
      res.sendFile(p1);
    } else if (fs.existsSync(pngPath)) {
      res.sendFile(pngPath);
    } else {
      res.setHeader(
        'Content-Type',
        'image/svg+xml'
      );
      res.sendFile(svgPath);
    }
  }
);

// Serve public directory
// (Not content-hashed, so browsers may reuse these for an hour, then revalidate.)
app.use(
  express.static(
    path.join(process.cwd(), 'public'),
    { index: false, maxAge: '1h' }
  )
);

// =====================================================
// SITE SETTINGS / CONTENT MANAGEMENT (CMS)
// =====================================================
// Public GET routes are open (needed to render the public site); every
// write and every "including hidden records" read goes through the same
// requireAdminAuth middleware used by the leads admin routes.

const mentorCrudOptions = {
  afterCreate: async (item: any, req: Request) => {
    if (item.email) {
      console.log(`[MentorCrud] Sending portal invite on create for ${item.name} (${item.email})`);
      await sendMentorInviteInternal({
        name: item.name,
        email: item.email,
        req,
      });
    }
  },
  afterUpdate: async (item: any, req: Request) => {
    if (item.email) {
      const existing = await Candidate.findOne({ email: item.email.toLowerCase() });
      if (!existing || !existing.hasPassword) {
        console.log(`[MentorCrud] Sending portal invite on update for ${item.name} (${item.email})`);
        await sendMentorInviteInternal({
          name: item.name,
          email: item.email,
          req,
        });
      }
    }
  },
  transformAdminItems: async (items: any[]) => {
    const emails = items.map((i: any) => (i.email || '').toLowerCase()).filter(Boolean);

    const candidates = emails.length
      ? await Candidate.find({ email: { $in: emails }, accountType: 'mentor' })
        .select('email hasPassword')
        .lean()
      : [];

    const candidateMap = new Map<string, { activated: boolean }>();
    for (const c of candidates) {
      candidateMap.set(c.email.toLowerCase(), { activated: c.hasPassword === true });
    }

    return items.map((rawDoc: any) => {
      const doc = typeof rawDoc?.toObject === 'function' ? rawDoc.toObject() : { ...rawDoc };
      const email = (doc.email || '').toLowerCase();
      if (!email) {
        doc.portalStatus = { state: 'none', label: 'No email' };
      } else {
        const c = candidateMap.get(email);
        if (c) {
          doc.portalStatus = {
            state: c.activated ? 'active' : 'pending',
            label: c.activated ? 'Active' : 'Pending Invite',
          };
        } else {
          doc.portalStatus = { state: 'uninvited', label: 'Not Invited' };
        }
      }
      return doc;
    });
  },
};

app.use('/api/site-settings', siteSettingsRouter);
app.use('/api/people', createCrudRouter(Person));
app.use('/api/mentors', createCrudRouter(Mentor, mentorCrudOptions));
app.use('/api/programmes', createCrudRouter(Programme));
app.use('/api/webinars', createCrudRouter(Webinar));
app.use('/api/testimonials', createCrudRouter(Testimonial));
app.use('/api/services', createCrudRouter(Service));
app.use('/api/plans', createCrudRouter(Plan));
app.use('/api/resources', createCrudRouter(Resource));
app.use('/api/payments', paymentsRouter);
app.use('/api/media', mediaRouter);
// Candidate Area records (notifications, materials, sessions, invoices). Mounted before the
// general candidate router; the admin side lives under /api/admin and is admin-only.
app.use('/api/candidate/items', candidateItemsRouter);
app.use('/api/admin/candidate-items', adminCandidateItemsRouter);
// Admin payment granting (mark-as-paid / manual grants for out-of-band payments). Admin-only.
app.use('/api/admin/payments', adminPaymentsRouter);
app.get('/api/admin/candidates', requireAdminAuth, listAdminCandidates);
app.get('/api/admin/candidates/:id', requireAdminAuth, getAdminCandidate);
app.get('/api/admin/me', requireAdminAuth, (req: Request, res: Response) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = readAdminSession(token);
  res.json({
    success: true,
    name: session?.name || 'Owner',
    source: session?.source || 'owner',
  });
});
app.get('/api/admin/notifications/stream', streamAdminNotifications);
app.get('/api/admin/notifications', requireAdminAuth, listAdminNotifications);
app.get('/api/admin/logs', requireAdminAuth, listAdminLogs);
app.get('/api/admin/mail/status', requireAdminAuth, getMailStatus);
app.get('/api/admin/mail/inbox', requireAdminAuth, listMailInbox);
app.get('/api/admin/mail/inbox/:uid', requireAdminAuth, getMailInboxMessage);
app.get('/api/admin/mail/sent', requireAdminAuth, listSentMail);
app.get('/api/admin/mail/recipients', requireAdminAuth, listMailRecipients);
app.post('/api/admin/mail/send', requireAdminAuth, sendAdminMail);
app.post('/api/admin/mail/bulk', requireAdminAuth, sendBulkMail);
app.post('/api/analytics/pageview', analyticsLimiter.middleware, recordPageView);
app.get('/api/admin/analytics', requireAdminAuth, getAnalyticsReport);
app.get('/api/admin/team', requireAdminAuth, listAdminTeam);
app.post('/api/admin/team', requireAdminAuth, createAdminTeamUser);
app.put('/api/admin/team/:id', requireAdminAuth, updateAdminTeamUser);
app.delete('/api/admin/team/:id', requireAdminAuth, deleteAdminTeamUser);
app.get('/api/admin/mentor-accounts', requireAdminAuth, listMentorAccounts);
app.post('/api/admin/mentor-accounts/invite', requireAdminAuth, inviteMentor);
app.use('/api/candidate', candidateRouter);
app.use('/api/auth', oauthRouter);

// =====================================================
// CB AI ASSISTANT (NVIDIA) - implementation lives in server/ai/assistant.ts
// =====================================================
app.post('/api/ai', aiBurstLimiter.middleware, aiDailyLimiter.middleware, aiChatHandler);

// ----------------- VITE MIDDLEWARE & SERVER START -----------------

// Any error raised on an API route becomes a structured JSON response (no HTML page,
// no stack trace, no internal paths). Body-parser problems are client errors (400/413);
// everything else is a generic 500.
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  if (!req.path.startsWith('/api') || res.headersSent) return next(err);
  const tooLarge = err?.type === 'entity.too.large' || err?.status === 413;
  const clientError = err?.type === 'entity.parse.failed' || err?.status === 400 || tooLarge;
  if (!clientError) console.error('[API] Unhandled error:', err?.name || 'Error');
  res.status(tooLarge ? 413 : clientError ? 400 : 500).json({
    success: false,
    error: tooLarge ? 'Request is too large.' : clientError ? 'Invalid request.' : 'Something went wrong. Please try again.',
  });
});

// Unknown API paths get a JSON 404 (not the SPA page). Registered after every real route.
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found.' });
});

async function startServer() {
  await connectDatabase();

  const isDev =
    process.env.NODE_ENV !== 'production';

  const httpServer =
    http.createServer(app);

  if (isDev) {
    const isHmrDisabled =
      process.env.DISABLE_HMR === 'true';

    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
          hmr: isHmrDisabled
            ? false
            : {
              server: httpServer,
            },
          watch: isHmrDisabled
            ? null
            : {},
        },
        appType: 'spa',
      });

    app.use(vite.middlewares);
  } else {
    // Only the client build is public. The server bundle (dist/server.cjs) and its
    // source map live next to it in dist/ and must never be served.
    const distPath = path.join(
      process.cwd(),
      'dist',
      'client'
    );

    // robots.txt / sitemap.xml are generated (never the SPA shell). The absolute URLs in
    // them - and the canonical / social tags in the HTML - come ONLY from the configured
    // public base URL, never from request headers. Without it they are simply omitted.
    app.get('/robots.txt', (req, res) => {
      const base = getPublicBaseUrl();
      const lines = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        'Disallow: /reset-password',
      ];
      if (base) lines.push('', `Sitemap: ${base}/sitemap.xml`);
      res.setHeader('Cache-Control', 'no-cache');
      res.type('text/plain').send(lines.join('\n') + '\n');
    });

    // Sitemap listing all public addressable pages
    app.get('/sitemap.xml', (req, res) => {
      const base = getPublicBaseUrl();
      if (!base) {
        res.status(404).type('text/plain').send('Sitemap unavailable.\n');
        return;
      }
      const publicRoutes = [
        '',
        '/services',
        '/programmes',
        '/career-check-in',
        '/how-it-works',
        '/webinars',
        '/mentors',
        '/leadership',
        '/leadership/nishant-sharma',
        '/leadership/divyanshu-verma',
        '/leadership/deepak-singh',
        '/success-stories',
        '/plans',
        '/resources',
        '/about-us',
        '/contact',
        '/counselling',
        '/privacy',
        '/terms',
        '/refund',
      ];
      const urls = publicRoutes
        .map((r) => `  <url><loc>${base}${r}</loc></url>`)
        .join('\n');
      res
        .set('Cache-Control', 'no-cache')
        .type('application/xml')
        .send(
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          urls + '\n' +
          '</urlset>\n'
        );
    });

    const indexTemplate = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    const renderIndex = (reqPath: string = '/') => {
      const base = getPublicBaseUrl();
      const canonicalPath = reqPath === '/' ? '' : reqPath.replace(/\/+$/, '');
      const tags = base
        ? [
          `<link rel="canonical" href="${base}${canonicalPath}" />`,
          `<meta property="og:url" content="${base}${canonicalPath}" />`,
          `<meta property="og:image" content="${base}/logo.png" />`,
          `<meta name="twitter:image" content="${base}/logo.png" />`,
        ].join('\n    ')
        : '';
      return indexTemplate.replace('<!--SEO_BASE-->', tags);
    };

    // Vite output names files by content hash (assets/name-XXXXXXXX.ext), so those can be cached
    // for a year and never change under the same URL. Everything else in the folder (logo,
    // photos from /public) is revalidated after an hour. The HTML shell is served separately
    // below and is never cached, so a new deploy is picked up immediately.
    const HASHED_ASSET = /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$/;
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          const normalised = filePath.split(path.sep).join('/');
          res.setHeader(
            'Cache-Control',
            HASHED_ASSET.test(normalised) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'
          );
        },
      })
    );

    const PRIVATE_PATHS = /^\/(admin|dashboard|leads-dashboard|mentor|mentor-portal|reset-password)(\/|$)/;
    app.get('*', (req, res) => {
      // A missing file (image, script, source map...) is a real 404, not the app shell.
      if (/\.[A-Za-z0-9]{1,8}$/.test(req.path)) {
        res.status(404).type('text/plain').send('Not found.');
        return;
      }
      // Private areas and reset links should not be indexed by search engines.
      if (PRIVATE_PATHS.test(req.path)) {
        res.setHeader('X-Robots-Tag', 'noindex');
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.type('html').send(renderIndex(req.path));
    });
  }

  httpServer.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `CareerBuddies Full-Stack Server running on http://0.0.0.0:${PORT}`
      );
    }
  );
}

startServer().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exitCode = 1;
});
