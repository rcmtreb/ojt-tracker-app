import { useNavigate } from 'react-router-dom';
import { Home, ShieldOff } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Error icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-[1.75rem] flex items-center justify-center shadow-xl">
            <ShieldOff className="w-9 h-9 text-slate-500" />
          </div>
        </div>

        {/* 404 */}
        <h1 className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-600 to-slate-800 tracking-tight mb-3 select-none">
          404
        </h1>

        <h2 className="text-xl font-extrabold text-white tracking-tight mb-3">
          Page Not Found
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
          The page you are looking for does not exist or has been moved. Please check the URL and try again.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-extrabold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-extrabold text-sm text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-slate-200 transition-all active:scale-95 cursor-pointer"
          >
            Go Back
          </button>
        </div>

        {/* Footer */}
        <p className="text-slate-700 text-xs mt-12">
          © 2026 OJT Tracker System • Developed by{' '}
          <span className="text-slate-600 font-semibold">Alberto Rili</span>
        </p>
      </div>
    </div>
  );
}
