const Message = require('../models/Message');
const Room = require('../models/Room');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { ensureObjectId } = require('../utils/validation');

const serializeMessage = (message) => ({
  id: String(message._id),
  room: String(message.room),
  sender: message.sender
    ? {
        id: String(message.sender._id),
        username: message.sender.username,
        email: message.sender.email,
      }
    : null,
  text: message.text,
  createdAt: message.createdAt,
});

const getRoomMessages = asyncHandler(async (req, res) => {
  const roomId = ensureObjectId(req.params?.roomId, 'room id');

  const room = await Room.findById(roomId).select('_id members').lean();

  if (!room) {
    throw httpError(404, 'Room not found');
  }

  const isMember = room.members.some(
    (memberId) => String(memberId) === req.user.userId
  );

  if (!isMember) {
    throw httpError(401, 'You are not a member of this room');
  }

  const messages = await Message.find({ room: roomId })
    .select('_id room sender text createdAt')
    .sort({ createdAt: 1 })
    .populate('sender', 'username email')
    .lean();

  return res.json({
    message: 'Room messages fetched successfully',
    messages: messages.map(serializeMessage),
  });
});

module.exports = {
  getRoomMessages,
};
