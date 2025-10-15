const { Grade, Submission, Assignment, User, Course } = require('../models');
const { validationResult } = require('express-validator');

const createOrUpdateGrade = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { submissionId } = req.params;
    const { points, feedback } = req.body;

    // Check if submission exists
    const submission = await Submission.findByPk(submissionId, {
      include: [{
        model: Assignment,
        as: 'assignment',
        include: [{
          model: Course,
          as: 'course'
        }]
      }]
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user is the teacher of this course
    if (submission.assignment.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only grade submissions for your own assignments'
      });
    }

    // Validate points
    if (points < 0 || points > submission.assignment.maxPoints) {
      return res.status(400).json({
        success: false,
        message: `Points must be between 0 and ${submission.assignment.maxPoints}`
      });
    }

    // Check if grade already exists
    const existingGrade = await Grade.findOne({
      where: { submissionId: submissionId }
    });

    let grade;
    if (existingGrade) {
      // Update existing grade
      await existingGrade.update({
        points: points,
        maxPoints: submission.assignment.maxPoints,
        feedback: feedback || null,
        gradedAt: new Date(),
        isFinal: true
      });
      grade = existingGrade;
    } else {
      // Create new grade
      grade = await Grade.create({
        submissionId: submissionId,
        teacherId: req.user.id,
        points: points,
        maxPoints: submission.assignment.maxPoints,
        feedback: feedback || null,
        isFinal: true
      });
    }

    // Update submission status
    await submission.update({ status: 'graded' });

    const gradeWithDetails = await Grade.findByPk(grade.id, {
      include: [
        {
          model: Submission,
          as: 'submission',
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'name', 'email']
            },
            {
              model: Assignment,
              as: 'assignment',
              attributes: ['id', 'title', 'maxPoints']
            }
          ]
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(existingGrade ? 200 : 201).json({
      success: true,
      message: existingGrade ? 'Grade updated successfully' : 'Grade assigned successfully',
      data: { grade: gradeWithDetails }
    });
  } catch (error) {
    console.error('Create/update grade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign grade',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10, courseId } = req.query;
    const offset = (page - 1) * limit;

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own grades'
      });
    }

    const whereClause = { '$submission.studentId$': studentId };
    if (courseId) {
      whereClause['$submission.assignment.courseId$'] = courseId;
    }

    const { count, rows: grades } = await Grade.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Submission,
          as: 'submission',
          include: [
            {
              model: Assignment,
              as: 'assignment',
              include: [{
                model: Course,
                as: 'course',
                attributes: ['id', 'title']
              }]
            }
          ]
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['gradedAt', 'DESC']]
    });

    // Calculate overall statistics
    const totalGrades = grades.length;
    const averagePercentage = totalGrades > 0
      ? grades.reduce((sum, grade) => sum + grade.percentage, 0) / totalGrades
      : 0;

    res.json({
      success: true,
      data: {
        grades,
        statistics: {
          totalGrades,
          averagePercentage: Math.round(averagePercentage * 100) / 100
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get student grades error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get grades'
    });
  }
};

const getGradeById = async (req, res) => {
  try {
    const { id } = req.params;

    const grade = await Grade.findByPk(id, {
      include: [
        {
          model: Submission,
          as: 'submission',
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'name', 'email']
            },
            {
              model: Assignment,
              as: 'assignment',
              include: [{
                model: Course,
                as: 'course',
                attributes: ['id', 'title']
              }]
            }
          ]
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    // Check permissions
    const hasAccess = (
      req.user.role === 'teacher' && grade.teacherId === req.user.id
    ) || (
      req.user.role === 'student' && grade.submission.studentId === req.user.id
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this grade'
      });
    }

    res.json({
      success: true,
      data: { grade }
    });
  } catch (error) {
    console.error('Get grade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get grade'
    });
  }
};

const getCourseGrades = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;
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
        message: 'You can only view grades for your own courses'
      });
    }

    const { count, rows: grades } = await Grade.findAndCountAll({
      include: [
        {
          model: Submission,
          as: 'submission',
          where: { '$submission.assignment.courseId$': courseId },
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'name', 'email']
            },
            {
              model: Assignment,
              as: 'assignment',
              attributes: ['id', 'title', 'maxPoints']
            }
          ]
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['gradedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title
        },
        grades,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get course grades error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get grades'
    });
  }
};

module.exports = {
  createOrUpdateGrade,
  getStudentGrades,
  getGradeById,
  getCourseGrades
};
