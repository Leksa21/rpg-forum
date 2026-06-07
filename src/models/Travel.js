const mongoose = require('mongoose');

const travelSchema = new mongoose.Schema(
  {
    character:     { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    from:          { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    to:            { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    status: {
      type: String,
      enum: ['traveling', 'arrived', 'intercepted', 'cancelled'],
      default: 'traveling',
    },
    departureTime: { type: Date, default: Date.now },
    arrivalTime:   { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    dangerEncountered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

travelSchema.index({ character: 1, status: 1 });
travelSchema.index({ user: 1 });

module.exports = mongoose.model('Travel', travelSchema);
