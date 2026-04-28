import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PlusCircle, Trash2, Download, Clock, FileText, ExternalLink, LogOut, User as UserIcon, Calendar, Briefcase, ChevronRight, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

function Dashboard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchRecords(token);
  }, [navigate]);

  const fetchRecords = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateTotalHours = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    const start = new Date(`2000-01-01T${formData.startTime}`);
    const end = new Date(`2000-01-01T${formData.endTime}`);
    let diff = (end - start) / (1000 * 60 * 60);
    diff -= formData.breakDuration / 60;
    return Math.max(0, diff).toFixed(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setPendingTotalHours(calculateTotalHours());
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
      await axios.post(`${API_URL}/records`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setFormData({
        ...formData,
        startTime: '',
        endTime: '',
        breakDuration: 0,
        taskDescription: ''
      });
      setFiles([]);
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

  const exportToPDF = () => {
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
      record.startTime,
      record.endTime,
      record.breakDuration,
      record.totalHours.toFixed(2),
      record.taskDescription
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 58,
      theme: 'striped',
      headStyles: { fillStyle: 'fill', fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 60 },
    });

    doc.save(`OJT_Report_${user?.name.replace(/\s+/g, '_')}.pdf`);
  };

  const totalAccumulatedHours = records.reduce((acc, rec) => acc + (rec.totalHours || 0), 0);
  const targetHours = 600;
  const progressPercent = Math.min(100, (totalAccumulatedHours / targetHours) * 100);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-12">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm shadow-gray-100/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tight">OJT<span className="text-blue-600">Tracker</span></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-900">{user.name}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Student Account</span>
              </div>
              <div className="relative group">
                {user.picture ? (
                  <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full ring-2 ring-blue-50" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-gray-50 mb-1">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Signed in as</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Welcome & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-8 bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Hello, {user.name.split(' ')[0]}! 👋</h2>
              <p className="text-gray-500 mb-6">You've completed <span className="text-blue-600 font-bold">{totalAccumulatedHours.toFixed(1)} hours</span> of your training. Keep it up!</p>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Training Progress</span>
                  <span className="text-sm font-black text-gray-900">{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden p-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out shadow-sm shadow-blue-200" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>0 HRS</span>
                  <span>Target: {targetHours} HRS</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex-1 bg-blue-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-100 flex flex-col justify-between">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-blue-100 text-xs font-black uppercase tracking-widest mb-1">Current Date</p>
                <h3 className="text-xl font-bold">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Records Logged</p>
                <h3 className="text-xl font-bold text-gray-900">{records.length} Total Entries</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Side */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">New Log Entry</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Name</label>
                  <input type="text" name="studentName" value={formData.studentName} onChange={handleChange} placeholder={user.name} className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-3 border transition-all placeholder:text-gray-300 font-medium" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-3 border transition-all font-medium" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Break (Mins)</label>
                    <input type="number" name="breakDuration" value={formData.breakDuration} onChange={handleChange} className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-3 border transition-all font-medium" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Time</label>
                    <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-3 border transition-all font-medium" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Time</label>
                    <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-3 border transition-all font-medium" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Documentary Proof</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      multiple
                      ref={fileInputRef}
                      onChange={(e) => setFiles(e.target.files)} 
                      className="hidden" 
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer text-sm text-gray-500 font-medium"
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      {files.length > 0 ? `${files.length} Files Selected` : 'Click to upload files'}
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Task Description</label>
                  <textarea name="taskDescription" value={formData.taskDescription} onChange={handleChange} rows="3" className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-3 border transition-all font-medium resize-none" placeholder="What did you work on today?"></textarea>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  Review & Save Record <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </section>
          </div>

          {/* Table Side */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Past Records</h2>
                </div>
                <button 
                  onClick={exportToPDF}
                  disabled={records.length === 0}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white text-gray-900 py-3 px-5 rounded-xl border border-gray-200 hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" /> Export DTR
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Hours</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tasks</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Proof</th>
                      <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-30">
                            <Briefcase className="w-12 h-12" />
                            <p className="font-bold text-sm uppercase tracking-widest">No records found yet</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record._id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-8 py-5 whitespace-nowrap">
                            <span className="text-sm font-bold text-gray-900">{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-blue-600">{record.totalHours.toFixed(2)}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">hrs</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-sm text-gray-500 line-clamp-1 max-w-[200px]">{record.taskDescription || 'No description'}</p>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap">
                            {record.documentaryUrls && record.documentaryUrls.length > 0 ? (
                              <div className="flex -space-x-2">
                                {record.documentaryUrls.map((url, index) => (
                                  <a 
                                    key={index}
                                    href={`${BASE_URL}${url}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-600 hover:z-10 hover:scale-110 transition transition-all shadow-sm"
                                    title={`View Attachment ${index + 1}`}
                                  >
                                    <FileText className="w-3 h-3" />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-300 uppercase italic">None</span>
                            )}
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap text-right">
                            <button 
                                onClick={() => deleteRecord(record._id)} 
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Review Entry</h3>
                <p className="text-sm text-gray-500">Double-check your duty logs.</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                <Check className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Name</p>
                  <p className="font-bold text-gray-900">{formData.studentName || user.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Log Date</p>
                  <p className="font-bold text-gray-900">{new Date(formData.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duty Window</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{formData.startTime}</span>
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                    <span className="font-bold text-gray-900">{formData.endTime}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Break Taken</p>
                  <p className="font-bold text-gray-900">{formData.breakDuration} Minutes</p>
                </div>
                
                <div className="col-span-2 bg-blue-600 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-xl shadow-blue-100">
                  <div>
                    <p className="text-blue-100 text-[10px] uppercase font-black tracking-widest mb-1">Total Computed Duty</p>
                    <p className="text-4xl font-black">{pendingTotalHours} <span className="text-lg font-bold">hrs</span></p>
                  </div>
                  <Clock className="w-10 h-10 text-white/30" />
                </div>

                <div className="col-span-2 space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tasks Documented</p>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 italic text-gray-700 text-xs leading-relaxed">
                    "{formData.taskDescription || 'No description provided'}"
                  </div>
                </div>
                
                <div className="col-span-2 flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <p className="text-xs font-bold text-gray-500">Documentary Proof: <span className="text-gray-900">{files.length} file(s) attached</span></p>
                </div>
              </div>
            </div>
            <div className="p-8 pt-0 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-4 px-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 border-2 border-gray-100 hover:bg-gray-50 transition active:scale-95 disabled:opacity-50"
              >
                Go Back
              </button>
              <button 
                onClick={confirmSubmit}
                disabled={isSubmitting}
                className="flex-1 py-4 px-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
