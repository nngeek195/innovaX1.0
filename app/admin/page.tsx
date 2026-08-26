'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [passkeyInput, setPasskeyInput] = useState('');
  
  const [p1Deadline, setP1Deadline] = useState('');
  const [p2Deadline, setP2Deadline] = useState('');

  // --- Visibility Toggles ---
  const [showPhase1, setShowPhase1] = useState(false);
  const [showFinalists, setShowFinalists] = useState(false);

  // --- Detailed View State ---
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // --- Security Confirmation Modal State ---
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  useEffect(() => {
    let unsubPublic: () => void;
    let unsubSecrets: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (adminDoc.exists()) {
          setIsAdmin(true);

          unsubPublic = onSnapshot(doc(db, "settings", "public"), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setSystemConfig(data);
              if (data.phase1Deadline) setP1Deadline(data.phase1Deadline);
              if (data.phase2Deadline) setP2Deadline(data.phase2Deadline);
            } else {
              setSystemConfig({ registrationOpen: false, phase1Open: false, phase2Open: false, round2Revealed: false, finalistsCalled: false });
            }
          });

          unsubSecrets = onSnapshot(doc(db, "settings", "secrets"), (docSnap) => {
            if (docSnap.exists() && docSnap.data().judgesPasskey) {
              setPasskeyInput(docSnap.data().judgesPasskey);
            } else {
              setPasskeyInput('innovax2026');
            }
          });

          fetchUsers();
        } else {
          router.push('/dashboard');
        }
      } else {
        if (unsubPublic) unsubPublic();
        if (unsubSecrets) unsubSecrets();
        router.push('/login');
      }
    });

    return () => {
      if (unsubPublic) unsubPublic();
      if (unsubSecrets) unsubSecrets();
      unsubscribeAuth();
    };
  }, [router]);

  const handleSetDeadline = (phase: number) => {
    const field = phase === 1 ? 'phase1Deadline' : 'phase2Deadline';
    const val = phase === 1 ? p1Deadline : p2Deadline;
    if (!val) return alert("Select a date and time first.");
    
    requestAction(
      "SET DEADLINE",
      `Confirm hard deadline for Phase ${phase} at ${new Date(val).toLocaleString()}? Submissions will lock automatically.`,
      async () => {
        await updateDoc(doc(db, "settings", "public"), { [field]: val });
        alert(`Phase ${phase} deadline locked.`);
      }
    );
  };

  const updatePasskey = () => {
    requestAction(
      "UPDATE SECURITY PROTOCOL",
      "Are you sure you want to change the judges' access passkey?",
      async () => {
        await setDoc(doc(db, "settings", "secrets"), { judgesPasskey: passkeyInput }, { merge: true });
        alert("Judges Passkey updated successfully!");
      }
    );
  };

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "registrations"));
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAllUsers(users);
    setLoading(false);
  };

  const requestAction = (title: string, message: string, action: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm: action });
  };

  const executeAction = () => {
    confirmModal.onConfirm();
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  const handleToggleRegistration = () => {
    if (!systemConfig.registrationOpen && systemConfig.phase1Open) {
      return alert("Cannot open registration while Phase 1 is running.");
    }
    const newStatus = !systemConfig.registrationOpen;
    requestAction(
      "GATEWAY OVERRIDE",
      `Are you sure you want to ${newStatus ? 'OPEN' : 'CLOSE'} the main registration gateway?`,
      async () => await updateDoc(doc(db, "settings", "public"), { registrationOpen: newStatus })
    );
  };

  const handleTogglePhase1 = () => {
    const opening = !systemConfig.phase1Open;
    if (opening) {
      if (systemConfig.registrationOpen) return alert("You must close Registration before opening Phase 1.");
      if (systemConfig.phase2Open) return alert("Cannot reopen Phase 1 because Phase 2 has already started.");
    }
    requestAction(
      "PHASE 1 OVERRIDE",
      `Are you sure you want to ${opening ? 'DEPLOY' : 'LOCK'} the Proposal Submission Phase?`,
      async () => await updateDoc(doc(db, "settings", "public"), { phase1Open: opening })
    );
  };

  const handleTogglePhase2 = () => {
    const opening = !systemConfig.phase2Open;
    if (opening) {
      if (systemConfig.phase1Open) return alert("You must close Phase 1 before opening Phase 2.");
      if (systemConfig.finalistsCalled) return alert("Cannot reopen Phase 2 because Finalists have been called.");
    }
    requestAction(
      "PHASE 2 OVERRIDE",
      `Are you sure you want to ${opening ? 'DEPLOY' : 'LOCK'} the Prototype Submission Phase?`,
      async () => await updateDoc(doc(db, "settings", "public"), { phase2Open: opening })
    );
  };

  const handleToggleRound2Results = () => {
    const newStatus = !systemConfig?.round2Revealed;
    requestAction(
      "PUBLISH ROUND 2 RESULTS",
      `Are you sure you want to ${newStatus ? 'REVEAL' : 'HIDE'} the Round 2 selections on the participants' dashboards?`,
      async () => await updateDoc(doc(db, "settings", "public"), { round2Revealed: newStatus })
    );
  };

  const handleToggleFinalists = () => {
    const newStatus = !systemConfig?.finalistsCalled;
    requestAction(
      "PUBLISH FINALISTS",
      `Are you sure you want to ${newStatus ? 'REVEAL' : 'HIDE'} the Finalist selections on the participants' dashboards?`,
      async () => await updateDoc(doc(db, "settings", "public"), { finalistsCalled: newStatus })
    );
  };

  const handleSendEmails = (phase: number) => {
    let eligibleUsers: any[] = [];
    
    if (phase === 1) {
      eligibleUsers = allUsers.filter(u => u.selectedForRound2 === true);
    } else if (phase === 2) {
      eligibleUsers = allUsers.filter(u => u.isFinalist === true);
    }

    if (eligibleUsers.length === 0) {
      return alert(`No eligible candidates found for Phase ${phase} emails.`);
    }

    const recipients = eligibleUsers.map(u => ({
      email: u.email,
      teamName: u.type === 'team' ? u.teamName : `${u.leader?.firstName} ${u.leader?.lastName}`
    }));

    requestAction(
      "EXECUTE MASS COMMS",
      `Are you ready to blast the success emails to ${recipients.length} selected candidates for Phase ${phase}? This action cannot be reversed.`,
      async () => {
        try {
          const response = await fetch('/api/send-emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phase, recipients })
          });
          
          const data = await response.json();
          if (data.success) {
            alert(`COMMUNICATION COMPLETE: Successfully sent ${recipients.length} emails!`);
          } else {
            alert(`ERROR: ${data.error}`);
          }
        } catch (error) {
          alert("CRITICAL ERROR: Failed to connect to the email server.");
        }
      }
    );
  };

  const toggleRound2 = (userId: string, currentStatus: boolean) => {
    requestAction(
      "ALTER APPLICANT STATUS",
      `Are you sure you want to ${currentStatus ? 'REVOKE' : 'ADVANCE'} this candidate's Phase 2 clearance?`,
      async () => {
        await updateDoc(doc(db, "registrations", userId), { selectedForRound2: !currentStatus });
        setAllUsers(allUsers.map(user => user.id === userId ? { ...user, selectedForRound2: !currentStatus } : user));
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
      "FINALIST SELECTION",
      `Are you sure you want to ${currentStatus ? 'REVOKE' : 'MAKE FINALIST'} for this candidate?`,
      async () => {
        await updateDoc(doc(db, "registrations", user.id), { isFinalist: !currentStatus });
        setAllUsers(allUsers.map(u => u.id === user.id ? { ...u, isFinalist: !currentStatus } : u));
      }
    );
  };

  const handleLogout = () => {
    requestAction(
      "TERMINATE SESSION",
      "Are you sure you want to exit the Command Center?",
      () => {
        document.cookie = "innovax_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        signOut(auth);
      }
    );
  };

  if (loading) return <div className="min-h-screen bg-[#05080C] flex items-center justify-center text-[#00E5FF] font-mono tracking-widest">VERIFYING CLEARANCE...</div>;
  if (!isAdmin) return null; 

  const phase1Users = allUsers; 
  const phase2Users = allUsers.filter(u => u.selectedForRound2); 
  const finalists = allUsers.filter(u => u.isFinalist); 

  return (
    <div className="min-h-screen bg-[#05080C] text-white p-10 pt-24 pb-32 relative">
      
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
                ABORT
              </button>
              <button onClick={executeAction} className="flex-1 py-3 text-xs font-bold tracking-widest uppercase bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/40 rounded transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#05080C]/90 backdrop-blur-md px-4">
          <div className="glass-panel border-[#00E5FF]/40 max-w-2xl w-full p-8 shadow-[0_0_60px_rgba(0,229,255,0.15)] relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white text-xl">✕</button>
            
            <h3 className="text-3xl font-display font-black text-white tracking-widest uppercase mb-1">
              {selectedUser.type === 'team' ? selectedUser.teamName : `${selectedUser.leader?.firstName} ${selectedUser.leader?.lastName}`}
            </h3>
            <p className="text-[#00E5FF] font-mono text-xs tracking-[0.2em] uppercase mb-8">
              {selectedUser.university} | <span className="text-gray-400">{selectedUser.type}</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-mono text-gray-300">
              <div className="glass-panel border-white/5 bg-[#121822]/50 p-4">
                <p className="text-gray-500 text-xs mb-1">LEADER NAME</p>
                <p className="text-white">{selectedUser.leader?.firstName} {selectedUser.leader?.lastName}</p>
              </div>
              <div className="glass-panel border-white/5 bg-[#121822]/50 p-4">
                <p className="text-gray-500 text-xs mb-1">CONTACT EMAIL</p>
                <p className="text-white break-all">{selectedUser.email}</p>
              </div>
              <div className="glass-panel border-white/5 bg-[#121822]/50 p-4">
                <p className="text-gray-500 text-xs mb-1">PHONE / WHATSAPP</p>
                <p className="text-white">{selectedUser.leader?.phone}</p>
              </div>
              <div className="glass-panel border-white/5 bg-[#121822]/50 p-4">
                <p className="text-gray-500 text-xs mb-1">ID CARD / REG NO</p>
                <p className="text-white">{selectedUser.leader?.idCard}</p>
              </div>

              {selectedUser.type === 'team' && selectedUser.teammates?.length > 0 && (
                <div className="col-span-1 md:col-span-2 glass-panel border-white/5 bg-[#121822]/50 p-4 mt-2">
                  <p className="text-gray-500 text-xs mb-3 border-b border-white/10 pb-2">TEAMMATES ({selectedUser.teammates.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedUser.teammates.map((mate: any, idx: number) => (
                      <div key={idx} className="border-l-2 border-[#00E5FF]/30 pl-3">
                        <p className="text-white text-xs">{mate.firstName} {mate.lastName}</p>
                        <p className="text-gray-500 text-[10px]">ID: {mate.idCard}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="col-span-1 md:col-span-2 mt-4 flex flex-wrap gap-4">
                {selectedUser.proposalLink ? (
                  <a href={selectedUser.proposalLink} target="_blank" className="flex-1 text-center bg-green-500/10 text-green-400 border border-green-500/30 px-4 py-3 rounded text-xs font-bold tracking-widest uppercase hover:bg-green-500/20 transition-colors">
                    📄 View Proposal PDF
                  </a>
                ) : (
                   <div className="flex-1 text-center bg-red-500/5 text-red-500/50 border border-red-500/10 px-4 py-3 rounded text-xs font-bold tracking-widest uppercase">
                    No Proposal
                  </div>
                )}
                
                {selectedUser.prototypeLink ? (
                  <a href={selectedUser.prototypeLink} target="_blank" className="flex-1 text-center bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 px-4 py-3 rounded text-xs font-bold tracking-widest uppercase hover:bg-[var(--gold)]/20 transition-colors">
                    ▶ Play Pitch Video
                  </a>
                ) : (
                  <div className="flex-1 text-center bg-red-500/5 text-red-500/50 border border-red-500/10 px-4 py-3 rounded text-xs font-bold tracking-widest uppercase">
                    No Video
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12 border-b border-[#121822] pb-6">
          <div>
            <h1 className="text-4xl font-display font-black tracking-widest uppercase mb-2">
              COMMAND <span className="text-[#00E5FF]">CENTER</span>
            </h1>
            <p className="text-gray-400 font-mono text-sm tracking-widest">SYSTEM ADMINISTRATOR ACCESS GRANTED</p>
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-white border border-gray-700 px-4 py-2 rounded transition-colors tracking-widest">LOGOUT</button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          
          <div className="glass-panel border-[#121822] bg-[#121822]/50 p-6 flex flex-col gap-4">
            <h2 className="text-white font-mono text-sm tracking-[0.2em] uppercase">1. Gateway</h2>
            <button onClick={handleToggleRegistration} className={`py-3 rounded text-xs font-bold tracking-widest uppercase transition-all ${systemConfig?.registrationOpen ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
              {systemConfig?.registrationOpen ? 'Registration is OPEN' : 'Registration is CLOSED'}
            </button>
          </div>

          <div className="glass-panel border-[#00E5FF]/20 bg-[#121822]/50 p-6 flex flex-col gap-4">
            <h2 className="text-[#00E5FF] font-mono text-sm tracking-[0.2em] uppercase">2. Phase 1 (Proposals)</h2>
            <button onClick={handleTogglePhase1} className={`py-3 rounded text-xs font-bold tracking-widest uppercase transition-all ${systemConfig?.phase1Open ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/50' : 'bg-gray-800 text-gray-400 border border-gray-600'}`}>
              {systemConfig?.phase1Open ? 'Phase 1 is LIVE' : 'Phase 1 is LOCKED'}
            </button>
            <div className="flex gap-2">
              <input type="datetime-local" value={p1Deadline} onChange={(e) => setP1Deadline(e.target.value)} className="bg-[#05080C] border border-white/10 rounded p-2 text-xs w-full focus:border-[#00E5FF]" />
              <button onClick={() => handleSetDeadline(1)} className="btn-outline-cyan text-[10px] px-3">SET</button>
            </div>
            
            <div className="border-t border-white/10 my-2"></div>
            
            <button onClick={handleToggleRound2Results} className={`w-full py-2 rounded text-[10px] font-bold tracking-widest uppercase transition-all ${systemConfig?.round2Revealed ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-800 text-gray-500 border border-gray-600 hover:bg-gray-700'}`}>
              {systemConfig?.round2Revealed ? '📢 R2 Results: PUBLIC' : '🔒 R2 Results: HIDDEN'}
            </button>
            
            <button onClick={() => handleSendEmails(1)} className="w-full bg-[#121822] border border-gray-600 text-gray-300 py-2 rounded text-xs font-mono uppercase hover:bg-white/10 transition-colors">
              📧 Send R2 Advance Emails
            </button>
          </div>

          <div className="glass-panel border-[var(--gold)]/20 bg-[#121822]/50 p-6 flex flex-col gap-4">
            <h2 className="text-[var(--gold)] font-mono text-sm tracking-[0.2em] uppercase">3. Phase 2 (Prototypes)</h2>
            <button onClick={handleTogglePhase2} className={`py-3 rounded text-xs font-bold tracking-widest uppercase transition-all ${systemConfig?.phase2Open ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/50' : 'bg-gray-800 text-gray-400 border border-gray-600'}`}>
              {systemConfig?.phase2Open ? 'Phase 2 is LIVE' : 'Phase 2 is LOCKED'}
            </button>
            <div className="flex gap-2">
              <input type="datetime-local" value={p2Deadline} onChange={(e) => setP2Deadline(e.target.value)} className="bg-[#05080C] border border-white/10 rounded p-2 text-xs w-full focus:border-[var(--gold)]" />
              <button onClick={() => handleSetDeadline(2)} className="border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)]/10 rounded text-[10px] px-3">SET</button>
            </div>

            <div className="border-t border-white/10 my-2"></div>
            
            <button onClick={handleToggleFinalists} className={`w-full py-2 rounded text-[10px] font-bold tracking-widest uppercase transition-all ${systemConfig?.finalistsCalled ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-800 text-gray-500 border border-gray-600 hover:bg-gray-700'}`}>
              {systemConfig?.finalistsCalled ? '📢 Finalists: PUBLIC' : '🔒 Finalists: HIDDEN'}
            </button>

            <button onClick={() => handleSendEmails(2)} className="w-full bg-[#121822] border border-gray-600 text-gray-300 py-2 rounded text-xs font-mono uppercase hover:bg-white/10 transition-colors">
              📧 Send Finalist Emails
            </button>
          </div>

        </div>

        <div className="glass-panel border-white/10 bg-[#121822]/50 p-6 mb-12">
          <h2 className="text-[#00E5FF] font-mono text-xs tracking-[0.2em] uppercase mb-4">Judges Portal Access</h2>
          <div className="flex gap-4 items-center mb-4">
            <input 
              type="text" 
              value={passkeyInput} 
              onChange={(e) => setPasskeyInput(e.target.value)} 
              className="bg-[#05080C] border border-white/10 rounded p-2 text-white font-mono text-sm w-full max-w-sm focus:border-[#00E5FF] focus:outline-none"
            />
            <button onClick={updatePasskey} className="text-xs border border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/10 px-4 py-2 rounded transition-colors">UPDATE KEY</button>
          </div>
        </div>

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
                  <th className="p-4 font-normal">Contact Email</th>
                  <th className="p-4 font-normal">Video Link</th>
                  <th className="p-4 font-normal text-center text-[#00E5FF]">Details</th>
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
                    <td className="p-4 font-mono text-xs text-gray-400">{user.email}</td>
                    <td className="p-4">
                      {user.prototypeLink ? <a href={user.prototypeLink} target="_blank" className="text-[var(--gold)] hover:underline flex items-center gap-2">▶ Play Video</a> : <span className="text-gray-600">Awaiting...</span>}
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => setSelectedUser(user)} className="text-[10px] font-mono font-bold tracking-widest text-[#00E5FF] border border-[#00E5FF]/50 hover:bg-[#00E5FF]/10 px-3 py-1.5 rounded transition-colors">
                        VIEW
                      </button>
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
                        onChange={() => toggleFinalist(user, user.isFinalist || false)} // UPDATED HERE
                        className="w-5 h-5 accent-[var(--gold)] cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
                {phase2Users.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500 font-mono text-xs">No candidates advanced to Phase 2 yet.</td></tr>}
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
                    <th className="p-4 font-normal text-center text-[#00E5FF]">Details</th>
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
                      <td className="p-4 text-center">
                        <button onClick={() => setSelectedUser(user)} className="text-[10px] font-mono font-bold tracking-widest text-[#00E5FF] border border-[#00E5FF]/50 hover:bg-[#00E5FF]/10 px-3 py-1.5 rounded transition-colors">
                          VIEW
                        </button>
                      </td>
                      <td className="p-4 text-center bg-red-500/5">
                        <input 
                          type="checkbox" checked={user.isFinalist || false}
                          onChange={() => toggleFinalist(user, user.isFinalist || false)} // UPDATED HERE
                          className="w-5 h-5 accent-red-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                  {finalists.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono text-xs">No finalists selected yet.</td></tr>}
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
                    <th className="p-4 font-normal">Contact Email</th>
                    <th className="p-4 font-normal">Proposal</th>
                    <th className="p-4 font-normal text-center text-[#00E5FF]">Details</th>
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
                      <td className="p-4 font-mono text-xs text-gray-400">{user.email}</td>
                      <td className="p-4">
                        {user.proposalUploaded && user.proposalLink ? (
                          <a href={user.proposalLink} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline flex items-center gap-2">📄 View PDF</a>
                        ) : (<span className="text-red-400">✖ Pending</span>)}
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => setSelectedUser(user)} className="text-[10px] font-mono font-bold tracking-widest text-[#00E5FF] border border-[#00E5FF]/50 hover:bg-[#00E5FF]/10 px-3 py-1.5 rounded transition-colors">
                          VIEW
                        </button>
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
                  {phase1Users.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500 font-mono text-xs">No registrations found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}