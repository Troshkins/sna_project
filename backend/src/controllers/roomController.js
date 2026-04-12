const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const {
  normalizeString,
  ensureObjectId,
} = require('../utils/validation');

const ROOM_NAME_MAX_LENGTH = 50;

const normalizeRoomName = (value) => normalizeString(value);

const serializeRoom = (room) => ({
  id: String(room._id),
  name: room.name,
  createdBy: room.createdBy ? String(room.createdBy._id || room.createdBy) : null,
  createdAt: room.createdAt,
});

const serializeMember = (member) => ({
  id: String(member._id),
  username: member.username,
  email: member.email,
});

const ensureRoomCreator = (room, userId) =>
  String(room.createdBy._id || room.createdBy) === userId;

const ensureRoomMembership = (room, userId) => {
  const isMember = room.members.some(
    (member) => String(member._id || member) === userId
  );

  if (!isMember) {
    throw httpError(401, 'You are not a member of this room');
  }
};

const getRoomByIdOrThrow = async (roomId, projection) => {
  const room = await Room.findById(roomId).select(projection);

  if (!room) {
    throw httpError(404, 'Room not found');
  }

  return room;
};

const loadRoomMembers = async (roomId) => {
  const room = await Room.findById(roomId)
    .select('_id members')
    .populate('members', 'username email')
    .lean();

  return room ? room.members.map(serializeMember) : [];
};

const validateRoomName = (value) => {
  const normalizedName = normalizeRoomName(value);

  if (!normalizedName) {
    throw httpError(400, 'Room name is required');
  }

  if (normalizedName.length > ROOM_NAME_MAX_LENGTH) {
    throw httpError(
      400,
      `Room name must be ${ROOM_NAME_MAX_LENGTH} characters or fewer`
    );
  }

  return normalizedName;
};

const createRoom = asyncHandler(async (req, res) => {
  const normalizedName = validateRoomName(req.body?.name);

  const existingRoom = await Room.findOne({ name: normalizedName }).collation({
    locale: 'en',
    strength: 2,
  });

  if (existingRoom) {
    throw httpError(409, 'Room with this name already exists');
  }

  const room = await Room.create({
    name: normalizedName,
    createdBy: req.user.userId,
    members: [req.user.userId],
  });

  return res.status(201).json({
    message: 'Room created successfully',
    room: serializeRoom(room),
  });
});

const updateRoom = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');
  const normalizedName = validateRoomName(req.body?.name);

  const room = await getRoomByIdOrThrow(roomId, '_id name createdBy createdAt');

  if (!ensureRoomCreator(room, req.user.userId)) {
    throw httpError(401, 'You are not allowed to edit this room');
  }

  const existingRoom = await Room.findOne({
    _id: { $ne: roomId },
    name: normalizedName,
  }).collation({
    locale: 'en',
    strength: 2,
  });

  if (existingRoom) {
    throw httpError(409, 'Room with this name already exists');
  }

  room.name = normalizedName;
  await room.save();

  return res.json({
    message: 'Room updated successfully',
    room: serializeRoom(room),
  });
});

const getRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ members: req.user.userId })
    .select('_id name createdBy createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    message: 'Rooms fetched successfully',
    rooms: rooms.map(serializeRoom),
  });
});

const deleteRoom = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');

  const room = await getRoomByIdOrThrow(roomId, '_id name createdBy createdAt');

  if (!ensureRoomCreator(room, req.user.userId)) {
    throw httpError(401, 'You are not allowed to delete this room');
  }

  await Message.deleteMany({ room: roomId });
  await room.deleteOne();

  return res.json({
    message: 'Room deleted successfully',
    room: serializeRoom(room),
  });
});

const getRoomById = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');

  const room = await getRoomByIdOrThrow(
    roomId,
    '_id name createdBy members createdAt'
  );

  ensureRoomMembership(room, req.user.userId);

  return res.json({
    message: 'Room fetched successfully',
    room: serializeRoom(room),
  });
});

const addRoomMember = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');
  const userId = ensureObjectId(req.body?.userId, 'user id');

  const room = await getRoomByIdOrThrow(roomId, '_id createdBy members');

  if (!ensureRoomCreator(room, req.user.userId)) {
    throw httpError(401, 'You are not allowed to manage members in this room');
  }

  const user = await User.findById(userId).select('_id');

  if (!user) {
    throw httpError(404, 'User not found');
  }

  const alreadyMember = room.members.some(
    (memberId) => String(memberId) === userId
  );

  if (alreadyMember) {
    throw httpError(409, 'User is already a member of this room');
  }

  room.members.push(user._id);
  await room.save();

  return res.status(201).json({
    message: 'Room member added successfully',
    members: await loadRoomMembers(roomId),
  });
});

const removeRoomMember = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');
  const userId = ensureObjectId(req.params?.userId, 'user id');

  const room = await getRoomByIdOrThrow(roomId, '_id createdBy members');

  if (!ensureRoomCreator(room, req.user.userId)) {
    throw httpError(401, 'You are not allowed to manage members in this room');
  }

  if (String(room.createdBy) === userId) {
    throw httpError(400, 'Room creator cannot be removed from their own room');
  }

  const memberIndex = room.members.findIndex(
    (memberId) => String(memberId) === userId
  );

  if (memberIndex === -1) {
    throw httpError(404, 'User is not a member of this room');
  }

  room.members.splice(memberIndex, 1);
  await room.save();

  return res.json({
    message: 'Room member removed successfully',
    members: await loadRoomMembers(roomId),
  });
});

const leaveRoom = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');
  const userId = req.user.userId;

  const room = await getRoomByIdOrThrow(roomId, '_id createdBy members');

  if (ensureRoomCreator(room, userId)) {
    throw httpError(400, 'Room creator cannot leave without transferring ownership');
  }

  const memberIndex = room.members.findIndex(
    (memberId) => String(memberId) === userId
  );

  if (memberIndex === -1) {
    throw httpError(404, 'You are not a member of this room');
  }

  room.members.splice(memberIndex, 1);
  await room.save();

  return res.json({
    message: 'You left the room successfully',
  });
});

const getRoomMembers = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');

  const room = await Room.findById(roomId)
    .select('_id members')
    .populate('members', 'username email')
    .lean();

  if (!room) {
    throw httpError(404, 'Room not found');
  }

  ensureRoomMembership(room, req.user.userId);

  return res.json({
    message: 'Room members fetched successfully',
    members: room.members.map(serializeMember),
  });
});

module.exports = {
  createRoom,
  updateRoom,
  getRooms,
  getRoomById,
  deleteRoom,
  addRoomMember,
  removeRoomMember,
  leaveRoom,
  getRoomMembers,
};
