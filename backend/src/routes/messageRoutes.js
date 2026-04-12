const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getRoomMessages } = require('../controllers/messageController');

const router = express.Router();

router.get('/:roomId/messages', authMiddleware, getRoomMessages);

module.exports = router;
