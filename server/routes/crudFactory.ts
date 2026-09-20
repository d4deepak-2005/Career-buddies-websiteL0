import express, { Router } from 'express';
import { Model } from 'mongoose';
import { requireAdminAuth } from '../middleware/adminAuth.ts';

// One reusable router per repeatable content collection (mentors, programmes,
// webinars, testimonials, services, plans, people) instead of hand-writing
// near-identical CRUD routes for each. Mounted at e.g. app.use('/api/mentors', ...):
//   GET    /api/mentors          public, visible-only, sorted by displayOrder
//   GET    /api/mentors/admin    admin-only, all records including hidden
//   POST   /api/mentors/admin    admin-only, create
//   PUT    /api/mentors/admin/:id admin-only, update
//   DELETE /api/mentors/admin/:id admin-only, delete
// Public responses never carry internal payment-provider identifiers. The frontend only
// needs to know whether online payment is enabled for an item, so the provider product
// id is replaced by a boolean. (Admin endpoints keep the raw field for editing.)
function toPublic(doc: any) {
  const obj = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc };
  if ('dodoProductId' in obj) {
    obj.onlinePayment = !!obj.dodoProductId;
    delete obj.dodoProductId;
  }
  return obj;
}

export function createCrudRouter(model: Model<any>): Router {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const items = await model
        .find({ visible: { $ne: false } })
        .sort({ displayOrder: 1, createdAt: 1 });
      res.json({ success: true, items: items.map(toPublic) });
    } catch (error) {
      console.error(`Error fetching ${model.modelName} records:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch records.',
      });
    }
  });

  router.get('/admin', requireAdminAuth, async (req, res) => {
    try {
      const items = await model
        .find()
        .sort({ displayOrder: 1, createdAt: 1 });
      res.json({ success: true, items });
    } catch (error) {
      console.error(`Error fetching ${model.modelName} records:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch records.',
      });
    }
  });

  router.post('/admin', requireAdminAuth, async (req, res) => {
    try {
      const item = await model.create(req.body);
      res.status(201).json({ success: true, item });
    } catch (error) {
      console.error(`Error creating ${model.modelName} record:`, error);
      res.status(400).json({
        success: false,
        error: 'Unable to create record.',
      });
    }
  });

  router.put('/admin/:id', requireAdminAuth, async (req, res) => {
    try {
      const item = await model.findByIdAndUpdate(req.params.id, req.body, {
        returnDocument: 'after',
        runValidators: true,
      });

      if (!item) {
        res.status(404).json({
          success: false,
          error: 'Record not found.',
        });
        return;
      }

      res.json({ success: true, item });
    } catch (error) {
      console.error(`Error updating ${model.modelName} record:`, error);
      res.status(400).json({
        success: false,
        error: 'Unable to update record.',
      });
    }
  });

  router.delete('/admin/:id', requireAdminAuth, async (req, res) => {
    try {
      const item = await model.findByIdAndDelete(req.params.id);

      if (!item) {
        res.status(404).json({
          success: false,
          error: 'Record not found.',
        });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting ${model.modelName} record:`, error);
      res.status(400).json({
        success: false,
        error: 'Unable to delete record.',
      });
    }
  });

  return router;
}
