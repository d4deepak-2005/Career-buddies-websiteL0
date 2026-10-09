import mongoose from 'mongoose';

const dailyPageSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    page: { type: String, required: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: false }
);
dailyPageSchema.index({ day: 1, page: 1 }, { unique: true });

const dailyVisitorSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    hash: { type: String, required: true },
  },
  { timestamps: false }
);
dailyVisitorSchema.index({ day: 1, hash: 1 }, { unique: true });

const dailyReferrerSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    source: { type: String, required: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: false }
);
dailyReferrerSchema.index({ day: 1, source: 1 }, { unique: true });

export const AnalyticsDailyPage =
  mongoose.models.AnalyticsDailyPage || mongoose.model('AnalyticsDailyPage', dailyPageSchema);
export const AnalyticsDailyVisitor =
  mongoose.models.AnalyticsDailyVisitor || mongoose.model('AnalyticsDailyVisitor', dailyVisitorSchema);
export const AnalyticsDailyReferrer =
  mongoose.models.AnalyticsDailyReferrer || mongoose.model('AnalyticsDailyReferrer', dailyReferrerSchema);
