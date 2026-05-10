import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

function Login() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Detect In-App Browsers (Facebook, Instagram, TikTok, etc.)
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isAppBrowser = /FBAN|FBAV|Instagram|TikTok|Line|Snapchat|LinkedIn/i.test(ua);
    setIsInAppBrowser(isAppBrowser);

    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
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
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    setError('Google Sign-In failed.');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Left Side: Branding & Info */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600 p-12 lg:p-24 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full -mr-48 -mt-48 opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600 rounded-full -ml-48 -mb-48 opacity-50 blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 mb-8">
            <Clock className="w-5 h-5 text-blue-100" />
            <span className="text-blue-50 text-xs font-bold uppercase tracking-widest">OJT TRACKER V1.0</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] mb-6">
            Master your <br /> <span className="text-blue-200">duty hours</span> with ease.
          </h1>
          <p className="text-blue-100 text-lg max-w-md leading-relaxed">
            The professional standard for students to centralize daily time records, task documentation, and report generation.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <p className="text-white font-bold text-2xl">100%</p>
            <p className="text-blue-100 text-xs uppercase font-black tracking-widest opacity-70">Secure & Private</p>
          </div>
          <div className="space-y-2">
            <p className="text-white font-bold text-2xl">Instant</p>
            <p className="text-blue-100 text-xs uppercase font-black tracking-widest opacity-70">PDF Generation</p>
          </div>
        </div>
      </div>

      {/* Right Side: Login Card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-white md:bg-transparent">
        <div className="max-w-md w-full">
          <div className="md:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <Clock className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">OJT Tracker</h1>
          </div>

          {isInAppBrowser && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500 bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 shadow-lg shadow-amber-100/50">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-amber-900 font-black text-sm uppercase tracking-tight mb-1">In-App Browser Detected</h3>
                  <p className="text-amber-700 text-xs leading-relaxed font-medium">
                    Google Login may not work inside this app. For a better experience, please tap the <span className="font-black underline">three dots (...)</span> or <span className="font-black underline">Share icon</span> and select <span className="font-black underline">"Open in Browser"</span> (Chrome or Safari).
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] shadow-2xl md:shadow-xl p-8 lg:p-10 border border-gray-100">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
              <p className="text-gray-500 text-sm">Sign in with your Google account to access your dashboard.</p>
            </div>

            <div className="space-y-6 mb-10">
              {[
                "Log your duty hours accurately",
                "Attach documentary proof",
                "Generate school reports"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                    <CheckCircle className="w-4 h-4 text-blue-600 group-hover:text-white" />
                  </div>
                  <span className="text-gray-700 font-medium">{text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="relative flex items-start gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 group transition-all hover:border-blue-200">
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={agreed} 
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                  className="mt-1 w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none leading-snug">
                  I agree to the <Link to="/terms" className="text-blue-600 font-bold hover:underline">Terms and Conditions</Link> regarding data privacy.
                </label>
              </div>

              <div className={`transition-all duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="relative">
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
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl border border-red-100 text-center">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-10 pt-8 border-t border-gray-100 text-center">
              <div className="inline-flex items-center gap-2 text-gray-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Protected by Google OAuth</span>
              </div>
            </div>
          </div>
          
          <p className="mt-8 text-center text-gray-400 text-xs">
            © 2026 OJT Tracker System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
