import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

export const attendanceAPI = {
  generateCode: (data) => api.post('/attendance/generate-code', data),
  verifyCode: (data) => api.post('/attendance/verify-code', data),
  checkIn: (data) => api.post('/attendance/check-in', data),
  updateLocation: (data) => api.post('/attendance/update-location', data),
  getSessionDetails: (sessionId) => api.get(`/attendance/session/${sessionId}`),
  getActiveSessions: () => api.get('/attendance/active-sessions'),
  getAttendanceHistory: (courseId) => api.get('/attendance/history', { params: { courseId } })
};

export const courseAPI = {
  createCourse: (data) => api.post('/courses', data),
  getCourses: () => api.get('/courses'),
  getCourse: (id) => api.get(`/courses/${id}`),
  enrollStudent: (courseId, studentId) => api.post(`/courses/${courseId}/enroll`, { studentId }),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data)
};

export default api;