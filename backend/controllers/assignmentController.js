const { Assignment, Course, User, Submission } = require('../models');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

const createAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { courseId } = req.params;
    const { title, description, dueDate, maxPoints, instructions } = req.body;

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
        message: 'You can only create assignments for your own courses'
      });
    }

    // Handle file attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => file.path);
    }

    const assignment = await Assignment.create({
      title,
      description,
      courseId,
      teacherId: req.user.id,
      dueDate,
      maxPoints,
      instructions,
      attachments
    });

    const assignmentWithDetails = await Assignment.findByPk(assignment.id, {
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'title']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: { assignment: assignmentWithDetails }
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user has access to this course
    let hasAccess = false;
    if (req.user.role === 'teacher') {
      const course = await Course.findByPk(courseId);
      hasAccess = course && course.teacherId === req.user.id;
    } else {
      const enrollment = await Enrollment.findOne({
        where: {
          studentId: req.user.id,
          courseId: courseId,
          status: 'active'
        }
      });
      hasAccess = !!enrollment;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this course'
      });
    }

    const { count, rows: assignments } = await Assignment.findAndCountAll({
      where: {
        courseId: courseId,
        isActive: true
      },
      include: [{
        model: User,
        as: 'teacher',
        attributes: ['id', 'name', 'email']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['dueDate', 'ASC']]
    });

    // Add submission status for students
    if (req.user.role === 'student') {
      for (const assignment of assignments) {
        const submission = await Submission.findOne({
          where: {
            assignmentId: assignment.id,
            studentId: req.user.id
          }
        });
        assignment.dataValues.hasSubmitted = !!submission;
        assignment.dataValues.submissionStatus = submission?.status || null;
      }
    }

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get course assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assignments'
    });
  }
};

const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findByPk(id, {
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
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!assignment || !assignment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check access permissions
    let hasAccess = false;
    if (req.user.role === 'teacher') {
      hasAccess = assignment.teacherId === req.user.id;
    } else {
      const enrollment = await Enrollment.findOne({
        where: {
          studentId: req.user.id,
          courseId: assignment.courseId,
          status: 'active'
        }
      });
      hasAccess = !!enrollment;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this assignment'
      });
    }

    // Add submission info for students
    if (req.user.role === 'student') {
      const submission = await Submission.findOne({
        where: {
          assignmentId: id,
          studentId: req.user.id
        }
      });
      assignment.dataValues.submission = submission;
    }

    res.json({
      success: true,
      data: { assignment }
    });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assignment'
    });
  }
};

const updateAssignment = async (req, res) => {
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
    const { title, description, dueDate, maxPoints, instructions, isActive } = req.body;

    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if user is the teacher
    if (assignment.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own assignments'
      });
    }

    // Handle file attachments
    let attachments = assignment.attachments || [];
    if (req.files && req.files.length > 0) {
      // Remove old files if new ones are uploaded
      if (attachments.length > 0) {
        attachments.forEach(filePath => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
      attachments = req.files.map(file => file.path);
    }

    await assignment.update({
      title,
      description,
      dueDate,
      maxPoints,
      instructions,
      attachments,
      isActive
    });

    const updatedAssignment = await Assignment.findByPk(id, {
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'title']
      }]
    });

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: { assignment: updatedAssignment }
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment'
    });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if user is the teacher
    if (assignment.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own assignments'
      });
    }

    // Remove attached files
    if (assignment.attachments && assignment.attachments.length > 0) {
      assignment.attachments.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await assignment.destroy();

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignment'
    });
  }
};

module.exports = {
  createAssignment,
  getCourseAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment
};
