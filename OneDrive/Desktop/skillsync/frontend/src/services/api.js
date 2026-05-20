import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('skillsync-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const stored = localStorage.getItem('skillsync-auth');
        if (stored) {
          const { state } = JSON.parse(stored);
          if (state?.refreshToken) {
            const response = await axios.post('/api/auth/refresh', {
              refreshToken: state.refreshToken
            });

            const { accessToken } = response.data;
            const parsed = JSON.parse(stored);
            parsed.state.accessToken = accessToken;
            localStorage.setItem('skillsync-auth', JSON.stringify(parsed));

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        localStorage.removeItem('skillsync-auth');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// API service modules
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me')
};

export const projectsAPI = {
  list: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  getTasks: (id) => api.get(`/projects/${id}/tasks`),
  addMilestone: (id, data) => api.post(`/projects/${id}/milestones`, data)
};

export const tasksAPI = {
  list: (params) => api.get('/tasks', { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  updatePosition: (id, data) => api.patch(`/tasks/${id}/position`, data),
  addContribution: (id, data) => api.post(`/tasks/${id}/contributions`, data)
};

export const leavesAPI = {
  list: (params) => api.get('/leaves', { params }),
  create: (data) => api.post('/leaves', data),
  approve: (id, data) => api.patch(`/leaves/${id}/approve`, data),
  getRedistributions: (id) => api.get(`/leaves/${id}/redistribution`),
  respondToRedistribution: (id, data) => api.patch(`/leaves/redistribution/${id}/respond`, data)
};

export const peerReviewsAPI = {
  submit: (data) => api.post('/peer-reviews', data),
  myReviews: () => api.get('/peer-reviews/my-reviews'),
  userReviews: (userId) => api.get(`/peer-reviews/user/${userId}`),
  pending: () => api.get('/peer-reviews/pending')
};

export const timeTrackingAPI = {
  log: (data) => api.post('/time-tracking/log', data),
  myLogs: (params) => api.get('/time-tracking/my-logs', { params }),
  team: (params) => api.get('/time-tracking/team', { params }),
  trend: (params) => api.get('/time-tracking/productivity-trend', { params })
};

export const aiAPI = {
  skills: (userId) => api.get(`/ai/skills/${userId}`),
  extractSkills: (userId) => api.post(`/ai/skills/${userId}/extract`),
  teamChemistry: (projectId) => api.get(`/ai/team-chemistry/${projectId}`),
  teamRecommendations: (data) => api.post('/ai/team-recommendations', data),
  burnout: (userId) => api.get(`/ai/burnout/${userId}`),
  teamBurnout: () => api.get('/ai/burnout-team'),
  compensation: (userId) => api.get(`/ai/compensation/${userId}`),
  compensationTeam: () => api.get('/ai/compensation-team'),
  orgInsights: () => api.get('/ai/org-insights'),
  skillGraph: (userId) => api.get(`/ai/skill-graph/${userId}`),
  runAllAgents: (data) => api.post('/ai/run-all-agents', data)
};

export const dashboardAPI = {
  employee: () => api.get('/dashboard/employee'),
  manager: () => api.get('/dashboard/manager'),
  admin: () => api.get('/dashboard/admin')
};

export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  workload: (id) => api.get(`/users/${id}/workload`)
};

export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

export const compensationAPI = {
  list: (params) => api.get('/compensation', { params }),
  review: (id, data) => api.patch(`/compensation/${id}/review`, data)
};

export const departmentsAPI = {
  list: () => api.get('/departments'),
  create: (data) => api.post('/departments', data)
};
