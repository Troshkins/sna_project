const mongoose = require('mongoose');

const normalizeRoomName = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50,
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    select: false,
    default: function getDefaultNormalizedName() {
      return normalizeRoomName(this.name);
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

roomSchema.pre('validate', function setNormalizedName() {
  if (this.isNew || this.isModified('name')) {
    this.normalizedName = normalizeRoomName(this.name);
  }
});

module.exports = mongoose.model('Room', roomSchema);
