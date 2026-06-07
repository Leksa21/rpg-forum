const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  text:      { type: String, required: true, maxlength: 500 },
  username:  { type: String, required: true },
  character: {
    name:   String,
    avatar: String,
    class:  String,
  },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
