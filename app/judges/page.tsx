'use client';
import React, { useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

// ─── Scoring Rubrics ──────────────────────────────────────────────────────────
const PHASE1_CRITERIA = [
  { key: 'problemClarity',  label: 'Problem Clarity & Impact',  max: 25 },
  { key: 'agenticDesign',   label: 'Agentic Design',            max: 30 },
  { key: 'innovation',      label: 'Innovation',                max: 20 },
  { key: 'feasibility',     label: 'Feasibility & Scalability', max: 15 },
  { key: 'responsibleAI',   label: 'Responsible AI & Safety',   max: 10 },
];

const PHASE2_CRITERIA = [
  { key: 'problemClarity',      label: 'Problem Clarity & Impact',  max: 10 },
  { key: 'agenticDesign',       label: 'Agentic Design',            max: 25 },
  { key: 'innovation',          label: 'Innovation',                max: 10 },
  { key: 'technicalExecution',  label: 'Technical Execution',       max: 30 },
  { key: 'feasibility',         label: 'Feasibility & Scalability', max: 10 },
  { key: 'responsibleAI',       label: 'Responsible AI & Safety',   max: 15 },
];

type ScoreMap = Record<string, number>;

function emptyScores(criteria: typeof PHASE1_CRITERIA): ScoreMap {
  return Object.fromEntries(criteria.map(c => [c.key, 0]));
}

function totalScore(scores: ScoreMap): number {
  return Object.values(scores).reduce((a, b) => a + b, 0);
}

function scoreColor(total: number): string {
  if (total >= 80) return 'text-green-400';
  if (total >= 60) return 'text-yellow-400';
  if (total >= 40) return 'text-orange-400';
  return 'text-red-400';
}

// ─── Score Modal ──────────────────────────────────────────────────────────────
interface ScoreModalProps {
  user: any;
  phase: 1 | 2;
  initialScores: ScoreMap;
  saving: boolean;
  onSave: (scores: ScoreMap) => void;
  onClose: () => void;
}

function ScoreModal({ user, phase, initialScores, saving, onSave, onClose }: ScoreModalProps) {
  const criteria = phase === 1 ? PHASE1_CRITERIA : PHASE2_CRITERIA;
  const [scores, setScores] = useState<ScoreMap>(initialScores);
  const total = totalScore(scores);
  const accentColor = phase === 1 ? '#00E5FF' : 'var(--gold)';
  const borderClass = phase === 1 ? 'border-[#00E5FF]/40' : 'border-[var(--gold)]/40';
  const badgeClass  = phase === 1 ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30' : 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30';
  const btnClass    = phase === 1 ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50 hover:bg-[#00E5FF]/30' : 'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/50 hover:bg-[var(--gold)]/30';

  const candidateName = user.type === 'team'
    ? user.teamName
    : `${user.leader?.firstName} ${user.leader?.lastName}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#05080C]/90 backdrop-blur-md px-4">
      <div className={`glass-panel ${borderClass} max-w-xl w-full p-8 shadow-[0_0_60px_rgba(0,229,255,0.1)] relative animate-fade-in max-h-[90vh] overflow-y-auto`}>

        {/* Close */}
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-white text-xl">✕</button>

        {/* Header */}
        <p className={`font-mono text-[10px] tracking-[0.3em] uppercase mb-1 ${phase === 1 ? 'text-[#00E5FF]' : 'text-[var(--gold)]'}`}>
          Phase {phase} Scoring Rubric
        </p>
        <h3 className="text-xl font-display font-black text-white tracking-widest uppercase mb-1">
          {candidateName}
        </h3>
        <p className="text-gray-500 font-mono text-xs mb-6">{user.university}</p>

        {/* Criteria inputs */}
        <div className="space-y-4 mb-6">
          {criteria.map(c => (
            <div key={c.key}>
              <div className="flex justify-between items-center mb-1">
                <label className="text-gray-300 text-xs font-mono">{c.label}</label>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeClass}`}>
                  / {c.max}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={c.max}
                  step={1}
                  value={scores[c.key] ?? 0}
                  onChange={e => setScores(prev => ({ ...prev, [c.key]: Number(e.target.value) }))}
                  className="flex-1 accent-current"
                  style={{ accentColor }}
                />
                <input
                  type="number"
                  min={0}
                  max={c.max}
                  value={scores[c.key] ?? 0}
                  onChange={e => {
                    const v = Math.min(c.max, Math.max(0, Number(e.target.value)));
                    setScores(prev => ({ ...prev, [c.key]: v }));
                  }}
                  className="w-16 bg-[#05080C] border border-white/10 rounded px-2 py-1 text-white font-mono text-sm text-center focus:outline-none focus:border-white/30"
                />
              </div>
              {/* Progress bar */}
              <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${c.max > 0 ? ((scores[c.key] ?? 0) / c.max) * 100 : 0}%`,
                    backgroundColor: accentColor === 'var(--gold)' ? '#FFD700' : accentColor,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t border-white/10 pt-5 mb-6">
          <span className="text-gray-400 font-mono text-sm uppercase tracking-widest">Total Score</span>
          <span className={`text-4xl font-black font-display ${scoreColor(total)}`}>
            {total} <span className="text-gray-500 text-lg font-normal">/ 100</span>
          </span>
        </div>

        {/* Save */}
        <button
          onClick={() => onSave(scores)}
          disabled={saving}
          className={`w-full py-3 rounded text-xs font-bold tracking-widest uppercase border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${btnClass}`}
        >
          {saving ? '⏳ Saving...' : '💾 Save Scores'}
        </button>
      </div>
    </div>
  );
}

// ─── Inline Score Badge ───────────────────────────────────────────────────────
function ScoreBadge({ score, phase }: { score?: number; phase: 1 | 2 }) {
  if (score === undefined || score === null) {
    return <span className="text-gray-600 font-mono text-xs">—</span>;
  }
  const colorClass = scoreColor(score);
  const bgClass = phase === 1 ? 'bg-[#00E5FF]/5 border-[#00E5FF]/20' : 'bg-[var(--gold)]/5 border-[var(--gold)]/20';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-xs font-bold ${colorClass} ${bgClass}`}>
      {score}<span className="text-gray-600 font-normal">/100</span>
    </span>
  );
}

// ─── Score Breakdown Expanded Row ─────────────────────────────────────────────
interface ScoreBreakdownRowProps {
  user: any;
  phase: 1 | 2;
  colSpan: number;
  onEdit: () => void;
}

function ScoreBreakdownRow({ user, phase, colSpan, onEdit }: ScoreBreakdownRowProps) {
  const criteria = phase === 1 ? PHASE1_CRITERIA : PHASE2_CRITERIA;
  const scoreField = phase === 1 ? 'judgeScore' : 'judgeScore2';
  const scores: ScoreMap = user[scoreField] || {};
  const accentColor = phase === 1 ? '#00E5FF' : '#FFD700';
  const accentClass = phase === 1 ? 'text-[#00E5FF]' : 'text-[var(--gold)]';
  const borderClass = phase === 1 ? 'border-[#00E5FF]/20' : 'border-[var(--gold)]/20';
  const bgClass = phase === 1 ? 'bg-[#00E5FF]/5' : 'bg-[var(--gold)]/5';
  const badgeClass = phase === 1
    ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
    : 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30';
  const hasScores = Object.keys(scores).length > 0 && scores.total !== undefined;

  return (
    <tr className="animate-fade-in">
      <td colSpan={colSpan} className={`px-6 pb-5 pt-0 ${bgClass}`}>
        <div className={`border ${borderClass} rounded-lg p-4 mt-1`}>
          {hasScores ? (
            <>
              <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${accentClass} mb-3`}>
                Phase {phase} Score Breakdown
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {criteria.map(c => {
                  const val = scores[c.key] ?? 0;
                  const pct = c.max > 0 ? (val / c.max) * 100 : 0;
                  return (
                    <div key={c.key} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-[11px] font-mono">{c.label}</span>
                        <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded border ${badgeClass}`}>
                          {val}<span className="opacity-60 font-normal">/{c.max}</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: accentColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">Total</span>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-black font-display ${scoreColor(scores.total ?? 0)}`}>
                    {scores.total ?? 0}
                    <span className="text-gray-600 text-sm font-normal"> / 100</span>
                  </span>
                  <button
                    onClick={onEdit}
                    className={`text-[10px] font-mono tracking-widest uppercase border px-3 py-1.5 rounded transition-colors ${
                      phase === 1
                        ? 'text-[#00E5FF] border-[#00E5FF]/40 hover:bg-[#00E5FF]/10'
                        : 'text-[var(--gold)] border-[var(--gold)]/40 hover:bg-[var(--gold)]/10'
                    }`}
                  >
                    ✏ Edit Scores
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-gray-500 font-mono text-[11px] italic">No scores recorded yet.</p>
              <button
                onClick={onEdit}
                className={`text-[10px] font-mono tracking-widest uppercase border px-3 py-1.5 rounded transition-colors ${
                  phase === 1
                    ? 'text-[#00E5FF] border-[#00E5FF]/40 hover:bg-[#00E5FF]/10'
                    : 'text-[var(--gold)] border-[var(--gold)]/40 hover:bg-[var(--gold)]/10'
                }`}
              >
                + Add Scores
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function JudgesPortal() {
  const [passkey, setPasskey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const [judgePanel, setJudgePanel] = useState<any>(null);
  const [phase2Panel, setPhase2Panel] = useState<any>(null);
  const [isLegacyAccess, setIsLegacyAccess] = useState(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [zipDownloading, setZipDownloading] = useState(false);

  // Visibility toggles (legacy)
  const [showPhase1, setShowPhase1] = useState(false);
  const [showFinalists, setShowFinalists] = useState(false);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  // Score modal
  const [scoreTarget, setScoreTarget] = useState<{ user: any; phase: 1 | 2 } | null>(null);
  const [scoreSaving, setScoreSaving] = useState(false);

  // Expanded breakdown rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  // ─── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setIsAuthenticated(false);
    setJudgePanel(null);
    setPhase2Panel(null);
    setIsLegacyAccess(false);
    setPasskey('');
    setAllUsers([]);
    setError('');
    setShowPhase1(false);
    setShowFinalists(false);
    setScoreTarget(null);
  };

  const handleResetWithConfirm = () => {
    requestAction(
      'RESET PORTAL',
      'Are you sure you want to reset the portal and return to the login screen? All saved scores and decisions are preserved in the database.',
      handleReset
    );
  };

  // ─── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const panelsDoc = await getDoc(doc(db, 'settings', 'judgePanels'));
      if (panelsDoc.exists() && panelsDoc.data().panels) {
        const panels: any[] = panelsDoc.data().panels;
        const matched = panels.find((p: any) => p.passkey === passkey);
        if (matched) {
          setJudgePanel(matched);
          setIsAuthenticated(true);
          loadDatasets();
          return;
        }
      }

      const phase2PanelsDoc = await getDoc(doc(db, 'settings', 'judgePhase2Panels'));
      if (phase2PanelsDoc.exists() && phase2PanelsDoc.data().panels) {
        const panels: any[] = phase2PanelsDoc.data().panels;
        const matched = panels.find((p: any) => p.passkey === passkey);
        if (matched) {
          setPhase2Panel(matched);
          setIsAuthenticated(true);
          loadDatasets();
          return;
        }
      }

      const sysDoc = await getDoc(doc(db, 'settings', 'secrets'));
      if (sysDoc.exists() && sysDoc.data().judgesPasskey === passkey) {
        setIsLegacyAccess(true);
        setIsAuthenticated(true);
        loadDatasets();
      } else {
        setError('Invalid Passkey. Please check with the administrator.');
      }
    } catch {
      setError('Connection error. Please try again or check permissions.');
    }
  };

  const loadDatasets = async () => {
    setLoadingData(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'registrations'));
      const users = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(users);
    } catch {
      setError('Failed to load datasets. Check Firestore connection.');
    }
    setLoadingData(false);
  };

  // ─── Confirm modal helpers ───────────────────────────────────────────────────
  const requestAction = (title: string, message: string, action: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm: action });
  };

  const executeAction = () => {
    confirmModal.onConfirm();
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  // ─── Advancement toggles ─────────────────────────────────────────────────────
  const toggleRound2 = (userId: string, currentStatus: boolean) => {
    requestAction(
      'JUDGE DECISION: ROUND 2',
      `Are you sure you want to ${currentStatus ? 'REVOKE' : 'ADVANCE'} this candidate's Phase 2 clearance?`,
      async () => {
        try {
          await updateDoc(doc(db, 'registrations', userId), { selectedForRound2: !currentStatus });
          setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, selectedForRound2: !currentStatus } : u));
        } catch {
          alert('Failed to update status. Check permissions/network.');
        }
      }
    );
  };

  const toggleFinalist = (user: any, currentStatus: boolean) => {
    if (!currentStatus && (!user.prototypeLink || user.prototypeLink.trim() === '')) {
      return alert('RESTRICTED ACTION: Cannot advance to Finalist. This candidate has not submitted a prototype video link.');
    }
    requestAction(
      'JUDGE DECISION: FINALIST',
      `Are you sure you want to ${currentStatus ? 'REVOKE' : 'MAKE FINALIST'} for this candidate?`,
      async () => {
        try {
          await updateDoc(doc(db, 'registrations', user.id), { isFinalist: !currentStatus });
          setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, isFinalist: !currentStatus } : u));
        } catch {
          alert('Failed to update status. Check permissions/network.');
        }
      }
    );
  };

  // ─── Score save ──────────────────────────────────────────────────────────────
  const handleSaveScore = async (scores: ScoreMap) => {
    if (!scoreTarget) return;
    setScoreSaving(true);
    const { user, phase } = scoreTarget;
    const field = phase === 1 ? 'judgeScore' : 'judgeScore2';
    try {
      // Use the server-side API route (Admin SDK) — judges have no Firebase Auth,
      // so direct client writes are blocked by Firestore Security Rules.
      const res = await fetch('/api/judge-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, phase, scores }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const { total } = await res.json();
      setAllUsers(prev =>
        prev.map(u => u.id === user.id ? { ...u, [field]: { ...scores, total } } : u)
      );
      setScoreTarget(null);
    } catch (err: any) {
      alert('Failed to save scores: ' + (err.message || 'Check network connection.'));
    }
    setScoreSaving(false);
  };

  // ─── ZIP download ────────────────────────────────────────────────────────────
  const downloadZip = async () => {
    setZipDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const proposals = myProposals.filter(u => u.proposalLink);
      if (proposals.length === 0) { alert('No proposal PDFs found for your panel.'); return; }
      for (const u of proposals) {
        try {
          const response = await fetch(u.proposalLink);
          const blob = await response.blob();
          const rawName = u.type === 'team' ? u.teamName : `${u.leader?.firstName}_${u.leader?.lastName}`;
          const safeName = (rawName || u.id).replace(/[^a-z0-9_-]/gi, '_');
          zip.file(`${safeName}.pdf`, blob);
        } catch { console.error('Failed to fetch PDF for', u.id); }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposals_${judgePanel?.name || `Panel_${judgePanel?.id}`}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('ZIP download failed: ' + err.message);
    } finally {
      setZipDownloading(false);
    }
  };

  // ─── Login Screen ─────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#05080C] text-white flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-md glass-panel relative z-10 border-[#00E5FF]/20 shadow-[0_0_30px_rgba(0,229,255,0.05)]">
          <h2 className="text-2xl font-display font-bold text-center mb-2 tracking-wider uppercase">
            JUDGES <span className="text-[#00E5FF]">DATA PORTAL</span>
          </h2>
          <p className="text-center text-xs text-gray-500 mb-8 font-mono tracking-widest">RESTRICTED ACCESS</p>
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-6 text-sm text-center">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter Access Passkey"
              value={passkey}
              onChange={e => setPasskey(e.target.value)}
              className="w-full bg-[#121822]/50 border border-white/10 rounded-lg p-4 text-white focus:border-[#00E5FF] focus:outline-none text-center tracking-widest font-mono"
              required
            />
            <button type="submit" className="w-full btn-solid-cyan mt-6 justify-center">
              VERIFY ACCESS
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Derived data ─────────────────────────────────────────────────────────────
  const myProposals = judgePanel
    ? allUsers.filter(u => judgePanel.assignedUserIds?.includes(u.id))
    : allUsers.filter(u => u.proposalUploaded && u.proposalLink);

  const myPhase2Entries = phase2Panel
    ? allUsers.filter(u => phase2Panel.assignedUserIds?.includes(u.id))
    : [];

  const phase1Users = allUsers;
  const phase2Users = allUsers.filter(u => u.selectedForRound2);
  const finalists   = allUsers.filter(u => u.isFinalist);

  const headerSubtitle = judgePanel
    ? `PHASE 1 · PANEL ${judgePanel.id}${judgePanel.name ? ` — ${judgePanel.name}` : ''} · ${myProposals.length} ASSIGNED PROPOSALS`
    : phase2Panel
    ? `PHASE 2 · PANEL ${phase2Panel.id}${phase2Panel.name ? ` — ${phase2Panel.name}` : ''} · ${myPhase2Entries.length} ASSIGNED PROTOTYPES`
    : 'CONFIDENTIAL APPLICANT DATASET — FULL ACCESS';

  // ─── Rubric legend row ────────────────────────────────────────────────────────
  const RubricLegend = ({ phase }: { phase: 1 | 2 }) => {
    const criteria = phase === 1 ? PHASE1_CRITERIA : PHASE2_CRITERIA;
    const colorClass = phase === 1 ? 'text-[#00E5FF]' : 'text-[var(--gold)]';
    const borderClass = phase === 1 ? 'border-[#00E5FF]/20 bg-[#00E5FF]/5' : 'border-[var(--gold)]/20 bg-[var(--gold)]/5';
    return (
      <div className={`mb-4 p-3 rounded border ${borderClass} flex flex-wrap gap-3`}>
        <span className={`font-mono text-[10px] uppercase tracking-widest ${colorClass} self-center mr-1`}>Rubric:</span>
        {criteria.map(c => (
          <span key={c.key} className="font-mono text-[10px] text-gray-400">
            {c.label} <span className={`font-bold ${colorClass}`}>{c.max}%</span>
          </span>
        ))}
      </div>
    );
  };

  // ─── Authenticated View ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#05080C] text-white p-10 pt-24 pb-32 relative">

      {/* Confirmation modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080C]/85 backdrop-blur-sm px-4">
          <div className="glass-panel border-red-500/30 max-w-md w-full p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-fade-in">
            <h3 className="text-xl font-display font-black text-red-500 mb-4 tracking-widest uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {confirmModal.title}
            </h3>
            <p className="text-gray-300 text-sm mb-8 leading-relaxed tracking-wide">{confirmModal.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 py-3 text-xs font-bold tracking-widest uppercase border border-gray-600 text-gray-400 hover:bg-gray-800 rounded transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={executeAction}
                className="flex-1 py-3 text-xs font-bold tracking-widest uppercase bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/40 rounded transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                CONFIRM DECISION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score modal */}
      {scoreTarget && (
        <ScoreModal
          user={scoreTarget.user}
          phase={scoreTarget.phase}
          initialScores={(() => {
            // Strip the computed `total` key so totalScore() doesn't double-count it
            const { total: _t, ...saved } = (scoreTarget.phase === 1
              ? scoreTarget.user.judgeScore
              : scoreTarget.user.judgeScore2) || {};
            const empty = emptyScores(scoreTarget.phase === 1 ? PHASE1_CRITERIA : PHASE2_CRITERIA);
            return { ...empty, ...saved };
          })()}
          saving={scoreSaving}
          onSave={handleSaveScore}
          onClose={() => setScoreTarget(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-12 border-b border-[#121822] pb-6 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-black tracking-widest uppercase mb-2">
              INNOVAX <span className="text-[#00E5FF]">JUDGE PORTAL</span>
            </h1>
            <p className="text-gray-400 font-mono text-sm tracking-widest">{headerSubtitle}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleResetWithConfirm}
              className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-500/40 hover:border-yellow-400 px-4 py-2 rounded transition-colors tracking-widest font-mono uppercase"
            >
              ↺ Reset Portal
            </button>
            <button
              onClick={handleResetWithConfirm}
              className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded transition-colors tracking-widest"
            >
              EXIT PORTAL
            </button>
          </div>
        </div>

        {loadingData ? (
          <div className="text-[#00E5FF] font-mono tracking-widest animate-pulse flex justify-center py-20">
            DECRYPTING DATA...
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* PHASE 1 JUDGE PANEL VIEW                                          */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {judgePanel && (
              <div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold uppercase tracking-widest">
                      My Assigned Proposals{' '}
                      <span className="text-[#00E5FF] ml-2">({myProposals.length})</span>
                    </h2>
                    <p className="text-gray-500 font-mono text-xs mt-1">
                      Score each proposal using the rubric, then mark your Round 2 selections.
                    </p>
                  </div>
                  <button
                    onClick={downloadZip}
                    disabled={zipDownloading || myProposals.filter(u => u.proposalLink).length === 0}
                    className="text-xs font-bold tracking-widest uppercase bg-green-500/10 text-green-400 border border-green-500/40 hover:bg-green-500/20 px-5 py-2.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {zipDownloading ? '⏳ Zipping...' : '📦 Download All as ZIP'}
                  </button>
                </div>

                <RubricLegend phase={1} />

                <div className="glass-panel border-[#00E5FF]/30 p-0 overflow-hidden mb-12 shadow-[0_0_20px_rgba(0,229,255,0.05)]">
                  <div className="p-4 bg-[#00E5FF]/10 border-b border-[#00E5FF]/30">
                    <h3 className="font-mono text-sm tracking-[0.2em] uppercase text-[#00E5FF]">
                      Assigned Proposals ({myProposals.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-[#05080C] text-gray-400 font-mono text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4 font-normal">#</th>
                          <th className="p-4 font-normal">Candidate / Team Name <span className="text-[9px] text-[#00E5FF]/60 normal-case tracking-normal">↕ click row to expand</span></th>
                          <th className="p-4 font-normal">University</th>
                          <th className="p-4 font-normal">Proposal PDF</th>
                          <th className="p-4 font-normal text-center">Score</th>
                          <th className="p-4 font-normal text-center bg-[#00E5FF]/10 text-[#00E5FF]">Scoring</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {myProposals.map((user, idx) => {
                          const isScored = user.judgeScore?.total !== undefined;
                          return (
                          <React.Fragment key={user.id}>
                          <tr
                            className={`transition-colors cursor-pointer border-l-2 ${
                              isScored
                                ? 'border-l-[#00E5FF] bg-[#00E5FF]/[0.04] hover:bg-[#00E5FF]/[0.08]'
                                : 'border-l-transparent hover:bg-white/5'
                            } ${expandedRows.has(user.id) ? '!bg-[#00E5FF]/[0.10]' : ''}`}
                            onClick={() => toggleExpand(user.id)}
                          >
                            <td className="p-4 text-gray-600 font-mono text-xs">{idx + 1}</td>
                            <td className="p-4 font-bold">
                              <div className="flex items-center gap-2 flex-wrap">
                                {user.type === 'team' ? user.teamName : `${user.leader?.firstName} ${user.leader?.lastName}`}
                                <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">{user.type}</span>
                                {isScored && (
                                  <span className="text-[9px] font-mono font-bold text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30 px-2 py-0.5 rounded-full">
                                    ✓ Scored
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-gray-300">{user.university}</td>
                            <td className="p-4" onClick={e => e.stopPropagation()}>
                              {user.proposalUploaded && user.proposalLink ? (
                                <a href={user.proposalLink} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline flex items-center gap-2">
                                  📄 View PDF
                                </a>
                              ) : (
                                <span className="text-red-400">✖ Pending</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <ScoreBadge score={user.judgeScore?.total} phase={1} />
                            </td>
                            <td className="p-4 text-center bg-[#00E5FF]/5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setScoreTarget({ user, phase: 1 })}
                                className={`text-[10px] font-mono tracking-widest uppercase border px-3 py-1.5 rounded transition-colors ${
                                  isScored
                                    ? 'text-[#00E5FF] border-[#00E5FF]/60 bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20'
                                    : 'text-[#00E5FF] border-[#00E5FF]/40 hover:bg-[#00E5FF]/10'
                                }`}
                              >
                                {isScored ? '✏ Edit Score' : '+ Score'}
                              </button>
                            </td>
                          </tr>
                          {expandedRows.has(user.id) && (
                            <ScoreBreakdownRow
                              user={user}
                              phase={1}
                              colSpan={6}
                              onEdit={() => { setScoreTarget({ user, phase: 1 }); }}
                            />
                          )}
                          </React.Fragment>
                          );
                        })}
                        {myProposals.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-500 font-mono text-xs">
                              No proposals assigned to your panel yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* PHASE 2 JUDGE PANEL VIEW                                          */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {phase2Panel && (
              <div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold uppercase tracking-widest">
                      My Assigned Prototypes{' '}
                      <span className="text-[var(--gold)] ml-2">({myPhase2Entries.length})</span>
                    </h2>
                    <p className="text-gray-500 font-mono text-xs mt-1">
                      Score each prototype using the rubric, then mark your Finalist selections.
                    </p>
                  </div>
                </div>

                <RubricLegend phase={2} />

                <div className="glass-panel border-[var(--gold)]/40 p-0 overflow-hidden mb-12 shadow-[0_0_30px_rgba(255,215,0,0.07)]">
                  <div className="p-4 bg-[var(--gold)]/10 border-b border-[var(--gold)]/30">
                    <h3 className="font-mono text-sm tracking-[0.2em] uppercase text-[var(--gold)]">
                      Assigned Prototypes ({myPhase2Entries.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-[#05080C] text-gray-400 font-mono text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4 font-normal">#</th>
                          <th className="p-4 font-normal">Candidate / Team Name <span className="text-[9px] text-[var(--gold)]/60 normal-case tracking-normal">↕ click row to expand</span></th>
                          <th className="p-4 font-normal">University</th>
                          <th className="p-4 font-normal">Demo Video</th>
                          <th className="p-4 font-normal">GitHub Repo</th>
                          <th className="p-4 font-normal text-center">Score</th>
                          <th className="p-4 font-normal text-center bg-[var(--gold)]/10 text-[var(--gold)]">Scoring</th>
                          <th className="p-4 font-normal text-center bg-[var(--gold)]/10 text-[var(--gold)]">Mark Finalist</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {myPhase2Entries.map((user, idx) => {
                          const isScored2 = user.judgeScore2?.total !== undefined;
                          return (
                          <React.Fragment key={user.id}>
                          <tr
                            className={`transition-colors cursor-pointer border-l-2 ${
                              isScored2
                                ? 'border-l-[var(--gold)] bg-[var(--gold)]/[0.04] hover:bg-[var(--gold)]/[0.08]'
                                : 'border-l-transparent hover:bg-white/5'
                            } ${expandedRows.has(user.id + '_p2') ? '!bg-[var(--gold)]/[0.10]' : ''}`}
                            onClick={() => toggleExpand(user.id + '_p2')}
                          >
                            <td className="p-4 text-gray-600 font-mono text-xs">{idx + 1}</td>
                            <td className="p-4 font-bold">
                              <div className="flex items-center gap-2 flex-wrap">
                                {user.type === 'team' ? user.teamName : `${user.leader?.firstName} ${user.leader?.lastName}`}
                                <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">{user.type}</span>
                                {isScored2 && (
                                  <span className="text-[9px] font-mono font-bold text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--gold)]/30 px-2 py-0.5 rounded-full">
                                    ✓ Scored
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-gray-300">{user.university}</td>
                            <td className="p-4" onClick={e => e.stopPropagation()}>
                              {user.prototypeLink ? (
                                <a href={user.prototypeLink} target="_blank" rel="noopener noreferrer" className="text-[var(--gold)] hover:underline flex items-center gap-1">
                                  ▶ Play Video
                                </a>
                              ) : (
                                <span className="text-gray-600">Awaiting…</span>
                              )}
                            </td>
                            <td className="p-4" onClick={e => e.stopPropagation()}>
                              {user.githubLink ? (
                                <a href={user.githubLink} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline flex items-center gap-1">
                                  ⎇ View Repo
                                </a>
                              ) : (
                                <span className="text-gray-600">Awaiting…</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <ScoreBadge score={user.judgeScore2?.total} phase={2} />
                            </td>
                            <td className="p-4 text-center bg-[var(--gold)]/5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setScoreTarget({ user, phase: 2 })}
                                className={`text-[10px] font-mono tracking-widest uppercase border px-3 py-1.5 rounded transition-colors ${
                                  isScored2
                                    ? 'text-[var(--gold)] border-[var(--gold)]/60 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20'
                                    : 'text-[var(--gold)] border-[var(--gold)]/40 hover:bg-[var(--gold)]/10'
                                }`}
                              >
                                {isScored2 ? '✏ Edit Score' : '+ Score'}
                              </button>
                            </td>
                            <td className="p-4 text-center bg-[var(--gold)]/5" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={user.isFinalist || false}
                                onChange={() => toggleFinalist(user, user.isFinalist || false)}
                                className="w-5 h-5 accent-[var(--gold)] cursor-pointer"
                              />
                            </td>
                          </tr>
                          {expandedRows.has(user.id + '_p2') && (
                            <ScoreBreakdownRow
                              user={user}
                              phase={2}
                              colSpan={8}
                              onEdit={() => { setScoreTarget({ user, phase: 2 }); }}
                            />
                          )}
                          </React.Fragment>
                          );
                        })}
                        {myPhase2Entries.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-gray-500 font-mono text-xs">
                              No prototypes assigned to your panel yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* LEGACY / FULL-ACCESS VIEW                                         */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {isLegacyAccess && (
              <>
                <div className="flex justify-between items-end mb-6 border-b border-[#121822] pb-4 flex-wrap gap-4">
                  <h2 className="text-2xl font-display font-bold uppercase tracking-widest">
                    Applicant Datasets <span className="text-[#00E5FF] ml-2">({allUsers.length})</span>
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPhase1(!showPhase1)}
                      className="text-xs font-mono tracking-widest uppercase border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800 px-4 py-2 rounded transition-colors"
                    >
                      {showPhase1 ? 'HIDE PHASE 1 (ALL)' : 'SHOW PHASE 1 (ALL)'}
                    </button>
                    <button
                      onClick={() => setShowFinalists(!showFinalists)}
                      className="text-xs font-mono tracking-widest uppercase border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)]/10 px-4 py-2 rounded transition-colors"
                    >
                      {showFinalists ? 'HIDE FINALISTS' : 'SHOW FINALISTS'}
                    </button>
                  </div>
                </div>

                {/* Phase 2 Participants */}
                <div className="glass-panel border-[#00E5FF]/30 p-0 overflow-hidden mb-12 shadow-[0_0_20px_rgba(0,229,255,0.05)]">
                  <div className="p-4 bg-[#00E5FF]/10 border-b border-[#00E5FF]/30 flex justify-between items-center">
                    <h3 className="font-mono text-sm tracking-[0.2em] uppercase text-[#00E5FF]">
                      Phase 2 Participants ({phase2Users.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-[#05080C] text-gray-400 font-mono text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4 font-normal">Candidate / Team Name</th>
                          <th className="p-4 font-normal">University</th>
                          <th className="p-4 font-normal">Demo Video</th>
                          <th className="p-4 font-normal">GitHub Repo</th>
                          <th className="p-4 font-normal text-center">P2 Score</th>
                          <th className="p-4 font-normal text-center bg-red-500/10 text-red-400">Revoke R2</th>
                          <th className="p-4 font-normal text-center bg-[var(--gold)]/10 text-[var(--gold)]">Advance to Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {phase2Users.map(user => (
                          <tr key={user.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-bold flex items-center gap-2">
                              {user.type === 'team' ? user.teamName : `${user.leader?.firstName} ${user.leader?.lastName}`}
                              <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">{user.type}</span>
                            </td>
                            <td className="p-4 text-gray-300">{user.university}</td>
                            <td className="p-4">
                              {user.prototypeLink
                                ? <a href={user.prototypeLink} target="_blank" className="text-[var(--gold)] hover:underline flex items-center gap-1">▶ Play Video</a>
                                : <span className="text-gray-600">Awaiting…</span>}
                            </td>
                            <td className="p-4">
                              {user.githubLink
                                ? <a href={user.githubLink} target="_blank" className="text-purple-400 hover:underline flex items-center gap-1">⎇ View Repo</a>
                                : <span className="text-gray-600">Awaiting…</span>}
                            </td>
                            <td className="p-4 text-center">
                              <ScoreBadge score={user.judgeScore2?.total} phase={2} />
                            </td>
                            <td className="p-4 text-center bg-red-500/5">
                              <input type="checkbox" checked={user.selectedForRound2 || false}
                                onChange={() => toggleRound2(user.id, user.selectedForRound2 || false)}
                                className="w-5 h-5 accent-red-500 cursor-pointer" />
                            </td>
                            <td className="p-4 text-center bg-[var(--gold)]/5">
                              <input type="checkbox" checked={user.isFinalist || false}
                                onChange={() => toggleFinalist(user, user.isFinalist || false)}
                                className="w-5 h-5 accent-[var(--gold)] cursor-pointer" />
                            </td>
                          </tr>
                        ))}
                        {phase2Users.length === 0 && (
                          <tr><td colSpan={7} className="p-8 text-center text-gray-500 font-mono text-xs">No candidates advanced to Phase 2 yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Finalists */}
                {showFinalists && (
                  <div className="glass-panel border-[var(--gold)]/40 p-0 overflow-hidden mb-12 animate-fade-in shadow-[0_0_30px_rgba(255,215,0,0.1)]">
                    <div className="p-4 bg-[var(--gold)]/20 border-b border-[var(--gold)]/40">
                      <h3 className="font-mono text-sm tracking-[0.2em] uppercase text-[var(--gold)] font-bold">
                        🏆 Selected Finalists ({finalists.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#05080C] text-gray-400 font-mono text-xs uppercase tracking-wider">
                          <tr>
                            <th className="p-4 font-normal">Candidate / Team Name</th>
                            <th className="p-4 font-normal">University</th>
                            <th className="p-4 font-normal">Contact Email</th>
                            <th className="p-4 font-normal text-center bg-red-500/10 text-red-400">Revoke Finalist</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {finalists.map(user => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 font-bold flex items-center gap-2">
                                {user.type === 'team' ? user.teamName : `${user.leader?.firstName} ${user.leader?.lastName}`}
                              </td>
                              <td className="p-4 text-gray-300">{user.university}</td>
                              <td className="p-4 font-mono text-xs text-gray-400">{user.email}</td>
                              <td className="p-4 text-center bg-red-500/5">
                                <input type="checkbox" checked={user.isFinalist || false}
                                  onChange={() => toggleFinalist(user, user.isFinalist || false)}
                                  className="w-5 h-5 accent-red-500 cursor-pointer" />
                              </td>
                            </tr>
                          ))}
                          {finalists.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500 font-mono text-xs">No finalists selected yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* All Phase 1 */}
                {showPhase1 && (
                  <div className="glass-panel border-white/10 p-0 overflow-hidden animate-fade-in">
                    <div className="p-4 bg-[#121822] border-b border-white/10">
                      <h3 className="font-mono text-sm tracking-[0.2em] uppercase text-gray-300">
                        Phase 1 Pool - All Submissions ({phase1Users.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#05080C] text-gray-400 font-mono text-xs uppercase tracking-wider">
                          <tr>
                            <th className="p-4 font-normal">Candidate / Team Name</th>
                            <th className="p-4 font-normal">University</th>
                            <th className="p-4 font-normal">Proposal</th>
                            <th className="p-4 font-normal text-center">P1 Score</th>
                            <th className="p-4 font-normal text-center bg-[#00E5FF]/10 text-[#00E5FF]">Advance to R2</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {phase1Users.map(user => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 font-bold flex items-center gap-2">
                                {user.type === 'team' ? user.teamName : `${user.leader?.firstName} ${user.leader?.lastName}`}
                                <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">{user.type}</span>
                              </td>
                              <td className="p-4 text-gray-300">{user.university}</td>
                              <td className="p-4">
                                {user.proposalUploaded && user.proposalLink ? (
                                  <a href={user.proposalLink} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline flex items-center gap-2">📄 View PDF</a>
                                ) : (
                                  <span className="text-red-400">✖ Pending</span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <ScoreBadge score={user.judgeScore?.total} phase={1} />
                              </td>
                              <td className="p-4 text-center bg-[#00E5FF]/5">
                                <input type="checkbox" checked={user.selectedForRound2 || false}
                                  onChange={() => toggleRound2(user.id, user.selectedForRound2 || false)}
                                  className="w-5 h-5 accent-[#00E5FF] cursor-pointer" />
                              </td>
                            </tr>
                          ))}
                          {phase1Users.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono text-xs">No registrations found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
