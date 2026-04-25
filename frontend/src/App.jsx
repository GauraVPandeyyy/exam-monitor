// App.jsx — Routing Setup
// Codeblock 2026 Round 3 · Q6 · Nadcab Labs

import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import ExamPortal from "./ExamPortal";
import Dashboard from "./Dashboard";

// ─── Landing / Route Selector ─────────────────────────────────────────────────
function Landing() {
  return (
    <div
      className="min-h-screen bg-[#0a0d14] flex items-center justify-center p-6"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-red-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-500/30">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Exam Monitor
        </h1>
        <p className="text-slate-400 mb-2">
          AI-powered proctoring system · Codeblock 2026
        </p>
        <p className="text-xs text-slate-600 mb-10">Q6: Exam Monitoring System · Nadcab Labs</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/exam"
            className="group bg-[#111622] border border-slate-700/50 hover:border-violet-500/50 rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/10"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-4 group-hover:bg-violet-600/30 transition-colors">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-white mb-1">Student Portal</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Take the mock exam. Monitored for suspicious activity in real-time.
            </p>
            <p className="text-xs text-violet-400 mt-3 font-semibold group-hover:underline">
              Open Exam →
            </p>
          </Link>

          <Link
            to="/dashboard"
            className="group bg-[#111622] border border-slate-700/50 hover:border-red-500/50 rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-xl hover:shadow-red-500/10"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mb-4 group-hover:bg-red-600/30 transition-colors">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-white mb-1">Admin Dashboard</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitor all students, view risk scores, and review flagged activity.
            </p>
            <p className="text-xs text-red-400 mt-3 font-semibold group-hover:underline">
              Open Dashboard →
            </p>
          </Link>
        </div>

        <p className="text-xs text-slate-600 mt-8">
          Open both views side-by-side for the best demo experience.
        </p>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/exam" element={<ExamPortal />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
