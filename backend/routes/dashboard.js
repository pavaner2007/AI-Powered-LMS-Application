// backend/routes/dashboard.js
const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

// Import the middleware
const { verifyToken } = require('../middleware/authMiddleware');

// Models
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

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch enrollments including course
    const enrollments = await Enrollment.findAll({
      where: { studentId: userId }, // Ensure studentId is mapped correctly in the model
      include: [{ model: Course }],
    });

    // Map courses from enrollments
    const courses = enrollments?.map((e) => e.Course).filter(Boolean) || [];

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
