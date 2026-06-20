const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // The recipient.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['reply'], default: 'reply' },
    // Who triggered it (their character, for avatar/name display).
    actorCharacter: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', default: null },
    // The thread this is about.
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    // Snapshot text (e.g. the thread title) so it still reads if the post is gone.
    text: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
