const express = require('express');
const { body } = require('express-validator');
const {
  createOrUpdateGrade,
  getStudentGrades,
  getGradeById,
  getCourseGrades
} = require('../controllers/gradeController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const gradeValidation = [
  body('points')
    .isFloat({ min: 0 })
    .withMessage('Points must be a positive number'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must not exceed 1000 characters')
];

// Routes
router.get('/student/:studentId', authenticate, getStudentGrades);
router.get('/course/:courseId', authenticate, authorize('teacher'), getCourseGrades);
router.get('/:id', authenticate, getGradeById);

router.post('/submission/:submissionId',
  authenticate,
  authorize('teacher'),
  gradeValidation,
  createOrUpdateGrade
);

module.exports = router;
