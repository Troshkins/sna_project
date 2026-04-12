const mongoose = require('mongoose');
const Message = require('../models/Message');
const Room = require('../models/Room');

const ROOM_NAME_MAX_LENGTH = 50;

const normalizeRoomName = (value) =>
  typeof value === 'string' ? value.trim() : '';

const serializeRoom = (room) => ({
  id: String(room._id),
  name: room.name,
  createdBy: room.createdBy ? String(room.createdBy._id || room.createdBy) : null,
  createdAt: room.createdAt,
});

const createRoom = async (req, res) => {
  try {
    const normalizedName = normalizeRoomName(req.body?.name);

    if (!normalizedName) {
      return res.status(400).json({
        message: 'Room name is required',
      });
    }

    if (normalizedName.length > ROOM_NAME_MAX_LENGTH) {
      return res.status(400).json({
        message: `Room name must be ${ROOM_NAME_MAX_LENGTH} characters or fewer`,
      });
    }

    const existingRoom = await Room.findOne({ name: normalizedName }).collation({
      locale: 'en',
      strength: 2,
    });

    if (existingRoom) {
      return res.status(409).json({
        message: 'Room with this name already exists',
      });
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
  } catch (error) {
    console.error('Create room error:', error.message);

    return res.status(500).json({
      message: 'Server error during room creation',
    });
  }
};

const updateRoom = async (req, res) => {
  try {
    const id = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
    const normalizedName = normalizeRoomName(req.body?.name);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid room id',
      });
    }

    if (!normalizedName) {
      return res.status(400).json({
        message: 'Room name is required',
      });
    }

    if (normalizedName.length > ROOM_NAME_MAX_LENGTH) {
      return res.status(400).json({
        message: `Room name must be ${ROOM_NAME_MAX_LENGTH} characters or fewer`,
      });
    }

    const room = await Room.findById(id).select('_id name createdBy createdAt');

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      });
    }

    if (String(room.createdBy) !== req.user.userId) {
      return res.status(401).json({
        message: 'You are not allowed to edit this room',
      });
    }

    const existingRoom = await Room.findOne({
      _id: { $ne: id },
      name: normalizedName,
    }).collation({
      locale: 'en',
      strength: 2,
    });

    if (existingRoom) {
      return res.status(409).json({
        message: 'Room with this name already exists',
      });
    }

    room.name = normalizedName;
    await room.save();

    return res.json({
      message: 'Room updated successfully',
      room: serializeRoom(room),
    });
  } catch (error) {
    console.error('Update room error:', error.message);

    return res.status(500).json({
      message: 'Server error during room update',
    });
  }
};

const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .select('_id name createdBy createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      message: 'Rooms fetched successfully',
      rooms: rooms.map(serializeRoom),
    });
  } catch (error) {
    console.error('Get rooms error:', error.message);

    return res.status(500).json({
      message: 'Server error while fetching rooms',
    });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const id = typeof req.params?.id === 'string' ? req.params.id.trim() : '';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid room id',
      });
    }

    const room = await Room.findById(id).select('_id name createdBy createdAt');

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      });
    }

    if (String(room.createdBy) !== req.user.userId) {
      return res.status(401).json({
        message: 'You are not allowed to delete this room',
      });
    }

    await Message.deleteMany({ room: id });
    await room.deleteOne();

    return res.json({
      message: 'Room deleted successfully',
      room: serializeRoom(room),
    });
  } catch (error) {
    console.error('Delete room error:', error.message);

    return res.status(500).json({
      message: 'Server error during room deletion',
    });
  }
};

const getRoomById = async (req, res) => {
  try {
    const id = typeof req.params?.id === 'string' ? req.params.id.trim() : '';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid room id',
      });
    }

    const room = await Room.findById(id)
      .select('_id name createdBy createdAt')
      .lean();

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      });
    }

    return res.json({
      message: 'Room fetched successfully',
      room: serializeRoom(room),
    });
  } catch (error) {
    console.error('Get room by id error:', error.message);

    return res.status(500).json({
      message: 'Server error while fetching room',
    });
  }
};

module.exports = {
  createRoom,
  updateRoom,
  getRooms,
  getRoomById,
  deleteRoom,
};
