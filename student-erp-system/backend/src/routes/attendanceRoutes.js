const express = require('express');
const {
  generateCode,
  verifyCode,
  checkIn,
  updateLocation,
  getSessionDetails,
  getActiveSessions,
  getAttendanceHistory
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/generate-code', authorize('teacher'), generateCode);
router.post('/verify-code', verifyCode);
router.post('/check-in', checkIn);
router.post('/update-location', updateLocation);
router.get('/session/:sessionId', getSessionDetails);
router.get('/active-sessions', getActiveSessions);
router.get('/history', getAttendanceHistory);

module.exports = router;