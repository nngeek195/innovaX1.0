'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

// ============================================================================
// Small local hooks/helpers
// ============================================================================

type Countdown = { d: number; h: number; m: number; s: number; expired: boolean } | null;

function useCountdown(deadline?: string | null): Countdown {
  const [timeLeft, setTimeLeft] = useState<Countdown>(null);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft(null);
      return;
    }
    const target = new Date(deadline).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true });
        return;
      }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor(diff / 3600000) % 24,
        m: Math.floor(diff / 60000) % 60,
        s: Math.floor(diff / 1000) % 60,
        expired: false,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return timeLeft;
}

const pad = (n: number) => String(n).padStart(2, '0');

function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

// ============================================================================
// Dashboard
// ============================================================================

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [proposalUploaded, setProposalUploaded] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let unsubUser: () => void;
    let unsubSys: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubUser = onSnapshot(doc(db, 'registrations', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setProposalUploaded(data.proposalUploaded || false);
            setVideoLink(data.prototypeLink || '');
          } else {
            document.cookie = 'innovax_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            signOut(auth);
            router.push('/login');
          }
        });

        unsubSys = onSnapshot(doc(db, 'settings', 'public'), (sysSnap) => {
          if (sysSnap.exists()) {
            setSystemConfig(sysSnap.data());
          }
          setLoading(false);
        });
      } else {
        if (unsubUser) unsubUser();
        if (unsubSys) unsubSys();
        document.cookie = 'innovax_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.push('/login');
      }
    });

    return () => {
      if (unsubUser) unsubUser();
      if (unsubSys) unsubSys();
      unsubscribeAuth();
    };
  }, [router]);

  const isPhase1Expired = systemConfig?.phase1Deadline
    ? new Date() > new Date(systemConfig.phase1Deadline)
    : false;

  const isPhase2Expired = systemConfig?.phase2Deadline
    ? new Date() > new Date(systemConfig.phase2Deadline)
    : false;

  const phase1Countdown = useCountdown(
    systemConfig?.phase1Open && !isPhase1Expired ? systemConfig?.phase1Deadline : null
  );
  const phase2Countdown = useCountdown(
    systemConfig?.phase2Open && !isPhase2Expired ? systemConfig?.phase2Deadline : null
  );

  const processFile = useCallback(
    async (file: File) => {
      if (isPhase1Expired) {
        return showToast('Submission deadline has passed. Modifications are locked.', 'error');
      }
      if (file.size > 10 * 1024 * 1024) {
        return showToast('File is too large. Please upload a PDF under 10MB.', 'error');
      }

      setUploadingDoc(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'innovax_proposals');

      try {
        const data = await uploadWithProgress(
          'https://api.cloudinary.com/v1_1/csfnvjnb/auto/upload',
          formData,
          setUploadProgress
        );

        if (data.secure_url) {
          await updateDoc(doc(db, 'registrations', auth.currentUser!.uid), {
            proposalUploaded: true,
            proposalLink: data.secure_url,
          });
          setProposalUploaded(true);
          showToast('System Updated: Proposal secured successfully!', 'success');
        } else {
          console.error('Cloudinary Error Details:', data);
          showToast(`Upload Blocked: ${data.error?.message || 'Unknown error'}`, 'error');
        }
      } catch (err: any) {
        showToast('Network Error: ' + err.message, 'error');
      }
      setUploadingDoc(false);
      setUploadProgress(0);
    },
    [isPhase1Expired]
  );

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (isPhase1Expired || uploadingDoc) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveDocument = async () => {
    if (isPhase1Expired) {
      return showToast('Submission deadline has passed. Modifications are locked.', 'error');
    }

    const confirmDelete = window.confirm(
      'Are you sure you want to remove your proposal document? You will need to upload a new one before the deadline.'
    );
    if (!confirmDelete) return;

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'registrations', auth.currentUser!.uid), {
        proposalUploaded: false,
        proposalLink: '',
      });
      setProposalUploaded(false);
      showToast('System Updated: Document removed successfully.', 'success');
    } catch (err: any) {
      showToast('Failed to remove document. Please try again.', 'error');
    }
    setUpdating(false);
  };

  const handleVideoSubmit = async () => {
    if (isPhase2Expired) {
      return showToast('Submission deadline has passed. Modifications are locked.', 'error');
    }
    if (!videoLink.trim()) return;

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'registrations', auth.currentUser!.uid), {
        prototypeLink: videoLink.trim(),
      });
      showToast('System Updated: Video link submitted successfully!', 'success');
    } catch (err) {
      showToast('Failed to submit link. Please try again.', 'error');
    }
    setUpdating(false);
  };

  const handleCopyLink = async () => {
    if (!userData?.prototypeLink) return;
    try {
      await navigator.clipboard.writeText(userData.prototypeLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showToast('Could not copy link.', 'error');
    }
  };

  const handleLogout = () => {
    document.cookie = 'innovax_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    signOut(auth);
  };

  // --- Journey stepper state (informational only, doesn't affect gating logic above) ---
  const steps = ['Registration', 'Proposal', 'Prototype', 'Results'];
  let stageIndex = 0;
  if (!systemConfig?.registrationOpen) stageIndex = 1;
  if (systemConfig?.phase1Open) stageIndex = 1;
  if (proposalUploaded && !systemConfig?.phase2Open) stageIndex = 1;
  if (systemConfig?.phase2Open) stageIndex = 2;
  if (systemConfig?.round2Revealed || systemConfig?.finalistsCalled) stageIndex = 3;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05080C] flex flex-col items-center justify-center gap-4 text-[#00E5FF] font-mono tracking-widest">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-[#00E5FF]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00E5FF] animate-spin" />
        </div>
        <span className="text-xs animate-pulse">AUTHENTICATING SECURE SESSION...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05080C] text-white pt-24 px-6 pb-20 relative overflow-hidden">
      {/* Ambient grid backdrop */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.35] grid-backdrop" />

      {toast && (
        <div
          className={`fixed top-24 right-6 z-50 w-[calc(100%-3rem)] max-w-sm p-4 pr-10 rounded-lg shadow-2xl border backdrop-blur-md toast-in overflow-hidden ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
              : 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <p className="font-mono text-xs tracking-widest uppercase">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-500 hover:text-white"
          >
            ✕
          </button>
          <span className={`absolute bottom-0 left-0 h-0.5 toast-bar ${toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
      )}

      <div className="max-w-4xl mx-auto relative">
        {/* ============================= HERO ============================= */}
        <div className="relative rounded-2xl border border-white/10 overflow-hidden mb-8 hero-reveal">
          <video
            className="hero-video absolute inset-0 w-full h-full object-cover opacity-25"
            src="/blue_power_owl.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#05080C]/50 via-[#05080C]/80 to-[#05080C]" />

          <div className="relative z-10 p-6 md:p-10">
            <div className="flex justify-between items-start gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-lg overflow-hidden border border-[#00E5FF]/30 bg-white/5">
                  <Image src="/innovax-logo.png" alt="InnovaX" fill className="object-contain p-1.5" />
                </div>
                <span className="text-[10px] tracking-[0.3em] text-gray-500 font-mono uppercase hidden sm:inline">
                  Competitor Console
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded transition-colors tracking-widest uppercase font-mono"
              >
                Logout
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-x-3 gap-y-2 mb-2">
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight uppercase leading-none">
                {userData?.type === 'team'
                  ? userData.teamName
                  : `${userData?.leader?.firstName} ${userData?.leader?.lastName}`}
              </h1>

              {userData?.selectedForRound2 && systemConfig?.round2Revealed && (
                <span className="badge-mono border-green-500/40 bg-green-500/10 text-green-400 text-xs px-2.5 py-1 rounded">
                  Selected for Round 2
                </span>
              )}

              {userData?.isFinalist && systemConfig?.finalistsCalled && (
                <span className="badge-mono border-[var(--gold)]/50 bg-[var(--gold)]/10 text-[var(--gold)] text-xs px-2.5 py-1 rounded finalist-glow">
                  🏆 Finalist
                </span>
              )}
            </div>
            <p className="text-[#00E5FF] tracking-widest text-xs md:text-sm mb-8 uppercase font-mono">
              {userData?.university}
            </p>

            {/* Journey stepper */}
            <div className="flex items-center">
              {steps.map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-2 relative">
                    <div
                      className={`w-3 h-3 rounded-full border transition-all duration-500 ${
                        i < stageIndex
                          ? 'bg-[#00E5FF] border-[#00E5FF]'
                          : i === stageIndex
                          ? 'bg-[#05080C] border-[#00E5FF] step-pulse'
                          : 'bg-[#05080C] border-white/20'
                      }`}
                    />
                    <span
                      className={`text-[9px] md:text-[10px] font-mono uppercase tracking-widest absolute -bottom-5 whitespace-nowrap ${
                        i <= stageIndex ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-px mx-1 md:mx-2 bg-white/10 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#00E5FF] transition-all duration-700"
                        style={{ width: i < stageIndex ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ================= DYNAMIC SYSTEM STATUS BANNERS ================= */}
        <div className="mb-8 flex flex-col gap-4">
          {systemConfig?.registrationOpen && (
            <div className="glass-panel border-[#00E5FF]/40 bg-[#00E5FF]/5 p-5 md:p-6 rounded-xl flex items-center gap-4 shadow-[0_0_20px_rgba(0,229,255,0.05)]">
              <div className="w-10 h-10 rounded-full bg-[#00E5FF]/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                <span className="text-lg">🚀</span>
              </div>
              <div>
                <h3 className="text-[#00E5FF] font-bold tracking-widest uppercase text-sm mb-1">
                  Registrations Are Open
                </h3>
                <p className="text-gray-300 text-xs font-mono leading-relaxed">
                  Your profile is secure in our database. Hold tight! The proposal phase will
                  commence shortly after the registration gateway closes.
                </p>
              </div>
            </div>
          )}

          {!systemConfig?.registrationOpen && !systemConfig?.phase1Open && !systemConfig?.phase2Open && (
            <div className="glass-panel border-gray-500/40 bg-gray-500/10 p-5 md:p-6 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg text-gray-300">⏳</span>
              </div>
              <div>
                <h3 className="text-gray-300 font-bold tracking-widest uppercase text-sm mb-1">
                  System Processing
                </h3>
                <p className="text-gray-400 text-xs font-mono leading-relaxed">
                  We are currently working behind the scenes to prepare the next stage. The
                  dashboard will update automatically when the phase begins.
                </p>
              </div>
            </div>
          )}

          {systemConfig?.round2Revealed && !userData?.selectedForRound2 && (
            <div className="glass-panel border-purple-500/30 bg-purple-500/10 p-5 md:p-6 rounded-xl flex items-start gap-4 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg text-purple-400">💡</span>
              </div>
              <div>
                <h3 className="text-purple-400 font-bold tracking-widest uppercase text-sm mb-1">
                  Thank You For Innovating
                </h3>
                <p className="text-gray-300 text-xs font-mono leading-relaxed">
                  You did a phenomenal job, but unfortunately, your team was not selected to
                  advance to Round 2. The competition was incredibly fierce this year, and we
                  highly appreciate your effort. Keep pushing boundaries, and we hope to see you
                  in the next hackathon!
                </p>
              </div>
            </div>
          )}

          {systemConfig?.finalistsCalled && userData?.selectedForRound2 && !userData?.isFinalist && (
            <div className="glass-panel border-blue-500/30 bg-blue-500/10 p-5 md:p-6 rounded-xl flex items-start gap-4 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg text-blue-400">🌟</span>
              </div>
              <div>
                <h3 className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-1">
                  A Phenomenal Run
                </h3>
                <p className="text-gray-300 text-xs font-mono leading-relaxed">
                  Making it to Phase 2 is a massive achievement! While your project wasn't
                  selected for the Finalist stage this time, your prototype showed exceptional
                  potential. Be proud of what you've built, and keep innovating!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* --- PHASE 1: PROPOSAL SUBMISSION --- */}
        {systemConfig?.phase1Open ? (
          <div className="glass-panel border-[#00E5FF]/30 mb-8 bg-[#00E5FF]/5 p-6 md:p-8 rounded-xl relative overflow-hidden">
            <div className="flex justify-between items-start flex-wrap gap-4 mb-2">
              <h2 className="text-[#00E5FF] font-display font-bold text-xl tracking-wide">
                Phase 1: Proposal Submission
              </h2>
              {proposalUploaded && (
                <span className="text-xs font-mono text-green-400 border border-green-500/30 bg-green-500/10 px-3 py-1 rounded">
                  ✔ Proposal secured
                </span>
              )}
            </div>

            {phase1Countdown && !phase1Countdown.expired && (
              <div className="flex items-center gap-2 mb-6 text-[10px] font-mono text-gray-400">
                <span className="uppercase tracking-widest">Closes in</span>
                <div className="flex gap-1.5">
                  {[
                    [phase1Countdown.d, 'd'],
                    [phase1Countdown.h, 'h'],
                    [phase1Countdown.m, 'm'],
                    [phase1Countdown.s, 's'],
                  ].map(([val, unit], i) => (
                    <span
                      key={i}
                      className="bg-[#05080C] border border-[#00E5FF]/20 text-[#00E5FF] rounded px-1.5 py-0.5 tabular-nums"
                    >
                      {pad(val as number)}
                      {unit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isPhase1Expired ? (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 text-xs font-mono mb-2">
                ⚠ Phase 1 deadline has passed. Submissions are locked.
              </div>
            ) : (
              <>
                {proposalUploaded && userData?.proposalLink ? (
                  <div className="mb-2 p-4 border border-green-500/30 bg-green-500/5 rounded-lg flex items-center justify-between flex-wrap gap-4">
                    <span className="text-sm text-green-400 font-mono">
                      Document securely transmitted.
                    </span>
                    <div className="flex gap-2">
                      <a
                        href={userData.proposalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline-cyan text-[10px] px-4 py-2 flex items-center"
                      >
                        View file
                      </a>
                      <button
                        onClick={handleRemoveDocument}
                        disabled={updating}
                        className="text-[10px] px-4 py-2 font-bold tracking-widest uppercase border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs md:text-sm text-gray-400 mb-5 leading-relaxed">
                      Upload your architecture proposal (PDF format, max 10MB). This file is
                      transmitted directly to the judging panel.
                    </p>

                    <label
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!uploadingDoc) setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleDrop}
                      className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer ${
                        dragActive
                          ? 'border-[#00E5FF] bg-[#00E5FF]/10'
                          : 'border-[#00E5FF]/25 hover:border-[#00E5FF]/50 hover:bg-[#00E5FF]/5'
                      } ${uploadingDoc ? 'pointer-events-none opacity-70' : ''}`}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleDocumentUpload}
                        disabled={uploadingDoc}
                        className="sr-only"
                      />
                      {uploadingDoc ? (
                        <div className="w-full max-w-xs">
                          <p className="text-[#00E5FF] text-xs font-mono mb-2">
                            Uploading… {uploadProgress}%
                          </p>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#00E5FF] transition-all duration-200 rounded-full"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="text-2xl text-[#00E5FF]">↑</span>
                          <p className="text-xs font-mono text-gray-300">
                            Drag &amp; drop your file, or{' '}
                            <span className="text-[#00E5FF] underline">browse</span>
                          </p>
                          <p className="text-[10px] font-mono text-gray-500">PDF, DOC, DOCX · up to 10MB</p>
                        </>
                      )}
                    </label>
                  </>
                )}
              </>
            )}
          </div>
        ) : null}

        {/* --- PHASE 2: PROTOTYPE & VIDEO SUBMISSION --- */}
        {systemConfig?.phase2Open && userData?.selectedForRound2 && systemConfig?.round2Revealed ? (
          <div className="glass-panel border-[var(--gold)]/40 mb-8 bg-[var(--gold)]/5 p-6 md:p-8 rounded-xl shadow-[0_0_30px_rgba(255,215,0,0.05)]">
            <div className="flex justify-between items-start flex-wrap gap-4 mb-2">
              <h2 className="text-[var(--gold)] font-display font-bold text-xl tracking-wide">
                Phase 2: Prototype &amp; Demo Video
              </h2>
              {userData?.prototypeLink ? (
                <span className="text-xs font-mono text-green-400 border border-green-500/30 bg-green-500/10 px-3 py-1 rounded">
                  ✔ Demo link submitted
                </span>
              ) : (
                <span className="text-xs font-mono text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 rounded">
                  Awaiting demo link
                </span>
              )}
            </div>

            {phase2Countdown && !phase2Countdown.expired && (
              <div className="flex items-center gap-2 mb-6 text-[10px] font-mono text-gray-400">
                <span className="uppercase tracking-widest">Closes in</span>
                <div className="flex gap-1.5">
                  {[
                    [phase2Countdown.d, 'd'],
                    [phase2Countdown.h, 'h'],
                    [phase2Countdown.m, 'm'],
                    [phase2Countdown.s, 's'],
                  ].map(([val, unit], i) => (
                    <span
                      key={i}
                      className="bg-[#05080C] border border-[var(--gold)]/20 text-[var(--gold)] rounded px-1.5 py-0.5 tabular-nums"
                    >
                      {pad(val as number)}
                      {unit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isPhase2Expired ? (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 text-xs font-mono mb-2">
                ⚠ Phase 2 deadline expired on{' '}
                {new Date(systemConfig.phase2Deadline).toLocaleString()}. Submissions are locked.
              </div>
            ) : (
              <>
                <p className="text-xs md:text-sm text-gray-400 mb-6 leading-relaxed">
                  Provide the link to your demo video (e.g., YouTube, LinkedIn, or Cloud Storage)
                  for final evaluation.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    className="flex-1 bg-[#05080C] border border-white/10 rounded-lg p-3 text-white text-xs font-mono focus:border-[var(--gold)] focus:outline-none transition-colors"
                  />
                  <button
                    onClick={handleVideoSubmit}
                    disabled={updating || !videoLink.trim()}
                    className="px-6 py-3 rounded-lg text-xs font-bold font-mono tracking-widest uppercase bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/50 hover:bg-[var(--gold)]/30 disabled:opacity-50 transition-all"
                  >
                    {updating ? 'Saving…' : 'Save link'}
                  </button>
                </div>

                {userData?.prototypeLink && (
                  <button
                    onClick={handleCopyLink}
                    className="text-[10px] font-mono text-gray-500 hover:text-[var(--gold)] transition-colors"
                  >
                    {linkCopied ? '✔ Copied to clipboard' : 'Copy submitted link'}
                  </button>
                )}
              </>
            )}
          </div>
        ) : null}

        {/* Registration Details Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel border-white/10 bg-[#121822]/40 p-6 rounded-xl hover:border-[#00E5FF]/20 transition-colors">
            <h3 className="text-[#00E5FF] font-mono text-xs tracking-[0.2em] mb-6 uppercase">
              Primary Contact Details
            </h3>
            <div className="space-y-4 text-xs font-mono">
              <div>
                <p className="text-gray-500 mb-1">Name</p>
                <p className="text-white font-sans font-medium text-sm">
                  {userData?.leader?.firstName} {userData?.leader?.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">ID card / reg no</p>
                <p className="text-white">{userData?.leader?.idCard}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">WhatsApp</p>
                <p className="text-[#00E5FF]">{userData?.leader?.phone}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Email</p>
                <p className="text-white">{userData?.email}</p>
              </div>
            </div>
          </div>

          {userData?.type === 'team' && userData?.teammates?.length > 0 && (
            <div className="glass-panel border-white/10 bg-[#121822]/40 p-6 rounded-xl hover:border-[#00E5FF]/20 transition-colors">
              <h3 className="text-gray-400 font-mono text-xs tracking-[0.2em] mb-6 uppercase">
                Squad Roster ({userData.teammates.length + 1} members)
              </h3>
              <div className="space-y-4">
                {userData.teammates.map((mate: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-[#00E5FF]/30 pl-4 py-1">
                    <p className="font-bold text-sm text-white">
                      {mate.firstName} {mate.lastName}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {mate.idCard}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .grid-backdrop {
          background-image: linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 70%);
        }

        .hero-reveal {
          animation: heroReveal 0.7s ease-out both;
        }
        @keyframes heroReveal {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .step-pulse {
          box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.6);
          animation: stepPulse 2s infinite;
        }
        @keyframes stepPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.5);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(0, 229, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 229, 255, 0);
          }
        }

        .finalist-glow {
          animation: finalistGlow 2.4s ease-in-out infinite;
        }
        @keyframes finalistGlow {
          0%,
          100% {
            box-shadow: 0 0 6px rgba(255, 215, 0, 0.15);
          }
          50% {
            box-shadow: 0 0 18px rgba(255, 215, 0, 0.45);
          }
        }

        .toast-in {
          animation: toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .toast-bar {
          width: 100%;
          animation: toastBar 4s linear forwards;
        }
        @keyframes toastBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-video {
            display: none;
          }
          .hero-reveal,
          .step-pulse,
          .finalist-glow,
          .toast-in,
          .toast-bar {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}