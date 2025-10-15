const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Grade = sequelize.define(
  'Grade',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    submissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'submission_id', // ✅ correct snake_case
      references: {
        model: 'submissions',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'teacher_id', // ✅ correct snake_case
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    points: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    maxPoints: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: 'max_points',
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    letterGrade: {
      type: DataTypes.ENUM(
        'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'
      ),
      field: 'letter_grade',
      allowNull: true,
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gradedAt: {
      type: DataTypes.DATE,
      field: 'graded_at',
      allowNull: true,
    },
    isFinal: {
      type: DataTypes.BOOLEAN,
      field: 'is_final',
      defaultValue: true,
    },
  },
  {
    tableName: 'grades',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['submission_id'] },
      {
        unique: true,
        name: 'grades_submission_idx', // ✅ corrected unique key
        fields: ['submission_id'],
      },
    ],
  }
);

module.exports = Grade;
