import { createHash } from 'crypto';
import { Request, Response } from 'express';
import {
  AnalyticsDailyPage,
  AnalyticsDailyReferrer,
  AnalyticsDailyVisitor,
} from '../models/Analytics.ts';

const PUBLIC_PAGES = new Set([
  'home',
  'about-us',
  'how-it-works',
  'services',
  'programmes',
  'webinars',
  'leadership',
  'leader-profile',
  'success-stories',
  'career-check-in',
  'mentors',
  'features',
  'plans',
  'resources',
  'contact',
  'counselling',
  'privacy',
  'terms',
  'refund',
]);

function istDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dayList(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 86400000);
    out.push(istDay(d));
  }
  return out;
}

function asPage(value: unknown): string | null {
  const page = typeof value === 'string' ? value.trim().slice(0, 40) : '';
  if (page === 'features') return 'mentors';
  return PUBLIC_PAGES.has(page) ? page : null;
}

function visitorHash(vid: unknown): string {
  const raw = typeof vid === 'string' ? vid.trim().slice(0, 80) : '';
  if (!raw) return '';
  return createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

function referrerHost(value: unknown, originHost: string): string {
  const raw = typeof value === 'string' ? value.trim().slice(0, 500) : '';
  if (!raw) return 'direct';
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '');
    if (!host || host === originHost) return 'direct';
    return host.slice(0, 80);
  } catch {
    return 'direct';
  }
}

export async function recordPageView(req: Request, res: Response) {
  const page = asPage(req.body?.page);
  if (!page) {
    res.status(400).json({ success: false, error: 'Unknown page.' });
    return;
  }
  const day = istDay();
  const hash = visitorHash(req.body?.vid);
  const originHost = String(req.headers.host || '').replace(/^www\./, '').split(':')[0];
  const source = referrerHost(req.body?.referrer, originHost);

  try {
    await AnalyticsDailyPage.updateOne({ day, page }, { $inc: { views: 1 } }, { upsert: true });
    if (source !== 'direct') {
      await AnalyticsDailyReferrer.updateOne({ day, source }, { $inc: { views: 1 } }, { upsert: true });
    }
    if (hash) {
      try {
        await AnalyticsDailyVisitor.create({ day, hash });
      } catch {
        /* already counted today */
      }
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Unable to record visit.' });
  }
}

export async function getAnalyticsReport(req: Request, res: Response) {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const range = dayList(days);
  const today = range[range.length - 1];
  const last7 = range.slice(-7);

  const [pages, visitors, referrers] = await Promise.all([
    AnalyticsDailyPage.find({ day: { $in: range } }).lean(),
    AnalyticsDailyVisitor.find({ day: { $in: range } }).select('day').lean(),
    AnalyticsDailyReferrer.find({ day: { $in: range } }).lean(),
  ]);

  const viewsByDay = new Map<string, number>();
  const visitorsByDay = new Map<string, number>();
  const viewsByPage = new Map<string, number>();
  const viewsBySource = new Map<string, number>();
  for (const day of range) {
    viewsByDay.set(day, 0);
    visitorsByDay.set(day, 0);
  }
  for (const row of pages) {
    viewsByDay.set(row.day, (viewsByDay.get(row.day) || 0) + (row.views || 0));
    viewsByPage.set(row.page, (viewsByPage.get(row.page) || 0) + (row.views || 0));
  }
  for (const row of visitors) {
    visitorsByDay.set(row.day, (visitorsByDay.get(row.day) || 0) + 1);
  }
  for (const row of referrers) {
    viewsBySource.set(row.source, (viewsBySource.get(row.source) || 0) + (row.views || 0));
  }

  const sumDays = (keys: string[], map: Map<string, number>) =>
    keys.reduce((total, key) => total + (map.get(key) || 0), 0);

  res.json({
    success: true,
    report: {
      today: {
        views: viewsByDay.get(today) || 0,
        visitors: visitorsByDay.get(today) || 0,
      },
      last7: {
        views: sumDays(last7, viewsByDay),
        visitors: sumDays(last7, visitorsByDay),
      },
      last30: {
        views: sumDays(range, viewsByDay),
        visitors: sumDays(range, visitorsByDay),
      },
      series: range.map((day) => ({
        day,
        views: viewsByDay.get(day) || 0,
        visitors: visitorsByDay.get(day) || 0,
      })),
      topPages: [...viewsByPage.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([page, views]) => ({ page, views })),
      topSources: [...viewsBySource.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([source, views]) => ({ source, views })),
    },
  });
}
