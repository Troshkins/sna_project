const mongoose = require('mongoose');
const { getRequiredEnv } = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(getRequiredEnv('MONGO_URI'));

    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
