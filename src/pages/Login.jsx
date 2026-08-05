import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, ShieldCheck, CheckCircle, AlertTriangle, Sun, Moon } from 'lucide-react';

import { API_URL } from '../config';

function Login() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) return storedTheme;
    return 'light'; // Default to light
  });
  const [isInAppBrowser] = useState(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /FBAN|FBAV|Instagram|TikTok|Line|Snapchat|LinkedIn/i.test(ua);
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const hasUser = user && user !== 'null' && user !== 'undefined';
    console.log("Login Mount: token =", token, "user =", user, "hasUser =", hasUser);
    if (token && hasUser) {
      console.log("Login: redirecting to /dashboard");
      navigate('/dashboard');
    } else {
      console.log("Login: session invalid, clearing");
      if (token) localStorage.removeItem('token');
      if (user) localStorage.removeItem('user');
    }
  }, [navigate]);

  const handleSuccess = async (response) => {
    if (!agreed) {
      setError('Please agree to the Terms and Conditions first.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/google`, {
        credential: response.credential
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      console.error('Login Error:', err);
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    setError('Google Sign-In failed.');
  };

  return (
    <div className="min-h-screen md:h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col md:flex-row font-sans overflow-x-hidden md:overflow-hidden relative transition-colors duration-300">
      
      {/* Decorative background blobs for the entire screen (visible behind panels) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>

      {/* Left Side: Branding & Info */}
      <div className="hidden md:flex md:w-1/2 p-8 lg:p-14 flex-col justify-between relative overflow-hidden bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-colors duration-300">
        
        {/* Floating gradient ambient blobs in background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full -mr-48 -mt-48 opacity-70 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full -ml-48 -mb-48 opacity-70 blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
        
        <div className="relative z-10 animate-slide-up">
          <div className="inline-flex items-center gap-3 bg-slate-100/80 dark:bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 mb-6 lg:mb-10">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-widest">OJT TRACKER V1.4.0</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4 lg:mb-6 tracking-tight">
            Master your <br /> 
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">duty hours</span> <br />
            with absolute ease.
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm lg:text-base max-w-md leading-relaxed">
            The professional dashboard for students to log hours, document daily task completions, and generate beautiful, compliance-ready reports.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-800 pt-6 animate-slide-up delay-100">
          <div className="space-y-1">
            <p className="text-slate-900 dark:text-white font-extrabold text-2xl lg:text-3xl tracking-tight">100%</p>
            <p className="text-slate-450 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">Secure & Protected</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-900 dark:text-white font-extrabold text-2xl lg:text-3xl tracking-tight">Instant</p>
            <p className="text-slate-450 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">DTR PDF Export</p>
          </div>
        </div>
      </div>

      {/* Right Side: Login Card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-12 z-10 overflow-y-auto">
        <div className="max-w-md w-full animate-scale-up">
          
          {/* Mobile Branding */}
          <div className="md:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl mb-4">
              <Clock className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">OJT Tracker</h1>
          </div>

          {isInAppBrowser && (
            <div className="mb-6 animate-fade-in bg-amber-50 dark:bg-amber-950/40 backdrop-blur-md border border-amber-500/20 rounded-3xl p-5 shadow-lg">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-550 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-amber-600 dark:text-amber-300 font-extrabold text-sm uppercase tracking-tight mb-1">In-App Browser Detected</h3>
                  <p className="text-amber-800 dark:text-amber-200/80 text-xs leading-relaxed">
                    Google Login may not work inside this app. Please tap the <span className="font-extrabold underline text-amber-650 text-amber-600 dark:text-amber-200">three dots (...)</span> or <span className="font-extrabold underline text-amber-650 text-amber-600 dark:text-amber-200">Share icon</span> and select <span className="font-extrabold underline text-amber-650 text-amber-600 dark:text-amber-200">"Open in Browser"</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Container with Glassmorphism */}
          <div className="glass-panel dark:glass-panel-dark rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden transition-colors">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>
            
            <div className="flex justify-between items-start mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Welcome Back!</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in with your Google account to access your dashboard.</p>
              </div>
              <button 
                onClick={toggleTheme}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl transition-all cursor-pointer shadow-sm dark:shadow-none flex-shrink-0"
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-500" />}
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {[
                "Log your duty hours accurately",
                "Attach documentary proof",
                "Generate school reports"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 group-hover:bg-emerald-600 group-hover:border-emerald-500 transition-all duration-300">
                    <CheckCircle className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  </div>
                  <span className="text-slate-650 text-slate-600 dark:text-slate-300 text-sm font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="relative flex items-start gap-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={agreed} 
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                  className="mt-0.5 w-5 h-5 text-emerald-600 rounded-lg focus:ring-emerald-500/20 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none leading-relaxed">
                  I agree to the <Link to="/terms" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline hover:text-emerald-500 dark:hover:text-emerald-300">Terms and Conditions</Link> regarding data privacy and consent.
                </label>
              </div>

              <div className={`transition-all duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="relative flex justify-center w-full transition-all">
                  <GoogleLogin 
                    onSuccess={handleSuccess} 
                    onError={handleError}
                    useOneTap
                    theme="filled_blue"
                    shape="pill"
                    text="continue_with"
                    width="100%"
                  />
                  {isLoading && (
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center pointer-events-none">
                      <div className="w-5 h-5 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="animate-fade-in bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-300 text-xs font-semibold p-4 rounded-2xl border border-red-200 dark:border-red-500/20 text-center">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
              <div className="inline-flex items-center gap-2 text-slate-500">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] uppercase font-bold tracking-widest">Protected by Google OAuth</span>
              </div>
            </div>
          </div>
          
          <p className="mt-8 text-center text-slate-500 text-xs">
            © 2026 OJT Tracker System • Developed by <span className="font-bold text-slate-700 dark:text-slate-300">Alberto Rili</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
