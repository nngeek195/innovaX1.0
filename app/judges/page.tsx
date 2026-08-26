'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

export default function JudgesPortal() {
  const [passkey, setPasskey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // --- Visibility Toggles ---
  const [showPhase1, setShowPhase1] = useState(false);
  const [showFinalists, setShowFinalists] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const sysDoc = await getDoc(doc(db, "settings", "secrets"));
      if (sysDoc.exists() && sysDoc.data().judgesPasskey === passkey) {
        setIsAuthenticated(true);
        loadDatasets();
      } else {
        setError('Invalid Passkey.');
      }
    } catch (err) {
      setError('Connection error. Please try again or check permissions.');
    }
  };

  const loadDatasets = async () => {
    setLoadingData(true);
    try {
      const querySnapshot = await getDocs(collection(db, "registrations"));
      const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(users);
    } catch (err) {
      setError("Failed to load datasets. Check Firestore connection.");
    }
    setLoadingData(false);
  };

  const requestAction = (title: string, message: string, action: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm: action });
  };

  const executeAction = () => {
    confirmModal.onConfirm();
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  const toggleRound2 = (userId: string, currentStatus: boolean) => {
    requestAction(
      "JUDGE DECISION: ROUND 2",
      `Are you sure you want to ${currentStatus ? 'REVOKE' : 'ADVANCE'} this candidate's Phase 2 clearance?`,
      async () => {
        try {
          await updateDoc(doc(db, "registrations", userId), { selectedForRound2: !currentStatus });
          setAllUsers(allUsers.map(user => user.id === userId ? { ...user, selectedForRound2: !currentStatus } : user));
        } catch (err) {
          alert("Failed to update status. Check permissions/network.");
        }
      }
    );
  };

  // --- UPDATED: RESTRICTED FINALIST TOGGLE ---
  const toggleFinalist = (user: any, currentStatus: boolean) => {
    // If attempting to advance (currentStatus is false) AND they have no video link, BLOCK IT.
    if (!currentStatus && (!user.prototypeLink || user.prototypeLink.trim() === '')) {
      return alert("RESTRICTED ACTION: Cannot advance to Finalist. This candidate has not submitted a prototype video link.");
    }

    requestAction(
      "JUDGE DECISION: FINALIST",
      `Are you sure you want to ${currentStatus ? 'REVOKE' : 'MAKE FINALIST'} for this candidate?`,
      async () => {
        try {
          await updateDoc(doc(db, "registrations", user.id), { isFinalist: !currentStatus });
          setAllUsers(allUsers.map(u => u.id === user.id ? { ...u, isFinalist: !currentStatus } : u));
        } catch (err) {
          alert("Failed to update status. Check permissions/network.");
        }
      }
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#05080C] text-white flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-md glass-panel relative z-10 border-[#00E5FF]/20 shadow-[0_0_30px_rgba(0,229,255,0.05)]">
          <h2 className="text-2xl font-display font-bold text-center mb-2 tracking-wider uppercase">
            JUDGES <span className="text-[#00E5FF]">DATA PORTAL</span>
          </h2>
          <p className="text-center text-xs text-gray-500 mb-8 font-mono tracking-widest">RESTRICTED ACCESS</p>
          {error && <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-6 text-sm text-center">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" placeholder="Enter Access Passkey" value={passkey} onChange={(e) => setPasskey(e.target.value)} 
              className="w-full bg-[#121822]/50 border border-white/10 rounded-lg p-4 text-white focus:border-[#00E5FF] focus:outline-none text-center tracking-widest font-mono" required 
            />
            <button type="submit" className="w-full btn-solid-cyan mt-6 justify-center">VERIFY ACCESS</button>
          </form>
        </div>
      </div>
    );
  }

  // --- CASCADING FILTERS ---
  const phase1Users = allUsers; // Table 1
  const phase2Users = allUsers.filter(u => u.selectedForRound2); // Table 2
  const finalists = allUsers.filter(u => u.isFinalist); // Table 3

  return (
    <div className="min-h-screen bg-[#05080C] text-white p-10 pt-24 pb-32 relative">
      
      {/* --- CONFIRMATION OVERLAY --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080C]/85 backdrop-blur-sm px-4">
          <div className="glass-panel border-red-500/30 max-w-md w-full p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-fade-in">
            <h3 className="text-xl font-display font-black text-red-500 mb-4 tracking-widest uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {confirmModal.title}
            </h3>
            <p className="text-gray-300 text-sm mb-8 leading-relaxed tracking-wide">{confirmModal.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-3 text-xs font-bold tracking-widest uppercase border border-gray-600 text-gray-400 hover:bg-gray-800 rounded transition-colors">
                CANCEL
              </button>
              <button onClick={executeAction} className="flex-1 py-3 text-xs font-bold tracking-widest uppercase bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/40 rounded transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                CONFIRM DECISION
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-12 border-b border-[#121822] pb-6 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-black tracking-widest uppercase mb-2">
              INNOVAX <span className="text-[#00E5FF]">JUDGE PORTAL</span>
            </h1>
            <p className="text-gray-400 font-mono text-sm tracking-widest">CONFIDENTIAL APPLICANT DATASET</p>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded transition-colors tracking-widest">
            EXIT PORTAL
          </button>
        </div>

        {loadingData ? (
          <div className="text-[#00E5FF] font-mono tracking-widest animate-pulse flex justify-center py-20">DECRYPTING DATA...</div>
        ) : (
          <>
            {/* Data Tables Header & Controls */}
            <div className="flex justify-between items-end mb-6 border-b border-[#121822] pb-4 flex-wrap gap-4">
              <h2 className="text-2xl font-display font-bold uppercase tracking-widest">
                Applicant Datasets <span className="text-[#00E5FF] ml-2">({allUsers.length})</span>
              </h2>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowPhase1(!showPhase1)}
                  className="text-xs font-mono tracking-widest uppercase border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800 px-4 py-2 rounded transition-colors"
                >
                  {showPhase1 ? "HIDE PHASE 1 (ALL)" : "SHOW PHASE 1 (ALL)"}
                </button>
                <button 
                  onClick={() => setShowFinalists(!showFinalists)}
                  className="text-xs font-mono tracking-widest uppercase border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)]/10 px-4 py-2 rounded transition-colors"
                >
                  {showFinalists ? "HIDE FINALISTS" : "SHOW FINALISTS"}
                </button>
              </div>
            </div>

            {/* TABLE 2: ROUND 2 ADVANCED (Always Visible) */}
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
                      <th className="p-4 font-normal">Video Link</th>
                      <th className="p-4 font-normal text-center bg-red-500/10 text-red-400">Revoke R2</th>
                      <th className="p-4 font-normal text-center bg-[var(--gold)]/10 text-[var(--gold)]">Advance to Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {phase2Users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold flex items-center gap-2">
                          {user.type === 'team' ? user.teamName : `${user.leader?.firstName} ${user.leader?.lastName}`}
                          <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">{user.type}</span>
                        </td>
                        <td className="p-4 text-gray-300">{user.university}</td>
                        <td className="p-4">
                          {user.prototypeLink ? <a href={user.prototypeLink} target="_blank" className="text-[var(--gold)] hover:underline flex items-center gap-2">▶ Play Video</a> : <span className="text-gray-600">Awaiting...</span>}
                        </td>
                        <td className="p-4 text-center bg-red-500/5">
                          <input 
                            type="checkbox" checked={user.selectedForRound2 || false}
                            onChange={() => toggleRound2(user.id, user.selectedForRound2 || false)}
                            className="w-5 h-5 accent-red-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 text-center bg-[var(--gold)]/5">
                          <input 
                            type="checkbox" checked={user.isFinalist || false}
                            onChange={() => toggleFinalist(user, user.isFinalist || false)} // UPDATED TO PASS USER
                            className="w-5 h-5 accent-[var(--gold)] cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                    {phase2Users.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono text-xs">No candidates advanced to Phase 2 yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLE 3: FINALISTS (Hidden by Default) */}
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
                      {finalists.map((user) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold flex items-center gap-2">
                            {user.type === 'team' ? user.teamName : `${user.leader?.firstName} ${user.leader?.lastName}`}
                          </td>
                          <td className="p-4 text-gray-300">{user.university}</td>
                          <td className="p-4 font-mono text-xs text-gray-400">{user.email}</td>
                          <td className="p-4 text-center bg-red-500/5">
                            <input 
                              type="checkbox" checked={user.isFinalist || false}
                              onChange={() => toggleFinalist(user, user.isFinalist || false)} // UPDATED TO PASS USER
                              className="w-5 h-5 accent-red-500 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                      {finalists.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500 font-mono text-xs">No finalists selected yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TABLE 1: ALL REGISTRATIONS (Hidden by Default) */}
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
                        <th className="p-4 font-normal text-center bg-[#00E5FF]/10 text-[#00E5FF]">Advance to R2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {phase1Users.map((user) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold flex items-center gap-2">
                            {user.type === 'team' ? user.teamName : `${user.leader?.firstName} ${user.leader?.lastName}`}
                            <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">{user.type}</span>
                          </td>
                          <td className="p-4 text-gray-300">{user.university}</td>
                          <td className="p-4">
                            {user.proposalUploaded && user.proposalLink ? (
                              <a href={user.proposalLink} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline flex items-center gap-2">📄 View PDF</a>
                            ) : (<span className="text-red-400">✖ Pending</span>)}
                          </td>
                          <td className="p-4 text-center bg-[#00E5FF]/5">
                            <input 
                              type="checkbox" checked={user.selectedForRound2 || false}
                              onChange={() => toggleRound2(user.id, user.selectedForRound2 || false)}
                              className="w-5 h-5 accent-[#00E5FF] cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                      {phase1Users.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500 font-mono text-xs">No registrations found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}