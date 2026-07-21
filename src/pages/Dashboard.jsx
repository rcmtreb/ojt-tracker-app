import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { PlusCircle, Trash2, Download, Clock, FileText, LogOut, User as UserIcon, Calendar, Briefcase, ChevronRight, Check, Pencil, ChevronLeft, UploadCloud, Eye, Sun, Moon, AlertCircle, AlertTriangle, Sparkles, PartyPopper, Trophy, Award, Medal, Crown, Hand } from 'lucide-react';
import ProofGalleryModal from './ProofGalleryModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${VITE_API_URL}/api`;
const BASE_URL = VITE_API_URL;

function Dashboard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [user] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser || storedUser === 'null' || storedUser === 'undefined') return null;
      return JSON.parse(storedUser);
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
      return null;
    }
  });
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) return storedTheme;
    return 'light';
  });
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    studentName: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    breakDuration: 0,
    taskDescription: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [pendingTotalHours, setPendingTotalHours] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [formError, setFormError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const totalPages = Math.ceil(records.length / recordsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  const indexOfLastRecord = validCurrentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const paginatedRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const duplicateNotice = (() => {
    if (!formData.date) return '';
    const exists = records.some(rec => {
      if (editingRecordId && rec._id === editingRecordId) return false;
      const recDate = new Date(rec.date).toISOString().split('T')[0];
      return recDate === formData.date;
    });
    return exists ? 'Notice: A log entry already exists for this date.' : '';
  })();

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const isOvernightShift = (() => {
    if (!formData.startTime || !formData.endTime) return false;
    const startMins = parseTimeToMinutes(formData.startTime);
    const endMins = parseTimeToMinutes(formData.endTime);
    return endMins < startMins;
  })();

  const calculateShiftMinutes = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);
    if (endMins < startMins) {
      return (1440 - startMins) + endMins;
    }
    return endMins - startMins;
  };

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

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  }, [navigate]);

  const startEdit = (record) => {
    setEditingRecordId(record._id);
    setFormData({
      studentName: record.studentName || '',
      date: new Date(record.date).toISOString().split('T')[0],
      startTime: record.startTime || '',
      endTime: record.endTime || '',
      breakDuration: record.breakDuration || 0,
      taskDescription: record.taskDescription || ''
    });
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingRecordId(null);
    setFormData({
      studentName: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      breakDuration: 0,
      taskDescription: ''
    });
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchRecords = useCallback(async (token) => {
    try {
      const response = await axios.get(`${API_URL}/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setRecords(response.data);
      } else {
        console.error("fetchRecords error: response.data is not an array", response.data);
        setRecords([]);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  }, [handleLogout]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const hasUser = userStr && userStr !== 'null' && userStr !== 'undefined';
    console.log("Dashboard Mount: token =", token, "userStr =", userStr, "hasUser =", hasUser, "userState =", user);
    if (!token || !hasUser || !user) {
      console.log("Dashboard: session invalid, clearing and redirecting to login");
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
      return;
    }
    console.log("Dashboard: session valid, fetching records");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecords(token);
  }, [navigate, fetchRecords, user]);

  const handleChange = (e) => {
    setFormError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFormError('');
    
    for (const file of selectedFiles) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError(`File "${file.name}" exceeds the 2MB size limit.`);
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (!file.type.startsWith('image/')) {
        setFormError(`File "${file.name}" is not a supported image format.`);
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }
    setFiles(selectedFiles);
  };



  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // Date validation
    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.date > todayStr) {
      setFormError('Selected duty date cannot be in the future.');
      return;
    }

    // Time validation
    if (!formData.startTime || !formData.endTime) {
      setFormError('Please select both Start Time and End Time.');
      return;
    }

    const startMins = parseTimeToMinutes(formData.startTime);
    const endMins = parseTimeToMinutes(formData.endTime);

    if (startMins === endMins) {
      setFormError('Start time and end time cannot be identical.');
      return;
    }

    const shiftDurationMins = calculateShiftMinutes(formData.startTime, formData.endTime);
    const breakMins = parseFloat(formData.breakDuration) || 0;

    if (breakMins >= shiftDurationMins) {
      setFormError('Break duration cannot meet or exceed total shift duration.');
      return;
    }

    const computed = ((shiftDurationMins - breakMins) / 60).toFixed(2);
    if (parseFloat(computed) <= 0) {
      setFormError('Computed duty hours must be greater than 0.');
      return;
    }

    setPendingTotalHours(computed);
    setShowModal(true);
  };

  const confirmSubmit = async () => {
    const token = localStorage.getItem('token');
    setIsSubmitting(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => {
        const value = formData[key] === '' && key === 'studentName' ? user.name : formData[key];
        data.append(key, value);
    });
    data.append('totalHours', pendingTotalHours);
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        data.append('documentaries', file);
      });
    }

    try {
      if (editingRecordId) {
        await axios.put(`${API_URL}/records/${editingRecordId}`, data, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });
      } else {
        await axios.post(`${API_URL}/records`, data, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });
      }
      
      setFormData({
        ...formData,
        startTime: '',
        endTime: '',
        breakDuration: 0,
        taskDescription: ''
      });
      setFiles([]);
      setEditingRecordId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowModal(false);
      fetchRecords(token);
    } catch (error) {
      console.error('Error saving record:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/records/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecords(token);
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const totalAccumulatedHours = records.reduce((acc, rec) => acc + (rec.totalHours || 0), 0);
  const [targetHours, setTargetHours] = useState(() => {
    const stored = localStorage.getItem('targetHours');
    return stored ? parseFloat(stored) : 600;
  });

  const rawProgressPercent = targetHours > 0 ? (totalAccumulatedHours / targetHours) * 100 : 0;
  const visualProgressPercent = Math.min(100, rawProgressPercent);
  const isTargetExceeded = totalAccumulatedHours >= targetHours;
  const bonusOvertimeHours = Math.max(0, totalAccumulatedHours - targetHours);
  const remainingHours = Math.max(0, targetHours - totalAccumulatedHours);

  const getTraineeRank = (percent) => {
    if (percent >= 100) return { title: 'Overachieving Master', icon: Crown, iconColor: 'text-amber-500', badgeBg: 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-amber-500/30 text-amber-600 dark:text-amber-300' };
    if (percent >= 75) return { title: 'OJT Specialist', icon: Trophy, iconColor: 'text-emerald-500', badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' };
    if (percent >= 25) return { title: 'Dedicated Apprentice', icon: Medal, iconColor: 'text-teal-500', badgeBg: 'bg-teal-500/15 border-teal-500/30 text-teal-700 dark:text-teal-300' };
    return { title: 'Rookie Trainee', icon: Award, iconColor: 'text-slate-400 dark:text-slate-500', badgeBg: 'bg-slate-200/50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300' };
  };

  const traineeRank = getTraineeRank(rawProgressPercent);
  const RankIcon = traineeRank.icon;

  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(targetHours));
  const [targetSaved, setTargetSaved] = useState(false);
  const targetInputRef = useRef(null);
  const editButtonRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargetInput(String(targetHours));
  }, [targetHours]);

  useEffect(() => {
    // If browser restored focus to edit button after refresh, blur it on mount to avoid visible focus box
    setTimeout(() => {
      if (editButtonRef.current && document.activeElement === editButtonRef.current) {
        editButtonRef.current.blur();
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (editingTarget) {
      // focus the input when edit mode is toggled on
      setTimeout(() => {
        if (targetInputRef.current) {
          targetInputRef.current.focus();
          targetInputRef.current.select();
        }
      }, 50);
    } else {
      // return focus to edit button
      if (editButtonRef.current) editButtonRef.current.focus();
    }
  }, [editingTarget]);

  const startEditTarget = () => setEditingTarget(true);
  const cancelEditTarget = () => {
    setTargetInput(String(targetHours));
    setEditingTarget(false);
  };

  const saveTarget = () => {
    const num = parseFloat(targetInput);
    if (!isNaN(num) && num > 0) {
      setTargetHours(num);
      localStorage.setItem('targetHours', String(num));
      setEditingTarget(false);
      setTargetSaved(true);
      setTimeout(() => setTargetSaved(false), 2000);
    } else {
      alert('Please enter a valid positive number');
    }
  };

  const handleTargetSubmit = (e) => {
    e.preventDefault();
    saveTarget();
  };

  const [showProofModal, setShowProofModal] = useState(false);
  const [proofImages, setProofImages] = useState([]);
  const [proofStartIndex, setProofStartIndex] = useState(0);

  // Calendar Helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1));

  const hasRecord = (day) => {
    return records.some(rec => {
      const recDate = new Date(rec.date);
      return recDate.getDate() === day && 
             recDate.getMonth() === viewDate.getMonth() && 
             recDate.getFullYear() === viewDate.getFullYear();
    });
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(30, 64, 175);
      doc.text('OJT Daily Time Record', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 32, 196, 32);

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Student Name: ${formData.studentName || user?.name || 'N/A'}`, 14, 42);
      doc.text(`Total Accumulated Hours: ${totalAccumulatedHours.toFixed(2)} hrs`, 14, 50);

      const tableColumn = ["Date", "Start Time", "End Time", "Break (min)", "Total Hours", "Task Description"];
      const tableRows = records.map(record => [
        new Date(record.date).toLocaleDateString(),
        record.startTime || 'N/A',
        record.endTime || 'N/A',
        record.breakDuration || 0,
        (record.totalHours || 0).toFixed(2),
        record.taskDescription || 'No description'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 58,
        theme: 'striped',
        headStyles: { fillStyle: 'fill', fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { top: 60 },
      });

      doc.save(`OJT_Report_${user?.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to generate PDF. Check console for details.');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-sans pb-16 relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-[60vh] left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Navigation */}
      <nav className="glass-panel dark:glass-panel-dark border-b border-slate-200/50 dark:border-slate-800 sticky top-0 z-30 shadow-sm shadow-slate-100/40 dark:shadow-none transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">OJT<span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Tracker</span></span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest leading-none">Student Portal</span>
              </div>
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="focus:outline-none block transition-transform active:scale-95 cursor-pointer"
                >
                  {user.picture ? (
                    <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full ring-2 ring-slate-100 dark:ring-slate-800 hover:ring-emerald-100 transition-all object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                </button>
                
                {showProfileDropdown && (
                  <div className="absolute top-full right-0 pt-2 animate-scale-up z-50">
                    <div className="w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2">
                      <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800/80 mb-1">
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Signed in as</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.email}</p>
                      </div>

                      {/* Theme Toggle option */}
                      <button 
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all font-bold cursor-pointer mb-1"
                      >
                        <div className="flex items-center gap-2">
                          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                        </div>
                        <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${theme === 'dark' ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${theme === 'dark' ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                        </div>
                      </button>

                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-650 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors font-bold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 animate-fade-in">
        
        {/* Welcome & Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* Progress Card */}
          <div className={`lg:col-span-8 bg-white dark:bg-slate-900/60 rounded-[2rem] p-6 sm:p-8 border ${isTargetExceeded ? 'border-amber-300/60 dark:border-amber-500/30' : 'border-slate-100 dark:border-slate-800/70'} shadow-sm relative overflow-hidden group transition-colors`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 dark:bg-emerald-900/5 rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-105"></div>
            
            <div className="relative z-10">
              {/* Celebration Banner when Target Exceeded */}
              {isTargetExceeded && (
                <div className="mb-4 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-500/30 dark:border-amber-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
                      <PartyPopper className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">Requirements Fulfilled!</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        Congratulations! You've logged <span className="font-bold text-amber-600 dark:text-amber-400">{bonusOvertimeHours.toFixed(1)} bonus hours</span> beyond your {targetHours} hrs requirement.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Hello, {user?.name ? user.name.split(' ')[0] : 'Student'}! 
                  <Hand className="w-6 h-6 text-amber-400 animate-pulse" />
                </h2>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${traineeRank.badgeBg} backdrop-blur-md shadow-sm`}>
                  <RankIcon className={`w-3.5 h-3.5 ${traineeRank.iconColor}`} />
                  <span>{traineeRank.title}</span>
                </span>
              </div>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">You've completed <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{totalAccumulatedHours.toFixed(1)} hours</span> of your training. Keep going!</p>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Training Completion Progress</span>
                  <span className={`text-sm font-extrabold px-3 py-0.5 rounded-full ${isTargetExceeded ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'text-slate-900 dark:text-emerald-100 bg-emerald-50 dark:bg-emerald-900/30'}`}>
                    {rawProgressPercent.toFixed(0)}%
                  </span>
                </div>
                
                <div className="w-full bg-slate-100/70 dark:bg-slate-800 rounded-full h-4 overflow-hidden p-1 border border-slate-200/30 dark:border-slate-700/20">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ease-out shadow-sm ${isTargetExceeded ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400 shadow-amber-300' : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-300'}`} 
                    style={{ width: `${visualProgressPercent}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md text-slate-500 dark:text-slate-450 font-extrabold">{totalAccumulatedHours.toFixed(1)} HRS LOGGED</span>
                    {isTargetExceeded ? (
                      <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2 py-1 rounded-md text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        +{bonusOvertimeHours.toFixed(1)} HRS OVERTIME BONUS
                      </span>
                    ) : (
                      <span className="bg-emerald-50/50 dark:bg-emerald-950/25 px-2 py-1 rounded-md text-emerald-600 dark:text-emerald-400 font-extrabold">{remainingHours.toFixed(1)} HRS REMAINING</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {editingTarget ? (
                      <form onSubmit={handleTargetSubmit} className="flex items-center gap-2" aria-label="Edit target hours">
                        <label htmlFor="target-hours" className="sr-only">Target Hours</label>
                        <input
                          id="target-hours"
                          ref={targetInputRef}
                          type="number"
                          min="1"
                          step="1"
                          value={targetInput}
                          onChange={(e) => setTargetInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); cancelEditTarget(); } }}
                          className="w-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-1.5 text-center text-xs font-bold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none"
                          aria-label="Target hours input"
                        />
                        <button type="submit" className="text-[9px] font-extrabold text-white bg-emerald-600 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-700">Save</button>
                        <button type="button" onClick={cancelEditTarget} className="text-[9px] font-extrabold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md">
                        <span className="text-slate-500 dark:text-slate-450 font-extrabold">TARGET: {targetHours} HRS</span>
                        <button ref={editButtonRef} onClick={startEditTarget} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline font-extrabold cursor-pointer">Edit</button>
                        {targetSaved && (
                          <span className="ml-1 inline-flex items-center text-green-600">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info widgets */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-4">
            
            {/* Widget 1 */}
            <div className="flex-1 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] p-6 text-white shadow-lg shadow-emerald-500/10 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
              <div className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-4 border border-white/10">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-emerald-100 text-[10px] font-extrabold uppercase tracking-widest mb-0.5">Current Date</p>
                <h3 className="text-lg font-bold tracking-tight">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              </div>
            </div>
            
            {/* Widget 2 */}
            <div className="flex-1 bg-white dark:bg-slate-900/60 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-200/60 dark:hover:border-slate-750/70 transition-all">
              <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest mb-0.5">Records Logged</p>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">{records.length} Total Entries</h3>
              </div>
            </div>

          </div>
        </div>

        {/* Action Panel Grid (Form & Calendar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* Form Side */}
          <div className="lg:col-span-8 order-2 lg:order-1 space-y-6">
            <section className="bg-white dark:bg-slate-900/60 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-850 dark:border-slate-800/75 p-6 sm:p-8 relative overflow-hidden transition-colors">
              {editingRecordId && (
                <div className="absolute top-0 left-0 w-full h-[4px] bg-amber-500"></div>
              )}
              
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-9 h-9 ${editingRecordId ? 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900 text-amber-600' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900 text-emerald-600'} border rounded-xl flex items-center justify-center`}>
                  {editingRecordId ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                </div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">{editingRecordId ? 'Edit Log Entry' : 'Create New Log Entry'}</h2>
              </div>
              
              {/* Inline Form Validation Error Banner */}
              {formError && (
                <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-650 dark:text-red-300 text-xs font-bold animate-fade-in">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Duplicate Date Notice */}
              {duplicateNotice && !formError && (
                <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/20 flex items-center gap-3 text-amber-700 dark:text-amber-300 text-xs font-semibold animate-fade-in">
                  <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 text-amber-500" />
                  <span>{duplicateNotice}</span>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Student Name</label>
                  <input 
                    type="text" 
                    name="studentName" 
                    value={formData.studentName} 
                    onChange={handleChange} 
                    placeholder={user.name} 
                    className="w-full rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 p-3.5 border transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 text-sm font-medium outline-none" 
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Date</label>
                    <input 
                      type="date" 
                      name="date" 
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.date} 
                      onChange={handleChange} 
                      required 
                      className="w-full rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 p-3.5 border transition-all text-sm font-medium outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Break Duration (Mins)</label>
                    <input 
                      type="number" 
                      name="breakDuration" 
                      min="0"
                      value={formData.breakDuration} 
                      onChange={handleChange} 
                      className="w-full rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 p-3.5 border transition-all text-sm font-medium outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Start Time</label>
                    <input 
                      type="time" 
                      name="startTime" 
                      value={formData.startTime} 
                      onChange={handleChange} 
                      required 
                      className="w-full rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 p-3.5 border transition-all text-sm font-medium outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">End Time</label>
                    <input 
                      type="time" 
                      name="endTime" 
                      value={formData.endTime} 
                      onChange={handleChange} 
                      required 
                      className="w-full rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 p-3.5 border transition-all text-sm font-medium outline-none" 
                    />
                  </div>

                  {isOvernightShift && (
                    <div className="sm:col-span-2 p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 flex items-center gap-2.5 text-teal-700 dark:text-teal-300 text-xs font-semibold animate-fade-in">
                      <Moon className="w-4 h-4 text-teal-500 flex-shrink-0 animate-pulse" />
                      <span>Overnight Duty Shift Detected (crosses midnight into next day). Shift total will be calculated accurately.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Documentary Proof</label>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Max 2MB per image</span>
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      multiple
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange} 
                      className="hidden" 
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all cursor-pointer text-sm text-slate-500 dark:text-slate-400 font-medium group"
                    >
                      <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-350">
                          {files.length > 0 ? `${files.length} Files Selected` : 'Click to select and upload images'}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Supports PNG, JPG, JPEG up to 2MB</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Task Description</label>
                  <textarea 
                    name="taskDescription" 
                    value={formData.taskDescription} 
                    onChange={handleChange} 
                    rows="3" 
                    className="w-full rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 p-3.5 border transition-all text-sm font-medium resize-none outline-none" 
                    placeholder="Write a brief summary of the tasks completed today..."
                  ></textarea>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button 
                    type="submit" 
                    className={`flex-1 cursor-pointer py-4 rounded-2xl font-extrabold text-xs uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-xl
                      ${editingRecordId 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/10' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/10'}
                    `}
                  >
                    {editingRecordId ? 'Review & Update Record' : 'Review & Save Record'} 
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {editingRecordId && (
                    <button 
                      type="button" 
                      onClick={cancelEdit}
                      className="px-6 py-4 cursor-pointer rounded-2xl font-extrabold text-xs uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition active:scale-95"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>

          {/* Calendar Widget */}
          <div className="lg:col-span-4 order-1 lg:order-2">
            <section className="bg-white dark:bg-slate-900/60 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-850 dark:border-slate-800/75 p-6 sm:p-8 h-full flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center justify-center">
                      <Calendar className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-md font-extrabold text-slate-800 dark:text-white tracking-tight">Calendar</h2>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={prevMonth} className="p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-800" title="Previous Month">
                      <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                    <button onClick={nextMonth} className="p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-800" title="Next Month">
                      <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                    {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {[...Array(getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                  ))}
                  {[...Array(getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => {
                    const day = i + 1;
                    const logged = hasRecord(day);
                    const isToday = day === new Date().getDate() && 
                                  viewDate.getMonth() === new Date().getMonth() && 
                                  viewDate.getFullYear() === new Date().getFullYear();
                    
                    return (
                      <div 
                        key={day} 
                        className={`aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all relative group cursor-default
                          ${logged 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'}
                          ${isToday && !logged ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400' : ''}
                        `}
                      >
                        {day}
                        {logged && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-555 dark:text-slate-500 uppercase tracking-widest">Training Logged</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Table Full Width */}
        <div className="w-full">
          <section className="bg-white dark:bg-slate-900/60 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-850 dark:border-slate-800/70 overflow-hidden transition-colors">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100/60 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-450" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">Activity Log Records</h2>
              </div>
              <button 
                onClick={exportToPDF}
                disabled={records.length === 0}
                className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" /> Export DTR
              </button>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50/40 dark:bg-slate-950/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-left text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hours Worked</th>
                    <th className="px-6 py-4 text-left text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Task Description</th>
                    <th className="px-6 py-4 text-left text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Attachments</th>
                    <th className="px-6 py-4 text-right text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900/10 divide-y divide-slate-100/60 dark:divide-slate-800/80">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-30">
                          <Briefcase className="w-10 h-10 text-slate-400" />
                          <p className="font-bold text-[10px] uppercase tracking-wider text-slate-500">No entries logged yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap font-medium">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{record.totalHours.toFixed(2)}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">hrs</span>
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 max-w-2xl">{record.taskDescription || 'No description provided'}</p>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          {record.documentaryUrls && record.documentaryUrls.length > 0 ? (
                            <button
                              onClick={() => {
                                setProofImages(record.documentaryUrls.map(u => 
                                  u.startsWith('data:') || u.startsWith('http') ? u : `${BASE_URL}${u}`
                                ));
                                setProofStartIndex(0);
                                setShowProofModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              aria-label="View proof images"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View ({record.documentaryUrls.length})
                            </button>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-300 dark:text-slate-500 uppercase italic">No attachments</span>
                          )}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1">
                            <button 
                                onClick={() => startEdit(record)} 
                                className="p-2 cursor-pointer text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl transition-all"
                                title="Edit record"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => deleteRecord(record._id)} 
                                className="p-2 cursor-pointer text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                title="Delete record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {records.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Showing <span className="text-slate-800 dark:text-slate-200 font-extrabold">{indexOfFirstRecord + 1}</span> to <span className="text-slate-800 dark:text-slate-200 font-extrabold">{Math.min(indexOfLastRecord, records.length)}</span> of <span className="text-slate-800 dark:text-slate-200 font-extrabold">{records.length}</span> records
                </p>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={validCurrentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                    title="Previous Page"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, index) => {
                      const pageNum = index + 1;
                      const isActive = pageNum === validCurrentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                              : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={validCurrentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                    title="Next Page"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <ProofGalleryModal visible={showProofModal} images={proofImages} startIndex={proofStartIndex} onClose={() => setShowProofModal(false)} />
      </main>

      {/* Review Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-up">
            
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">Review Entry</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Please verify the correctness of your logs.</p>
              </div>
              <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Check className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-2 gap-y-5 gap-x-6 text-sm">
                
                <div className="space-y-1">
                  <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student Name</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{formData.studentName || user.name}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Duty Date</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{new Date(formData.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Shift Hours</p>
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <span className="font-bold">{formData.startTime}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-350" />
                    <span className="font-bold">{formData.endTime}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Break Duration</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{formData.breakDuration} Minutes</p>
                </div>
                
                <div className="col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-[2rem] text-white flex justify-between items-center shadow-md shadow-emerald-500/10">
                  <div>
                    <p className="text-emerald-100 text-[9px] uppercase font-bold tracking-widest mb-0.5">Computed Duty Hours</p>
                    <p className="text-3xl font-extrabold">{pendingTotalHours} <span className="text-sm font-bold opacity-80">hrs</span></p>
                  </div>
                  <Clock className="w-9 h-9 text-white/20 animate-pulse" />
                </div>

                {isOvernightShift && (
                  <div className="col-span-2 flex items-center gap-2 bg-teal-50 dark:bg-teal-950/40 p-3 rounded-xl border border-teal-200 dark:border-teal-900/50 text-xs font-bold text-teal-700 dark:text-teal-300">
                    <Moon className="w-4 h-4 text-teal-500" />
                    <span>Overnight Shift (Crosses Midnight)</span>
                  </div>
                )}

                <div className="col-span-2 space-y-1.5">
                  <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tasks Summary</p>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 italic text-slate-650 text-slate-600 dark:text-slate-400 text-xs leading-relaxed max-h-32 overflow-y-auto">
                    "{formData.taskDescription || 'No description provided'}"
                  </div>
                </div>
                
                <div className="col-span-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <p>Attachments: <span className="text-slate-800 dark:text-slate-200">{files.length} image file(s) loaded</span></p>
                </div>

              </div>
            </div>

            <div className="p-6 sm:p-8 pt-0 flex gap-3">
              <button 
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-3.5 cursor-pointer rounded-2xl font-extrabold text-[10px] uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition active:scale-95 disabled:opacity-50"
              >
                Go Back
              </button>
              <button 
                onClick={confirmSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3.5 cursor-pointer rounded-2xl font-extrabold text-[10px] uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
