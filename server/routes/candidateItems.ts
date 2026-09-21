import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Candidate } from '../models/Candidate.ts';
import { CandidateItem, ITEM_KINDS, ItemKind } from '../models/CandidateItem.ts';
import { Payment } from '../models/Payment.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';
import { requireCandidateAuth } from '../middleware/candidateAuth.ts';

// ---------------------------------------------------------------------------
// Candidate side: mounted at /api/candidate/items. The owner is ALWAYS the session's
// candidate (requireCandidateAuth); no candidate id is ever read from the request.
// ---------------------------------------------------------------------------
export const candidateItemsRouter = express.Router();

const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

// Items this candidate may see: addressed to them, or (notifications / materials only) to everyone.
const visibleTo = (candidateId: unknown) => ({
  visible: { $ne: false },
  $or: [{ candidateId }, { candidateId: null, kind: { $in: ['notification', 'material'] } }],
});

candidateItemsRouter.get('/', requireCandidateAuth, async (req: Request, res: Response) => {
  try {
    const me = (req as any).candidate;
    const items = await CandidateItem.find(visibleTo(me._id)).sort({ createdAt: -1 }).limit(500).lean();
    const mine = String(me._id);
    const out: Record<string, any[]> = { notifications: [], materials: [], sessions: [], invoices: [] };

    for (const i of items as any[]) {
      const base = { id: String(i._id), title: i.title, description: i.description || '', createdAt: i.createdAt };
      if (i.kind === 'notification') {
        out.notifications.push({ ...base, read: (i.readBy || []).some((r: any) => String(r) === mine) });
      } else if (i.kind === 'material') {
        out.materials.push({ ...base, url: i.url || '', category: i.category || '' });
      } else if (i.kind === 'session') {
        out.sessions.push({
          ...base,
          url: i.url || '',
          startsAt: i.startsAt || null,
          durationMinutes: i.durationMinutes ?? null,
          advisorName: i.advisorName || '',
          advisorRole: i.advisorRole || '',
          status: i.sessionStatus || 'scheduled',
        });
      } else if (i.kind === 'invoice') {
        out.invoices.push({
          ...base,
          url: i.url || '',
          invoiceNo: i.invoiceNo || '',
          amount: typeof i.amount === 'number' ? i.amount : null,
          currency: i.currency || 'INR',
          issuedAt: i.issuedAt || i.createdAt,
        });
      }
    }
    // Sessions read best soonest-first.
    out.sessions.sort((a, b) => new Date(a.startsAt || 0).getTime() - new Date(b.startsAt || 0).getTime());
    res.json({ success: true, ...out });
  } catch (error) {
    console.error('[CandidateItems] list failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Unable to load your records right now.' });
  }
});

candidateItemsRouter.post('/:id/read', requireCandidateAuth, async (req: Request, res: Response) => {
  try {
    const me = (req as any).candidate;
    if (!isId(req.params.id)) return void res.status(404).json({ success: false, error: 'Not found.' });
    // Only notifications this candidate is allowed to see can be marked read.
    const updated = await CandidateItem.updateOne(
      { _id: req.params.id, kind: 'notification', ...visibleTo(me._id) },
      { $addToSet: { readBy: me._id } }
    );
    if (!updated.matchedCount) return void res.status(404).json({ success: false, error: 'Not found.' });
    res.json({ success: true });
  } catch (error) {
    console.error('[CandidateItems] read failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Unable to update this notification.' });
  }
});

// ---------------------------------------------------------------------------
// Admin side: mounted at /api/admin/candidate-items. Every route is admin-only.
// ---------------------------------------------------------------------------
export const adminCandidateItemsRouter = express.Router();
adminCandidateItemsRouter.use(requireAdminAuth);

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

class ValidationError extends Error {}

function cleanUrl(v: unknown): string {
  const s = str(v, 1000);
  if (!s) return '';
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new ValidationError('Links must be full web addresses starting with https://');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new ValidationError('Links must start with https:// or http://');
  return u.toString();
}

function cleanDate(v: unknown, label: string, required = false): Date | undefined {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ValidationError(`${label} is required.`);
    return undefined;
  }
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`${label} is not a valid date.`);
  return d;
}

// Builds the stored document from an admin request: whitelisted fields only.
async function buildItem(kind: ItemKind, body: any) {
  const title = str(body.title, 200);
  if (!title) throw new ValidationError('Title is required.');

  // Owner: one explicit candidate, or "all candidates" (notification / material only).
  let candidateId: mongoose.Types.ObjectId | null = null;
  const wantsAll = body.audience === 'all' || body.candidateId === null || body.candidateId === '' || body.candidateId === undefined;
  if (!wantsAll) {
    if (!isId(body.candidateId)) throw new ValidationError('Choose a valid candidate.');
    if (!(await Candidate.exists({ _id: body.candidateId }))) throw new ValidationError('That candidate does not exist.');
    candidateId = new mongoose.Types.ObjectId(body.candidateId);
  }
  if (!candidateId && (kind === 'session' || kind === 'invoice')) throw new ValidationError('Choose the candidate this belongs to.');

  const doc: any = { kind, candidateId, title, description: str(body.description, 2000), url: cleanUrl(body.url), visible: body.visible !== false };

  if (kind === 'material') {
    doc.category = str(body.category, 100);
    if (!doc.url) throw new ValidationError('A link to the material is required.');
  }
  if (kind === 'session') {
    doc.startsAt = cleanDate(body.startsAt, 'Session date and time', true);
    doc.advisorName = str(body.advisorName, 200);
    doc.advisorRole = str(body.advisorRole, 200);
    const dur = body.durationMinutes === '' || body.durationMinutes == null ? undefined : Number(body.durationMinutes);
    if (dur !== undefined && (!Number.isFinite(dur) || dur < 0 || dur > 1440)) throw new ValidationError('Duration must be between 0 and 1440 minutes.');
    doc.durationMinutes = dur;
    doc.sessionStatus = ['scheduled', 'completed', 'cancelled'].includes(body.sessionStatus) ? body.sessionStatus : 'scheduled';
  }
  if (kind === 'invoice') {
    doc.invoiceNo = str(body.invoiceNo, 60);
    if (!doc.invoiceNo) throw new ValidationError('Invoice number is required.');
    const amt = Number(body.amount);
    if (body.amount === '' || body.amount == null || !Number.isFinite(amt) || amt < 0) throw new ValidationError('Enter the invoice amount.');
    doc.amount = amt;
    doc.currency = (str(body.currency, 8) || 'INR').toUpperCase();
    doc.issuedAt = cleanDate(body.issuedAt, 'Issue date') || new Date();
    const ref = str(body.paymentOrderRef, 60);
    if (ref) {
      const own = await Payment.exists({ orderRef: ref, candidateId });
      if (!own) throw new ValidationError('That payment reference does not belong to this candidate.');
    }
    doc.paymentOrderRef = ref;
  }
  return doc;
}

const kindOf = (v: unknown): ItemKind | null => (ITEM_KINDS as readonly string[]).includes(String(v)) ? (String(v) as ItemKind) : null;

function fail(res: Response, error: unknown, what: string) {
  if (error instanceof ValidationError) return void res.status(400).json({ success: false, error: error.message });
  console.error(`[CandidateItems] ${what} failed:`, (error as any)?.message);
  res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
}

// Candidates the admin can pick from (minimal fields).
adminCandidateItemsRouter.get('/candidates', async (_req: Request, res: Response) => {
  try {
    const list = await Candidate.find({}).select('firstName lastName email').sort({ createdAt: -1 }).limit(1000).lean();
    res.json({
      success: true,
      items: (list as any[]).map((c) => ({ id: String(c._id), name: `${c.firstName || ''} ${c.lastName || ''}`.trim(), email: c.email })),
    });
  } catch (error) {
    fail(res, error, 'candidates');
  }
});

adminCandidateItemsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const q: any = {};
    const kind = kindOf(req.query.kind);
    if (req.query.kind && !kind) return void res.status(400).json({ success: false, error: 'Unknown record type.' });
    if (kind) q.kind = kind;
    if (req.query.candidateId !== undefined && req.query.candidateId !== '') {
      if (!isId(req.query.candidateId)) return void res.status(400).json({ success: false, error: 'Choose a valid candidate.' });
      q.candidateId = req.query.candidateId;
    }
    const items = await CandidateItem.find(q).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ success: true, items: (items as any[]).map((i) => ({ ...i, id: String(i._id), readCount: (i.readBy || []).length, readBy: undefined })) });
  } catch (error) {
    fail(res, error, 'list');
  }
});

adminCandidateItemsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const kind = kindOf(req.body?.kind);
    if (!kind) return void res.status(400).json({ success: false, error: 'Choose a record type.' });
    const created = await CandidateItem.create(await buildItem(kind, req.body));
    res.status(201).json({ success: true, item: { ...created.toObject(), id: String(created._id), readBy: undefined } });
  } catch (error) {
    fail(res, error, 'create');
  }
});

adminCandidateItemsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!isId(req.params.id)) return void res.status(404).json({ success: false, error: 'Not found.' });
    const existing = await CandidateItem.findById(req.params.id);
    if (!existing) return void res.status(404).json({ success: false, error: 'Not found.' });
    // The type never changes; the owner changes only if the admin explicitly picks another one.
    const body = { ...req.body };
    if (body.candidateId === undefined && body.audience === undefined) body.candidateId = existing.candidateId ? String(existing.candidateId) : null;
    const doc = await buildItem(existing.kind, body);
    existing.set(doc);
    await existing.save();
    res.json({ success: true, item: { ...existing.toObject(), id: String(existing._id), readBy: undefined } });
  } catch (error) {
    fail(res, error, 'update');
  }
});

adminCandidateItemsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isId(req.params.id)) return void res.status(404).json({ success: false, error: 'Not found.' });
    const r = await CandidateItem.deleteOne({ _id: req.params.id });
    if (!r.deletedCount) return void res.status(404).json({ success: false, error: 'Not found.' });
    res.json({ success: true });
  } catch (error) {
    fail(res, error, 'delete');
  }
});
