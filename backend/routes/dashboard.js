// backend/routes/dashboard.js
const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

// import the middleware — we exported both verifyToken and authenticate
const { verifyToken } = require('../middleware/authMiddleware');

// models
const { User, Course, Enrollment } = require('../models');

/**
 * GET /api/dashboard
 * Returns user info and courses the user is enrolled in
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user token' });
    }

    // Fetch user basic info
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role'],
    });

    // Fetch enrollments including course (association must be set up in models)
    // Use attribute name studentId (model-level) rather than DB column student_id.
    // If your Enrollment model uses underscored and defines studentId with field: 'student_id',
    // then use studentId here:
    const enrollments = await Enrollment.findAll({
      where: { studentId: userId },
      include: [{ model: Course }],
    });

    const courses = enrollments.map((e) => e.Course).filter(Boolean);

    return res.status(200).json({
      success: true,
      message: 'Dashboard data loaded successfully',
      user,
      courses,
    });
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: error.message,
    });
  }
});

module.exports = router;
