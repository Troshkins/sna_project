const jwt = require('jsonwebtoken');
const { getRequiredEnv } = require('../config/env');

const authMiddleware = (req, res, next) => {
  const jwtSecret = getRequiredEnv('JWT_SECRET');

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'Authorization header is missing',
      });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        message: 'Invalid authorization format',
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token',
    });
  }
};

module.exports = authMiddleware;
