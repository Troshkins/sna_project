const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { searchUsers } = require('../controllers/userController');

const router = express.Router();

router.use(authMiddleware);

router.get('/search', searchUsers);

module.exports = router;
