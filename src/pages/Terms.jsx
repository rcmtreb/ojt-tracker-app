import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Database, EyeOff, Lock, Clock, ChevronRight } from 'lucide-react';

function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-12 lg:p-20 font-sans flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl animate-float animate-delay-200" style={{ animationDelay: '3s' }}></div>

      <div className="max-w-3xl w-full glass-panel-dark bg-slate-950/80 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative z-10 animate-scale-up">
        
        {/* Header Section */}
        <div className="p-8 md:p-12 bg-slate-950/40 text-white relative overflow-hidden border-b border-slate-850">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
          
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-8 left-8 p-3 cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 text-slate-400 hover:text-white transition-all active:scale-95 group z-10"
            title="Go Back"
          >
            <ArrowLeft className="w-4.5 h-4.5 transition-transform group-hover:-translate-x-0.5" />
          </button>

          <div className="text-center relative z-10 pt-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl mb-4">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight text-white">Terms & Conditions</h1>
            <p className="text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">Last updated: April 2026</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 md:p-12 space-y-10">
          
          <section className="space-y-3 group">
            <div className="flex items-center gap-3.5 text-emerald-400">
              <div className="w-9 h-9 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:border-emerald-500 group-hover:text-white transition-all duration-300">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">1. Introduction</h2>
            </div>
            <p className="text-slate-450 text-slate-400 leading-relaxed text-xs md:text-sm pl-12">
              Welcome to the <span className="font-bold text-emerald-400">OJT Tracker App</span>. By using our service and signing in with your Google account, you agree to comply with and be bound by the following terms and conditions. This app is designed solely for students to track their On-the-Job Training hours and tasks efficiently and professionally.
            </p>
          </section>

          <section className="space-y-3 group">
            <div className="flex items-center gap-3.5 text-emerald-400">
              <div className="w-9 h-9 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:border-emerald-500 group-hover:text-white transition-all duration-300">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">2. Data Privacy & Storage</h2>
            </div>
            <p className="text-slate-450 text-slate-400 leading-relaxed text-xs md:text-sm pl-12">
              We store your <span className="font-semibold text-slate-200">name, email address, and profile picture</span> retrieved from Google to personalize your experience. Your logged OJT records and uploaded documentary evidence are stored in our secure database and local storage. <span className="text-teal-400 font-medium italic">We do not share your data with third parties.</span>
            </p>
          </section>

          <section className="space-y-3 group">
            <div className="flex items-center gap-3.5 text-emerald-400">
              <div className="w-9 h-9 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:border-emerald-500 group-hover:text-white transition-all duration-300">
                <EyeOff className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">3. User Responsibility</h2>
            </div>
            <p className="text-slate-450 text-slate-400 leading-relaxed text-xs md:text-sm pl-12">
              You are solely responsible for the accuracy of the data you log. Misrepresentation of duty hours or tasks is a <span className="text-red-400 font-bold">violation of academic integrity</span>. Ensure that you have obtained the necessary permissions before uploading any sensitive company documents as proof of work.
            </p>
          </section>

          <section className="space-y-3 group border-b border-slate-800 pb-10">
            <div className="flex items-center gap-3.5 text-emerald-400">
              <div className="w-9 h-9 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:border-emerald-500 group-hover:text-white transition-all duration-300">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">4. Security</h2>
            </div>
            <p className="text-slate-450 text-slate-400 leading-relaxed text-xs md:text-sm pl-12">
              While we implement modern security measures to protect your data, no method of transmission over the internet is 100% secure. You use this application at your own discretion. Our authentication is handled exclusively by Google OAuth 2.0 for maximum safety.
            </p>
          </section>

          <div className="flex flex-col items-center gap-4 pt-2">
            <button 
              onClick={() => navigate(-1)}
              className="group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[10px] uppercase tracking-widest py-4.5 px-12 rounded-2xl shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              I Understand & Agree 
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
              Secured by Google OAuth Technology
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-slate-500 text-xs relative z-10">
        © 2026 OJT Tracker System. All rights reserved.
      </p>
    </div>
  );
}

export default Terms;
