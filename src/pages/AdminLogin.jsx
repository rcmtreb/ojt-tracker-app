import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ojttrackerapp@gmail.com';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const user = (() => {
      try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
    })();
    if (token && user?.email === ADMIN_EMAIL) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/auth/google`, {
        credential: credentialResponse.credential,
      });
      const { token, user } = res.data;
      if (user.email !== ADMIN_EMAIL) {
        setError('Access Denied. This panel is restricted to administrators only.');
        setIsLoading(false);
        return;
      }
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      navigate('/admin', { replace: true });
    } catch {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2.5 bg-emerald-950/60 border border-emerald-800/50 px-4 py-2 rounded-full backdrop-blur-md">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest">OJT TRACKER V1.4.0</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800/70 rounded-[2.5rem] p-8 sm:p-10 backdrop-blur-xl shadow-2xl shadow-slate-950/80">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">Admin Panel</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Restricted access. Sign in with the authorized administrator Google account to continue.
            </p>
          </div>

          {/* Error Card */}
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-950/40 border border-red-800/50 rounded-2xl p-4">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-xs font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {/* Google Sign In */}
          <div className="flex flex-col items-center gap-4">
            {isLoading ? (
              <div className="flex items-center gap-3 text-slate-400 text-sm font-medium py-3">
                <svg className="w-5 h-5 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying credentials...
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                theme="filled_black"
                shape="pill"
                size="large"
                text="signin_with"
              />
            )}
          </div>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <p className="text-slate-600 text-xs">
              Not an administrator?{' '}
              <a href="/" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Go to Student Login
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          © 2026 OJT Tracker System • Developed by <span className="text-slate-500 font-semibold">Alberto Rili</span>
        </p>
      </div>
    </div>
  );
}
