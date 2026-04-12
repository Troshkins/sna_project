const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Room = require('../models/Room');

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';
const MESSAGE_TEXT_MAX_LENGTH = 1000;

const getAllowedOrigins = () => {
  const configuredOrigins =
    process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN || DEFAULT_FRONTEND_ORIGIN;

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeMessageText = (value) =>
  normalizeString(value);

const serializeMessage = (message) => ({
  id: String(message._id),
  room: String(message.room),
  sender: message.sender
    ? {
        id: String(message.sender._id),
        username: message.sender.username,
      }
    : null,
  text: message.text,
  createdAt: message.createdAt,
});

const findRoomForMember = async (roomId, userId) =>
  Room.findOne({
    _id: roomId,
    members: userId,
  })
    .select('_id')
    .lean();

const createSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    try {
      const { token } = socket.handshake.auth || {};

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.user = {
        userId: decoded.userId,
      };

      return next();
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_room', async (payload = {}, callback) => {
      try {
        const roomId = normalizeString(payload.roomId);

        if (!isValidObjectId(roomId)) {
          const error = { message: 'Invalid room id' };

          if (callback) {
            return callback(error);
          }

          return socket.emit('socket_error', error);
        }

        const room = await findRoomForMember(roomId, socket.user.userId);

        if (!room) {
          const error = { message: 'Room not found or access denied' };

          if (callback) {
            return callback(error);
          }

          return socket.emit('socket_error', error);
        }

        await socket.join(roomId);

        const response = { roomId };

        if (callback) {
          return callback(null, response);
        }

        return socket.emit('joined_room', response);
      } catch (error) {
        const response = { message: 'Failed to join room' };

        if (callback) {
          return callback(response);
        }

        return socket.emit('socket_error', response);
      }
    });

    socket.on('send_message', async (payload = {}, callback) => {
      try {
        const roomId = normalizeString(payload.roomId);
        const text = normalizeMessageText(payload.text);

        if (!isValidObjectId(roomId)) {
          const error = { message: 'Invalid room id' };

          if (callback) {
            return callback(error);
          }

          return socket.emit('socket_error', error);
        }

        if (!text) {
          const error = { message: 'Message text is required' };

          if (callback) {
            return callback(error);
          }

          return socket.emit('socket_error', error);
        }

        if (text.length > MESSAGE_TEXT_MAX_LENGTH) {
          const error = {
            message: `Message text must be ${MESSAGE_TEXT_MAX_LENGTH} characters or fewer`,
          };

          if (callback) {
            return callback(error);
          }

          return socket.emit('socket_error', error);
        }

        const room = await findRoomForMember(roomId, socket.user.userId);

        if (!room) {
          const error = { message: 'Room not found or access denied' };

          if (callback) {
            return callback(error);
          }

          return socket.emit('socket_error', error);
        }

        const message = await Message.create({
          room: roomId,
          sender: socket.user.userId,
          text,
        });

        const populatedMessage = await Message.findById(message._id)
          .select('_id room sender text createdAt')
          .populate('sender', 'username')
          .lean();

        const serializedMessage = serializeMessage(populatedMessage);

        io.to(roomId).emit('new_message', serializedMessage);

        if (callback) {
          return callback(null, serializedMessage);
        }
      } catch (error) {
        const response = { message: 'Failed to send message' };

        if (callback) {
          return callback(response);
        }

        socket.emit('socket_error', response);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = {
  createSocketServer,
  getAllowedOrigins,
};
