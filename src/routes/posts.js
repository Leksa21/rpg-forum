const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPosts, getPost, createPost, updatePost, deletePost,
  getComments, createComment, deleteComment,
} = require('../controllers/postController');

router.get('/',                          getPosts);
router.post('/',                protect,  createPost);
router.get('/:id',                        getPost);
router.put('/:id',              protect,  updatePost);
router.delete('/:id',           protect,  deletePost);

router.get('/:id/comments',               getComments);
router.post('/:id/comments',    protect,  createComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);

module.exports = router;
