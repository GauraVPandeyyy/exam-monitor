// Dashboard.jsx — Admin Monitoring View
// Codeblock 2026 Round 3 · Q6 · Nadcab Labs

import { useState, useEffect, useRef } from "react";

const API = "https://exam-monitor-api.onrender.com/api";
const POLL_INTERVAL = 3000;

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function timeSince(iso) {
  const seconds = Math.floor((new Date() - new Date(iso)) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

const EVENT_LABELS = {
  TAB_SWITCH: "Tab Switch",
  MOUSE_LEAVE: "Mouse Left",
  COPY: "Copy Attempt",
  PASTE: "Paste Attempt",
  COPY_PASTE: "Copy / Paste",
  RIGHT_CLICK: "Right Click",
  KEYBOARD_SHORTCUT: "Key Shortcut",
  FOCUS_LOST: "Focus Lost",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const map = {
    High: "bg-red-500/15 text-red-300 border-red-500/30",
    Medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    Low: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  };
  const dot = {
    High: "bg-red-400",
    Medium: "bg-amber-400",
    Low: "bg-sky-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${map[severity] || "bg-slate-700 text-slate-300 border-slate-600"}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot[severity] || "bg-slate-400"}`} />
      {severity}
    </span>
  );
}

function EventTypePill({ type }) {
  const map = {
    TAB_SWITCH: "bg-red-950/60 text-red-300 border-red-800/50",
    MOUSE_LEAVE: "bg-amber-950/60 text-amber-300 border-amber-800/50",
    COPY: "bg-purple-950/60 text-purple-300 border-purple-800/50",
    PASTE: "bg-purple-950/60 text-purple-300 border-purple-800/50",
    COPY_PASTE: "bg-purple-950/60 text-purple-300 border-purple-800/50",
    RIGHT_CLICK: "bg-slate-700/60 text-slate-300 border-slate-600/50",
    KEYBOARD_SHORTCUT: "bg-orange-950/60 text-orange-300 border-orange-800/50",
    FOCUS_LOST: "bg-amber-950/60 text-amber-300 border-amber-800/50",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-md text-xs font-mono font-semibold border ${map[type] || "bg-slate-800 text-slate-300 border-slate-700"}`}
    >
      {EVENT_LABELS[type] || type}
    </span>
  );
}

function MetricCard({ label, value, sub, accent, icon }) {
  return (
    <div className={`bg-[#111622] border rounded-2xl p-6 flex flex-col gap-3 shadow-xl relative overflow-hidden ${accent}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="w-9 h-9 rounded-xl bg-slate-800/70 border border-slate-700/50 flex items-center justify-center text-lg">
          {icon}
        </div>
      </div>
      <p className="text-4xl font-black text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function LiveDot({ active }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-600"}`} />
    </span>
  );
}

function RiskBar({ score }) {
  const max = 100;
  const pct = Math.min((score / max) * 100, 100);
  const color =
    pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-amber-500" : "bg-sky-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{score}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [newLogIds, setNewLogIds] = useState(new Set());
  const prevLogIdsRef = useRef(new Set());

  const fetchData = async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API}/logs`),
        fetch(`${API}/stats`),
      ]);
      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      if (logsData.success) {
        const incoming = logsData.logs;
        const incomingIds = new Set(incoming.map((l) => l.id));
        const fresh = new Set(
          [...incomingIds].filter((id) => !prevLogIdsRef.current.has(id))
        );
        prevLogIdsRef.current = incomingIds;
        if (fresh.size > 0) {
          setNewLogIds(fresh);
          setTimeout(() => setNewLogIds(new Set()), 2500);
        }
        setLogs(incoming);
      }
      if (statsData.success) setStats(statsData.stats);
      setLastUpdated(new Date());
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isLive]);

  const handleClear = async () => {
    if (!window.confirm("Clear all logs? This cannot be undone.")) return;
    await fetch(`${API}/logs`, { method: "DELETE" });
    prevLogIdsRef.current = new Set();
    fetchData();
  };

  // ── Filtered logs ──────────────────────────────────────────────────────
  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      !search ||
      log.studentName.toLowerCase().includes(search.toLowerCase()) ||
      log.studentId.toLowerCase().includes(search.toLowerCase()) ||
      log.eventType.toLowerCase().includes(search.toLowerCase());
    const matchSeverity =
      severityFilter === "All" || log.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Connecting to monitor...</p>
        </div>
      </div>
    );
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0a0d14] text-white"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
    >
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#0a0d14]/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/80 flex items-center justify-center shadow-lg shadow-red-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">Exam Monitor</h1>
              <p className="text-xs text-slate-500 mt-0.5">Codeblock 2026 · Admin Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <LiveDot active={isLive} />
              {isLive
                ? lastUpdated
                  ? `Updated ${timeSince(lastUpdated)}`
                  : "Live"
                : "Paused"}
            </div>
            <button
              onClick={() => setIsLive((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer
                ${isLive
                  ? "bg-emerald-900/40 border-emerald-700/40 text-emerald-300 hover:bg-emerald-800/50"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
            >
              {isLive ? "⏸ Pause" : "▶ Resume"}
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/40 transition-all cursor-pointer"
            >
              🗑 Clear Logs
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total Flags"
            value={stats?.totalFlags ?? 0}
            sub="All recorded events"
            accent="border-slate-700/50"
            icon="🚩"
          />
          <MetricCard
            label="Critical Alerts"
            value={stats?.highSeverityCount ?? 0}
            sub="High severity events"
            accent="border-red-800/40"
            icon="🚨"
          />
          <MetricCard
            label="Students Flagged"
            value={stats?.uniqueStudentsFlagged ?? 0}
            sub="Unique participants"
            accent="border-amber-800/40"
            icon="👤"
          />
          <MetricCard
            label="Medium Alerts"
            value={stats?.mediumSeverityCount ?? 0}
            sub="Requires review"
            accent="border-amber-800/30"
            icon="⚠️"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Main Log Table ── */}
          <div className="xl:col-span-2 bg-[#111622] border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
            {/* Table header / filters */}
            <div className="px-6 py-4 border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Activity Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">{filteredLogs.length} event{filteredLogs.length !== 1 ? "s" : ""} shown</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2a7.5 7.5 0 010 14.65z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search student, event…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-slate-800/60 border border-slate-700/50 text-slate-200 placeholder-slate-500 rounded-lg pl-9 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:border-violet-500/60 transition-colors"
                  />
                </div>
                {/* Severity filter */}
                {["All", "High", "Medium", "Low"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer
                      ${severityFilter === s
                        ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                        : "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center text-2xl mb-4">
                    🔍
                  </div>
                  <p className="text-slate-400 font-medium">No events found</p>
                  <p className="text-slate-600 text-sm mt-1">
                    {logs.length === 0
                      ? "Open the exam portal to start generating events."
                      : "Try adjusting your search or filter."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      {["#", "Student", "Event", "Severity", "Time"].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-widest"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const isNew = newLogIds.has(log.id);
                      return (
                        <tr
                          key={log.id}
                          className={`border-b border-slate-800/50 transition-all duration-700
                            ${isNew ? "bg-violet-600/10" : "hover:bg-slate-800/30"}`}
                        >
                          <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                            {log.id}
                            {isNew && (
                              <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold uppercase tracking-wide">
                                new
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-200 text-xs">{log.studentName}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{log.studentId}</p>
                          </td>
                          <td className="px-6 py-4">
                            <EventTypePill type={log.eventType} />
                          </td>
                          <td className="px-6 py-4">
                            <SeverityBadge severity={log.severity} />
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-slate-300 font-mono">{formatTime(log.receivedAt)}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{formatDate(log.receivedAt)}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="flex flex-col gap-6">
            {/* Risk leaderboard */}
            <div className="bg-[#111622] border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-white">Risk Scores</h2>
                <span className="text-xs text-slate-500">Top students</span>
              </div>
              {(stats?.topRiskyStudents ?? []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No data yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {(stats?.topRiskyStudents ?? []).map((s, i) => (
                    <div key={s.studentId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono w-4">{i + 1}</span>
                          <div>
                            <p className="text-xs font-semibold text-slate-200">{s.studentName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{s.flags} flags</p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            s.score >= 30
                              ? "text-red-400"
                              : s.score >= 15
                              ? "text-amber-400"
                              : "text-sky-400"
                          }`}
                        >
                          {s.score >= 30
                            ? "HIGH RISK"
                            : s.score >= 15
                            ? "MODERATE"
                            : "LOW"}
                        </span>
                      </div>
                      <RiskBar score={s.score} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Event breakdown */}
            <div className="bg-[#111622] border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-5">Event Breakdown</h2>
              {!stats?.eventBreakdown || Object.keys(stats.eventBreakdown).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No events recorded.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {Object.entries(stats.eventBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const total = stats.totalFlags || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={type}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-300 font-medium">
                              {EVENT_LABELS[type] || type}
                            </span>
                            <span className="text-xs font-mono text-slate-400">{count}</span>
                          </div>
                          <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="bg-[#111622] border border-slate-700/50 rounded-2xl p-5 shadow-xl">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Severity Legend</h2>
              <div className="flex flex-col gap-2.5 text-xs">
                {[
                  { sev: "High", desc: "Tab switch, page leave — probable cheating", color: "text-red-400" },
                  { sev: "Medium", desc: "Cursor exit, keyboard shortcuts", color: "text-amber-400" },
                  { sev: "Low", desc: "Copy / paste / right-click attempts", color: "text-sky-400" },
                ].map(({ sev, desc, color }) => (
                  <div key={sev} className="flex items-start gap-2">
                    <SeverityBadge severity={sev} />
                    <p className={`text-slate-400 leading-relaxed mt-0.5`}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
