import express, { Request, Response } from 'express';
import { SiteSettings } from '../models/SiteSettings.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';

// Site Settings is a singleton — one document holds every "one value at a
// time" section (General/Header/Home/About/Footer/Contact/SEO). Unlike the
// repeatable collections (mentors, programmes, ...), it has no list/id routes.
const router = express.Router();

async function getOrCreateSettings() {
  let doc = await SiteSettings.findOne();

  if (!doc) {
    doc = await SiteSettings.create({});
  }

  return doc;
}

// Public — read-only. Schema carries no secrets, so the whole document is safe to return.
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site settings.',
    });
  }
});

// Admin-only — partial or full update of the singleton document.
router.put('/', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const settings = await SiteSettings.findOneAndUpdate(
      {},
      { $set: req.body },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating site settings:', error);
    res.status(400).json({
      success: false,
      error: 'Unable to update site settings.',
    });
  }
});

export default router;
