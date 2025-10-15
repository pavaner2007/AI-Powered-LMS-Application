const express = require('express');
const {
  enrollInCourse,
  getStudentEnrollments,
  getCourseEnrollments,
  updateEnrollmentStatus,
  unenrollFromCourse
} = require('../controllers/enrollmentController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Routes
router.get('/student', authenticate, authorize('student'), getStudentEnrollments);
router.get('/course/:courseId', authenticate, authorize('teacher'), getCourseEnrollments);

router.post('/:courseId/enroll', authenticate, authorize('student'), enrollInCourse);
router.put('/:enrollmentId/status', authenticate, updateEnrollmentStatus);
router.delete('/:courseId/unenroll', authenticate, authorize('student'), unenrollFromCourse);

module.exports = router;
