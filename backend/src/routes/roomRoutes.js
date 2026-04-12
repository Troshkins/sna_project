const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  createRoom,
  updateRoom,
  getRooms,
  getRoomById,
  deleteRoom,
} = require('../controllers/roomController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createRoom);
router.get('/', getRooms);
router.get('/:id', getRoomById);
router.patch('/:id', updateRoom);
router.delete('/:id', deleteRoom);

module.exports = router;
