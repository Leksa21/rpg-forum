const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      minlength: [10, 'Content must be at least 10 characters'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author'],
    },
    character: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
      default: null,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['General', 'Quests', 'Lore', 'Characters', 'Trading', 'Announcements'],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 30,
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    subLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubLocation',
      default: null,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ character: 1 });

postSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
  count: true,
});

module.exports = mongoose.model('Post', postSchema);
