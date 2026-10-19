import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    wpId: { type: Number, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    parentWpId: { type: Number, default: 0 },
    parentSlug: { type: String, default: null },
    count: { type: Number, default: 0 },
    originalUrl: { type: String, default: '' },
    migration: {
      importedAt: Date,
      lastSyncedAt: Date,
      source: { type: String, default: 'wordpress' },
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);
