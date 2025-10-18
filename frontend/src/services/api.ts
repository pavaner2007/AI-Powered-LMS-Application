import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import {
  LoginData,
  RegisterData,
  UpdateProfileData,
  User,
  Course,
  Enrollment,
  Assignment,
  Submission,
  Grade,
} from '../types';

// ===============================
// ✅ Base API configuration
// ===============================
const API_BASE_URL = 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===============================
// ✅ Request interceptor: Add auth token
// ===============================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig<any>): InternalAxiosRequestConfig<any> => {
    const token = localStorage.getItem('token');
    if (token) {
      // Axios v1+ uses AxiosHeaders class internally, so cast safely
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


// ===============================
// ✅ Response interceptor: Handle unauthorized access
// ===============================
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===============================
// ✅ Helper to safely extract data
// ===============================
const extractData = (response: AxiosResponse<any>) =>
  response.data?.data ?? response.data;

// ===============================
// ✅ AUTH API
// ===============================
export const authAPI = {
  login: async (data: LoginData): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/login', data);
    return extractData(response);
  },

  register: async (data: RegisterData): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/register', data);
    return extractData(response);
  },

  refreshToken: async (): Promise<{ token: string }> => {
    const response = await api.post('/auth/refresh');
    return extractData(response);
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    return extractData(response);
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const response = await api.put('/auth/profile', data);
    return extractData(response);
  },
};

// ===============================
// ✅ COURSES API
// ===============================
export const coursesAPI = {
  getAllCourses: async (): Promise<Course[]> => {
    const response = await api.get('/courses');
    return extractData(response).courses;
  },

  getCourse: async (id: number): Promise<Course> => {
    const response = await api.get(`/courses/${id}`);
    return extractData(response).course;
  },

  createCourse: async (data: { title: string; description: string }): Promise<Course> => {
    const response = await api.post('/courses', data);
    return extractData(response);
  },

  updateCourse: async (
    id: number,
    data: { title: string; description: string }
  ): Promise<Course> => {
    const response = await api.put(`/courses/${id}`, data);
    return extractData(response);
  },

  deleteCourse: async (id: number): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },
};

// ===============================
// ✅ ENROLLMENTS API
// ===============================
export const enrollmentsAPI = {
  getEnrollments: async (): Promise<Enrollment[]> => {
    const response = await api.get('/enrollments');
    return extractData(response).enrollments;
  },

  enrollInCourse: async (courseId: number): Promise<Enrollment> => {
    const response = await api.post('/enrollments', { course_id: courseId });
    return extractData(response).enrollment;
  },

  unenrollFromCourse: async (courseId: number): Promise<void> => {
    await api.delete(`/enrollments/${courseId}`);
  },
};

// ===============================
// ✅ ASSIGNMENTS API
// ===============================
export const assignmentsAPI = {
  getAssignments: async (courseId?: number): Promise<Assignment[]> => {
    const params = courseId ? { course_id: courseId } : {};
    const response = await api.get('/assignments', { params });
    return extractData(response);
  },

  getAssignment: async (id: number): Promise<Assignment> => {
    const response = await api.get(`/assignments/${id}`);
    return extractData(response);
  },

  createAssignment: async (data: {
    course_id: number;
    title: string;
    description: string;
    due_date: string;
    max_score: number;
  }): Promise<Assignment> => {
    const response = await api.post('/assignments', data);
    return extractData(response);
  },

  updateAssignment: async (
    id: number,
    data: Partial<{
      title: string;
      description: string;
      due_date: string;
      max_score: number;
    }>
  ): Promise<Assignment> => {
    const response = await api.put(`/assignments/${id}`, data);
    return extractData(response);
  },

  deleteAssignment: async (id: number): Promise<void> => {
    await api.delete(`/assignments/${id}`);
  },
};

// ===============================
// ✅ SUBMISSIONS API
// ===============================
export const submissionsAPI = {
  getSubmissions: async (assignmentId?: number): Promise<Submission[]> => {
    const params = assignmentId ? { assignment_id: assignmentId } : {};
    const response = await api.get('/submissions', { params });
    return extractData(response);
  },

  getSubmission: async (id: number): Promise<Submission> => {
    const response = await api.get(`/submissions/${id}`);
    return extractData(response);
  },

  submitAssignment: async (data: {
    assignment_id: number;
    submission_file?: File;
    submission_text?: string;
  }): Promise<Submission> => {
    const formData = new FormData();
    formData.append('assignment_id', data.assignment_id.toString());
    if (data.submission_file) formData.append('submission_file', data.submission_file);
    if (data.submission_text) formData.append('submission_text', data.submission_text);

    const response = await api.post('/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData(response);
  },

  updateSubmission: async (
    id: number,
    data: { submission_file?: File; submission_text?: string }
  ): Promise<Submission> => {
    const formData = new FormData();
    if (data.submission_file) formData.append('submission_file', data.submission_file);
    if (data.submission_text) formData.append('submission_text', data.submission_text);

    const response = await api.put(`/submissions/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData(response);
  },
};

// ===============================
// ✅ GRADES API
// ===============================
export const gradesAPI = {
  getGrades: async (submissionId?: number): Promise<Grade[]> => {
    const params = submissionId ? { submission_id: submissionId } : {};
    const response = await api.get('/grades', { params });
    return extractData(response);
  },

  getGrade: async (id: number): Promise<Grade> => {
    const response = await api.get(`/grades/${id}`);
    return extractData(response);
  },

  createGrade: async (data: {
    submission_id: number;
    score: number;
    feedback?: string;
  }): Promise<Grade> => {
    const response = await api.post('/grades', data);
    return extractData(response);
  },

  updateGrade: async (
    id: number,
    data: { score: number; feedback?: string }
  ): Promise<Grade> => {
    const response = await api.put(`/grades/${id}`, data);
    return extractData(response);
  },
};

export default api;
