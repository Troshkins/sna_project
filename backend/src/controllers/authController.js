const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const {
  normalizeString,
  normalizeLowercaseString,
} = require('../utils/validation');

const registerUser = asyncHandler(async (req, res) => {
  const username = normalizeString(req.body?.username);
  const email = normalizeLowercaseString(req.body?.email);
  const password = normalizeString(req.body?.password);

  if (!username || !email || !password) {
    throw httpError(400, 'Username, email and password are required');
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw httpError(409, 'User with this email or username already exists');
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
});

const loginUser = asyncHandler(async (req, res) => {
  const email = normalizeLowercaseString(req.body?.email);
  const password = normalizeString(req.body?.password);

  if (!email || !password) {
    throw httpError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw httpError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    throw httpError(401, 'Invalid email or password');
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
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    '_id username email createdAt'
  );

  if (!user) {
    throw httpError(404, 'User not found');
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
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
