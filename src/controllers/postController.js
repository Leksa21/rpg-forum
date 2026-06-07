const Post = require('../models/Post');
const Comment = require('../models/Comment');

const getPosts = async (req, res) => {
  try {
    const { category, location, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (location) filter.location = location;
    const skip = (Number(page) - 1) * Number(limit);

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

    const Character = require('../models/Character');
    const character = await Character.findOne({ owner: req.userId, isSetup: true, isDead: false });
    if (!character) {
      return res.status(400).json({ success: false, error: 'You need an active character to post' });
    }

    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags || [],
      author: req.userId,
      character: character._id,
      subLocation: subLocation || null,
      location: location || null,
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

    const Character = require('../models/Character');
    const character = await Character.findOne({ owner: req.userId, isSetup: true, isDead: false });
    if (!character) {
      return res.status(400).json({ success: false, error: 'You need an active character to comment' });
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
