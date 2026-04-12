const mongoose = require('mongoose');
const Message = require('../models/Message');
const Room = require('../models/Room');

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

const getRoomMessages = async (req, res) => {
  try {
    const roomId = typeof req.params?.roomId === 'string' ? req.params.roomId.trim() : '';

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        message: 'Invalid room id',
      });
    }

    const room = await Room.findById(roomId).select('_id members').lean();

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      });
    }

    const isMember = room.members.some(
      (memberId) => String(memberId) === req.user.userId
    );

    if (!isMember) {
      return res.status(401).json({
        message: 'You are not a member of this room',
      });
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
  } catch (error) {
    console.error('Get room messages error:', error.message);

    return res.status(500).json({
      message: 'Server error while fetching room messages',
    });
  }
};

module.exports = {
  getRoomMessages,
};
