const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Character = require('../models/Character');
const Location = require('../models/Location');
const { canViewCity, canPostInCity, isStaffRole } = require('../utils/visibility');
const { resolveCurrentCityId } = require('../utils/presence');
const SubLocation = require('../models/SubLocation');

const getPosts = async (req, res) => {
  try {
    const { category, location, subLocation, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (location) filter.location = location;
    if (subLocation) filter.subLocation = subLocation;
    const skip = (Number(page) - 1) * Number(limit);

    // Area-forum reads (scoped to a city or a venue within it) are presence-
    // gated. A venue inherits its city, so resolve the owning city first. Staff
    // skip the lookup. A blocked request gets an empty, flagged result rather
    // than an error so the client can show a "you are not here" state.
    let targetCityId = location || null;
    if (!targetCityId && subLocation) {
      const venue = await SubLocation.findById(subLocation).select('city');
      targetCityId = venue?.city || null;
    }

    if (targetCityId) {
      const currentCityId = isStaffRole(req.userRole)
        ? null
        : await resolveCurrentCityId(req.userId);

      if (!canViewCity({ role: req.userRole, currentCityId, targetCityId })) {
        return res.json({
          success: true,
          data: [],
          meta: { total: 0, page: Number(page), limit: Number(limit) },
          restricted: true,
        });
      }
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('character', 'name avatar class race level')
        .populate('author', 'username')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('commentCount'),
      Post.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: posts,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('character', 'name avatar class race level')
      .populate('author', 'username');

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Presence gate: a location-bound thread is invisible (404, no leak) to
    // anyone not currently in its city. OOC threads (no location) stay open.
    if (post.location && !isStaffRole(req.userRole)) {
      const currentCityId = await resolveCurrentCityId(req.userId);
      if (!canViewCity({ role: req.userRole, currentCityId, targetCityId: post.location })) {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }
    }

    post.views += 1;
    await post.save();

    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createPost = async (req, res) => {
  try {
    const { title, content, category, tags, subLocation, location } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ success: false, error: 'Title, content, and category are required' });
    }

    const character = await Character.findOne({ owner: req.userId, isSetup: true, isDead: false });
    if (!character) {
      return res.status(400).json({ success: false, error: 'You need an active character to post' });
    }

    // Resolve the owning city. A venue (subLocation) carries its city, so a
    // thread opened inside a venue inherits it even if `location` was omitted.
    let targetCityId = location || null;
    if (!targetCityId && subLocation) {
      const venue = await SubLocation.findById(subLocation).select('city');
      targetCityId = venue?.city || null;
    }

    // Presence gate: location-bound threads can only be opened in the city you
    // are in (staff may open them anywhere, e.g. mod-seeded threads).
    if (targetCityId) {
      const currentCityId = character.currentLocation
        || (await Location.findOne({ isStartingLocation: true }).select('_id'))?._id;
      if (!canPostInCity({ role: req.userRole, currentCityId, targetCityId })) {
        return res.status(403).json({
          success: false,
          error: 'You must be in this location to post here',
        });
      }
    }

    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags || [],
      author: req.userId,
      character: character._id,
      subLocation: subLocation || null,
      location: targetCityId,
    });

    const populated = await post.populate([
      { path: 'character', select: 'name avatar class race level' },
      { path: 'author', select: 'username' },
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    if (post.author.toString() !== req.userId && req.userRole !== 'admin' && req.userRole !== 'head_admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { title, content, tags, isPinned, isLocked } = req.body;
    if (title) post.title = title.trim();
    if (content) post.content = content.trim();
    if (tags) post.tags = tags;

    if ((req.userRole === 'admin' || req.userRole === 'head_admin' || req.userRole === 'moderator')) {
      if (isPinned !== undefined) post.isPinned = isPinned;
      if (isLocked !== undefined) post.isLocked = isLocked;
    }

    await post.save();
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    if (post.author.toString() !== req.userId && req.userRole !== 'admin' && req.userRole !== 'head_admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await Promise.all([
      Post.deleteOne({ _id: post._id }),
      Comment.deleteMany({ post: post._id }),
    ]);

    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getComments = async (req, res) => {
  try {
    // Replies are only readable when their thread's city is visible to you.
    const parent = await Post.findById(req.params.id).select('location');
    if (parent && parent.location && !isStaffRole(req.userRole)) {
      const currentCityId = await resolveCurrentCityId(req.userId);
      if (!canViewCity({ role: req.userRole, currentCityId, targetCityId: parent.location })) {
        return res.json({ success: true, data: [], restricted: true });
      }
    }

    const comments = await Comment.find({ post: req.params.id })
      .populate('character', 'name avatar class race level')
      .populate('author', 'username')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    if (post.isLocked) return res.status(403).json({ success: false, error: 'Post is locked' });

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const character = await Character.findOne({ owner: req.userId, isSetup: true, isDead: false });
    if (!character) {
      return res.status(400).json({ success: false, error: 'You need an active character to comment' });
    }

    // Presence gate: you can only reply in a thread whose city you are in.
    if (post.location && !isStaffRole(req.userRole)) {
      const currentCityId = character.currentLocation
        || (await Location.findOne({ isStartingLocation: true }).select('_id'))?._id;
      if (!canPostInCity({ role: req.userRole, currentCityId, targetCityId: post.location })) {
        return res.status(403).json({
          success: false,
          error: 'You must be in this location to reply here',
        });
      }
    }

    const comment = await Comment.create({
      content: content.trim(),
      author: req.userId,
      character: character._id,
      post: req.params.id,
    });

    const populated = await comment.populate([
      { path: 'character', select: 'name avatar class race level' },
      { path: 'author', select: 'username' },
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });

    if (comment.author.toString() !== req.userId && req.userRole !== 'admin' && req.userRole !== 'head_admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await Comment.deleteOne({ _id: comment._id });
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getPosts, getPost, createPost, updatePost, deletePost, getComments, createComment, deleteComment };
