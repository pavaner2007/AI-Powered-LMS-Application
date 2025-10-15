import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { coursesAPI, enrollmentsAPI } from '../services/api';
import { Course, Enrollment } from '../types';
import CourseCard from '../components/CourseCard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesData, enrollmentsData] = await Promise.all([
          coursesAPI.getAllCourses(),
          enrollmentsAPI.getEnrollments(),
        ]);
        setCourses(coursesData);
        setEnrollments(enrollmentsData);
      } catch (err: any) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEnroll = async (courseId: number) => {
    try {
      await enrollmentsAPI.enrollInCourse(courseId);
      // Refresh enrollments
      const enrollmentsData = await enrollmentsAPI.getEnrollments();
      setEnrollments(enrollmentsData);
    } catch (err: any) {
      setError('Failed to enroll in course');
    }
  };

  const enrolledCourseIds = enrollments.map(e => e.course_id);
  const availableCourses = courses.filter(course => !enrolledCourseIds.includes(course.id));
  const enrolledCourses = courses.filter(course => enrolledCourseIds.includes(course.id));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Welcome back, {user?.name}!
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Enrolled Courses */}
      {enrolledCourses.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isEnrolled={true}
                onView={(id) => window.location.href = `/courses/${id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Courses */}
      {availableCourses.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Available Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onEnroll={handleEnroll}
                onView={(id) => window.location.href = `/courses/${id}`}
              />
            ))}
          </div>
        </div>
      )}

      {enrolledCourses.length === 0 && availableCourses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No courses available at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
