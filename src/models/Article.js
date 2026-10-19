import mongoose from 'mongoose';

const imageRefSchema = new mongoose.Schema(
  {
    wpId: Number,
    url: String,
    alt: { type: String, default: '' },
    caption: { type: String, default: '' },
    credit: { type: String, default: '' },
    width: Number,
    height: Number,
  },
  { _id: false }
);

const articleSchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    wpId: { type: Number, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    excerpt: { type: String, default: '' },
    content: { type: String, required: true },
    status: { type: String, enum: ['publish', 'draft', 'private', 'trash'], default: 'publish', index: true },
    publishedAt: { type: Date, index: true },
    modifiedAt: { type: Date },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    featuredImage: imageRefSchema,
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
      contentHash: String,
    },
  },
  { timestamps: true }
);

articleSchema.index({ title: 'text', excerpt: 'text', content: 'text' });

export const Article = mongoose.model('Article', articleSchema);
