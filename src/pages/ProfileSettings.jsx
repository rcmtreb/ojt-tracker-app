import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Clock, ArrowLeft, Sun, Moon, LogOut, Building2,
  FileSpreadsheet, Settings, User as UserIcon, Check, Loader2, Crown, Trophy,
  Medal, Hand, Code2, FileText, Palette, Wrench, ClipboardList, ShieldCheck,
  TrendingUp, Download
} from 'lucide-react';
import { API_URL } from '../config';

const SKILL_CATEGORIES = [
  { id: 'Development', label: 'Development & Engineering', icon: Code2, color: 'bg-emerald-500', bar: 'from-emerald-500 to-teal-500' },
  { id: 'Documentation', label: 'Documentation & Reports', icon: FileText, color: 'bg-teal-500', bar: 'from-teal-500 to-cyan-500' },
  { id: 'Design', label: 'Design & Prototyping', icon: Palette, color: 'bg-purple-500', bar: 'from-purple-500 to-indigo-500' },
  { id: 'Support', label: 'System Maintenance & Support', icon: Wrench, color: 'bg-amber-500', bar: 'from-amber-500 to-orange-500' },
  { id: 'Admin', label: 'Administrative & Meetings', icon: ClipboardList, color: 'bg-slate-500', bar: 'from-slate-500 to-slate-600' },
];

function getRankBadge(pct) {
  if (pct >= 100) return { label: 'Overachieving Master', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50' };
  if (pct >= 75)  return { label: 'OJT Specialist',       icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50' };
  if (pct >= 25)  return { label: 'Dedicated Apprentice', icon: Medal,  color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50' };
  return               { label: 'Rookie Trainee',         icon: Hand,   color: 'text-slate-500',   bg: 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/50' };
}

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') === 'settings' ? 'settings' : 'profile');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'settings' || tabParam === 'profile') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored && stored !== 'null' ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [settingsForm, setSettingsForm] = useState({
    companyName: '',
    department: '',
    supervisorName: '',
    courseProgram: '',
    targetHours: 486,
    defaultStartTime: '08:00',
    defaultEndTime: '17:00',
    defaultBreakDuration: 60,
    includeSignatureBlock: true
  });
  const [initialSettingsForm, setInitialSettingsForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDirty = useMemo(() => {
    if (!initialSettingsForm) return false;
    return JSON.stringify(settingsForm) !== JSON.stringify(initialSettingsForm);
  }, [settingsForm, initialSettingsForm]);

  // Sync theme class to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  }, [navigate]);

  // Fetch student profile and duty records
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [profileRes, recordsRes] = await Promise.all([
          axios.get(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/records`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (profileRes.data) {
          const p = profileRes.data;
          setUser(prev => ({ ...prev, ...p }));
          const loaded = {
            companyName: p.companyName || '',
            department: p.department || '',
            supervisorName: p.supervisorName || '',
            courseProgram: p.courseProgram || '',
            targetHours: p.targetHours || 486,
            defaultStartTime: p.defaultStartTime || '08:00',
            defaultEndTime: p.defaultEndTime || '17:00',
            defaultBreakDuration: p.defaultBreakDuration ?? 60,
            includeSignatureBlock: p.includeSignatureBlock ?? true
          };
          setSettingsForm(loaded);
          setInitialSettingsForm(loaded);
        }
        if (Array.isArray(recordsRes.data)) {
          setRecords(recordsRes.data);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          handleLogout();
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigate, handleLogout]);

  const handleSaveSettings = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(`${API_URL}/user/settings`, settingsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.user) {
        setUser(prev => ({ ...prev, ...res.data.user }));
        if (res.data.user.targetHours) {
          localStorage.setItem('targetHours', String(res.data.user.targetHours));
        }
      }
      setInitialSettingsForm({ ...settingsForm });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) {
      alert('No duty records to export.');
      return;
    }
    const headers = ['Date', 'Day', 'Start Time', 'End Time', 'Break (mins)', 'Total Hours', 'Category', 'Task Description'];
    const rows = records.map(r => {
      const d = new Date(r.date);
      const dateStr = d.toLocaleDateString('en-US');
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      return [
        `"${dateStr}"`,
        `"${dayStr}"`,
        `"${r.startTime || ''}"`,
        `"${r.endTime || ''}"`,
        r.breakDuration || 0,
        parseFloat(r.totalHours || 0).toFixed(2),
        `"${r.category || ''}"`,
        `"${(r.taskDescription || '').replace(/"/g, '""')}"`
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `OJT_Duty_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregated progress and skill calculations
  const totalWorked = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
  const targetHours = settingsForm.targetHours || 486;
  const progressPct = Math.min((totalWorked / targetHours) * 100, 100);
  const remainingHours = Math.max(targetHours - totalWorked, 0);
  const rank = getRankBadge(progressPct);
  const RankIcon = rank.icon;

  const categoryTotals = {};
  records.forEach(r => {
    if (r.category) {
      categoryTotals[r.category] = (categoryTotals[r.category] || 0) + (r.totalHours || 0);
    }
  });

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-sans pb-16 transition-colors duration-300">
      
      {/* Ambient backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[60vh] left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <nav className="glass-panel dark:glass-panel-dark border-b border-slate-200/50 dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-9 h-9 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">OJT<span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Tracker</span></span>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="hidden sm:flex text-xs font-extrabold text-emerald-600 dark:text-emerald-400 items-center gap-1">
                  <Check className="w-4 h-4" /> Saved!
                </span>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={!isDirty || isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  isDirty && !isSaving
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300/40 dark:border-slate-700/40'
                }`}
                title={isDirty ? 'Save changes to system' : 'No changes made yet'}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>

              <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-500" />}
              </button>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-800/50 transition-all cursor-pointer">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400 dark:text-slate-500">
            <Loader2 className="w-9 h-9 animate-spin text-emerald-500" />
            <p className="font-extrabold text-sm">Loading your profile & settings...</p>
          </div>
        ) : (
          <>
            {/* Hero Profile Header Banner */}
            <div className="bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                
                {/* Student Info */}
                <div className="flex items-center gap-5">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow-md" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md">
                      <UserIcon className="w-10 h-10" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{user?.name || 'Student Trainee'}</h1>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
                        <ShieldCheck className="w-3 h-3" /> Student
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-3">{user?.email}</p>

                    {/* Rank Badge */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-extrabold border ${rank.bg} ${rank.color}`}>
                      <RankIcon className="w-4 h-4" />
                      <span>{rank.label}</span>
                    </div>
                  </div>
                </div>

                {/* Back to Dashboard CTA */}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/50 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Duty Dashboard</span>
                </Link>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-extrabold text-sm transition-all border-b-2 -mb-[2px] cursor-pointer ${activeTab === 'profile' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900/80 shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Profile & Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-extrabold text-sm transition-all border-b-2 -mb-[2px] cursor-pointer ${activeTab === 'settings' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900/80 shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <Settings className="w-4 h-4" />
                <span>Account & Preferences</span>
              </button>
            </div>

            {/* TAB 1: Profile & Overview */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                
                {/* Stats & Progress Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Progress Card */}
                  <div className="bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Duty Completion Progress</span>
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{progressPct.toFixed(1)}%</span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden mb-4">
                      <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Logged</p>
                        <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">{totalWorked.toFixed(1)} <span className="text-xs text-slate-400 font-normal">hrs</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Target Goal</p>
                        <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">{targetHours} <span className="text-xs text-slate-400 font-normal">hrs</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Remaining</p>
                        <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{remainingHours.toFixed(1)} <span className="text-xs text-slate-400 font-normal">hrs</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Chip */}
                  <div className="bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Duty Logs</p>
                      <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{records.length} <span className="text-sm text-slate-400 font-normal">entries</span></p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Average Shift Length</p>
                      <p className="text-lg font-extrabold text-slate-700 dark:text-slate-300">{records.length ? (totalWorked / records.length).toFixed(1) : 0} hrs/shift</p>
                    </div>
                  </div>
                </div>

                {/* Internship & Academic Info Cards */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-500" />
                      <span>Internship & Academic Information</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Edit Information →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Company / Host Establishment</p>
                      <p className="font-extrabold text-slate-900 dark:text-white text-sm">{settingsForm.companyName || 'Not configured'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Department / Division</p>
                      <p className="font-extrabold text-slate-900 dark:text-white text-sm">{settingsForm.department || 'Not configured'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Industry Supervisor</p>
                      <p className="font-extrabold text-slate-900 dark:text-white text-sm">{settingsForm.supervisorName || 'Not configured'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Course & Program</p>
                      <p className="font-extrabold text-slate-900 dark:text-white text-sm">{settingsForm.courseProgram || 'Not configured'}</p>
                    </div>
                  </div>
                </div>

                {/* Skill Competency Breakdown */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-500" />
                    <span>Skill Competency Breakdown</span>
                  </h3>
                  <div className="space-y-3">
                    {SKILL_CATEGORIES.map(cat => {
                      const hrs = categoryTotals[cat.id] || 0;
                      const catPct = totalWorked > 0 ? (hrs / totalWorked) * 100 : 0;
                      const Icon = cat.icon;
                      return (
                        <div key={cat.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                              <Icon className="w-4 h-4 text-slate-400" />
                              {cat.label}
                            </div>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">{hrs.toFixed(1)} hrs <span className="text-slate-400 font-normal">({catPct.toFixed(0)}%)</span></span>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className={`h-2 rounded-full bg-gradient-to-r ${cat.bar} transition-all duration-500`} style={{ width: `${catPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Account & Preferences Settings */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                
                {/* Internship & Academic Settings Form */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-500" />
                    <span>Internship & Academic Profile</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-5">These details automatically populate official DTR PDF headers & footers.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Company / Host Training Establishment (HTE)</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Innovations Corp."
                        value={settingsForm.companyName}
                        onChange={e => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/40 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Department / Division</label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineering & IT Operations"
                        value={settingsForm.department}
                        onChange={e => setSettingsForm({ ...settingsForm, department: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/40 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Industry Supervisor Name & Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Engr. John Doe (Tech Lead)"
                        value={settingsForm.supervisorName}
                        onChange={e => setSettingsForm({ ...settingsForm, supervisorName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/40 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Course / Degree Program</label>
                      <input
                        type="text"
                        placeholder="e.g. BS Information Technology - 4th Year"
                        value={settingsForm.courseProgram}
                        onChange={e => setSettingsForm({ ...settingsForm, courseProgram: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/40 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Target Hours & Shift Auto-Fill Defaults */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-teal-500" />
                    <span>Target Hours & Shift Auto-Fill Defaults</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-5">Set default shift times to auto-fill new daily log entries faster.</p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Required OJT Target Hours</label>
                      <input
                        type="number"
                        value={settingsForm.targetHours}
                        onChange={e => setSettingsForm({ ...settingsForm, targetHours: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/40 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Default Start Time</label>
                        <input
                          type="time"
                          value={settingsForm.defaultStartTime}
                          onChange={e => setSettingsForm({ ...settingsForm, defaultStartTime: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/40 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Default End Time</label>
                        <input
                          type="time"
                          value={settingsForm.defaultEndTime}
                          onChange={e => setSettingsForm({ ...settingsForm, defaultEndTime: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/40 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Default Break (Mins)</label>
                        <input
                          type="number"
                          value={settingsForm.defaultBreakDuration}
                          onChange={e => setSettingsForm({ ...settingsForm, defaultBreakDuration: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/40 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Preferences & Data Management */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                    <span>PDF Options & Data Management</span>
                  </h3>

                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Supervisor Signature Line on PDF</p>
                      <p className="text-xs text-slate-400 mt-0.5">Render a formal Industry Supervisor signature line at the bottom of generated DTR PDFs.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.includeSignatureBlock}
                      onChange={e => setSettingsForm({ ...settingsForm, includeSignatureBlock: e.target.checked })}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Export Duty Logs to CSV</p>
                      <p className="text-xs text-slate-400 mt-0.5">Download all {records.length} logged duty entries as a spreadsheet file (.csv).</p>
                    </div>
                    <button
                      onClick={exportCSV}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/50 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Save Bar */}
                <div className="flex items-center justify-between pt-2">
                  {saveSuccess ? (
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Settings Saved Successfully!
                    </span>
                  ) : <span />}
                  <button
                    onClick={handleSaveSettings}
                    disabled={!isDirty || isSaving}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-xs transition-all ${
                      isDirty && !isSaving
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300/40 dark:border-slate-700/40'
                    }`}
                    title={isDirty ? 'Save changes to system' : 'No changes made yet'}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
