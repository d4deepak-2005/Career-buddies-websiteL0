import mongoose from 'mongoose';

// Admin-uploaded images. Bytes live in MongoDB (persistent across restarts,
// redeploys and hosts — no local disk, no third-party storage credentials).
// Content records store only the reference `/api/media/<id>`.
const mediaAssetSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    originalName: { type: String, default: '' },
  },
  { timestamps: true }
);

export const MediaAsset: mongoose.Model<any> =
  mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema);
