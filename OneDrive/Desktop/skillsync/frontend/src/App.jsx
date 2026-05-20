import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import Layout from './components/layout/Layout';
import LoadingScreen from './components/ui/LoadingScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const KanbanBoard = lazy(() => import('./pages/KanbanBoard'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const TeamAnalytics = lazy(() => import('./pages/TeamAnalytics'));
const SkillGraph = lazy(() => import('./pages/SkillGraph'));
const BurnoutMonitor = lazy(() => import('./pages/BurnoutMonitor'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const CompensationDashboard = lazy(() => import('./pages/CompensationDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const TimeTracking = lazy(() => import('./pages/TimeTracking'));
const PeerReviews = lazy(() => import('./pages/PeerReviews'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      cacheTime: 300000,
      refetchOnWindowFocus: false
    }
  }
});

function AppRoutes() {
  const { user, isAuthenticated } = useAuthStore();

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'manager': return '/manager';
      default: return '/dashboard';
    }
  };

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={getDashboardPath()} replace />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Employee routes */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['employee', 'manager', 'admin']}><EmployeeDashboard /></ProtectedRoute>} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/kanban" element={<KanbanBoard />} />
        <Route path="/time-tracking" element={<TimeTracking />} />
        <Route path="/peer-reviews" element={<PeerReviews />} />
        <Route path="/leaves" element={<LeaveManagement />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/skill-graph" element={<SkillGraph />} />

        {/* Manager routes */}
        <Route path="/manager" element={<ProtectedRoute roles={['manager', 'admin']}><ManagerDashboard /></ProtectedRoute>} />
        <Route path="/team-analytics" element={<ProtectedRoute roles={['manager', 'admin']}><TeamAnalytics /></ProtectedRoute>} />
        <Route path="/burnout-monitor" element={<ProtectedRoute roles={['manager', 'admin']}><BurnoutMonitor /></ProtectedRoute>} />
        <Route path="/ai-insights" element={<ProtectedRoute roles={['manager', 'admin']}><AIInsights /></ProtectedRoute>} />
        <Route path="/compensation" element={<ProtectedRoute roles={['manager', 'admin']}><CompensationDashboard /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      </Route>

      <Route path="/" element={<Navigate to={getDashboardPath()} replace />} />
      <Route path="*" element={<Navigate to={getDashboardPath()} replace />} />
    </Routes>
  );
}

export default function App() {
  const { isDark } = useThemeStore();

  return (
    <div className={isDark ? 'dark' : ''}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <AppRoutes />
          </Suspense>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: isDark ? '#1e293b' : '#fff',
                color: isDark ? '#f1f5f9' : '#0f172a',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: '12px',
                fontSize: '14px'
              }
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </div>
  );
}
