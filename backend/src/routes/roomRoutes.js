const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  createRoom,
  updateRoom,
  getRooms,
  getRoomById,
  deleteRoom,
  addRoomMember,
  removeRoomMember,
  leaveRoom,
  getRoomMembers,
} = require('../controllers/roomController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createRoom);
router.get('/', getRooms);
router.get('/:id/members', getRoomMembers);
router.post('/:id/members', addRoomMember);
router.delete('/:id/members/me', leaveRoom);
router.delete('/:id/members/:userId', removeRoomMember);
router.get('/:id', getRoomById);
router.patch('/:id', updateRoom);
router.delete('/:id', deleteRoom);

module.exports = router;
