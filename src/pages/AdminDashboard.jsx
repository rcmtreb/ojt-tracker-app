import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LayoutDashboard, Users, FileText, LogOut, Menu, X,
  ShieldCheck, Clock, TrendingUp, Activity, Search,
  ChevronRight, ChevronLeft, Medal, Trophy, Crown, Briefcase,
  Code2, Palette, Wrench, ClipboardList, Download, Loader2,
  Calendar, BarChart3, Hand, RotateCcw, Trash2, Archive, AlertTriangle, CheckCircle2, Pencil, Building2, GraduationCap, CalendarDays, Plus
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';

import { API_URL } from '../config';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ojttrackerapp@gmail.com';

const CHART_COLORS = ['#10b981', '#14b8a6', '#a855f7', '#f59e0b', '#64748b'];
const RANK_COLORS = { 'Overachieving Master': '#f59e0b', 'OJT Specialist': '#10b981', 'Dedicated Apprentice': '#3b82f6', 'Rookie Trainee': '#64748b' };

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

// ─── PDF Helpers ─────────────────────────────────────────────────────────────
function formatTime(t) { return t || '--:--'; }

function buildDTRPdf(doc, student, records, startY = 14) {
  const name = student.name || 'Student';
  const totalHrs = parseFloat(student.totalHours || 0).toFixed(2);
  const target = student.targetHours || 486;
  const pct = Math.min(((student.totalHours / target) * 100), 999).toFixed(1);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DAILY TIME RECORD', 105, startY, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Official OJT Duty Log', 105, startY + 5, { align: 'center' });

  // Student info box
  const infoY = startY + 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, infoY, 182, 18, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('STUDENT NAME', 18, infoY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(name, 18, infoY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL HOURS LOGGED', 80, infoY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`${totalHrs} hrs`, 80, infoY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PROGRESS', 148, infoY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`${pct}% of ${target} hrs`, 148, infoY + 10);

  // Table
  const tableY = infoY + 22;
  const tableRows = records.map(r => {
    const d = new Date(r.date);
    const dateStr = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    return [
      dateStr,
      dayStr,
      formatTime(r.startTime),
      '',
      '',
      formatTime(r.endTime),
      `${parseFloat(r.totalHours || 0).toFixed(2)} hrs`
    ];
  });

  autoTable(doc, {
    startY: tableY,
    head: [['DATE', 'DAY', 'TIME IN', 'TIME OUT', 'TIME IN', 'TIME OUT', 'HOURS']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 6: { fontStyle: 'bold', textColor: [5, 150, 105] } },
    margin: { left: 14, right: 14 },
  });

  return doc.lastAutoTable.finalY;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [adminUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [editingTargetId, setEditingTargetId] = useState(null);
  const [targetInputVal, setTargetInputVal] = useState('');
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerStudent, setDrawerStudent] = useState(null);
  const [drawerRecords, setDrawerRecords] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerViewTab, setDrawerViewTab] = useState('logs'); // 'logs' | 'calendar'
  const [drawerCalendarDate, setDrawerCalendarDate] = useState(() => new Date());
  const [cardSelectedBatch, setCardSelectedBatch] = useState({});
  const [drawerBatchFilter, setDrawerBatchFilter] = useState('all');
  const [exportingId, setExportingId] = useState(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [drawerPage, setDrawerPage] = useState(1);

  const authHeader = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('admin_token')}`
  }), []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin-login', { replace: true });
  }, [navigate]);

  // Fetch stats + students on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const user = (() => { try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; } })();
    if (!token || user?.email !== ADMIN_EMAIL) {
      navigate('/admin-login', { replace: true });
      return;
    }
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [statsRes, usersRes, archivedRes] = await Promise.all([
          axios.get(`${API_URL}/admin/stats`, { headers: authHeader() }),
          axios.get(`${API_URL}/admin/users`, { headers: authHeader() }),
          axios.get(`${API_URL}/admin/users/archived`, { headers: authHeader() }),
        ]);
        setStats(statsRes.data);
        setStudents(usersRes.data);
        setArchivedStudents(archivedRes.data);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [authHeader, handleLogout, navigate]);

  const handleSoftDelete = async (student) => {
    if (!student) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/admin/users/${student._id}`, { headers: authHeader() });
      setUserToDelete(null);
      if (drawerStudent?._id === student._id) setDrawerStudent(null);
      setToastMessage({ type: 'success', text: `${student.name || 'Account'} moved to trash. Automatically purged in 30 days unless restored.` });

      const [statsRes, usersRes, archivedRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, { headers: authHeader() }),
        axios.get(`${API_URL}/admin/users`, { headers: authHeader() }),
        axios.get(`${API_URL}/admin/users/archived`, { headers: authHeader() })
      ]);
      setStats(statsRes.data);
      setStudents(usersRes.data);
      setArchivedStudents(archivedRes.data);
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete student account.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (student) => {
    setRestoringId(student._id);
    try {
      await axios.patch(`${API_URL}/admin/users/${student._id}/restore`, {}, { headers: authHeader() });
      setToastMessage({ type: 'success', text: `${student.name || 'Account'} and all records successfully restored!` });

      const [statsRes, usersRes, archivedRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, { headers: authHeader() }),
        axios.get(`${API_URL}/admin/users`, { headers: authHeader() }),
        axios.get(`${API_URL}/admin/users/archived`, { headers: authHeader() })
      ]);
      setStats(statsRes.data);
      setStudents(usersRes.data);
      setArchivedStudents(archivedRes.data);
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.message || 'Failed to restore student account.' });
    } finally {
      setRestoringId(null);
    }
  };

  const handleUpdateTarget = async (studentId, newTarget, batchNumber) => {
    const parsed = parseFloat(newTarget);
    if (isNaN(parsed) || parsed <= 0) {
      setToastMessage({ type: 'error', text: 'Target hours must be a positive number.' });
      return;
    }
    setIsUpdatingTarget(true);
    try {
      await axios.patch(`${API_URL}/admin/users/${studentId}/target`, { targetHours: parsed, batchNumber }, { headers: authHeader() });
      setToastMessage({ type: 'success', text: `Target hours updated to ${parsed} hrs!` });
      setEditingTargetId(null);

      // Real-time local state update
      setStudents(prev => prev.map(s => {
        if (s._id === studentId) {
          const bNum = batchNumber !== undefined ? parseInt(batchNumber) : (s.currentBatch || 1);
          if (bNum === (s.currentBatch || 1)) {
            return { ...s, targetHours: parsed };
          } else {
            const updatedHist = (s.internshipHistory || []).map(h => h.batchNumber === bNum ? { ...h, targetHours: parsed } : h);
            return { ...s, internshipHistory: updatedHist };
          }
        }
        return s;
      }));

      if (drawerStudent?._id === studentId) {
        setDrawerStudent(prev => {
          if (!prev) return null;
          const bNum = batchNumber !== undefined ? parseInt(batchNumber) : (prev.currentBatch || 1);
          if (bNum === (prev.currentBatch || 1)) {
            return { ...prev, targetHours: parsed };
          } else {
            const updatedHist = (prev.internshipHistory || []).map(h => h.batchNumber === bNum ? { ...h, targetHours: parsed } : h);
            return { ...prev, internshipHistory: updatedHist };
          }
        });
      }
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update target hours.' });
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleToggleStudentCompletion = async (student) => {
    const nextStatus = student.ojtStatus === 'completed' ? 'in_progress' : 'completed';
    try {
      await axios.patch(
        `${API_URL}/admin/users/${student._id}/completion`,
        { ojtStatus: nextStatus, completedAtDate: new Date().toISOString().split('T')[0] },
        { headers: authHeader() }
      );
      setToastMessage({
        type: 'success',
        text: `Updated ${student.name || 'Student'} status to ${nextStatus === 'completed' ? 'Completed' : 'In Progress'}`
      });
      const usersRes = await axios.get(`${API_URL}/admin/users`, { headers: authHeader() });
      setStudents(usersRes.data);
      if (drawerStudent?._id === student._id) {
        setDrawerStudent(prev => prev ? { ...prev, ojtStatus: nextStatus, completedAtDate: new Date().toISOString().split('T')[0] } : null);
      }
    } catch {
      setToastMessage({ type: 'error', text: 'Failed to update student completion status.' });
    }
  };

  const handleAdminStartNewOJT = async (student) => {
    try {
      await axios.post(
        `${API_URL}/admin/users/${student._id}/start-new-ojt`,
        {},
        { headers: authHeader() }
      );
      setToastMessage({
        type: 'success',
        text: `Started new OJT internship batch for ${student.name || 'Student'}`
      });
      const usersRes = await axios.get(`${API_URL}/admin/users`, { headers: authHeader() });
      setStudents(usersRes.data);
    } catch {
      setToastMessage({ type: 'error', text: 'Failed to start new OJT for student.' });
    }
  };

  // Open student drawer
  const openDrawer = async (student) => {
    setDrawerStudent(student);
    setDrawerRecords([]);
    setDrawerPage(1);
    setDrawerLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/users/${student._id}/records`, { headers: authHeader() });
      setDrawerRecords(res.data);
    } catch {
      setDrawerRecords([]);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Per-student PDF export
  const exportStudentPDF = async (student) => {
    setExportingId(student._id);
    try {
      const res = await axios.get(`${API_URL}/admin/users/${student._id}/records`, { headers: authHeader() });
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      buildDTRPdf(doc, student, res.data);
      doc.save(`DTR_${(student.name || 'Student').replace(/\s+/g, '_')}.pdf`);
    } catch { /* silent */ } finally {
      setExportingId(null);
    }
  };

  // Combined all-students PDF export
  const exportAllPDF = async () => {
    setExportingAll(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Cover page
      doc.setFillColor(5, 150, 105);
      doc.rect(0, 0, 210, 60, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text('OJT TRACKER SYSTEM', 105, 30, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Combined Daily Time Record — All Students', 105, 40, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(209, 250, 229);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 105, 50, { align: 'center' });

      // Summary table
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Students Overview', 14, 78);
      autoTable(doc, {
        startY: 83,
        head: [['#', 'Student Name', 'Email', 'Records', 'Total Hours', 'Progress']],
        body: students.map((s, i) => [
          i + 1,
          s.name || '',
          s.email || '',
          s.totalRecords,
          `${s.totalHours} hrs`,
          `${Math.min(((s.totalHours / (s.targetHours || 486)) * 100), 999).toFixed(1)}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });

      // Per-student DTR pages
      for (const student of students) {
        const res = await axios.get(`${API_URL}/admin/users/${student._id}/records`, { headers: authHeader() });
        doc.addPage();
        buildDTRPdf(doc, student, res.data, 14);
      }

      doc.save(`OJT_Combined_DTR_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch { /* silent */ } finally {
      setExportingAll(false);
    }
  };

  // Filtered students (searches Name, Email, Company, Course)
  const STUDENTS_PER_PAGE = 6;
  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.courseProgram || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [students, search]);

  const totalStudentPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * STUDENTS_PER_PAGE;
    return filteredStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [filteredStudents, studentPage]);

  // Reset student page on search change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStudentPage(1);
  }, [search]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'trash', label: `Trash / Archived (${archivedStudents.length})`, icon: Archive },
  ];

  // ─── Sub-renders ─────────────────────────────────────────────────────────────
  const renderStats = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: 'Total Students', value: stats?.totalStudents ?? '—', icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
        { label: 'Combined Duty Hours', value: stats ? `${stats.totalHours} hrs` : '—', icon: Clock, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40' },
        { label: 'Avg Hours / Student', value: stats ? `${stats.avgHoursPerStudent} hrs` : '—', icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
        { label: 'Active This Month', value: stats?.activeThisMonth ?? '—', icon: Activity, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
      ].map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderStudentTable = (list) => (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800/70">
              <th className="text-left px-5 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student</th>
              <th className="text-left px-5 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden md:table-cell">Rank</th>
              <th className="text-left px-5 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Progress</th>
              <th className="text-left px-5 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden lg:table-cell">Last Active</th>
              <th className="px-5 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm font-medium">No students found.</td></tr>
            )}
            {list.map(student => {
              const target = student.targetHours || 486;
              const pct = Math.min((student.totalHours / target) * 100, 100);
              // Rank uses lifetime hours so a new batch doesn't reset rank to Rookie
              const lifetimeTarget = (student.targetHours || 486) + (student.internshipHistory || []).reduce((sum, h) => sum + (h.targetHours || 486), 0);
              const lifetimePct = lifetimeTarget > 0 ? Math.min((student.lifetimeTotalHours / lifetimeTarget) * 100, 100) : 0;
              const rank = getRankBadge(lifetimePct);
              const RankIcon = rank.icon;
              return (
                <tr key={student._id} className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {student.picture ? (
                        <img src={student.picture} alt={student.name} className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">{student.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[160px]">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-xl text-[10px] font-extrabold ${rank.bg} ${rank.color}`}>
                      <RankIcon className="w-3 h-3" />
                      {rank.label}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 min-w-[160px]">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 min-w-[70px] text-right">
                        {student.totalHours} <span className="text-slate-400 font-medium">/ {target}h</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {student.lastActive
                        ? new Date(student.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'No records'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDrawer(student)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/50 transition-all cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <button
                        onClick={() => exportStudentPDF(student)}
                        disabled={exportingId === student._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {exportingId === student._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                      <button
                        onClick={() => setUserToDelete(student)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-800/50 transition-all cursor-pointer"
                        title="Move Account to Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStudentCards = (list, currentPage, totalPages, totalCount, onPageChange) => {
    const startIdx = (currentPage - 1) * STUDENTS_PER_PAGE;
    const endIdx = Math.min(startIdx + STUDENTS_PER_PAGE, totalCount);

    return (
      <div className="space-y-6">
        {totalCount === 0 ? (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
            No student profiles match your search criteria.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {list.map(student => {
                const activeBatchNum = cardSelectedBatch[student._id] || student.currentBatch || 1;
                const historyList = student.internshipHistory || [];
                const hasMultipleBatches = historyList.length > 0 || (student.currentBatch && student.currentBatch > 1);

                let displayCompany = student.companyName;
                let displayDept = student.department;
                let displaySupervisor = student.supervisorName;
                let displayCourse = student.courseProgram;
                let displayTarget = student.targetHours || 486;
                let displayWorked = student.currentBatchHours !== undefined ? student.currentBatchHours : student.totalHours;
                let displayCompleted = student.ojtStatus === 'completed';
                let displayCompletedDate = student.completedAtDate;
                let displayRecordCount = student.totalRecords;

                if (activeBatchNum !== (student.currentBatch || 1)) {
                  const histItem = historyList.find(h => h.batchNumber === activeBatchNum);
                  if (histItem) {
                    displayCompany = histItem.companyName || displayCompany;
                    displayDept = histItem.department || displayDept;
                    displaySupervisor = histItem.supervisorName || displaySupervisor;
                    displayCourse = histItem.courseProgram || displayCourse;
                    displayTarget = histItem.targetHours || displayTarget;
                    displayWorked = histItem.totalHours !== undefined ? histItem.totalHours : 0;
                    displayRecordCount = histItem.recordCount !== undefined ? histItem.recordCount : '—';
                    displayCompleted = true;
                    displayCompletedDate = histItem.completedAtDate;
                  }
                }

                const pct = Math.min((displayWorked / displayTarget) * 100, 100);
                // Rank uses lifetime hours so a new batch doesn't reset rank to Rookie
                const lifetimeTarget = (student.targetHours || 486) + (student.internshipHistory || []).reduce((sum, h) => sum + (h.targetHours || 486), 0);
                const lifetimePct = lifetimeTarget > 0 ? Math.min((student.lifetimeTotalHours / lifetimeTarget) * 100, 100) : 0;
                const rank = getRankBadge(lifetimePct);
                const RankIcon = rank.icon;

                return (
                  <div key={student._id} className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      {/* Header: Student Info & Rank */}
                      <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-3.5">
                          {student.picture ? (
                            <img src={student.picture} alt={student.name} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 flex-shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                              <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">{student.name || 'Unknown Student'}</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[200px] mt-0.5">{student.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {student.currentBatch > 1 && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg text-[9px] font-extrabold">
                              OJT Batch #{student.currentBatch}
                            </span>
                          )}
                          <div className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-xl text-[10px] font-extrabold ${rank.bg} ${rank.color}`}>
                            <RankIcon className="w-3.5 h-3.5" />
                            <span>{rank.label}</span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Batch Selector Dropdown if multiple batches */}
                      {hasMultipleBatches && (
                        <div className="flex items-center justify-between gap-2 mb-4 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Select OJT Batch:</span>
                          <select
                            value={activeBatchNum}
                            onChange={e => setCardSelectedBatch(prev => ({ ...prev, [student._id]: parseInt(e.target.value) }))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none cursor-pointer"
                          >
                            <option value={student.currentBatch || 1}>
                              OJT Batch #{student.currentBatch || 1} (Current: {student.companyName || 'Active'})
                            </option>
                            {historyList.map(h => (
                              <option key={h.batchNumber} value={h.batchNumber}>
                                OJT Batch #{h.batchNumber} (Completed: {h.companyName || 'Past OJT'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Completion Status Badge if Completed */}
                      {displayCompleted && (
                        <div className="flex items-center gap-2 mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <div className="text-xs font-extrabold text-emerald-800 dark:text-emerald-200">
                            <span>OJT Completed</span>
                            {displayCompletedDate && (
                              <span className="font-normal text-[11px] text-emerald-600 dark:text-emerald-400 ml-1.5">
                                ({new Date(displayCompletedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Internship & Academic Info Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                            <Building2 className="w-3 h-3 text-emerald-500" />
                            <span>Company / HTE</span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{displayCompany || 'Not configured'}</p>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                            <GraduationCap className="w-3 h-3 text-purple-500" />
                            <span>Course & Year</span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{displayCourse || 'Not configured'}</p>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                            <Briefcase className="w-3 h-3 text-teal-500" />
                            <span>Department</span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{displayDept || 'Not configured'}</p>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                            <Users className="w-3 h-3 text-amber-500" />
                            <span>Supervisor</span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{displaySupervisor || 'Not configured'}</p>
                        </div>
                      </div>

                      {/* Duty Hours & Responsive Progress */}
                      <div className="mb-5 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center justify-between text-xs font-extrabold mb-1.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">{displayRecordCount} duty records</span>
                          <span className="text-slate-900 dark:text-white">{displayWorked} / {displayTarget} hrs <span className="text-emerald-600 dark:text-emerald-400">({pct.toFixed(1)}%)</span></span>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
                          <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          <span>Last Active: {student.lastActive ? new Date(student.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No records'}</span>
                          {student.lifetimeTotalHours !== undefined && (
                            <span className="font-bold text-slate-600 dark:text-slate-400">Total Lifetime: {student.lifetimeTotalHours} hrs</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openDrawer(student)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/50 transition-all cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>View Duty Logs</span>
                      </button>

                      <button
                        onClick={() => {
                          openDrawer(student);
                          setEditingTargetId(student._id);
                          setTargetInputVal(String(displayTarget || 486));
                          setDrawerBatchFilter(String(activeBatchNum));
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                        title="Edit Target Hours"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleStudentCompletion(student)}
                        className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                          student.ojtStatus === 'completed'
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title={student.ojtStatus === 'completed' ? 'Reopen Training (In Progress)' : 'Mark OJT as Completed'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleAdminStartNewOJT(student)}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                        title="Start New OJT Internship Batch"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </button>

                      <button
                        onClick={() => exportStudentPDF(student)}
                        disabled={exportingId === student._id}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                        title="Export DTR PDF"
                      >
                        {exportingId === student._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setUserToDelete(student)}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-800/50 transition-all cursor-pointer"
                        title="Move Account to Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Showing <span className="font-bold text-slate-900 dark:text-white">{startIdx + 1}</span>–<span className="font-bold text-slate-900 dark:text-white">{endIdx}</span> of <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> students
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        pageNum === currentPage
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ─── Chart data helpers ───────────────────────────────────────────────────
  const hoursBarData = students
    .slice()
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 10)
    .map(s => ({
      name: (s.name || 'Unknown').split(' ')[0],
      hours: parseFloat(s.totalHours),
    }));

  const categoryDonutData = (() => {
    const totals = {};
    students.forEach(s => {
      Object.entries(s.categories || {}).forEach(([cat, hrs]) => {
        totals[cat] = (totals[cat] || 0) + hrs;
      });
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(1)) }));
  })();

  const rankPieData = (() => {
    const counts = { 'Overachieving Master': 0, 'OJT Specialist': 0, 'Dedicated Apprentice': 0, 'Rookie Trainee': 0 };
    students.forEach(s => {
      const lifetimeTarget = (s.targetHours || 486) + (s.internshipHistory || []).reduce((sum, h) => sum + (h.targetHours || 486), 0);
      const lifetimePct = lifetimeTarget > 0 ? (s.lifetimeTotalHours / lifetimeTarget) * 100 : 0;
      const rank = lifetimePct >= 100 ? 'Overachieving Master' : lifetimePct >= 75 ? 'OJT Specialist' : lifetimePct >= 25 ? 'Dedicated Apprentice' : 'Rookie Trainee';
      counts[rank]++;
    });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  })();

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-xs">
        {label && <p className="font-extrabold text-slate-700 dark:text-slate-300 mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || p.fill }} className="font-bold">
            {p.name}: {p.value}{p.name === 'hours' || p.dataKey === 'hours' ? ' hrs' : ''}
          </p>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) return null;
    switch (activeSection) {
      case 'overview': return (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Platform Overview</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">All registered students and combined duty hour analytics.</p>
          </div>
          {renderStats()}

          {/* ── Charts Row ── */}
          {students.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">

              {/* Bar Chart — Hours per Student */}
              <div className="xl:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">Hours per Student</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Top 10 by total duty hours logged</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hoursBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                    <Bar dataKey="hours" name="hours" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Donut Chart — Skill Category Breakdown */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 rounded-2xl p-5 shadow-sm flex flex-col">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 bg-purple-50 dark:bg-purple-950/40 rounded-xl flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">Skill Breakdown</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Combined category distribution</p>
                  </div>
                </div>
                {categoryDonutData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoryDonutData} cx="50%" cy="45%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                        {categoryDonutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium">No category data yet</div>
                )}
              </div>
            </div>
          )}

          {/* Rank Distribution */}
          {students.length > 0 && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 rounded-2xl p-5 shadow-sm mb-8">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">Rank Distribution</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Trainee achievement tier breakdown</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[{ rank: 'Overachieving Master', icon: Crown }, { rank: 'OJT Specialist', icon: Trophy }, { rank: 'Dedicated Apprentice', icon: Medal }, { rank: 'Rookie Trainee', icon: Hand }].map(({ rank, icon: RIcon }) => {
                  const count = rankPieData.find(r => r.name === rank)?.value || 0;
                  const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                  return (
                    <div key={rank} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <RIcon className="w-4 h-4" style={{ color: RANK_COLORS[rank] }} />
                        <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight">{rank}</p>
                      </div>
                      <p className="text-2xl font-extrabold tracking-tight" style={{ color: RANK_COLORS[rank] }}>{count}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{pct}% of students</p>
                      <div className="mt-2 bg-slate-200 dark:bg-slate-700 rounded-full h-1 overflow-hidden">
                        <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: RANK_COLORS[rank] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <h3 className="text-base font-extrabold text-slate-700 dark:text-slate-200 mb-4">All Students</h3>
          {renderStudentTable(students)}
        </div>
      );
      case 'students': return (
        <div>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Students</h2>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">{students.length} registered trainees</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-full sm:w-64 transition-all"
              />
            </div>
          </div>
          {renderStudentCards(paginatedStudents, studentPage, totalStudentPages, filteredStudents.length, setStudentPage)}
        </div>
      );
      case 'reports': return (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Reports & PDF Export</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Generate official DTR reports per student or a combined export.</p>
          </div>

          {/* Combined Export */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 mb-6 text-white shadow-lg shadow-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-emerald-100 text-[10px] uppercase font-extrabold tracking-widest mb-1">Combined Export</p>
              <h3 className="text-lg font-extrabold">All Students Combined DTR PDF</h3>
              <p className="text-emerald-100 text-xs mt-1">Generates a cover page + summary table + individual DTR pages for all {students.length} students in one PDF document.</p>
            </div>
            <button
              onClick={exportAllPDF}
              disabled={exportingAll || students.length === 0}
              className="flex items-center gap-2.5 bg-white/20 hover:bg-white/30 border border-white/30 px-5 py-3 rounded-xl font-extrabold text-sm transition-all disabled:opacity-50 cursor-pointer flex-shrink-0 backdrop-blur-sm"
            >
              {exportingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportingAll ? 'Generating...' : 'Export All'}
            </button>
          </div>

          {/* Per-student export */}
          <h3 className="text-base font-extrabold text-slate-700 dark:text-slate-200 mb-4">Per-Student PDF Export</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => {
              const target = student.targetHours || 486;
              const pct = Math.min((student.totalHours / target) * 100, 100);
              // Rank uses lifetime hours so a new batch doesn't reset rank to Rookie
              const lifetimeTarget = (student.targetHours || 486) + (student.internshipHistory || []).reduce((sum, h) => sum + (h.targetHours || 486), 0);
              const lifetimePct = lifetimeTarget > 0 ? Math.min((student.lifetimeTotalHours / lifetimeTarget) * 100, 100) : 0;
              const rank = getRankBadge(lifetimePct);
              const RankIcon = rank.icon;
              return (
                <div key={student._id} className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    {student.picture
                      ? <img src={student.picture} alt={student.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800" />
                      : <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><Users className="w-5 h-5 text-emerald-500" /></div>}
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{student.name}</p>
                      <div className={`inline-flex items-center gap-1 mt-0.5 border px-2 py-0.5 rounded-lg text-[9px] font-extrabold ${rank.bg} ${rank.color}`}>
                        <RankIcon className="w-2.5 h-2.5" />
                        {rank.label}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{student.totalRecords} records</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{student.totalHours} / {target} hrs</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mb-4">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <button
                    onClick={() => exportStudentPDF(student)}
                    disabled={exportingId === student._id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {exportingId === student._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {exportingId === student._id ? 'Generating...' : 'Export DTR PDF'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
      case 'trash': return (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Trash / Archived Accounts</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Deleted accounts remain accessible for 30 days before MongoDB automatically purges them permanently. You can restore them anytime during this grace period.</p>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/70">
                    <th className="text-left px-5 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student</th>
                    <th className="text-left px-5 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden md:table-cell">Deleted Date</th>
                    <th className="text-left px-5 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Grace Period</th>
                    <th className="px-5 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedStudents.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm font-medium">Trash is empty. No deleted accounts found.</td></tr>
                  )}
                  {archivedStudents.map(student => {
                    const deletedDate = student.deletedAt ? new Date(student.deletedAt) : new Date();
                    const daysPassed = Math.floor((new Date() - deletedDate) / (1000 * 60 * 60 * 24));
                    const daysRemaining = Math.max(0, 30 - daysPassed);
                    return (
                      <tr key={student._id} className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {student.picture ? (
                              <img src={student.picture} alt={student.name} className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <Users className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-extrabold text-slate-900 dark:text-white text-sm">{student.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[160px]">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {deletedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                            <Clock className="w-3 h-3" />
                            Purges in {daysRemaining} days
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRestore(student)}
                              disabled={restoringId === student._id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/50 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {restoringId === student._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                              <span>Restore Account</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-sans flex transition-colors duration-300">

      {/* ── Sidebar Overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 z-40 flex flex-col
        bg-white dark:bg-slate-900 border-r border-slate-200/70 dark:border-slate-800
        shadow-xl shadow-slate-200/30 dark:shadow-none
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none lg:z-20
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 dark:text-white text-sm leading-none">Admin Panel</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mt-0.5">v1.4.0</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Admin Profile Chip */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
            {adminUser?.picture
              ? <img src={adminUser.picture} alt={adminUser.name} className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-200 dark:ring-emerald-800 flex-shrink-0" />
              : <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-4 h-4 text-emerald-600" /></div>}
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{adminUser?.name || 'Admin'}</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Administrator</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveSection(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all cursor-pointer text-left ${
                activeSection === id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {activeSection === id && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer - Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-3">© 2026 OJT Tracker System</p>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 shadow-sm shadow-slate-100/40 dark:shadow-none flex items-center gap-4 px-5 py-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
              <BarChart3 className="w-4 h-4" />
              <span>Admin Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white text-sm capitalize">{activeSection}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>{students.length} students</span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-5 sm:p-7 overflow-x-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400 dark:text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <p className="font-extrabold text-sm">Loading admin dashboard...</p>
            </div>
          ) : renderContent()}
        </main>
      </div>

      {/* ── Student Records Drawer ── */}
      {drawerStudent && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-50" onClick={() => setDrawerStudent(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-slide-in-right border-l border-slate-200 dark:border-slate-800">

            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex-shrink-0">
              <div className="flex items-center gap-3">
                {drawerStudent.picture
                  ? <img src={drawerStudent.picture} alt={drawerStudent.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700" />
                  : <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center"><Users className="w-5 h-5 text-emerald-500" /></div>}
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">{drawerStudent.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{drawerStudent.email}</p>
                </div>
              </div>
              <button onClick={() => setDrawerStudent(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-sm font-medium">Loading records...</p>
                </div>
              ) : (
                <>
                  {/* Target Hours Edit Card */}
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Required Target Hours</p>
                      {(() => {
                        const activeDrawerBatchNum = drawerBatchFilter === 'all' ? (drawerStudent.currentBatch || 1) : parseInt(drawerBatchFilter);
                        const displayedTarget = activeDrawerBatchNum === (drawerStudent.currentBatch || 1)
                          ? (drawerStudent.targetHours || 486)
                          : ((drawerStudent.internshipHistory || []).find(h => h.batchNumber === activeDrawerBatchNum)?.targetHours || 486);
                        return <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{displayedTarget} <span className="text-slate-400 font-normal text-xs">hrs target</span></p>;
                      })()}
                    </div>
                    {editingTargetId === drawerStudent._id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={targetInputVal}
                          onChange={e => setTargetInputVal(e.target.value)}
                          className="w-20 px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-extrabold focus:outline-none"
                          placeholder="Hours"
                        />
                        <button
                          onClick={() => handleUpdateTarget(drawerStudent._id, targetInputVal, drawerBatchFilter === 'all' ? drawerStudent.currentBatch : parseInt(drawerBatchFilter))}
                          disabled={isUpdatingTarget}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdatingTarget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingTargetId(null)}
                          className="px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingTargetId(drawerStudent._id);
                          const activeDrawerBatchNum = drawerBatchFilter === 'all' ? (drawerStudent.currentBatch || 1) : parseInt(drawerBatchFilter);
                          const activeDrawerTarget = activeDrawerBatchNum === (drawerStudent.currentBatch || 1)
                            ? (drawerStudent.targetHours || 486)
                            : ((drawerStudent.internshipHistory || []).find(h => h.batchNumber === activeDrawerBatchNum)?.targetHours || 486);
                          setTargetInputVal(String(activeDrawerTarget));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/40 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 transition-all cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Target</span>
                      </button>
                    )}
                  </div>

                  {/* Drawer Batch Filter — moved to top */}
                  {(drawerStudent.currentBatch > 1 || (drawerStudent.internshipHistory || []).length > 0) && (
                    <div className="flex items-center justify-between mb-4 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">OJT Batch:</span>
                      <select
                        value={drawerBatchFilter}
                        onChange={e => { setDrawerBatchFilter(e.target.value); setDrawerPage(1); }}
                        className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none cursor-pointer"
                      >
                        <option value="all">All Batches (Lifetime)</option>
                        <option value={drawerStudent.currentBatch}>OJT Batch #{drawerStudent.currentBatch} (Current)</option>
                        {(drawerStudent.internshipHistory || []).map(h => (
                          <option key={h.batchNumber} value={h.batchNumber}>OJT Batch #{h.batchNumber} ({h.companyName || 'Completed'})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Batch-filtered summary chips — computed here so skills also use it */}
                  {(() => {
                    const batchFilteredRecs = drawerRecords.filter(r => {
                      if (drawerBatchFilter === 'all') return true;
                      return (r.internshipBatch || 1) === parseInt(drawerBatchFilter);
                    });
                    const batchFilteredHours = batchFilteredRecs.reduce((sum, r) => sum + (r.totalHours || 0), 0);
                    const activeDrawerBatchNum = drawerBatchFilter === 'all' ? (drawerStudent.currentBatch || 1) : parseInt(drawerBatchFilter);
                    const batchTarget = activeDrawerBatchNum === (drawerStudent.currentBatch || 1)
                      ? (drawerStudent.targetHours || 486)
                      : ((drawerStudent.internshipHistory || []).find(h => h.batchNumber === activeDrawerBatchNum)?.targetHours || 486);
                    const batchPct = batchTarget > 0 ? Math.min((batchFilteredHours / batchTarget) * 100, 999) : 0;

                    // Per-batch skill breakdown
                    const batchCategories = {};
                    batchFilteredRecs.forEach(r => {
                      if (r.category) {
                        batchCategories[r.category] = (batchCategories[r.category] || 0) + (r.totalHours || 0);
                      }
                    });

                    return (
                      <>
                        {/* Stat chips */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          {[
                            { label: 'Records', value: batchFilteredRecs.length },
                            { label: drawerBatchFilter === 'all' ? 'Total Hours' : 'Batch Hours', value: batchFilteredHours.toFixed(1) },
                            { label: 'Progress', value: `${batchPct.toFixed(1)}%` },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-center">
                              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                              <p className="text-lg font-extrabold text-slate-900 dark:text-white">{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Skill breakdown — batch-filtered */}
                        {Object.keys(batchCategories).length > 0 && (
                          <div className="mb-6">
                            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Skill Competency</p>
                            <div className="space-y-2.5">
                              {SKILL_CATEGORIES.filter(c => batchCategories[c.id]).map(cat => {
                                const hrs = batchCategories[cat.id] || 0;
                                const catPct = batchFilteredHours > 0 ? (hrs / batchFilteredHours) * 100 : 0;
                                const Icon = cat.icon;
                                return (
                                  <div key={cat.id}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                                        <Icon className="w-3 h-3" />
                                        {cat.label}
                                      </div>
                                      <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{parseFloat(hrs).toFixed(1)} hrs</span>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                      <div className={`h-1.5 rounded-full bg-gradient-to-r ${cat.bar} transition-all`} style={{ width: `${catPct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Drawer Tab Switcher */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-4 border border-slate-200/60 dark:border-slate-700/60">
                    <button
                      onClick={() => setDrawerViewTab('logs')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        drawerViewTab === 'logs'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                      }`}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Duty Logs</span>
                    </button>
                    <button
                      onClick={() => setDrawerViewTab('calendar')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        drawerViewTab === 'calendar'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Duty Calendar</span>
                    </button>
                  </div>

                  {/* Drawer Tab Content */}
                  {(() => {
                    const filteredRecords = drawerRecords.filter(r => {
                      if (drawerBatchFilter === 'all') return true;
                      return (r.internshipBatch || 1) === parseInt(drawerBatchFilter);
                    });

                    if (drawerViewTab === 'calendar') {
                      const yr = drawerCalendarDate.getFullYear();
                      const mo = drawerCalendarDate.getMonth();
                      const fDay = new Date(yr, mo, 1);
                      const lDay = new Date(yr, mo + 1, 0);
                      const startDay = fDay.getDay();
                      const daysInMo = lDay.getDate();

                      const dateMap = {};
                      filteredRecords.forEach(r => {
                        if (!r.date) return;
                        const k = new Date(r.date).toISOString().split('T')[0];
                        if (!dateMap[k]) dateMap[k] = [];
                        dateMap[k].push(r);
                      });

                      const moName = drawerCalendarDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      const todayK = new Date().toISOString().split('T')[0];

                      const cells = [];
                      for (let i = 0; i < startDay; i++) cells.push({ isCurrent: false });
                      for (let d = 1; d <= daysInMo; d++) {
                        const dt = new Date(yr, mo, d);
                        const k = dt.toISOString().split('T')[0];
                        const dow = dt.getDay();
                        const isWknd = dow === 0 || dow === 6;
                        const isP = k < todayK;
                        const recs = dateMap[k] || [];
                        const totalH = recs.reduce((s, r) => s + (r.totalHours || 0), 0);
                        cells.push({ isCurrent: true, dayNum: d, dateStr: k, isWeekend: isWknd, isPast: isP, records: recs, totalH });
                      }

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{moName}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setDrawerCalendarDate(new Date(yr, mo - 1, 1))} className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer">
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDrawerCalendarDate(new Date(yr, mo + 1, 1))} className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer">
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-1.5 text-center">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                              <div key={i} className="text-[10px] font-extrabold text-slate-400 uppercase">{d}</div>
                            ))}
                            {cells.map((c, i) => {
                              if (!c.isCurrent) return <div key={i} className="h-12 bg-slate-50/20 dark:bg-slate-900/10 rounded-lg opacity-30" />;
                              const hasRecs = c.records.length > 0;
                              const isMissing = !hasRecs && c.isPast && !c.isWeekend;
                              return (
                                <div key={c.dateStr} className={`h-12 p-1 rounded-lg border flex flex-col justify-between text-[10px] font-extrabold ${
                                  c.dateStr === todayK
                                    ? 'ring-1 ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300'
                                    : hasRecs
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                                    : isMissing
                                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 text-amber-600'
                                    : 'bg-slate-50/40 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800 text-slate-500'
                                }`}>
                                  <div className="flex justify-between">
                                    <span>{c.dayNum}</span>
                                    {hasRecs && <span>{c.totalH.toFixed(1)}h</span>}
                                  </div>
                                  {isMissing && <span className="text-[8px] text-amber-500 leading-none">Miss</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    const DRAWER_PER_PAGE = 6;
                    const totalPages = Math.ceil(filteredRecords.length / DRAWER_PER_PAGE) || 1;
                    const start = (drawerPage - 1) * DRAWER_PER_PAGE;
                    const paginated = filteredRecords.slice(start, start + DRAWER_PER_PAGE);

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Duty Log Records ({filteredRecords.length})</p>
                          {totalPages > 1 && (
                            <span className="text-[10px] font-bold text-slate-400">Page {drawerPage} of {totalPages}</span>
                          )}
                        </div>

                        {filteredRecords.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm font-medium">No records logged for this filter yet.</div>
                        ) : (
                          <div className="space-y-2">
                            {paginated.map(r => (
                              <div key={r._id} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3.5 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                                    {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{r.startTime} — {r.endTime} {r.category ? `· ${r.category}` : ''}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{parseFloat(r.totalHours).toFixed(2)} hrs</p>
                                </div>
                              </div>
                            ))}

                            {/* Drawer Pagination Toolbar */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  onClick={() => setDrawerPage(p => Math.max(1, p - 1))}
                                  disabled={drawerPage === 1}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  Prev
                                </button>
                                <span className="text-xs font-bold text-slate-500">{drawerPage} / {totalPages}</span>
                                <button
                                  onClick={() => setDrawerPage(p => Math.min(totalPages, p + 1))}
                                  disabled={drawerPage === totalPages}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  Next
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="flex-shrink-0 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col gap-2">
              <button
                onClick={() => exportStudentPDF(drawerStudent)}
                disabled={exportingId === drawerStudent._id}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-extrabold text-xs uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10 transition-all cursor-pointer disabled:opacity-50"
              >
                {exportingId === drawerStudent._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportingId === drawerStudent._id ? 'Generating PDF...' : 'Export This Student DTR PDF'}
              </button>
              <button
                onClick={() => setUserToDelete(drawerStudent)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-extrabold text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-800/50 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Move Account to Trash</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Move Account to Trash?</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Student Account Deletion</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-900 dark:text-white text-sm">{userToDelete.name}</p>
              <p className="text-xs text-slate-400 mb-2">{userToDelete.email}</p>
              <div className="flex gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Logged Records: <strong>{userToDelete.totalRecords}</strong></span>
                <span>Total Hours: <strong>{userToDelete.totalHours} hrs</strong></span>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 mb-6">
              <p className="font-bold mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 30-Day Retrieval Grace Period</p>
              This account will be hidden immediately. You can retrieve and restore it anytime within 30 days from the <strong>Trash</strong> section before MongoDB purges it permanently.
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl font-extrabold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSoftDelete(userToDelete)}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Deleting...' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-slide-in-right">
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
