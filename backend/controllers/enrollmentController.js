const { Enrollment, Course, User } = require('../models');
const { validationResult } = require('express-validator');

const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists and is active
    const course = await Course.findByPk(courseId);
    if (!course || !course.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or inactive'
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: {
        studentId: req.user.id,
        courseId: courseId
      }
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return res.status(409).json({
          success: false,
          message: 'You are already enrolled in this course'
        });
      } else if (existingEnrollment.status === 'completed') {
        return res.status(409).json({
          success: false,
          message: 'You have already completed this course'
        });
      }
    }

    // Check course capacity
    if (course.maxStudents) {
      const activeEnrollments = await Enrollment.count({
        where: {
          courseId: courseId,
          status: 'active'
        }
      });

      if (activeEnrollments >= course.maxStudents) {
        return res.status(409).json({
          success: false,
          message: 'Course is full'
        });
      }
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      studentId: req.user.id,
      courseId: courseId,
      status: 'active'
    });

    // Fetch enrollment with course and student details
    const enrollmentWithDetails = await Enrollment.findByPk(enrollment.id, {
      include: [
        {
          model: Course,
          as: 'course',
          include: [{
            model: User,
            as: 'teacher',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      data: { enrollment: enrollmentWithDetails }
    });
  } catch (error) {
    console.error('Enroll in course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getStudentEnrollments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: enrollments } = await Enrollment.findAndCountAll({
      where: {
        studentId: req.user.id,
        status: status
      },
      include: [{
        model: Course,
        as: 'course',
        include: [{
          model: User,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        }]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['enrollmentDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        enrollments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get student enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get enrollments'
    });
  }
};

const getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10, status = 'active' } = req.query;
    const offset = (page - 1) * limit;

    // Check if course exists and user is the teacher
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view enrollments for your own courses'
      });
    }

    const { count, rows: enrollments } = await Enrollment.findAndCountAll({
      where: {
        courseId: courseId,
        status: status
      },
      include: [{
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email', 'profilePicture', 'bio']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['enrollmentDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title
        },
        enrollments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get course enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get enrollments'
    });
  }
};

const updateEnrollmentStatus = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'completed', 'dropped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, completed, or dropped'
      });
    }

    const enrollment = await Enrollment.findByPk(enrollmentId, {
      include: [{
        model: Course,
        as: 'course'
      }]
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student') {
      // Students can only update their own enrollments
      if (enrollment.studentId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own enrollments'
        });
      }
      // Students can only change status to 'dropped'
      if (status !== 'dropped') {
        return res.status(403).json({
          success: false,
          message: 'Students can only drop courses'
        });
      }
    } else if (req.user.role === 'teacher') {
      // Teachers can only update enrollments in their courses
      if (enrollment.course.teacherId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update enrollments in your own courses'
        });
      }
    }

    const updateData = { status };
    if (status === 'completed') {
      updateData.completionDate = new Date();
      updateData.progress = 100.00;
    }

    await enrollment.update(updateData);

    const updatedEnrollment = await Enrollment.findByPk(enrollmentId, {
      include: [
        {
          model: Course,
          as: 'course',
          include: [{
            model: User,
            as: 'teacher',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Enrollment status updated successfully',
      data: { enrollment: updatedEnrollment }
    });
  } catch (error) {
    console.error('Update enrollment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enrollment status'
    });
  }
};

const unenrollFromCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      where: {
        studentId: req.user.id,
        courseId: courseId,
        status: 'active'
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Active enrollment not found'
      });
    }

    await enrollment.update({ status: 'dropped' });

    res.json({
      success: true,
      message: 'Successfully unenrolled from course'
    });
  } catch (error) {
    console.error('Unenroll from course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unenroll from course'
    });
  }
};

module.exports = {
  enrollInCourse,
  getStudentEnrollments,
  getCourseEnrollments,
  updateEnrollmentStatus,
  unenrollFromCourse
};
