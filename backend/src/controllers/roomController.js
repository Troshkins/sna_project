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
const normalizeRoomNameKey = (value) => normalizeRoomName(value).toLowerCase();
const buildDirectKey = (memberIds) =>
  memberIds
    .map((memberId) => String(memberId))
    .sort()
    .join(':');

const serializeMember = (member) => ({
  id: String(member._id),
  username: member.username,
  email: member.email,
});

const serializeRoom = (room) => {
  const serializedRoom = {
    id: String(room._id),
    roomType: room.roomType || 'group',
    createdBy: room.createdBy ? String(room.createdBy._id || room.createdBy) : null,
    createdAt: room.createdAt,
  };

  if (serializedRoom.roomType === 'direct') {
    serializedRoom.members = Array.isArray(room.members)
      ? room.members.map(serializeMember)
      : [];

    return serializedRoom;
  }

  serializedRoom.name = room.name;

  return serializedRoom;
};

const ensureRoomCreator = (room, userId) =>
  String(room.createdBy._id || room.createdBy) === userId;

const ensureGroupRoom = (room, action) => {
  if (room.roomType === 'direct') {
    throw httpError(400, `Direct rooms cannot ${action}`);
  }
};

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

const validateDirectParticipant = (currentUserId, targetUserId) => {
  if (targetUserId === currentUserId) {
    throw httpError(400, 'You cannot create a direct room with yourself');
  }

  return targetUserId;
};

const findDirectRoomByMembers = async (memberIds) =>
  Room.findOne({
    roomType: 'direct',
    directKey: buildDirectKey(memberIds),
  })
    .select('_id roomType name members createdBy createdAt')
    .populate('members', 'username email');

const evictUserSocketsFromRoom = async (req, roomId, userId) => {
  const io = req.app?.locals?.io;

  if (!io?.evictUserFromRoom) {
    return;
  }

  await io.evictUserFromRoom(roomId, userId);
};

const createRoom = asyncHandler(async (req, res) => {
  const normalizedName = validateRoomName(req.body?.name);
  const normalizedNameKey = normalizeRoomNameKey(normalizedName);

  const existingRoom = await Room.findOne({ normalizedName: normalizedNameKey });

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

const createDirectRoom = asyncHandler(async (req, res) => {
  const currentUserId = req.user.userId;
  const targetUserId = validateDirectParticipant(
    currentUserId,
    ensureObjectId(req.body?.userId, 'user id')
  );

  const targetUser = await User.findById(targetUserId).select('_id');

  if (!targetUser) {
    throw httpError(404, 'User not found');
  }

  const existingRoom = await findDirectRoomByMembers([
    currentUserId,
    targetUserId,
  ]);

  if (existingRoom) {
    return res.json({
      message: 'Direct room fetched successfully',
      room: serializeRoom(existingRoom),
    });
  }

  try {
    const room = await Room.create({
      roomType: 'direct',
      createdBy: currentUserId,
      members: [currentUserId, targetUser._id],
    });

    await room.populate('members', 'username email');

    return res.status(201).json({
      message: 'Direct room created successfully',
      room: serializeRoom(room),
    });
  } catch (error) {
    if (error?.code === 11000) {
      const room = await findDirectRoomByMembers([currentUserId, targetUserId]);

      if (room) {
        return res.json({
          message: 'Direct room fetched successfully',
          room: serializeRoom(room),
        });
      }
    }

    throw error;
  }
});

const updateRoom = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');
  const normalizedName = validateRoomName(req.body?.name);
  const normalizedNameKey = normalizeRoomNameKey(normalizedName);

  const room = await getRoomByIdOrThrow(
    roomId,
    '_id name roomType createdBy createdAt'
  );

  ensureGroupRoom(room, 'be renamed');

  if (!ensureRoomCreator(room, req.user.userId)) {
    throw httpError(401, 'You are not allowed to edit this room');
  }

  const existingRoom = await Room.findOne({
    _id: { $ne: roomId },
    normalizedName: normalizedNameKey,
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
    .select('_id roomType name members createdBy createdAt')
    .populate('members', 'username email')
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    message: 'Rooms fetched successfully',
    rooms: rooms.map(serializeRoom),
  });
});

const deleteRoom = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');

  const room = await getRoomByIdOrThrow(
    roomId,
    '_id name roomType createdBy createdAt'
  );

  ensureGroupRoom(room, 'be deleted');

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
    '_id roomType name createdBy members createdAt'
  );

  await room.populate('members', 'username email');

  ensureRoomMembership(room, req.user.userId);

  return res.json({
    message: 'Room fetched successfully',
    room: serializeRoom(room),
  });
});

const addRoomMember = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');
  const userId = ensureObjectId(req.body?.userId, 'user id');

  const room = await getRoomByIdOrThrow(
    roomId,
    '_id name roomType createdBy members'
  );

  ensureGroupRoom(room, 'add members');

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

  const room = await getRoomByIdOrThrow(
    roomId,
    '_id name roomType createdBy members'
  );

  ensureGroupRoom(room, 'remove members');

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
  await evictUserSocketsFromRoom(req, roomId, userId);

  return res.json({
    message: 'Room member removed successfully',
    members: await loadRoomMembers(roomId),
  });
});

const leaveRoom = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.id, 'room id');
  const userId = req.user.userId;

  const room = await getRoomByIdOrThrow(
    roomId,
    '_id name roomType createdBy members'
  );

  ensureGroupRoom(room, 'be left');

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
  await evictUserSocketsFromRoom(req, roomId, userId);

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
  createDirectRoom,
  updateRoom,
  getRooms,
  getRoomById,
  deleteRoom,
  addRoomMember,
  removeRoomMember,
  leaveRoom,
  getRoomMembers,
};
