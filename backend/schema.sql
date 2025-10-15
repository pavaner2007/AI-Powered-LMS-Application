-- LMS Database Schema
-- Run this script to create the database and tables

CREATE DATABASE IF NOT EXISTS lms_db;
USE lms_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'teacher') NOT NULL DEFAULT 'student',
  is_active BOOLEAN DEFAULT TRUE,
  profile_picture VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  duration INT NOT NULL COMMENT 'Duration in hours',
  teacher_id INT NOT NULL,
  category VARCHAR(100),
  level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
  is_active BOOLEAN DEFAULT TRUE,
  max_students INT,
  thumbnail VARCHAR(255),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_category (category),
  INDEX idx_level (level),
  INDEX idx_is_active (is_active)
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrollment_date DATE DEFAULT (CURRENT_DATE),
  status ENUM('active', 'completed', 'dropped') DEFAULT 'active',
  completion_date DATE,
  progress DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Progress percentage 0.00-100.00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id),
  INDEX idx_student_id (student_id),
  INDEX idx_course_id (course_id),
  INDEX idx_status (status)
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  course_id INT NOT NULL,
  teacher_id INT NOT NULL,
  due_date DATETIME NOT NULL,
  max_points INT NOT NULL DEFAULT 100,
  instructions TEXT,
  attachments JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_course_id (course_id),
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_due_date (due_date)
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('submitted', 'late', 'graded') DEFAULT 'submitted',
  file_path VARCHAR(255),
  file_name VARCHAR(255),
  file_size INT,
  content TEXT COMMENT 'For text submissions',
  is_late BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_submission (assignment_id, student_id),
  INDEX idx_assignment_id (assignment_id),
  INDEX idx_student_id (student_id),
  INDEX idx_status (status)
);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL UNIQUE,
  teacher_id INT NOT NULL,
  points DECIMAL(5,2) NOT NULL,
  max_points DECIMAL(5,2) NOT NULL,
  percentage DECIMAL(5,2),
  letter_grade ENUM('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'),
  feedback TEXT,
  graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_final BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_teacher_id (teacher_id)
);

-- Insert sample data
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@lms.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6fYzK1QZwK', 'teacher'),
('John Teacher', 'john@lms.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6fYzK1QZwK', 'teacher'),
('Jane Student', 'jane@lms.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6fYzK1QZwK', 'student'),
('Bob Student', 'bob@lms.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6fYzK1QZwK', 'student');

INSERT INTO courses (title, description, duration, teacher_id, category, level) VALUES
('Introduction to Programming', 'Learn the basics of programming with hands-on exercises', 40, 2, 'Computer Science', 'beginner'),
('Advanced Web Development', 'Master modern web development techniques', 60, 2, 'Web Development', 'advanced'),
('Data Structures and Algorithms', 'Deep dive into DSA concepts', 80, 2, 'Computer Science', 'intermediate');

INSERT INTO enrollments (student_id, course_id, status) VALUES
(3, 1, 'active'),
(3, 2, 'active'),
(4, 1, 'active'),
(4, 3, 'completed');

INSERT INTO assignments (title, description, course_id, teacher_id, due_date, max_points) VALUES
('Hello World Program', 'Write your first program that prints Hello World', 1, 2, DATE_ADD(NOW(), INTERVAL 7 DAY), 50),
('Build a Calculator', 'Create a simple calculator application', 1, 2, DATE_ADD(NOW(), INTERVAL 14 DAY), 100),
('Portfolio Website', 'Design and develop a personal portfolio website', 2, 2, DATE_ADD(NOW(), INTERVAL 21 DAY), 150);

-- Note: Password for all sample users is 'password123'
-- In production, use proper password hashing
