const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Enrollment = sequelize.define(
  'Enrollment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'student_id', // ✅ use correct DB column name
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'course_id', // ✅ use correct DB column name
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    enrollmentDate: {
      type: DataTypes.DATE,
      field: 'enrollment_date',
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'dropped'),
      defaultValue: 'active',
    },
    completionDate: {
      type: DataTypes.DATE,
      field: 'completion_date',
      allowNull: true,
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.0,
    },
  },
  {
    tableName: 'enrollments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        name: 'enrollments_student_course_idx', // ✅ give explicit name
        fields: ['student_id', 'course_id'], // ✅ use actual DB columns
      },
    ],
  }
);

module.exports = Enrollment;
