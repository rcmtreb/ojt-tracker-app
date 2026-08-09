import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { PlusCircle, Trash2, Download, Clock, FileText, LogOut, User as UserIcon, Calendar, Briefcase, ChevronRight, Check, Pencil, ChevronLeft, UploadCloud, Eye, Sun, Moon, AlertCircle, AlertTriangle, Sparkles, PartyPopper, Trophy, Award, Medal, Crown, Hand, Target, Flame, BarChart3, Code2, Palette, Wrench, ClipboardList, Loader2, Settings, List, CalendarDays, Plus } from 'lucide-react';
import ProofGalleryModal from './ProofGalleryModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate, Link } from 'react-router-dom';

const SKILL_CATEGORIES = [
  { id: 'Development', label: 'Development & Engineering', iconName: 'Code2', color: 'bg-emerald-500', barColor: 'from-emerald-500 to-teal-500' },
  { id: 'Documentation', label: 'Documentation & Reports', iconName: 'FileText', color: 'bg-teal-500', barColor: 'from-teal-500 to-cyan-500' },
  { id: 'Design', label: 'Design & Prototyping', iconName: 'Palette', color: 'bg-purple-500', barColor: 'from-purple-500 to-indigo-500' },
  { id: 'Support', label: 'System Maintenance & Support', iconName: 'Wrench', color: 'bg-amber-500', barColor: 'from-amber-500 to-orange-500' },
  { id: 'Admin', label: 'Administrative & Meetings', iconName: 'ClipboardList', color: 'bg-slate-500', barColor: 'from-slate-500 to-slate-600' }
];

const getCategoryIcon = (iconName, className = "w-4 h-4") => {
  switch (iconName) {
    case 'Code2': return <Code2 className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'Palette': return <Palette className={className} />;
    case 'Wrench': return <Wrench className={className} />;
    case 'ClipboardList': return <ClipboardList className={className} />;
    default: return <Code2 className={className} />;
  }
};

import { API_URL, BASE_URL } from '../config';

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
  const [targetHours, setTargetHours] = useState(() => {
    const stored = localStorage.getItem('targetHours');
    return stored ? parseFloat(stored) : 486;
  });
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    studentName: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    breakDuration: 0,
    taskDescription: '',
    category: 'Development'
  });
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(() => new Date());
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
  const [pendingTotalHours, setPendingTotalHours] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [formError, setFormError] = useState('');
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 8;

  const totalPages = useMemo(() => Math.ceil(records.length / recordsPerPage) || 1, [records.length]);
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  const indexOfLastRecord = validCurrentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const paginatedRecords = useMemo(() => {
    return records.slice(indexOfFirstRecord, indexOfLastRecord);
  }, [records, indexOfFirstRecord, indexOfLastRecord]);

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

  const formatDTRSessions = (startTimeStr, endTimeStr) => {
    if (!startTimeStr || !endTimeStr) {
      return { amIn: '--:--', amOut: '--:--', pmIn: '--:--', pmOut: '--:--' };
    }

    const startMins = parseTimeToMinutes(startTimeStr);
    const endMins = parseTimeToMinutes(endTimeStr);

    const format12H = (mins) => {
      const h24 = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      const period = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    };

    const noonMins = 12 * 60; // 12:00 PM

    // Morning Half Day (ends at or before 12:00 PM)
    if (endMins <= noonMins && startMins < noonMins) {
      return {
        amIn: format12H(startMins),
        amOut: format12H(endMins),
        pmIn: '--:--',
        pmOut: '--:--'
      };
    }

    // Afternoon Half Day (starts at or after 12:00 PM)
    if (startMins >= noonMins) {
      return {
        amIn: '--:--',
        amOut: '--:--',
        pmIn: format12H(startMins),
        pmOut: format12H(endMins)
      };
    }

    // Continuous Full Day Shift: Morning TIME IN is startMins, Afternoon TIME OUT is endMins
    return {
      amIn: format12H(startMins),
      amOut: '--:--',
      pmIn: '--:--',
      pmOut: format12H(endMins)
    };
  };

  // Pure JS OJT Pace Predictor & Streak Calculator
  const calculateForecaster = () => {
    if (records.length === 0 || remainingHours <= 0) {
      return { projectedDate: null, daysNeeded: 0, avgHoursPerDay: '0.0', streak: 0 };
    }

    const totalLoggedHours = totalAccumulatedHours;
    const uniqueDaysCount = new Set(records.map(r => r.date)).size || 1;
    const avgHoursPerDay = totalLoggedHours / uniqueDaysCount;

    if (avgHoursPerDay <= 0) {
      return { projectedDate: null, daysNeeded: 0, avgHoursPerDay: '0.0', streak: 0 };
    }

    const daysNeeded = Math.ceil(remainingHours / avgHoursPerDay);

    // Calculate projected date counting weekdays (Mon-Fri) only
    let targetDate = new Date();
    let addedDays = 0;
    while (addedDays < daysNeeded) {
      targetDate.setDate(targetDate.getDate() + 1);
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        addedDays++;
      }
    }

    // Calculate logging streak (consecutive days logged)
    const sortedDates = Array.from(new Set(records.map(r => r.date))).sort((a, b) => new Date(b) - new Date(a));
    let streak = 0;
    if (sortedDates.length > 0) {
      let checkDate = new Date();
      const todayStr = checkDate.toISOString().split('T')[0];
      checkDate.setDate(checkDate.getDate() - 1);
      const yestStr = checkDate.toISOString().split('T')[0];

      if (sortedDates.includes(todayStr) || sortedDates.includes(yestStr)) {
        let curr = new Date(sortedDates.includes(todayStr) ? todayStr : yestStr);
        while (true) {
          const currStr = curr.toISOString().split('T')[0];
          if (sortedDates.includes(currStr)) {
            streak++;
            curr.setDate(curr.getDate() - 1);
            if (curr.getDay() === 0) curr.setDate(curr.getDate() - 2); // Skip weekend
          } else {
            break;
          }
        }
      }
    }

    return {
      projectedDate: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      daysNeeded,
      avgHoursPerDay: avgHoursPerDay.toFixed(1),
      streak
    };
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

  const startEdit = useCallback((record) => {
    setEditingRecordId(record._id);
    setFormData({
      studentName: record.studentName || '',
      date: new Date(record.date).toISOString().split('T')[0],
      startTime: record.startTime || '',
      endTime: record.endTime || '',
      breakDuration: record.breakDuration || 0,
      taskDescription: record.taskDescription || '',
      category: record.category || 'Development'
    });
    setFormError('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    setIsLoadingRecords(true);
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
    } finally {
      setIsLoadingRecords(false);
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
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          const p = res.data;
          setSettingsForm({
            companyName: p.companyName || '',
            department: p.department || '',
            supervisorName: p.supervisorName || '',
            courseProgram: p.courseProgram || '',
            targetHours: p.targetHours || 486,
            defaultStartTime: p.defaultStartTime || '08:00',
            defaultEndTime: p.defaultEndTime || '17:00',
            defaultBreakDuration: p.defaultBreakDuration ?? 60,
            includeSignatureBlock: p.includeSignatureBlock ?? true
          });
          if (p.targetHours) setTargetHours(p.targetHours);
        }
      } catch {
        /* silent fallback */
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const hasUser = userStr && userStr !== 'null' && userStr !== 'undefined';
    if (!token || !hasUser || !user) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
      return;
    }
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
    setDeletingId(id);
    try {
      await axios.delete(`${API_URL}/records/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecords(token);
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalAccumulatedHours = records.reduce((acc, rec) => acc + (rec.totalHours || 0), 0);

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

  const saveTarget = async () => {
    const num = parseFloat(targetInput);
    if (!isNaN(num) && num > 0) {
      setTargetHours(num);
      localStorage.setItem('targetHours', String(num));
      setEditingTarget(false);
      setTargetSaved(true);
      setTimeout(() => setTargetSaved(false), 2000);
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await axios.patch(`${API_URL}/user/target`, { targetHours: num }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch {
        /* silent fallback */
      }
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
      
      // Sort records chronologically (oldest date at top, latest at bottom)
      const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const studentNameStr = formData.studentName || user?.name || 'Student Trainee';
      const studentEmailStr = user?.email || 'N/A';
      
      // Calculate Date Range
      const startDateStr = sortedRecords.length > 0
        ? new Date(sortedRecords[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';
      const endDateStr = sortedRecords.length > 0
        ? new Date(sortedRecords[sortedRecords.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';

      // 1. Header Banner (Emerald Accent: #059669)
      doc.setFillColor(5, 150, 105);
      doc.rect(0, 0, 210, 13, 'F');
      
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('DAILY TIME RECORD', 14, 9);

      // 2. Compact 2-Column Student Info & Summary Card Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 16, 182, 18, 2, 2, 'FD');

      // Row 1: Student & Accumulated Hours
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('STUDENT:', 18, 23);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(studentNameStr, 34, 23);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const studentWidth = doc.getTextWidth(studentNameStr);
      doc.text(`(${studentEmailStr})`, 36 + studentWidth, 23);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL WORKED:', 122, 23);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(`${totalAccumulatedHours.toFixed(2)} / ${targetHours} HRS`, 148, 23);

      // Row 2: Period & Status
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('PERIOD:', 18, 29.5);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`${startDateStr} - ${endDateStr}`, 34, 29.5);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('PROGRESS:', 122, 29.5);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isTargetExceeded ? 5 : 15, isTargetExceeded ? 150 : 23, isTargetExceeded ? 105 : 42);
      doc.text(`${rawProgressPercent.toFixed(0)}% (${isTargetExceeded ? 'COMPLETED' : 'IN PROGRESS'})`, 148, 29.5);

      // 3. Table Headers and Rows (Official DATE | DAY | TIME IN | TIME OUT Format)
      const tableColumn = [
        "DATE", 
        "DAY", 
        "TIME IN", 
        "TIME OUT", 
        "TIME IN", 
        "TIME OUT", 
        "Daily Hours"
      ];
      const tableRows = sortedRecords.map(record => {
        const d = new Date(record.date);
        const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
        const sessions = formatDTRSessions(record.startTime, record.endTime);

        return [
          formattedDate,
          dayOfWeek,
          sessions.amIn,
          sessions.amOut,
          sessions.pmIn,
          sessions.pmOut,
          `${(record.totalHours || 0).toFixed(2)} hrs`
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 37,
        theme: 'grid',
        headStyles: { 
          fillColor: [5, 150, 105], 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
          valign: 'middle'
        },
        alternateRowStyles: { 
          fillColor: [240, 253, 244]
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85],
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold' },
          1: { cellWidth: 16, fontStyle: 'bold', textColor: [100, 116, 139] },
          2: { cellWidth: 27 },
          3: { cellWidth: 27 },
          4: { cellWidth: 27 },
          5: { cellWidth: 27 },
          6: { cellWidth: 30, fontStyle: 'bold', textColor: [5, 150, 105] }
        },
        margin: { top: 37, bottom: 38 }
      });

      // 4. Signatures & Certification Block at bottom of last page
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 190;
      
      let sigY = finalY;
      if (sigY > 245) {
        doc.addPage();
        sigY = 25;
      }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('I hereby certify on my honor that the above is a true and correct record of the duty hours worked and tasks accomplished.', 14, sigY);

      // Signature Lines
      const lineY = sigY + 16;
      
      // Student Signature
      doc.setDrawColor(148, 163, 184);
      doc.line(14, lineY, 68, lineY);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(studentNameStr, 14, lineY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Student Trainee', 14, lineY + 8);

      // OJT Supervisor Signature
      if (settingsForm.includeSignatureBlock) {
        doc.line(78, lineY, 132, lineY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(settingsForm.supervisorName || 'OJT Industry Supervisor', 78, lineY + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('Signature over Printed Name', 78, lineY + 8);

        // Academic Coordinator Signature
        doc.line(142, lineY, 196, lineY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Academic Coordinator', 142, lineY + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('Signature over Printed Name', 142, lineY + 8);
      }

      doc.save(`OJT_DTR_Report_${studentNameStr.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to generate PDF. Check console for details.');
    }
  };

  const renderCalendarView = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay();
    const totalDaysInMonth = lastDay.getDate();

    const recordsByDate = {};
    records.forEach(r => {
      if (!r.date) return;
      const key = new Date(r.date).toISOString().split('T')[0];
      if (!recordsByDate[key]) recordsByDate[key] = [];
      recordsByDate[key].push(r);
    });

    const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
    const resetToToday = () => setCalendarDate(new Date());

    const todayStr = new Date().toISOString().split('T')[0];

    const cells = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push({ isCurrentMonth: false, dayNum: null, dateStr: null });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPast = dateStr < todayStr;
      const dayRecords = recordsByDate[dateStr] || [];
      const totalHrs = dayRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);

      cells.push({
        isCurrentMonth: true,
        dayNum: day,
        dateStr,
        dayOfWeek,
        isWeekend,
        isPast,
        dayRecords,
        totalHrs
      });
    }

    return (
      <div className="p-6 sm:p-8 space-y-6">
        {/* Calendar Navigation Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{monthName}</h3>
              <p className="text-xs text-slate-400">Monthly OJT Duty Visualizer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetToToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7-Day Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div key={d} className={`text-center py-2 text-xs font-extrabold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {d}
            </div>
          ))}

          {cells.map((cell, idx) => {
            if (!cell.isCurrentMonth) {
              return <div key={`blank-${idx}`} className="min-h-[90px] sm:min-h-[110px] rounded-2xl bg-slate-50/30 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-800/40 opacity-40 pointer-events-none" />;
            }

            const isToday = cell.dateStr === todayStr;
            const hasLogs = cell.dayRecords.length > 0;
            const isMissingWeekday = !hasLogs && cell.isPast && !cell.isWeekend;

            return (
              <div
                key={cell.dateStr}
                className={`min-h-[90px] sm:min-h-[110px] p-2.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isToday
                    ? 'ring-2 ring-emerald-500/80 bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                    : hasLogs
                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
                    : isMissingWeekday
                    ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/40'
                    : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50'
                }`}
              >
                {/* Cell Header: Day Number & Indicators */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-extrabold ${isToday ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-md' : 'text-slate-700 dark:text-slate-300'}`}>
                    {cell.dayNum}
                  </span>

                  {hasLogs && (
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded-md">
                      {cell.totalHrs.toFixed(1)}h
                    </span>
                  )}
                </div>

                {/* Cell Body: Log Badges or Missing Prompt */}
                <div className="my-1 space-y-1 overflow-hidden">
                  {hasLogs ? (
                    cell.dayRecords.map(r => (
                      <button
                        key={r._id}
                        onClick={() => startEdit(r)}
                        className="w-full text-left p-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-100 dark:border-slate-700/60 transition-colors cursor-pointer block truncate"
                        title={`${r.taskDescription} (${r.totalHours} hrs)`}
                      >
                        <p className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 truncate">{r.taskDescription || 'Duty Entry'}</p>
                      </button>
                    ))
                  ) : isMissingWeekday ? (
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="hidden sm:inline">Missing Log</span>
                    </div>
                  ) : null}
                </div>

                {/* Cell Footer: Add Log Shortcut */}
                <div>
                  {!hasLogs && (
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, date: cell.dateStr }));
                        setShowModal(true);
                      }}
                      className="w-full py-1 text-[10px] font-extrabold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden sm:inline">Log</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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

                      {/* My Profile Option */}
                      <Link 
                        to="/profile"
                        onClick={() => setShowProfileDropdown(false)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all font-bold cursor-pointer mb-1"
                      >
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>My Profile</span>
                        </div>
                      </Link>

                      {/* Settings Option */}
                      <Link 
                        to="/profile?tab=settings"
                        onClick={() => setShowProfileDropdown(false)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all font-bold cursor-pointer mb-1"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span>Settings</span>
                        </div>
                      </Link>

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

              {/* OJT Completion Forecast & Streak Badge */}
              {(() => {
                const forecaster = calculateForecaster();
                return (
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {forecaster.projectedDate ? (
                      <div className="flex items-center gap-2 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 px-3 py-1.5 rounded-xl text-emerald-700 dark:text-emerald-300 font-medium">
                        <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>Projected Completion: <strong className="font-extrabold text-emerald-800 dark:text-emerald-200">{forecaster.projectedDate}</strong> (~{forecaster.daysNeeded} duty days at {forecaster.avgHoursPerDay} hrs/day)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/50 px-3 py-1.5 rounded-xl text-slate-500 dark:text-slate-400 font-medium">
                        <Target className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>Projected Completion: <strong className="font-bold text-slate-600 dark:text-slate-300">Log 1 entry to calculate velocity forecast</strong></span>
                      </div>
                    )}

                    {forecaster.streak > 0 && (
                      <div className="flex items-center gap-1.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 px-3 py-1.5 rounded-xl text-amber-700 dark:text-amber-300 font-extrabold">
                        <Flame className="w-4 h-4 text-amber-500 fill-amber-400 animate-pulse" />
                        <span>{forecaster.streak}-Day Duty Streak!</span>
                      </div>
                    )}
                  </div>
                );
              })()}
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
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Task Category / Skill Domain</label>
                  <select
                    name="category"
                    value={formData.category || 'Development'}
                    onChange={handleChange}
                    className="w-full rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 p-3.5 border transition-all text-sm font-medium outline-none cursor-pointer"
                  >
                    {SKILL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
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

        {/* OJT Skill Competency Matrix Widget */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[2.2rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800/70 shadow-sm mb-8 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">OJT Skill Competency Matrix</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Distribution of your logged training hours across professional skill domains</p>
              </div>
            </div>

            {(() => {
              const skillMatrixData = SKILL_CATEGORIES.map(cat => {
                const categoryRecords = records.filter(r => (r.category || 'Development') === cat.id);
                const categoryHours = categoryRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
                const percent = totalAccumulatedHours > 0 ? (categoryHours / totalAccumulatedHours) * 100 : 0;
                return { ...cat, hours: categoryHours, percent };
              });
              const topCat = skillMatrixData.reduce((prev, curr) => (curr.hours > prev.hours) ? curr : prev, skillMatrixData[0]);
              if (!topCat || topCat.hours === 0) return null;
              return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Primary Focus:</span>
                  {getCategoryIcon(topCat.iconName, "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400")}
                  <span>{topCat.label} ({topCat.percent.toFixed(0)}%)</span>
                </span>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {SKILL_CATEGORIES.map(cat => {
              const categoryRecords = records.filter(r => (r.category || 'Development') === cat.id);
              const categoryHours = categoryRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
              const percent = totalAccumulatedHours > 0 ? (categoryHours / totalAccumulatedHours) * 100 : 0;
              return (
                <div key={cat.id} className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-slate-200 dark:hover:border-slate-700">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-xs">
                        {getCategoryIcon(cat.iconName, "w-4 h-4")}
                      </div>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{percent.toFixed(0)}%</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1">{cat.label}</h3>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{categoryHours.toFixed(1)} hrs logged</p>
                  </div>
                  
                  <div className="w-full bg-slate-200/60 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full bg-gradient-to-r ${cat.barColor} transition-all duration-700`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      viewMode === 'calendar'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Calendar</span>
                  </button>
                </div>

                <button 
                  onClick={exportToPDF}
                  disabled={records.length === 0}
                  className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" /> Export DTR
                </button>
              </div>
            </div>

            {viewMode === 'calendar' ? (
              renderCalendarView()
            ) : (
              <>
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
                          <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100/80 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/40">
                            {getCategoryIcon(SKILL_CATEGORIES.find(c => c.id === (record.category || 'Development'))?.iconName, "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400")}
                            <span>{SKILL_CATEGORIES.find(c => c.id === (record.category || 'Development'))?.label || 'Development & Engineering'}</span>
                          </span>
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
                                disabled={deletingId === record._id}
                                className="p-2 cursor-pointer text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all disabled:opacity-50"
                                title="Delete record"
                            >
                              {deletingId === record._id ? (
                                <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
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
          </>
        )}
      </section>
        </div>

        <ProofGalleryModal visible={showProofModal} images={proofImages} startIndex={proofStartIndex} onClose={() => setShowProofModal(false)} />
        
        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 OJT Tracker System • Developed by <span className="font-bold text-slate-700 dark:text-slate-200">Alberto Rili</span></p>
        </footer>
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
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span>{editingRecordId ? 'Updating Log Entry...' : 'Uploading & Saving...'}</span>
                  </>
                ) : (
                  <span>{editingRecordId ? 'Confirm & Update' : 'Confirm & Save'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Centered Circling Loading Modal */}
      {(() => {
        const activeLoadingMessage = isLoadingRecords
          ? 'Syncing OJT records...'
          : isSubmitting && editingRecordId
          ? 'Updating log entry...'
          : isSubmitting
          ? 'Uploading & saving entry...'
          : deletingId
          ? 'Deleting log entry...'
          : null;

        if (!activeLoadingMessage) return null;

        return (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 text-center animate-scale-up max-w-xs w-full">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">{activeLoadingMessage}</h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Please wait a moment...</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Dashboard;
