const express = require('express');
const { body } = require('express-validator');
const {
  createAssignment,
  getCourseAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment
} = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadMaterial, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const createAssignmentValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),
  body('maxPoints')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max points must be between 1 and 1000'),
  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Instructions must not exceed 2000 characters')
];

const updateAssignmentValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('maxPoints')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max points must be between 1 and 1000'),
  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Instructions must not exceed 2000 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Routes
router.get('/course/:courseId', authenticate, getCourseAssignments);
router.get('/:id', authenticate, getAssignmentById);

router.post('/course/:courseId',
  authenticate,
  authorize('teacher'),
  uploadMaterial.array('attachments', 5),
  handleUploadError,
  createAssignmentValidation,
  createAssignment
);

router.put('/:id',
  authenticate,
  authorize('teacher'),
  uploadMaterial.array('attachments', 5),
  handleUploadError,
  updateAssignmentValidation,
  updateAssignment
);

router.delete('/:id', authenticate, authorize('teacher'), deleteAssignment);

module.exports = router;
