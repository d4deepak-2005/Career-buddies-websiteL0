import mongoose from 'mongoose';

const outboundMailSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    audience: { type: String, enum: ['one', 'leads', 'users', 'custom'], default: 'one' },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    error: { type: String, default: '' },
    actorName: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

outboundMailSchema.index({ createdAt: -1 });

export const OutboundMail: mongoose.Model<any> =
  mongoose.models.OutboundMail || mongoose.model('OutboundMail', outboundMailSchema);
