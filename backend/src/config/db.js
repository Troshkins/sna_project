const mongoose = require('mongoose');
const { getRequiredEnv } = require('./env');
const Room = require('../models/Room');

const connectDB = async () => {
  try {
    await mongoose.connect(getRequiredEnv('MONGO_URI'));
    await Room.syncIndexes();

    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
