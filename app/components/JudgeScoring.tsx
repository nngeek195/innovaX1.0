'use client';
/**
 * Shared scoring UI used by the passkey Judges Portal (/judges) and the
 * registered Judge Board dashboard (/judge-dashboard).
 */
import React, { useState } from 'react';
import { PHASE1_CRITERIA, PHASE2_CRITERIA, type Criterion } from '@/lib/rubrics';

export type ScoreMap = Record<string, number>;

export function emptyScores(criteria: Criterion[]): ScoreMap {
  return Object.fromEntries(criteria.map(c => [c.key, 0]));
}

export function totalScore(scores: ScoreMap): number {
  return Object.values(scores).reduce((a, b) => a + b, 0);
}

export function scoreColor(total: number): string {
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

export function ScoreModal({ user, phase, initialScores, saving, onSave, onClose }: ScoreModalProps) {
  const criteria = phase === 1 ? PHASE1_CRITERIA : PHASE2_CRITERIA;
  const [scores, setScores] = useState<ScoreMap>(initialScores);
  const total = totalScore(scores);
  const accentColor = phase === 1 ? '#00E5FF' : 'var(--gold)';
  const borderClass = phase === 1 ? 'border-[#00E5FF]/40' : 'border-[var(--gold)]/40';
  const badgeClass  = phase === 1 ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30' : 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30';
  const btnClass    = phase === 1 ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50 hover:bg-[#00E5FF]/30' : 'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/50 hover:bg-[var(--gold)]/30';

  const candidateName = user.name ?? (user.type === 'team'
    ? user.teamName
    : `${user.leader?.firstName} ${user.leader?.lastName}`);

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
export function ScoreBadge({ score, phase }: { score?: number; phase: 1 | 2 }) {
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
