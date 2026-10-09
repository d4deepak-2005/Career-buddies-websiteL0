import { Request, Response } from 'express';
import { AdminLog } from '../models/AdminLog.ts';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listAdminLogs(req: Request, res: Response) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    const entity = typeof req.query.entity === 'string' ? req.query.entity.trim().slice(0, 60) : '';
    const actor = typeof req.query.actor === 'string' ? req.query.actor.trim().slice(0, 80) : '';
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const filter: Record<string, unknown> = {};
    if (entity && entity !== 'all') filter.entity = entity;
    if (actor) filter.actorName = new RegExp(escapeRegex(actor), 'i');
    if (q) {
      filter.$or = [
        { summary: new RegExp(escapeRegex(q), 'i') },
        { actorName: new RegExp(escapeRegex(q), 'i') },
        { entity: new RegExp(escapeRegex(q), 'i') },
      ];
    }

    const items = await AdminLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({
      success: true,
      items: items.map((row) => ({
        id: String(row._id),
        actorName: row.actorName,
        actorSource: row.actorSource,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId || '',
        summary: row.summary,
        details: row.details || null,
        createdAt: row.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ success: false, error: 'Could not load logs.' });
  }
}
