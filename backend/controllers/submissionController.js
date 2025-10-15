const { Submission, Assignment, User, Course, Enrollment } = require('../models');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { content } = req.body;

    // Check if assignment exists and is active
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [{
        model: Course,
        as: 'course'
      }]
    });

    if (!assignment || !assignment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or inactive'
      });
    }

    // Check if student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      where: {
        studentId: req.user.id,
        courseId: assignment.courseId,
        status: 'active'
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to submit assignments'
      });
    }

    // Check if assignment is past due
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isLate = now > dueDate;

    // Check if student already submitted
    const existingSubmission = await Submission.findOne({
      where: {
        assignmentId: assignmentId,
        studentId: req.user.id
      }
    });

    let submission;
    if (existingSubmission) {
      // Update existing submission
      const updateData = {
        submittedAt: new Date(),
        isLate: isLate,
        status: isLate ? 'late' : 'submitted'
      };

      if (content !== undefined) updateData.content = content;

      if (req.file) {
        // Remove old file if exists
        if (existingSubmission.filePath && fs.existsSync(existingSubmission.filePath)) {
          fs.unlinkSync(existingSubmission.filePath);
        }
        updateData.filePath = req.file.path;
        updateData.fileName = req.file.originalname;
        updateData.fileSize = req.file.size;
      }

      await existingSubmission.update(updateData);
      submission = existingSubmission;
    } else {
      // Create new submission
      const submissionData = {
        assignmentId: assignmentId,
        studentId: req.user.id,
        content: content || null,
        isLate: isLate,
        status: isLate ? 'late' : 'submitted'
      };

      if (req.file) {
        submissionData.filePath = req.file.path;
        submissionData.fileName = req.file.originalname;
        submissionData.fileSize = req.file.size;
      }

      submission = await Submission.create(submissionData);
    }

    const submissionWithDetails = await Submission.findByPk(submission.id, {
      include: [
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title', 'dueDate', 'maxPoints']
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(existingSubmission ? 200 : 201).json({
      success: true,
      message: existingSubmission ? 'Assignment updated successfully' : 'Assignment submitted successfully',
      data: { submission: submissionWithDetails }
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check if assignment exists and user is the teacher
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [{
        model: Course,
        as: 'course'
      }]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (assignment.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view submissions for your own assignments'
      });
    }

    const { count, rows: submissions } = await Submission.findAndCountAll({
      where: { assignmentId: assignmentId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'profilePicture']
        },
        {
          model: Grade,
          as: 'grade',
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['submittedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          course: assignment.course.title
        },
        submissions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get assignment submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get submissions'
    });
  }
};

const getStudentSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: submissions } = await Submission.findAndCountAll({
      where: { studentId: req.user.id },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          include: [{
            model: Course,
            as: 'course',
            attributes: ['id', 'title']
          }]
        },
        {
          model: Grade,
          as: 'grade',
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['submittedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get student submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get submissions'
    });
  }
};

const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findByPk(id, {
      include: [
        {
          model: Assignment,
          as: 'assignment',
          include: [{
            model: Course,
            as: 'course'
          }]
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Grade,
          as: 'grade',
          required: false
        }
      ]
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check permissions
    const hasAccess = (
      req.user.role === 'teacher' && submission.assignment.teacherId === req.user.id
    ) || (
      req.user.role === 'student' && submission.studentId === req.user.id
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this submission'
      });
    }

    res.json({
      success: true,
      data: { submission }
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get submission'
    });
  }
};

const downloadSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findByPk(id, {
      include: [{
        model: Assignment,
        as: 'assignment'
      }]
    });

    if (!submission || !submission.filePath) {
      return res.status(404).json({
        success: false,
        message: 'Submission file not found'
      });
    }

    // Check permissions
    const hasAccess = (
      req.user.role === 'teacher' && submission.assignment.teacherId === req.user.id
    ) || (
      req.user.role === 'student' && submission.studentId === req.user.id
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this file'
      });
    }

    if (!fs.existsSync(submission.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(submission.filePath, submission.fileName);
  } catch (error) {
    console.error('Download submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
};

module.exports = {
  submitAssignment,
  getAssignmentSubmissions,
  getStudentSubmissions,
  getSubmissionById,
  downloadSubmission
};
