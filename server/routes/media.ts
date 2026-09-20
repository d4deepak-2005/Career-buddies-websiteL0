import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { MediaAsset } from '../models/MediaAsset.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';

// Image upload / serving for the CMS.
//   POST   /api/media        admin-only, raw image body (Content-Type: image/*)
//   GET    /api/media/:id    public, immutable-cached image bytes
//   DELETE /api/media/:id    admin-only
const router = express.Router();

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB in
const MAX_DIMENSION = 1800; // px — larger images are downscaled
const ALLOWED = new Set(['jpeg', 'png', 'webp']); // no SVG/GIF: SVG can carry scripts

router.post(
  '/',
  requireAdminAuth,
  express.raw({ type: 'image/*', limit: MAX_UPLOAD_BYTES }),
  async (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ success: false, error: 'No image received.' });
        return;
      }

      // Trust the file's real bytes, not the declared type.
      const meta = await sharp(body).metadata();

      if (!meta.format || !ALLOWED.has(meta.format)) {
        res.status(415).json({
          success: false,
          error: 'Unsupported image type. Please upload a JPG, PNG or WebP image.',
        });
        return;
      }

      // Fix phone-camera rotation and cap the size; keep the original format
      // (so transparent PNG logos stay transparent).
      let pipeline = sharp(body).rotate().resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });

      if (meta.format === 'jpeg') pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
      else if (meta.format === 'png') pipeline = pipeline.png({ compressionLevel: 9 });
      else pipeline = pipeline.webp({ quality: 90 });

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

      const asset = await MediaAsset.create({
        data,
        contentType: `image/${info.format}`,
        size: data.length,
        width: info.width,
        height: info.height,
        originalName: decodeURIComponent(String(req.headers['x-file-name'] || '')).slice(0, 200),
      });

      res.status(201).json({
        success: true,
        id: asset._id.toString(),
        url: `/api/media/${asset._id.toString()}`,
        width: info.width,
        height: info.height,
        size: data.length,
      });
    } catch (error: any) {
      if (error?.type === 'entity.too.large') {
        res.status(413).json({ success: false, error: 'Image is too large (max 8 MB).' });
        return;
      }
      console.error('[Media] Upload failed:', error?.message || error);
      res.status(400).json({ success: false, error: 'Could not process that image.' });
    }
  }
);

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(404).end();
    return;
  }

  const asset = await MediaAsset.findById(id);

  if (!asset) {
    res.status(404).end();
    return;
  }

  // Each upload has a unique id, so the bytes at a URL never change.
  res.setHeader('Content-Type', asset.contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Content-Length', String(asset.data.length));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(asset.data);
});

router.delete('/:id', requireAdminAuth, async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, error: 'Invalid id.' });
    return;
  }
  await MediaAsset.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
