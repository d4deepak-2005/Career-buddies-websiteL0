import { Request, Response } from 'express';
import { AdminUser } from '../models/AdminUser.ts';
import { hashPassword } from '../middleware/candidateAuth.ts';
import { actorFromReq, recordAdminAudit } from '../services/adminAudit.ts';

const MIN_PASSWORD = 8;

function cleanName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function cleanPassword(value: unknown) {
  return String(value || '');
}

export async function listAdminTeam(_req: Request, res: Response) {
  try {
    const rows = await AdminUser.find().sort({ createdAt: 1 }).lean();
    res.json({
      success: true,
      owner: { name: 'Owner', source: 'env' },
      items: rows.map((row) => ({
        id: String(row._id),
        name: row.name,
        createdAt: row.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ success: false, error: 'Could not load team users.' });
  }
}

export async function createAdminTeamUser(req: Request, res: Response) {
  const name = cleanName(req.body?.name);
  const password = cleanPassword(req.body?.password);

  if (!name) {
    res.status(400).json({ success: false, error: 'Name is required.' });
    return;
  }
  if (password.length < MIN_PASSWORD) {
    res.status(400).json({ success: false, error: `Password must be at least ${MIN_PASSWORD} characters.` });
    return;
  }

  const nameKey = name.toLowerCase();
  const exists = await AdminUser.findOne({ nameKey });
  if (exists) {
    res.status(409).json({ success: false, error: 'That name is already used.' });
    return;
  }

  try {
    const created = await AdminUser.create({
      name,
      nameKey,
      passwordHash: hashPassword(password),
    });

    recordAdminAudit(req, {
      action: 'create',
      entity: 'team',
      entityId: String(created._id),
      summary: `${actorFromReq(req).name} created admin user "${created.name}"`,
    });
    res.status(201).json({
      success: true,
      item: { id: String(created._id), name: created.name, createdAt: created.createdAt },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Could not create admin user.' });
  }
}

export async function updateAdminTeamUser(req: Request, res: Response) {
  const id = String(req.params.id || '');
  const existing = await AdminUser.findById(id).select('+passwordHash');
  if (!existing) {
    res.status(404).json({ success: false, error: 'Admin user not found.' });
    return;
  }

  const name = req.body?.name != null ? cleanName(req.body.name) : existing.name;
  const password = req.body?.password != null ? cleanPassword(req.body.password) : '';

  if (!name) {
    res.status(400).json({ success: false, error: 'Name is required.' });
    return;
  }
  if (req.body?.password != null && password.length < MIN_PASSWORD) {
    res.status(400).json({ success: false, error: `Password must be at least ${MIN_PASSWORD} characters.` });
    return;
  }

  const nameKey = name.toLowerCase();
  const clash = await AdminUser.findOne({ nameKey, _id: { $ne: existing._id } });
  if (clash) {
    res.status(409).json({ success: false, error: 'That name is already used.' });
    return;
  }

  existing.name = name;
  existing.nameKey = nameKey;
  if (password) existing.passwordHash = hashPassword(password);
  try {
    await existing.save();
    recordAdminAudit(req, {
      action: 'update',
      entity: 'team',
      entityId: String(existing._id),
      summary: password
        ? `${actorFromReq(req).name} changed password for admin user "${existing.name}"`
        : `${actorFromReq(req).name} updated admin user "${existing.name}"`,
    });
    res.json({
      success: true,
      item: { id: String(existing._id), name: existing.name, createdAt: existing.createdAt },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Could not update admin user.' });
  }
}

export async function deleteAdminTeamUser(req: Request, res: Response) {
  try {
    const id = String(req.params.id || '');
    const existing = await AdminUser.findByIdAndDelete(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Admin user not found.' });
      return;
    }
    recordAdminAudit(req, {
      action: 'delete',
      entity: 'team',
      entityId: id,
      summary: `${actorFromReq(req).name} removed admin user "${existing.name}"`,
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Could not remove admin user.' });
  }
}
