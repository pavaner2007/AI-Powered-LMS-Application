const express = require('express');
const { body } = require('express-validator');
const {
  submitAssignment,
  getAssignmentSubmissions,
  getStudentSubmissions,
  getSubmissionById,
  downloadSubmission
} = require('../controllers/submissionController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadAssignment, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const submitAssignmentValidation = [
  body('content')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Content must not exceed 5000 characters')
];

// Routes
router.get('/student', authenticate, authorize('student'), getStudentSubmissions);
router.get('/assignment/:assignmentId', authenticate, authorize('teacher'), getAssignmentSubmissions);
router.get('/:id', authenticate, getSubmissionById);
router.get('/:id/download', authenticate, downloadSubmission);

router.post('/:assignmentId/submit',
  authenticate,
  authorize('student'),
  uploadAssignment.single('file'),
  handleUploadError,
  submitAssignmentValidation,
  submitAssignment
);

module.exports = router;
