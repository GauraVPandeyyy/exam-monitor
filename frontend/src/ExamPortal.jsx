// ExamPortal.jsx — Student Exam View
// Codeblock 2026 Round 3 · Q6 · Nadcab Labs

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Mock exam data ───────────────────────────────────────────────────────────
const EXAM_QUESTIONS = [
  {
    id: 1,
    text: "Which data structure uses LIFO (Last In, First Out) ordering?",
    options: ["Queue", "Stack", "Linked List", "Binary Tree"],
    correct: 1,
  },
  {
    id: 2,
    text: "What is the time complexity of binary search on a sorted array of n elements?",
    options: ["O(n)", "O(n²)", "O(log n)", "O(n log n)"],
    correct: 2,
  },
  {
    id: 3,
    text: "In RESTful APIs, which HTTP method is idempotent and used to fully update a resource?",
    options: ["POST", "PATCH", "PUT", "DELETE"],
    correct: 2,
  },
];

// Fixed demo student — swap out for real auth in production
const DEMO_STUDENT = {
  id: "STU-2026-042",
  name: "Arjun Mehta",
};

const EXAM_DURATION_SECONDS = 30 * 60; // 30 minutes

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium max-w-xs backdrop-blur-md transition-all duration-300
            ${
              t.severity === "High"
                ? "bg-red-950/90 border-red-500/60 text-red-200"
                : t.severity === "Medium"
                ? "bg-amber-950/90 border-amber-500/60 text-amber-200"
                : "bg-slate-800/90 border-slate-500/60 text-slate-200"
            }`}
        >
          <span className="text-lg leading-none mt-0.5">
            {t.severity === "High" ? "🚨" : t.severity === "Medium" ? "⚠️" : "ℹ️"}
          </span>
          <div>
            <p className="font-semibold">{t.title}</p>
            <p className="text-xs opacity-75 mt-0.5">{t.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function ExamTimer({ secondsLeft }) {
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const s = String(secondsLeft % 60).padStart(2, "0");
  const urgent = secondsLeft < 300;
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold tracking-widest border transition-colors
        ${
          urgent
            ? "bg-red-950/60 border-red-500/50 text-red-300 animate-pulse"
            : "bg-slate-800/60 border-slate-600/50 text-slate-200"
        }`}
    >
      <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
        <path strokeLinecap="round" strokeWidth="1.5" d="M12 6v6l4 2" />
      </svg>
      {m}:{s}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExamPortal() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(EXAM_DURATION_SECONDS);
  const [toasts, setToasts] = useState([]);
  const [flagCount, setFlagCount] = useState(0);
  const toastIdRef = useRef(0);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = useCallback((title, message, severity) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, title, message, severity }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // ── Send log to backend ───────────────────────────────────────────────────
  const sendLog = useCallback(
    async (eventType, severity, toastTitle, toastMessage) => {
      if (submitted) return;
      setFlagCount((c) => c + 1);
      showToast(toastTitle, toastMessage, severity);
      try {
        await fetch("https://exam-monitor-api.onrender.com/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: DEMO_STUDENT.id,
            studentName: DEMO_STUDENT.name,
            eventType,
            severity,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {
        // Network silently fails — don't alert the student
      }
    },
    [submitted, showToast]
  );

  // ── Timer countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          setSubmitted(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted]);

  // ── Tab/Visibility switch ─────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        sendLog(
          "TAB_SWITCH",
          "High",
          "Tab Switch Detected",
          "Switching tabs during an exam is not allowed."
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [sendLog]);

  // ── Mouse leave viewport ──────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth) {
        sendLog(
          "MOUSE_LEAVE",
          "Medium",
          "Cursor Left Exam Window",
          "Keep your cursor within the exam area."
        );
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [sendLog]);

  // ── Copy / Paste / Context menu ───────────────────────────────────────────
  useEffect(() => {
    const handleCopy = (e) => {
      e.preventDefault();
      sendLog("COPY", "Low", "Copy Blocked", "Copying exam content is not permitted.");
    };
    const handlePaste = (e) => {
      e.preventDefault();
      sendLog("PASTE", "Low", "Paste Blocked", "Pasting content into the exam is not permitted.");
    };
    const handleContextMenu = (e) => {
      e.preventDefault();
      sendLog("RIGHT_CLICK", "Low", "Right-Click Blocked", "Right-click is disabled during the exam.");
    };
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [sendLog]);

  // ── Keyboard shortcut detection ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const suspicious =
        (e.ctrlKey && ["c", "v", "a", "p"].includes(e.key.toLowerCase())) ||
        e.key === "PrintScreen" ||
        (e.altKey && e.key === "Tab");
      if (suspicious) {
        e.preventDefault();
        sendLog(
          "KEYBOARD_SHORTCUT",
          "Medium",
          "Suspicious Shortcut",
          `Key combo detected: ${e.ctrlKey ? "Ctrl+" : ""}${e.altKey ? "Alt+" : ""}${e.key}`
        );
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sendLog]);

  const handleAnswer = (qId, idx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: idx }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const score = EXAM_QUESTIONS.filter(
    (q) => answers[q.id] === q.correct
  ).length;

  // ─── Submitted State ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center p-6">
        <div className="bg-[#111622] border border-slate-700/50 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Exam Submitted</h2>
          <p className="text-slate-400 mb-6">Your responses have been recorded.</p>
          <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
            <p className="text-sm text-slate-400 mb-1">Your Score</p>
            <p className="text-5xl font-black text-white">
              {score}
              <span className="text-2xl text-slate-400">/{EXAM_QUESTIONS.length}</span>
            </p>
          </div>
          {flagCount > 0 && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
              ⚠️ {flagCount} suspicious event{flagCount !== 1 ? "s" : ""} were recorded and reported to your instructor.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Exam Interface ─────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0a0d14] text-white"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
    >
      <Toast toasts={toasts} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0d14]/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 leading-none">Codeblock 2026 — Round 3</p>
              <p className="text-sm font-semibold text-white leading-tight">Computer Science Assessment</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">{DEMO_STUDENT.name}</span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500">{DEMO_STUDENT.id}</span>
            </div>
            <ExamTimer secondsLeft={secondsLeft} />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Instruction bar */}
        <div className="flex items-center gap-3 bg-violet-950/40 border border-violet-500/25 rounded-xl px-5 py-3.5 mb-10 text-sm text-violet-300">
          <svg className="w-4 h-4 shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          This exam is proctored. Tab switching, copy-paste, right-clicking, and cursor movements outside the window are monitored and reported.
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-white">
            {EXAM_QUESTIONS.length} Questions
          </h1>
          <span className="text-sm text-slate-400">
            {Object.keys(answers).length} of {EXAM_QUESTIONS.length} answered
          </span>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-6">
          {EXAM_QUESTIONS.map((q, qi) => (
            <div
              key={q.id}
              className="bg-[#111622] border border-slate-700/50 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-bold flex items-center justify-center">
                  {qi + 1}
                </span>
                <div className="flex-1">
                  <p className="text-white font-medium leading-relaxed mb-5">{q.text}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt, oi) => {
                      const selected = answers[q.id] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => handleAnswer(q.id, oi)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all duration-150 cursor-pointer
                            ${
                              selected
                                ? "bg-violet-600/20 border-violet-500/60 text-violet-200 shadow-lg shadow-violet-500/10"
                                : "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-700/40 hover:border-slate-600/60"
                            }`}
                        >
                          <span
                            className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                              ${selected ? "border-violet-400 bg-violet-500" : "border-slate-600"}`}
                          >
                            {selected && (
                              <span className="w-2 h-2 rounded-full bg-white block" />
                            )}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111622] border border-slate-700/50 rounded-2xl p-6">
          <div>
            <p className="text-sm font-semibold text-white">
              {Object.keys(answers).length === EXAM_QUESTIONS.length
                ? "All questions answered. Ready to submit."
                : `${EXAM_QUESTIONS.length - Object.keys(answers).length} question${EXAM_QUESTIONS.length - Object.keys(answers).length !== 1 ? "s" : ""} remaining`}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Once submitted, you cannot change your answers.
            </p>
          </div>
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-150 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            Submit Exam →
          </button>
        </div>
      </main>
    </div>
  );
}
