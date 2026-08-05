import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center transition-colors">
      <h1 className="text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">404</h1>
      <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Page Not Found</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
        The requested URL was not found on this server.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-sm"
      >
        Go Back Home
      </button>
    </div>
  );
}
