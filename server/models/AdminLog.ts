import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema(
  {
    actorName: { type: String, required: true, trim: true },
    actorSource: { type: String, enum: ['owner', 'team'], default: 'owner' },
    action: { type: String, required: true, trim: true },
    entity: { type: String, required: true, trim: true },
    entityId: { type: String, default: '' },
    summary: { type: String, required: true, trim: true },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ actorName: 1, createdAt: -1 });
adminLogSchema.index({ entity: 1, createdAt: -1 });

export const AdminLog: mongoose.Model<any> =
  mongoose.models.AdminLog || mongoose.model('AdminLog', adminLogSchema);
