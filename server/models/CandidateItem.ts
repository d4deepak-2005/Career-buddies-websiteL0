import mongoose from 'mongoose';

// Admin-managed records that show up in a candidate's own Candidate Area:
//   notification | material (learning material) | session (master session) | invoice
// `candidateId` is the owner. It is null only for notifications / materials that the admin
// deliberately sends to every candidate; sessions and invoices always belong to one candidate.
// Nothing here is generated automatically - every field is entered by an admin.
export const ITEM_KINDS = ['notification', 'material', 'session', 'invoice'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

const candidateItemSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ITEM_KINDS, required: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    // material: link to the file/page - session: meeting link entered by the admin - invoice: link to the document
    url: { type: String, default: '', maxlength: 1000 },
    category: { type: String, default: '', maxlength: 100 }, // material

    // session
    startsAt: { type: Date },
    durationMinutes: { type: Number, min: 0, max: 1440 },
    advisorName: { type: String, default: '', maxlength: 200 },
    advisorRole: { type: String, default: '', maxlength: 200 },
    sessionStatus: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },

    // invoice
    invoiceNo: { type: String, default: '', maxlength: 60 },
    amount: { type: Number, min: 0 }, // major currency units (e.g. rupees) exactly as typed by the admin
    currency: { type: String, default: 'INR', maxlength: 8 },
    issuedAt: { type: Date },
    paymentOrderRef: { type: String, default: '', maxlength: 60 }, // optional: one of this candidate's own payments

    // Candidates who have opened / dismissed it (works for both targeted and "all candidates" items).
    readBy: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

candidateItemSchema.index({ kind: 1, candidateId: 1, createdAt: -1 });

export const CandidateItem: mongoose.Model<any> =
  (mongoose.models.CandidateItem as mongoose.Model<any>) || mongoose.model('CandidateItem', candidateItemSchema);
