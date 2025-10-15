import React from 'react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: number) => void;
  onView?: (courseId: number) => void;
  isEnrolled?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onEnroll,
  onView,
  isEnrolled = false,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{course.title}</h3>
      <p className="text-gray-600 mb-4 line-clamp-3">{course.description}</p>

      {course.teacher && (
        <p className="text-sm text-gray-500 mb-4">
          Teacher: {course.teacher.name}
        </p>
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Created: {new Date(course.created_at).toLocaleDateString()}
        </span>

        <div className="flex space-x-2">
          {onView && (
            <button
              onClick={() => onView(course.id)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
            >
              View
            </button>
          )}

          {onEnroll && !isEnrolled && (
            <button
              onClick={() => onEnroll(course.id)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              Enroll
            </button>
          )}

          {isEnrolled && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              Enrolled
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
