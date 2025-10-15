export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  bio?: string;
  profile_image?: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  teacher_id: number;
  teacher?: User;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  enrolled_at: string;
  student?: User;
  course?: Course;
}

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  created_at: string;
  updated_at: string;
  course?: Course;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  submission_file?: string;
  submission_text?: string;
  submitted_at: string;
  assignment?: Assignment;
  student?: User;
}

export interface Grade {
  id: number;
  submission_id: number;
  score: number;
  feedback?: string;
  graded_at: string;
  graded_by: number;
  submission?: Submission;
  grader?: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'teacher';
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
}
