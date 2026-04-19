const express = require('express');
const {
  createCourse,
  getCourses,
  getCourse,
  enrollStudent,
  updateCourse
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('teacher'), createCourse);
router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/:id/enroll', authorize('teacher'), enrollStudent);
router.put('/:id', authorize('teacher'), updateCourse);

module.exports = router;