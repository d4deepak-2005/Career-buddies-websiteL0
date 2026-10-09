import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, default: '' },
    summary: { type: String, default: '' },
    content: { type: String, default: '' },
    readTime: { type: String, default: '' },
    publishedDate: { type: String, default: '' },
    tags: { type: [String], default: [] },
    author: { type: String, default: '' },
    authorRole: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Resource: mongoose.Model<any> =
  mongoose.models.Resource || mongoose.model('Resource', resourceSchema);
