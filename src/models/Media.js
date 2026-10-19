import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    wpId: { type: Number, index: true },
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    caption: { type: String, default: '' },
    credit: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    originalUrl: { type: String, default: '' },
    migration: {
      importedAt: Date,
      lastSyncedAt: Date,
      source: { type: String, default: 'wordpress' },
    },
  },
  { timestamps: true }
);

export const Media = mongoose.model('Media', mediaSchema);
