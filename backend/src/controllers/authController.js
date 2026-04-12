const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : '';

const registerUser = async (req, res) => {
  try {
    const username = normalizeString(req.body?.username);
    const email = normalizeString(req.body?.email).toLowerCase();
    const password = normalizeString(req.body?.password);

    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Username, email and password are required',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'User with this email or username already exists',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);

    return res.status(500).json({
      message: 'Server error during registration',
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const email = normalizeString(req.body?.email).toLowerCase();
    const password = normalizeString(req.body?.password);

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      message: 'Server error during login',
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      '_id username email createdAt'
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    return res.json({
      message: 'Current user fetched successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error.message);

    return res.status(500).json({
      message: 'Server error while fetching current user',
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
