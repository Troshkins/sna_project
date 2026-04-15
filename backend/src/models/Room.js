const mongoose = require('mongoose');

const normalizeRoomName = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizeRoomType = (value) =>
  value === 'direct' ? 'direct' : 'group';

const toMemberKey = (member) =>
  String(member?._id || member || '');

const buildDirectKey = (members) =>
  members
    .map(toMemberKey)
    .filter(Boolean)
    .sort()
    .join(':');

const roomSchema = new mongoose.Schema({
  roomType: {
    type: String,
    enum: ['group', 'direct'],
    required: true,
    default: 'group',
  },
  name: {
    type: String,
    required: function isGroupRoomNameRequired() {
      return normalizeRoomType(this.roomType) === 'group';
    },
    trim: true,
    minlength: 1,
    maxlength: 50,
  },
  normalizedName: {
    type: String,
    required: function isGroupNormalizedNameRequired() {
      return normalizeRoomType(this.roomType) === 'group';
    },
    trim: true,
    select: false,
    default: function getDefaultNormalizedName() {
      return normalizeRoomType(this.roomType) === 'group'
        ? normalizeRoomName(this.name)
        : undefined;
    },
  },
  directKey: {
    type: String,
    trim: true,
    select: false,
    default: function getDefaultDirectKey() {
      return normalizeRoomType(this.roomType) === 'direct'
        ? buildDirectKey(this.members || [])
        : undefined;
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

roomSchema.pre('validate', function syncRoomFields() {
  this.roomType = normalizeRoomType(this.roomType);

  if (this.roomType === 'group') {
    this.normalizedName = normalizeRoomName(this.name);
    this.directKey = undefined;
    return;
  }

  const memberIds = (this.members || []).map(toMemberKey).filter(Boolean);
  const uniqueMemberIds = new Set(memberIds);

  if (memberIds.length !== 2 || uniqueMemberIds.size !== 2) {
    this.invalidate(
      'members',
      'Direct rooms must have exactly 2 distinct members'
    );
  }

  this.normalizedName = undefined;
  this.directKey = buildDirectKey(this.members || []);
});

roomSchema.index(
  { normalizedName: 1 },
  {
    unique: true,
    partialFilterExpression: { roomType: 'group' },
  }
);

roomSchema.index(
  { directKey: 1 },
  {
    unique: true,
    partialFilterExpression: { roomType: 'direct' },
  }
);

module.exports = mongoose.model('Room', roomSchema);
