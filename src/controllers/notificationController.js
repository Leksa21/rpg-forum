const Notification = require('../models/Notification');
const Comment = require('../models/Comment');

// Create reply notifications for everyone involved in a thread except the
// person who just replied: the thread author plus anyone who has replied before.
// "News travels" — recipients are notified regardless of where they are; reading
// the thread itself stays presence-gated.
async function notifyThreadReply(post, actorCharacterId, actorUserId) {
  try {
    const commenterIds = await Comment.find({ post: post._id }).distinct('author');
    const recipients = new Set([post.author.toString(), ...commenterIds.map(String)]);
    recipients.delete(actorUserId.toString());
    if (recipients.size === 0) return;

    await Notification.insertMany(
      [...recipients].map(uid => ({
        user: uid,
        type: 'reply',
        actorCharacter: actorCharacterId,
        post: post._id,
        text: post.title,
      }))
    );
  } catch {
    // A failed notification must never break the reply itself.
  }
}

const listNotifications = async (req, res) => {
  try {
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.userId })
        .populate('actorCharacter', 'name avatar class')
        .sort({ createdAt: -1 })
        .limit(30),
      Notification.countDocuments({ user: req.userId, isRead: false }),
    ]);
    res.json({ success: true, data: items, meta: { unread } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.userId, isRead: false }, { isRead: true });
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const markRead = async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id, user: req.userId }, { isRead: true });
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { notifyThreadReply, listNotifications, markAllRead, markRead };
