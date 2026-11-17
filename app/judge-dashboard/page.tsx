'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { PHASE1_CRITERIA } from '@/lib/rubrics';
import { CONTACT_EMAIL_GENERAL } from '@/lib/config';
import { judgeCategoryLabel, judgeDisplayName, judgeInstitution, type JudgeProfile } from '@/lib/judges';
import { ScoreModal, ScoreBadge, emptyScores, type ScoreMap } from '@/app/components/JudgeScoring';

interface AssignedProposal {
  id: string;
  type: 'team' | 'individual';
  name: string;
  university: string;
  proposalLink: string | null;
  judgeScore: (ScoreMap & { total?: number }) | null;
}

const WAITING_REFRESH_MS = 60_000;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

async function authedFetch(user: User, url: string, init: RequestInit = {}) {
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

// ─── Small presentational pieces ──────────────────────────────────────────────
function Timeline({ current }: { current: number }) {
  const steps = ['Registered', 'Committee confirmation', 'Proposals distributed', 'Evaluation'];
  return (
    <ol className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-8">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={s} className={`rounded-lg border p-3 text-center ${
            state === 'done' ? 'border-[#00E5FF]/40 bg-[#00E5FF]/5'
              : state === 'current' ? 'border-[var(--gold)]/50 bg-[var(--gold)]/5'
              : 'border-white/10 bg-black/20'}`}>
            <div className={`mx-auto mb-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              state === 'done' ? 'bg-[#00E5FF] text-black'
                : state === 'current' ? 'border-2 border-[var(--gold)] text-[var(--gold)] animate-pulse'
                : 'border border-white/20 text-gray-600'}`}>
              {state === 'done' ? '✓' : i + 1}
            </div>
            <p className={`text-[10px] font-mono uppercase tracking-widest ${state === 'todo' ? 'text-gray-600' : 'text-gray-200'}`}>{s}</p>
          </li>
        );
      })}
    </ol>
  );
}

function RubricPreview() {
  return (
    <div className="mt-8 border border-white/10 rounded-lg p-5 bg-black/20 text-left">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00E5FF] mb-4">While you wait — the Phase 1 evaluation rubric</p>
      <div className="space-y-3">
        {PHASE1_CRITERIA.map(c => (
          <div key={c.key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-300">{c.label}</span>
              <span className="font-mono text-[#00E5FF]">{c.max} pts</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#00E5FF]/60 rounded-full" style={{ width: `${c.max}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-500 mt-4">Total: 100 points per proposal.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function JudgeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [judge, setJudge] = useState<JudgeProfile | null>(null);
  const [proposals, setProposals] = useState<AssignedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const [scoreTarget, setScoreTarget] = useState<AssignedProposal | null>(null);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [zipping, setZipping] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(async (u: User, silent = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) setRefreshing(true);
    try {
      const res = await authedFetch(u, '/api/judge/me');
      if (res.status === 404) {
        // Not a judge — participants belong on the main dashboard.
        router.replace('/dashboard');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load your dashboard.');
      setJudge(data.judge);
      setProposals(data.proposals || []);
      setError('');
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your dashboard.');
    } finally {
      loadingRef.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      // First visit straight after registration → show the welcome banner once.
      if (new URLSearchParams(window.location.search).get('welcome') === '1') {
        setShowWelcome(true);
        window.history.replaceState(null, '', '/judge-dashboard');
      }
      if (!u) {
        document.cookie = 'innovax_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.push('/login');
        return;
      }
      setUser(u);
      load(u);
    });
    return () => unsub();
  }, [load, router]);

  // Keep checking while the judge is waiting on the committee.
  const isWaiting = !!judge && (judge.status === 'pending' || (judge.status === 'approved' && proposals.length === 0));
  useEffect(() => {
    if (!user || !isWaiting) return;
    const t = setInterval(() => load(user, true), WAITING_REFRESH_MS);
    return () => clearInterval(t);
  }, [user, isWaiting, load]);

  const handleLogout = async () => {
    document.cookie = 'innovax_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    await signOut(auth);
    router.push('/login');
  };

  const handleSaveScore = async (scores: ScoreMap) => {
    if (!scoreTarget || !user) return;
    setScoreSaving(true);
    try {
      const res = await authedFetch(user, '/api/judge/score', {
        method: 'POST',
        body: JSON.stringify({ userId: scoreTarget.id, scores }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save score.');
      setProposals(prev => prev.map(p => p.id === scoreTarget.id ? { ...p, judgeScore: { ...scores, total: data.total } } : p));
      setScoreTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save score.');
    } finally {
      setScoreSaving(false);
    }
  };

  const downloadZip = async () => {
    const withPdf = proposals.filter(p => p.proposalLink);
    if (withPdf.length === 0) return alert('No proposal PDFs available yet.');
    setZipping(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const used = new Set<string>();
      for (const p of withPdf) {
        try {
          const blob = await (await fetch(p.proposalLink!)).blob();
          let base = (p.name || p.id).replace(/[^a-z0-9_-]/gi, '_');
          if (used.has(base)) base = `${base}_${p.id.slice(0, 5)}`;
          used.add(base);
          zip.file(`${base}.pdf`, blob);
        } catch { console.error('Failed to fetch PDF for', p.id); }
      }
      const url = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'InnovaX_My_Assigned_Proposals.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('ZIP download failed: ' + (err instanceof Error ? err.message : 'unknown error'));
    } finally {
      setZipping(false);
    }
  };

  // ── Loading / error shells ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#05080C] flex flex-col items-center justify-center gap-6 text-[#00E5FF] font-mono tracking-widest">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border border-[#00E5FF]/20" />
          <div className="absolute inset-0 rounded-full border border-transparent border-t-[#00E5FF] animate-spin" />
        </div>
        <span className="text-xs animate-pulse">PREPARING YOUR JUDGE DASHBOARD...</span>
      </div>
    );
  }

  if (!judge) {
    return (
      <div className="min-h-screen bg-[#05080C] text-white flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-red-400 font-mono text-sm">{error || 'Unable to load your profile.'}</p>
        <div className="flex gap-3">
          <button onClick={() => user && load(user)} className="btn-outline-cyan text-xs px-4 py-2">Try again</button>
          <button onClick={handleLogout} className="text-xs border border-gray-700 text-gray-400 px-4 py-2 rounded">Sign out</button>
        </div>
      </div>
    );
  }

  const name = judgeDisplayName(judge);
  const scoredCount = proposals.filter(p => p.judgeScore?.total !== undefined).length;
  const progress = proposals.length ? Math.round((scoredCount / proposals.length) * 100) : 0;
  const avg = scoredCount
    ? Math.round(proposals.reduce((s, p) => s + (p.judgeScore?.total ?? 0), 0) / scoredCount)
    : null;

  return (
    <div className="min-h-screen bg-[#05080C] text-white px-5 md:px-10 pt-20 pb-32 relative">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(0,229,255,0.07),transparent_55%)]" />

      {scoreTarget && (
        <ScoreModal
          user={scoreTarget}
          phase={1}
          initialScores={(() => {
            const { total: _t, ...saved } = scoreTarget.judgeScore || {};
            void _t;
            return { ...emptyScores(PHASE1_CRITERIA), ...saved };
          })()}
          saving={scoreSaving}
          onSave={handleSaveScore}
          onClose={() => setScoreTarget(null)}
        />
      )}

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="flex justify-between items-end flex-wrap gap-4 border-b border-[#121822] pb-6 mb-10">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-2">⚖️ InnovaX Judge Board</p>
            <h1 className="text-2xl md:text-4xl font-display font-black tracking-wider">
              {greeting()}, <span className="text-[#00E5FF]">{name}</span>
            </h1>
            <p className="text-gray-400 font-mono text-xs tracking-widest mt-2 uppercase">
              {judgeCategoryLabel(judge.category)} · {judgeInstitution(judge)}
              {judge.designation ? ` · ${judge.designation}` : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => user && load(user)}
              disabled={refreshing}
              className="text-xs text-[#00E5FF] border border-[#00E5FF]/40 hover:bg-[#00E5FF]/10 px-4 py-2 rounded transition-colors tracking-widest font-mono uppercase disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-white border border-gray-700 px-4 py-2 rounded transition-colors tracking-widest">
              LOGOUT
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/40 text-red-300 p-3 rounded text-sm">{error}</div>
        )}

        {/* First-visit welcome */}
        {showWelcome && (
          <div className="mb-10 relative overflow-hidden rounded-xl border border-[var(--gold)]/40 bg-gradient-to-r from-[var(--gold)]/10 via-[#00E5FF]/5 to-transparent p-6 md:p-8 animate-fade-in">
            <button onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white" aria-label="Dismiss">✕</button>
            <p className="text-3xl mb-3">🎉</p>
            <h2 className="text-xl md:text-2xl font-display font-black tracking-wide">Welcome aboard, {name}!</h2>
            <p className="text-gray-300 text-sm mt-2 max-w-2xl leading-relaxed">
              Your email is verified and your Judge Board registration is complete. Thank you for lending your expertise
              to InnovaX — your evaluation helps shape the next generation of agentic AI innovators in Sri Lanka.
            </p>
          </div>
        )}

        {/* ── STATUS: pending ── */}
        {judge.status === 'pending' && (
          <section className="glass-panel border-[var(--gold)]/30 p-8 md:p-10 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl md:text-2xl font-display font-bold tracking-widest uppercase">Registration under review</h2>
            <p className="text-gray-400 text-sm mt-3 max-w-2xl mx-auto leading-relaxed">
              The InnovaX organizing committee is reviewing your Judge Board registration. Once you&apos;re confirmed and the
              proposals are distributed, they will appear right here — and we&apos;ll email you at{' '}
              <span className="text-white font-mono">{judge.email}</span>.
            </p>
            <Timeline current={1} />
            <RubricPreview />
          </section>
        )}

        {/* ── STATUS: rejected ── */}
        {judge.status === 'rejected' && (
          <section className="glass-panel border-white/10 p-8 md:p-10 text-center">
            <div className="text-5xl mb-4">🙏</div>
            <h2 className="text-xl md:text-2xl font-display font-bold tracking-widest uppercase">Thank you for your interest</h2>
            <p className="text-gray-400 text-sm mt-3 max-w-2xl mx-auto leading-relaxed">
              We truly appreciate your willingness to support InnovaX. The Judge Board for this round has been finalized and
              we&apos;re unable to confirm your registration at this time. If you believe this is a mistake, please contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL_GENERAL}`} className="text-[#00E5FF] hover:underline">{CONTACT_EMAIL_GENERAL}</a>.
            </p>
          </section>
        )}

        {/* ── STATUS: approved, nothing distributed yet ── */}
        {judge.status === 'approved' && proposals.length === 0 && (
          <section className="glass-panel border-[#00E5FF]/30 p-8 md:p-10 text-center">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-green-400 border border-green-500/40 bg-green-500/10 px-3 py-1 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Confirmed Judge Board member
            </div>
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border border-[#00E5FF]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00E5FF] animate-spin [animation-duration:3s]" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">📂</div>
            </div>
            <h2 className="text-xl md:text-2xl font-display font-bold tracking-widest uppercase">No proposals distributed yet</h2>
            <p className="text-gray-400 text-sm mt-3 max-w-2xl mx-auto leading-relaxed">
              No proposals have been distributed to the Judge Board yet — please wait. The committee will share the Phase 1
              proposals once the submission window closes. You&apos;ll receive an email at{' '}
              <span className="text-white font-mono">{judge.email}</span> the moment your proposals are ready, and they&apos;ll
              appear on this page automatically.
            </p>
            {lastChecked && (
              <p className="text-[10px] font-mono text-gray-600 mt-4 uppercase tracking-widest">
                Last checked {lastChecked.toLocaleTimeString()} · auto-refreshing every minute
              </p>
            )}
            <Timeline current={2} />
            <RubricPreview />
          </section>
        )}

        {/* ── STATUS: approved with proposals ── */}
        {judge.status === 'approved' && proposals.length > 0 && (
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Assigned', value: proposals.length, cls: 'text-white' },
                { label: 'Scored', value: scoredCount, cls: 'text-[#00E5FF]' },
                { label: 'Remaining', value: proposals.length - scoredCount, cls: 'text-[var(--gold)]' },
                { label: 'Avg. Score', value: avg ?? '—', cls: 'text-green-400' },
              ].map(s => (
                <div key={s.label} className="glass-panel border-white/10 bg-[#121822]/50 p-4 text-center">
                  <p className={`text-3xl font-black font-display ${s.cls}`}>{s.value}</p>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                <span>Evaluation progress</span><span>{progress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00E5FF] to-green-400 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              {scoredCount === proposals.length && (
                <p className="text-green-400 text-xs font-mono mt-3">✓ All your proposals are scored — thank you! You can still revise any score.</p>
              )}
            </div>

            <div className="glass-panel border-[#00E5FF]/30 p-0 overflow-hidden">
              <div className="p-4 bg-[#00E5FF]/10 border-b border-[#00E5FF]/30 flex justify-between items-center flex-wrap gap-3">
                <h3 className="font-mono text-sm tracking-[0.2em] uppercase text-[#00E5FF]">My Assigned Proposals ({proposals.length})</h3>
                <button
                  onClick={downloadZip}
                  disabled={zipping}
                  className="text-[10px] font-bold tracking-widest uppercase bg-green-500/10 text-green-400 border border-green-500/40 hover:bg-green-500/20 px-4 py-2 rounded transition-all disabled:opacity-40"
                >
                  {zipping ? '⏳ Zipping…' : '📦 Download all as ZIP'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#05080C] text-gray-400 font-mono text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-normal">#</th>
                      <th className="p-4 font-normal">Candidate / Team</th>
                      <th className="p-4 font-normal">University</th>
                      <th className="p-4 font-normal">Proposal</th>
                      <th className="p-4 font-normal text-center">Score</th>
                      <th className="p-4 font-normal text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {proposals.map((p, i) => {
                      const scored = p.judgeScore?.total !== undefined;
                      return (
                        <tr key={p.id} className={`border-l-2 transition-colors ${scored ? 'border-l-[#00E5FF] bg-[#00E5FF]/[0.03]' : 'border-l-transparent hover:bg-white/5'}`}>
                          <td className="p-4 text-gray-600 font-mono text-xs">{i + 1}</td>
                          <td className="p-4 font-bold">
                            <div className="flex items-center gap-2">
                              {p.name}
                              <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">{p.type}</span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-300">{p.university}</td>
                          <td className="p-4">
                            {p.proposalLink
                              ? <a href={p.proposalLink} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">📄 View PDF</a>
                              : <span className="text-gray-600">Unavailable</span>}
                          </td>
                          <td className="p-4 text-center"><ScoreBadge score={p.judgeScore?.total} phase={1} /></td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setScoreTarget(p)}
                              className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] border border-[#00E5FF]/40 hover:bg-[#00E5FF]/10 px-3 py-1.5 rounded transition-colors"
                            >
                              {scored ? '✏ Edit Score' : '+ Score'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
