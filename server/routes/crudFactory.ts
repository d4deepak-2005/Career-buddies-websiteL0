import express, { Router } from 'express';
import { Model } from 'mongoose';
import { requireAdminAuth } from '../middleware/adminAuth.ts';
import { actorFromReq, itemLabel, recordAdminAudit, safeDetails } from '../services/adminAudit.ts';

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
function cmsHasPrice(obj: any): boolean {
  const raw = obj.feeINR ?? obj.priceINR;
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) && value > 0;
}

function toPublic(doc: any) {
  const obj = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc };
  if ('dodoProductId' in obj || 'priceINR' in obj || 'feeINR' in obj) {
    obj.onlinePayment = cmsHasPrice(obj);
    delete obj.dodoProductId;
  }
  // Strip private mentor/admin emails from public client payload
  delete obj.email;
  return obj;
}

export interface CrudOptions {
  afterCreate?: (item: any, req: express.Request) => Promise<void> | void;
  afterUpdate?: (item: any, req: express.Request) => Promise<void> | void;
  transformAdminItems?: (items: any[]) => Promise<any[]> | any[];
}

export function createCrudRouter(model: Model<any>, options?: CrudOptions): Router {
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
      const finalItems = options?.transformAdminItems
        ? await options.transformAdminItems(items)
        : items;
      res.json({ success: true, items: finalItems });
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
      const createData = { ...req.body };
      delete createData._id;
      delete createData.portalStatus;
      const item = await model.create(createData);
      const who = actorFromReq(req).name;
      recordAdminAudit(req, {
        action: 'create',
        entity: model.modelName,
        entityId: String(item._id),
        summary: `${who} created ${model.modelName} "${itemLabel(item, model.modelName)}"`,
        details: safeDetails(req.body),
      });

      if (options?.afterCreate) {
        try {
          await options.afterCreate(item, req);
        } catch (hookErr) {
          console.error(`[crudFactory] afterCreate hook error for ${model.modelName}:`, hookErr);
        }
      }

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
      const updateData = { ...req.body };
      delete updateData._id;
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.__v;
      delete updateData.portalStatus;

      const item = await model.findByIdAndUpdate(req.params.id, updateData, {
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

      const who = actorFromReq(req).name;
      recordAdminAudit(req, {
        action: 'update',
        entity: model.modelName,
        entityId: String(item._id),
        summary: `${who} updated ${model.modelName} "${itemLabel(item, model.modelName)}"`,
        details: safeDetails(req.body),
      });

      if (options?.afterUpdate) {
        try {
          await options.afterUpdate(item, req);
        } catch (hookErr) {
          console.error(`[crudFactory] afterUpdate hook error for ${model.modelName}:`, hookErr);
        }
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

      const who = actorFromReq(req).name;
      recordAdminAudit(req, {
        action: 'delete',
        entity: model.modelName,
        entityId: String(item._id),
        summary: `${who} deleted ${model.modelName} "${itemLabel(item, model.modelName)}"`,
      });
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
