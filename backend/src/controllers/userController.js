const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { normalizeString } = require('../utils/validation');

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 10;

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const serializeUser = (user) => ({
  id: String(user._id),
  username: user.username,
  email: user.email,
});

const searchUsers = asyncHandler(async (req, res) => {
  const query = normalizeString(req.query?.q);
  const currentUserId = req.user.userId;

  if (query.length < MIN_QUERY_LENGTH) {
    return res.json({
      message: `Provide at least ${MIN_QUERY_LENGTH} characters`,
      users: [],
    });
  }

  const pattern = new RegExp(escapeRegex(query), 'i');

  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [{ username: pattern }, { email: pattern }],
  })
    .select('_id username email')
    .limit(MAX_RESULTS)
    .lean();

  return res.json({
    message: 'Users fetched successfully',
    users: users.map(serializeUser),
  });
});

module.exports = {
  searchUsers,
};
