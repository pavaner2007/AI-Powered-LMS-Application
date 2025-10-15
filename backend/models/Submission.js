const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Submission = sequelize.define(
  'Submission',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    assignmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assignment_id', // ✅ snake_case
      references: {
        model: 'assignments',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'student_id', // ✅ snake_case
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    submissionDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'submission_date',
    },
    status: {
      type: DataTypes.ENUM('submitted', 'late', 'graded'),
      defaultValue: 'submitted',
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'file_path',
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'file_name',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isLate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_late',
    },
    submittedAt: {
      type: DataTypes.DATE,
      field: 'submitted_at',
      allowNull: true,
    },
  },
  {
    tableName: 'submissions',
    timestamps: true,
    underscored: true, // ✅ ensures consistency
    indexes: [
      { fields: ['assignment_id'] },
      { fields: ['student_id'] },
      {
        unique: true,
        name: 'submissions_assignment_student_idx',
        fields: ['assignment_id', 'student_id'], // ✅ corrected
      },
    ],
  }
);

module.exports = Submission;
