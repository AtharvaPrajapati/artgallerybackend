import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    wpId: { type: Number, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    originalUrl: { type: String, default: '' },
    migration: {
      importedAt: Date,
      lastSyncedAt: Date,
      source: { type: String, default: 'wordpress' },
    },
  },
  { timestamps: true }
);

export const Author = mongoose.model('Author', authorSchema);
