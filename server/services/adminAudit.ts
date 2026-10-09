import { Request } from 'express';
import { AdminLog } from '../models/AdminLog.ts';
import type { AdminActor } from '../middleware/adminAuth.ts';

const SECRET = /password|token|secret|hash|authorization|cookie/i;

export function actorFromReq(req?: Request | null, fallback?: AdminActor): AdminActor {
  const fromReq = req ? (req as any).adminActor as AdminActor | undefined : undefined;
  return fromReq || fallback || { name: 'Owner', source: 'owner' };
}

export function itemLabel(doc: any, fallback = 'item') {
  const raw = doc?.title || doc?.name || doc?.heading || doc?.label || doc?.email || fallback;
  return String(raw || fallback).trim().slice(0, 120) || fallback;
}

export function safeDetails(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SECRET.test(key)) {
      out[key] = value ? 'changed' : undefined;
      continue;
    }
    if (value == null || value === '') continue;
    if (typeof value === 'string') out[key] = value.slice(0, 200);
    else if (typeof value === 'number' || typeof value === 'boolean') out[key] = value;
    else if (Array.isArray(value)) out[key] = `${value.length} items`;
    else out[key] = 'updated';
  }
  return Object.keys(out).length ? out : undefined;
}

export function recordAdminAudit(
  req: Request | null | undefined,
  entry: {
    action: 'create' | 'update' | 'delete' | 'login' | 'status';
    entity: string;
    entityId?: string;
    summary: string;
    details?: Record<string, unknown>;
    actor?: AdminActor;
  }
) {
  const actor = actorFromReq(req, entry.actor);
  void AdminLog.create({
    actorName: String(actor.name || 'Owner').slice(0, 80),
    actorSource: actor.source === 'team' ? 'team' : 'owner',
    action: entry.action,
    entity: String(entry.entity || 'admin').slice(0, 60),
    entityId: String(entry.entityId || '').slice(0, 80),
    summary: String(entry.summary || '').slice(0, 400),
    details: entry.details,
  }).catch((error) => {
    console.warn('[Audit] Could not store admin log:', (error as Error)?.message);
  });
}
