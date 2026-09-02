'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [proposalUploaded, setProposalUploaded] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // --- Professional Toast Notification System ---
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000); 
  };

  useEffect(() => {
    let unsubUser: () => void;
    let unsubSys: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubUser = onSnapshot(doc(db, "registrations", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setProposalUploaded(data.proposalUploaded || false);
            setVideoLink(data.prototypeLink || '');
          } else {
            document.cookie = "innovax_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            signOut(auth);
            router.push('/login');
          }
        });

        unsubSys = onSnapshot(doc(db, "settings", "public"), (sysSnap) => {
          if (sysSnap.exists()) {
            setSystemConfig(sysSnap.data());
          }
          setLoading(false);
        });
      } else {
        if (unsubUser) unsubUser();
        if (unsubSys) unsubSys();
        document.cookie = "innovax_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push('/login');
      }
    });

    return () => {
      if (unsubUser) unsubUser();
      if (unsubSys) unsubSys();
      unsubscribeAuth();
    };
  }, [router]);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { 
      return showToast("File is too large. Please upload a PDF under 10MB.", "error");
    }

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'innovax_proposals'); 

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/csfnvjnb/auto/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (data.secure_url) {
        await updateDoc(doc(db, "registrations", auth.currentUser!.uid), {
          proposalUploaded: true,
          proposalLink: data.secure_url
        });
        setProposalUploaded(true);
        showToast("System Updated: Proposal secured successfully!", "success");
      } else {
        console.error("Cloudinary Error Details:", data);
        showToast(`Upload Blocked: ${data.error?.message || "Unknown error"}`, "error");
      }
    } catch (err: any) {
      showToast("Network Error: " + err.message, "error");
    }
    setUploadingDoc(false);
  };

  const handleRemoveDocument = async () => {
    if (isPhase1Expired) {
      return showToast("Submission deadline has passed. Modifications are locked.", "error");
    }
    
    const confirmDelete = window.confirm("Are you sure you want to remove your proposal document? You will need to upload a new one before the deadline.");
    if (!confirmDelete) return;

    setUpdating(true);
    try {
      await updateDoc(doc(db, "registrations", auth.currentUser!.uid), {
        proposalUploaded: false,
        proposalLink: ""
      });
      setProposalUploaded(false);
      showToast("System Updated: Document removed successfully.", "success");
    } catch (err: any) {
      showToast("Failed to remove document. Please try again.", "error");
    }
    setUpdating(false);
  };

  const isPhase1Expired = systemConfig?.phase1Deadline 
    ? new Date() > new Date(systemConfig.phase1Deadline) 
    : false;

  const isPhase2Expired = systemConfig?.phase2Deadline 
    ? new Date() > new Date(systemConfig.phase2Deadline) 
    : false;

  const handleVideoSubmit = async () => {
    if (isPhase2Expired) {
      return showToast("Submission deadline has passed. Modifications are locked.", "error");
    }
    if (!videoLink.trim()) return;

    setUpdating(true);
    try {
      await updateDoc(doc(db, "registrations", auth.currentUser!.uid), {
        prototypeLink: videoLink.trim()
      });
      showToast("System Updated: Video link submitted successfully!", "success");
    } catch (err) {
      showToast("Failed to submit link. Please try again.", "error");
    }
    setUpdating(false);
  };

  const handleLogout = () => {
    document.cookie = "innovax_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05080C] flex items-center justify-center text-[#00E5FF] font-mono tracking-widest animate-pulse">
        AUTHENTICATING SECURE SESSION...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05080C] text-white pt-24 px-6 pb-20 relative">
      
      {toast && (
        <div className={`fixed top-24 right-6 z-50 p-4 pr-12 rounded-lg shadow-2xl border backdrop-blur-md transition-all animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
            : 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <p className="font-mono text-xs tracking-widest uppercase">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)} 
            className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        
        {/* Header Profile */}
        <div className="flex justify-between items-end mb-10 border-b border-[#121822] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-display font-black tracking-widest uppercase">
                {userData?.type === 'team' ? userData.teamName : `${userData?.leader?.firstName} ${userData?.leader?.lastName}`}
              </h1>
              
              {/* UPDATED: Only show Round 2 badge IF admin explicitly revealed Round 2 results */}
              {userData?.selectedForRound2 && systemConfig?.round2Revealed && (
                <span className="badge-mono border-green-500/40 bg-green-500/10 text-green-400 text-xs px-2.5 py-1 rounded">
                  Selected for Round 2
                </span>
              )}

              {/* UPDATED: Only show Finalist badge IF admin explicitly revealed Finalist results */}
              {userData?.isFinalist && systemConfig?.finalistsCalled && (
                <span className="badge-mono border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)] text-xs px-2.5 py-1 rounded">
                  🏆 FINALIST
                </span>
              )}
            </div>
            <p className="text-[#00E5FF] tracking-widest text-xs md:text-sm mt-2 uppercase font-mono">
              {userData?.university}
            </p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded transition-colors tracking-widest uppercase font-mono"
          >
            LOGOUT
          </button>
        </div>
        {/* ================= DYNAMIC SYSTEM STATUS BANNERS ================= */}
        <div className="mb-8 flex flex-col gap-4">
          
          {/* 1. Registration is still open */}
          {systemConfig?.registrationOpen && (
            <div className="glass-panel border-[#00E5FF]/40 bg-[#00E5FF]/5 p-5 md:p-6 rounded-xl flex items-center gap-4 shadow-[0_0_20px_rgba(0,229,255,0.05)] animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-[#00E5FF]/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                <span className="text-lg">🚀</span>
              </div>
              <div>
                <h3 className="text-[#00E5FF] font-bold tracking-widest uppercase text-sm mb-1">Registrations Are Open</h3>
                <p className="text-gray-300 text-xs font-mono leading-relaxed">Your profile is secure in our database. Hold tight! The proposal phase will commence shortly after the registration gateway closes.</p>
              </div>
            </div>
          )}

          {/* 2. Limbo State: Registration Closed, but No Phase Open */}
          {!systemConfig?.registrationOpen && !systemConfig?.phase1Open && !systemConfig?.phase2Open && (
            <div className="glass-panel border-gray-500/40 bg-gray-500/10 p-5 md:p-6 rounded-xl flex items-center gap-4 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg text-gray-300">⏳</span>
              </div>
              <div>
                <h3 className="text-gray-300 font-bold tracking-widest uppercase text-sm mb-1">System Processing</h3>
                <p className="text-gray-400 text-xs font-mono leading-relaxed">We are currently working behind the scenes to prepare the next stage. The dashboard will update automatically when the phase begins.</p>
              </div>
            </div>
          )}

          {/* 3. Not Selected for Round 2 */}
          {systemConfig?.round2Revealed && !userData?.selectedForRound2 && (
            <div className="glass-panel border-purple-500/30 bg-purple-500/10 p-5 md:p-6 rounded-xl flex items-start gap-4 shadow-[0_0_20px_rgba(168,85,247,0.05)] animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg text-purple-400">💡</span>
              </div>
              <div>
                <h3 className="text-purple-400 font-bold tracking-widest uppercase text-sm mb-1">Thank You For Innovating</h3>
                <p className="text-gray-300 text-xs font-mono leading-relaxed">
                  You did a phenomenal job, but unfortunately, your team was not selected to advance to Round 2. The competition was incredibly fierce this year, and we highly appreciate your effort. Keep pushing boundaries, and we hope to see you in the next hackathon!
                </p>
              </div>
            </div>
          )}

          {/* 4. Not Selected for Finals (But made it to R2) */}
          {systemConfig?.finalistsCalled && userData?.selectedForRound2 && !userData?.isFinalist && (
            <div className="glass-panel border-blue-500/30 bg-blue-500/10 p-5 md:p-6 rounded-xl flex items-start gap-4 shadow-[0_0_20px_rgba(59,130,246,0.05)] animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg text-blue-400">🌟</span>
              </div>
              <div>
                <h3 className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-1">A Phenomenal Run</h3>
                <p className="text-gray-300 text-xs font-mono leading-relaxed">
                  Making it to Phase 2 is a massive achievement! While your project wasn't selected for the Finalist stage this time, your prototype showed exceptional potential. Be proud of what you've built, and keep innovating!
                </p>
              </div>
            </div>
          )}
          
        </div>
        {/* ================================================================= */}

        {/* --- PHASE 1: PROPOSAL SUBMISSION --- */}
        {systemConfig?.phase1Open ? (
          <div className="glass-panel border-[#00E5FF]/30 mb-8 bg-[#00E5FF]/5 p-6 md:p-8 rounded-xl relative overflow-hidden">
            <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
              <h2 className="text-[#00E5FF] font-display font-bold text-xl tracking-wide">PHASE 1: PROPOSAL SUBMISSION</h2>
              {proposalUploaded && (
                <span className="text-xs font-mono text-green-400 border border-green-500/30 bg-green-500/10 px-3 py-1 rounded">✔ PROPOSAL SECURED</span>
              )}
            </div>

            {isPhase1Expired ? (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 text-xs font-mono mb-2">
                ⚠ Phase 1 deadline has passed. Submissions are locked.
              </div>
            ) : (
              <>
                {proposalUploaded && userData?.proposalLink ? (
                  <div className="mb-6 p-4 border border-green-500/30 bg-green-500/5 rounded-lg flex items-center justify-between flex-wrap gap-4">
                    <span className="text-sm text-green-400 font-mono">Document securely transmitted.</span>
                    <div className="flex gap-2">
                      <a href={userData.proposalLink} target="_blank" rel="noopener noreferrer" className="btn-outline-cyan text-[10px] px-4 py-2 flex items-center">
                        VIEW FILE
                      </a>
                      <button 
                        onClick={handleRemoveDocument}
                        disabled={updating}
                        className="text-[10px] px-4 py-2 font-bold tracking-widest uppercase border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs md:text-sm text-gray-400 mb-6 leading-relaxed">
                      Upload your architecture proposal (PDF format, Max 10MB). This file will be transmitted directly to the judging panel.
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx"
                        onChange={handleDocumentUpload}
                        disabled={uploadingDoc}
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-xs file:font-bold file:font-mono file:tracking-widest file:bg-[#00E5FF]/20 file:text-[#00E5FF] hover:file:bg-[#00E5FF]/30 file:cursor-pointer transition-colors"
                      />
                      {uploadingDoc && <span className="text-[#00E5FF] text-xs font-mono animate-pulse">UPLOADING...</span>}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        ) : null}

        {/* --- PHASE 2: PROTOTYPE & VIDEO SUBMISSION --- */}
        {/* UPDATED: Only show the submission UI if Phase 2 is open AND the user knows they are in R2 */}
        {systemConfig?.phase2Open && userData?.selectedForRound2 && systemConfig?.round2Revealed ? (
          <div className="glass-panel border-[var(--gold)]/40 mb-8 bg-[var(--gold)]/5 p-6 md:p-8 rounded-xl shadow-[0_0_30px_rgba(255,215,0,0.05)]">
            <div className="flex justify-between items-start flex-wrap gap-4 mb-3">
              <h2 className="text-[var(--gold)] font-display font-bold text-xl tracking-wide">
                PHASE 2: PROTOTYPE & DEMO VIDEO
              </h2>
              {userData?.prototypeLink ? (
                <span className="text-xs font-mono text-green-400 border border-green-500/30 bg-green-500/10 px-3 py-1 rounded">
                  ✔ DEMO LINK SUBMITTED
                </span>
              ) : (
                <span className="text-xs font-mono text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 rounded">
                  AWAITING DEMO LINK
                </span>
              )}
            </div>

            {isPhase2Expired ? (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 text-xs font-mono mb-2">
                ⚠ Phase 2 deadline expired on {new Date(systemConfig.phase2Deadline).toLocaleString()}. Submissions are locked.
              </div>
            ) : (
              <>
                <p className="text-xs md:text-sm text-gray-400 mb-6 leading-relaxed">
                  Provide the link to your demo video (e.g., YouTube, LinkedIn, or Cloud Storage) for final evaluation.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
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
                    {updating ? 'SAVING...' : 'SAVE LINK'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {/* Registration Details Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel border-white/10 bg-[#121822]/40 p-6 rounded-xl">
            <h3 className="text-[#00E5FF] font-mono text-xs tracking-[0.2em] mb-6 uppercase">
              Primary Contact Details
            </h3>
            <div className="space-y-4 text-xs font-mono">
              <div>
                <p className="text-gray-500 mb-1">NAME</p>
                <p className="text-white font-sans font-medium text-sm">
                  {userData?.leader?.firstName} {userData?.leader?.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">ID CARD / REG NO</p>
                <p className="text-white">{userData?.leader?.idCard}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">WHATSAPP</p>
                <p className="text-[#00E5FF]">{userData?.leader?.phone}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">EMAIL</p>
                <p className="text-white">{userData?.email}</p>
              </div>
            </div>
          </div>

          {userData?.type === 'team' && userData?.teammates?.length > 0 && (
            <div className="glass-panel border-white/10 bg-[#121822]/40 p-6 rounded-xl">
              <h3 className="text-gray-400 font-mono text-xs tracking-[0.2em] mb-6 uppercase">
                Squad Roster ({userData.teammates.length + 1} Members)
              </h3>
              <div className="space-y-4">
                {userData.teammates.map((mate: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-[#00E5FF]/30 pl-4 py-1">
                    <p className="font-bold text-sm text-white">
                      {mate.firstName} {mate.lastName}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      ID: {mate.idCard}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}