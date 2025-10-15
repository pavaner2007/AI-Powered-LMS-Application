const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Course = require('./Course');
const Enrollment = require('./Enrollment');
const Assignment = require('./Assignment');
const Submission = require('./Submission');
const Grade = require('./Grade');

// Define associations
// User associations
User.hasMany(Course, { foreignKey: 'teacher_id', as: 'taughtCourses' });
User.hasMany(Enrollment, { foreignKey: 'student_id', as: 'enrollments' });
User.hasMany(Assignment, { foreignKey: 'teacher_id', as: 'createdAssignments' });
User.hasMany(Submission, { foreignKey: 'student_id', as: 'submissions' });
User.hasMany(Grade, { foreignKey: 'teacher_id', as: 'givenGrades' });

// Course associations
Course.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });
Course.hasMany(Enrollment, { foreignKey: 'course_id', as: 'enrollments' });
Course.hasMany(Assignment, { foreignKey: 'course_id', as: 'assignments' });

// Enrollment associations
Enrollment.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// Assignment associations
Assignment.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Assignment.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });
Assignment.hasMany(Submission, { foreignKey: 'assignment_id', as: 'submissions' });

// Submission associations
Submission.belongsTo(Assignment, { foreignKey: 'assignment_id', as: 'assignment' });
Submission.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
Submission.hasOne(Grade, { foreignKey: 'submission_id', as: 'grade' });

// Grade associations
Grade.belongsTo(Submission, { foreignKey: 'submission_id', as: 'submission' });
Grade.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });

module.exports = {
  sequelize,
  User,
  Course,
  Enrollment,
  Assignment,
  Submission,
  Grade
};
