import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    wpId: { type: Number, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    excerpt: { type: String, default: '' },
    content: { type: String, default: '' },
    status: { type: String, enum: ['publish', 'draft', 'private', 'trash'], default: 'publish', index: true },
    publishedAt: { type: Date },
    modifiedAt: { type: Date },
    featuredImage: {
      wpId: Number,
      url: String,
      alt: { type: String, default: '' },
      caption: { type: String, default: '' },
    },
    seo: {
      title: String,
      description: String,
      canonicalUrl: String,
    },
    originalUrl: { type: String, required: true },
    canonicalUrl: { type: String, default: '' },
    migration: {
      importedAt: Date,
      lastSyncedAt: Date,
      source: { type: String, default: 'wordpress' },
    },
  },
  { timestamps: true }
);

export const Page = mongoose.model('Page', pageSchema);
