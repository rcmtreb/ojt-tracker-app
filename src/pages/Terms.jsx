import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Database, EyeOff, Lock, Clock, ChevronRight } from 'lucide-react';

function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-12 lg:p-24 font-sans flex flex-col items-center">
      <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Header Section */}
        <div className="p-8 md:p-12 bg-blue-600 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
          
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-8 left-8 p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all active:scale-95 group z-10"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 text-white transition-transform group-hover:-translate-x-1" />
          </button>

          <div className="text-center relative z-10 pt-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-2xl mb-4 backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Terms & Conditions</h1>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-[0.2em] opacity-80">Last updated: April 2026</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 md:p-12 lg:p-16 space-y-12">
          <section className="space-y-4 group">
            <div className="flex items-center gap-4 text-blue-600">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">1. Introduction</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base pl-14">
              Welcome to the <span className="font-bold text-blue-600">OJT Tracker App</span>. By using our service and signing in with your Google account, you agree to comply with and be bound by the following terms and conditions. This app is designed solely for students to track their On-the-Job Training hours and tasks efficiently and professionally.
            </p>
          </section>

          <section className="space-y-4 group">
            <div className="flex items-center gap-4 text-blue-600">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">2. Data Privacy & Storage</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base pl-14">
              We store your <span className="font-semibold text-gray-900">name, email address, and profile picture</span> retrieved from Google to personalize your experience. Your logged OJT records and uploaded documentary evidence are stored in our secure database and local storage. <span className="text-indigo-600 font-medium italic">We do not share your data with third parties.</span>
            </p>
          </section>

          <section className="space-y-4 group">
            <div className="flex items-center gap-4 text-blue-600">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <EyeOff className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">3. User Responsibility</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base pl-14">
              You are solely responsible for the accuracy of the data you log. Misrepresentation of duty hours or tasks is a <span className="text-red-500 font-bold">violation of academic integrity</span>. Ensure that you have obtained the necessary permissions before uploading any sensitive company documents as proof of work.
            </p>
          </section>

          <section className="space-y-4 group border-b border-gray-50 pb-12">
            <div className="flex items-center gap-4 text-blue-600">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">4. Security</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base pl-14">
              While we implement modern security measures to protect your data, no method of transmission over the internet is 100% secure. You use this application at your own discretion. Our authentication is handled exclusively by Google OAuth 2.0 for maximum safety.
            </p>
          </section>

          <div className="flex flex-col items-center gap-6 pt-4">
            <button 
              onClick={() => navigate(-1)}
              className="group bg-blue-600 text-white font-black text-xs uppercase tracking-widest py-5 px-12 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center gap-2"
            >
              I Understand & Agree <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Secured by Google OAuth Technology
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-gray-400 text-xs">
        © 2026 OJT Tracker System. All rights reserved.
      </p>
    </div>
  );
}

export default Terms;
