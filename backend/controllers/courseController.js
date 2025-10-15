const { Course, User, Enrollment } = require('../models');
const { validationResult } = require('express-validator');

const createCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, duration, category, level, maxStudents, startDate, endDate } = req.body;

    const course = await Course.create({
      title,
      description,
      duration,
      teacherId: req.user.id,
      category,
      level,
      maxStudents,
      startDate,
      endDate
    });

    // Fetch course with teacher info
    const courseWithTeacher = await Course.findByPk(course.id, {
      include: [{
        model: User,
        as: 'teacher',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course: courseWithTeacher }
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, level, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };

    if (category) whereClause.category = category;
    if (level) whereClause.level = level;
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'teacher',
        attributes: ['id', 'name', 'email']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get courses'
    });
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name', 'email', 'bio']
        },
        {
          model: Enrollment,
          as: 'enrollments',
          where: { status: 'active' },
          required: false,
          include: [{
            model: User,
            as: 'student',
            attributes: ['id', 'name', 'email']
          }]
        }
      ]
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled (for students)
    let isEnrolled = false;
    if (req.user && req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        where: {
          studentId: req.user.id,
          courseId: id,
          status: 'active'
        }
      });
      isEnrolled = !!enrollment;
    }

    res.json({
      success: true,
      data: {
        course,
        isEnrolled,
        enrollmentCount: course.enrollments?.length || 0
      }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course'
    });
  }
};

const updateCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { title, description, duration, category, level, maxStudents, startDate, endDate, isActive } = req.body;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the teacher of this course
    if (course.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own courses'
      });
    }

    await course.update({
      title,
      description,
      duration,
      category,
      level,
      maxStudents,
      startDate,
      endDate,
      isActive
    });

    const updatedCourse = await Course.findByPk(id, {
      include: [{
        model: User,
        as: 'teacher',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: { course: updatedCourse }
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course'
    });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the teacher of this course
    if (course.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own courses'
      });
    }

    await course.destroy();

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course'
    });
  }
};

const getTeacherCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: courses } = await Course.findAndCountAll({
      where: { teacherId: req.user.id },
      include: [{
        model: Enrollment,
        as: 'enrollments',
        where: { status: 'active' },
        required: false,
        attributes: ['id']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Add enrollment count to each course
    const coursesWithCount = courses.map(course => ({
      ...course.toJSON(),
      enrollmentCount: course.enrollments?.length || 0
    }));

    res.json({
      success: true,
      data: {
        courses: coursesWithCount,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get teacher courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get courses'
    });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getTeacherCourses
};
