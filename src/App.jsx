import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Terms from './pages/Terms';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

// NOTE: You must create a project in Google Cloud Console, 
// enable Google People API, and get a Client ID.
const GOOGLE_CLIENT_ID = "1021240931407-d22o1pbm1c10jpsor4qc2irfmu66fmel.apps.googleusercontent.com";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ojttrackerapp@gmail.com';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const hasUser = user && user !== 'null' && user !== 'undefined';
  if (!token || !hasUser) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
  })();
  if (!token || user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/admin-login" replace />;
  }
  return children;
};

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/terms" element={<Terms />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
