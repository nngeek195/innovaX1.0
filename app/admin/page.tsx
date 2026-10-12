'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { extractAmbassadorsFromCSV, type ParsedAmbassador } from '@/lib/csv';
import { exportToExcel, exportToPDF } from '@/lib/export';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [passkeyInput, setPasskeyInput] = useState('');
  
  const [p1Deadline, setP1Deadline] = useState('');
  const [p2Deadline, setP2Deadline] = useState('');

  // --- Ambassador Registration State ---
  const [showAmbassadorPanel, setShowAmbassadorPanel] = useState(true);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedAmbassadors, setParsedAmbassadors] = useState<ParsedAmbassador[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [ambassadorUploadStatus, setAmbassadorUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [ambassadorEmailStatus, setAmbassadorEmailStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [ambassadorUploadMsg, setAmbassadorUploadMsg] = useState('');
  const [ambassadorEmailMsg, setAmbassadorEmailMsg] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);

  // --- Visibility Toggles ---
  const [showPhase1, setShowPhase1] = useState(false);
  const [showFinalists, setShowFinalists] = useState(false);

  // --- Ambassador Report State ---
  const [showAmbassadorReport, setShowAmbassadorReport] = useState(false);
  const [ambassadorReport, setAmbassadorReport] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedAmbassador, setSelectedAmbassador] = useState<any | null>(null);

  // --- Detailed View State ---
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // --- Export State ---
  const [exportBusy, setExportBusy] = useState<'excel' | 'pdf' | null>(null);

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
      async () => {
        // Create an update object
        const updateData: any = { phase1Open: opening };
        
        // If we are locking the phase, reset the deadline to an empty string
        if (!opening) {
          updateData.phase1Deadline = '';
        }

        await updateDoc(doc(db, "settings", "public"), updateData);
      }
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
      async () => {
        // Create an update object
        const updateData: any = { phase2Open: opening };
        
        // If we are locking the phase, reset the deadline to an empty string
        if (!opening) {
          updateData.phase2Deadline = '';
        }

        await updateDoc(doc(db, "settings", "public"), updateData);
      }
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

  // --- Ambassador CSV Handlers ---
  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setParsedAmbassadors([]);
    setCsvErrors([]);
    setAmbassadorUploadStatus('idle');
    setAmbassadorEmailStatus('idle');
    setAmbassadorUploadMsg('');
    setAmbassadorEmailMsg('');
    const text = await file.text();
    const { ambassadors, errors } = extractAmbassadorsFromCSV(text);
    setParsedAmbassadors(ambassadors);
    setCsvErrors(errors);
  };

  const handleSaveAmbassadors = () => {
    if (parsedAmbassadors.length === 0) return alert('No valid ambassador records to save.');
    requestAction(
      'SAVE AMBASSADORS',
      `Are you sure you want to save ${parsedAmbassadors.length} ambassador records to the database? (delegateCount will be set to 0 for new records)`,
      async () => {
        setAmbassadorUploadStatus('uploading');
        setAmbassadorUploadMsg('');
        try {
          const res = await fetch('/api/save-ambassadors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ambassadors: parsedAmbassadors }),
          });
          const data = await res.json();
          if (data.success) {
            setAmbassadorUploadStatus('done');
            setAmbassadorUploadMsg(`✓ ${data.count} ambassadors saved to database.`);
          } else {
            setAmbassadorUploadStatus('error');
            setAmbassadorUploadMsg(`Error: ${data.error}`);
          }
        } catch (err: any) {
          setAmbassadorUploadStatus('error');
          setAmbassadorUploadMsg(`Critical error: ${err.message}`);
        }
      }
    );
  };

  const handleSendAmbassadorEmails = () => {
    if (parsedAmbassadors.length === 0) return alert('No ambassador records loaded. Please upload and save a CSV first.');
    requestAction(
      'SEND AMBASSADOR EMAILS',
      `Are you sure you want to send ambassador appointment emails to all ${parsedAmbassadors.length} ambassadors? This will deliver their unique code and referral link.`,
      async () => {
        setAmbassadorEmailStatus('sending');
        setAmbassadorEmailMsg('');
        try {
          const recipients = parsedAmbassadors.map(a => ({
            email: a.email,
            nameWithInitials: a.nameWithInitials,
            firstName: a.firstName,
            lastName: a.lastName,
            ambassadorId: a.ambassadorId,
            university: a.university,
          }));
          const res = await fetch('/api/send-ambassador-emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipients }),
          });
          const data = await res.json();
          if (data.success) {
            setAmbassadorEmailStatus('done');
            setAmbassadorEmailMsg(`✓ Emails sent to ${data.count} ambassadors.`);
          } else {
            setAmbassadorEmailStatus('error');
            setAmbassadorEmailMsg(`Error: ${data.error}`);
          }
        } catch (err: any) {
          setAmbassadorEmailStatus('error');
          setAmbassadorEmailMsg(`Critical error: ${err.message}`);
        }
      }
    );
  };

  // --- Export Handlers ---
  const handleExportExcel = async (dataset: 'all' | 'phase2' | 'finalists') => {
    setExportBusy('excel');
    try {
      const dataMap = {
        all: { users: allUsers, filename: 'InnovaX_All_Registrations' },
        phase2: { users: allUsers.filter(u => u.selectedForRound2), filename: 'InnovaX_Phase2_Participants' },
        finalists: { users: allUsers.filter(u => u.isFinalist), filename: 'InnovaX_Finalists' },
      };
      const { users, filename } = dataMap[dataset];
      if (!users.length) return alert('No records in this dataset to export.');
      await exportToExcel(users, filename);
    } catch (err: any) {
      alert('Excel export failed: ' + err.message);
    } finally {
      setExportBusy(null);
    }
  };

  const handleExportPDF = async (dataset: 'all' | 'phase2' | 'finalists') => {
    setExportBusy('pdf');
    try {
      const dataMap = {
        all: { users: allUsers, title: 'All Registrations' },
        phase2: { users: allUsers.filter(u => u.selectedForRound2), title: 'Phase 2 Participants' },
        finalists: { users: allUsers.filter(u => u.isFinalist), title: 'Finalists' },
      };
      const { users, title } = dataMap[dataset];
      if (!users.length) return alert('No records in this dataset to export.');
      await exportToPDF(users, `InnovaX – ${title}`);
    } catch (err: any) {
      alert('PDF export failed: ' + err.message);
    } finally {
      setExportBusy(null);
    }
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

  const fetchAmbassadorReport = async () => {
    setReportLoading(true);
    try {
      // Load all ambassadors
      const ambSnap = await getDocs(collection(db, 'ambassadors'));
      const ambassadors = ambSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Load all registrations (already in allUsers, but re-fetch to be safe)
      const regSnap = await getDocs(collection(db, 'registrations'));
      const registrations = regSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      // For each ambassador, find their referrals
      const report = ambassadors.map((amb: any) => {
        const delegates = registrations.filter(
          (r: any) => r.ambassadorCode && r.ambassadorCode.toUpperCase() === amb.ambassadorId?.toUpperCase()
        );
        return { ...amb, delegates };
      });

      // Sort by delegate count desc
      report.sort((a, b) => (b.delegates?.length || 0) - (a.delegates?.length || 0));
      setAmbassadorReport(report);
    } catch (err: any) {
      alert('Failed to load ambassador report: ' + err.message);
    } finally {
      setReportLoading(false);
    }
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
              <div className="w-full">
                <DatePicker
                  selected={p1Deadline ? new Date(p1Deadline) : null}
                  onChange={(date: Date | null) => setP1Deadline(date ? date.toISOString() : '')}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  placeholderText="Select Date & Time"
                  className="bg-[#05080C] border border-white/10 rounded p-2 text-xs w-full focus:border-[#00E5FF] text-white"
                  wrapperClassName="w-full"
                />
              </div>
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
              <div className="w-full">
                <DatePicker
                  selected={p2Deadline ? new Date(p2Deadline) : null}
                  onChange={(date: Date | null) => setP2Deadline(date ? date.toISOString() : '')}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  placeholderText="Select Date & Time"
                  className="bg-[#05080C] border border-white/10 rounded p-2 text-xs w-full focus:border-[var(--gold)] text-white"
                  wrapperClassName="w-full"
                />
              </div>
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
        <br /><br /><br />
        <div className="glass-panel border-white/10 bg-[#121822]/50 p-6 mb-12">
          <h2 className="text-[#00E5FF] font-mono text-xs tracking-[0.2em] uppercase mb-4">
            Judges Portal Access
          </h2>

          {/* Judges Portal Link */}
          <div className="mb-5">
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-2">
              Judges Portal URL
            </p>

            <a
              href="/judges"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#00E5FF] font-mono text-sm hover:underline"
            >
              🔗 Open Judges Portal
            </a>

            <p className="text-gray-600 text-[10px] mt-2">
              This link automatically works in both local development and production hosting.
            </p>
          </div>

          {/* Passkey */}
          <div className="flex gap-4 items-center mb-4">
            <input
              type="text"
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
              className="bg-[#05080C] border border-white/10 rounded p-2 text-white font-mono text-sm w-full max-w-sm focus:border-[#00E5FF] focus:outline-none"
            />

            <button
              onClick={updatePasskey}
              className="text-xs border border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/10 px-4 py-2 rounded transition-colors"
            >
              UPDATE KEY
            </button>
          </div>
        </div>

        {/* === AMBASSADOR REGISTRATION PANEL === */}
        <div className="glass-panel border-[#7C3AED]/30 bg-[#121822]/50 p-6 mb-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[#A78BFA] font-mono text-xs tracking-[0.2em] uppercase">
              🎖️ Ambassador Registration
            </h2>
            <button
              onClick={() => setShowAmbassadorPanel(!showAmbassadorPanel)}
              className="text-xs font-mono tracking-widest uppercase border border-[#7C3AED]/50 text-[#A78BFA] hover:bg-[#7C3AED]/10 px-4 py-2 rounded transition-colors"
            >
              {showAmbassadorPanel ? 'COLLAPSE' : 'EXPAND'}
            </button>
          </div>

          {showAmbassadorPanel && (
            <div className="animate-fade-in">
              {/* Step 1: Upload CSV */}
              <div className="mb-6">
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-3">
                  Step 1 — Upload Ambassador CSV
                </p>
                <p className="text-gray-600 font-mono text-[10px] mb-3 leading-relaxed">
                  Expected columns (in order): Email Address · Name with Initials · First Name · Last Name · WhatsApp Number · University · Faculty · Year of Study · Ambassador ID
                </p>
                <div
                  className="border-2 border-dashed border-[#7C3AED]/40 rounded-lg p-6 text-center cursor-pointer hover:border-[#7C3AED]/70 hover:bg-[#7C3AED]/5 transition-all"
                  onClick={() => csvInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      const syntheticEvent = { target: { files: e.dataTransfer.files } } as any;
                      handleCsvFileChange(syntheticEvent);
                    }
                  }}
                >
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleCsvFileChange}
                  />
                  <p className="text-[#A78BFA] font-mono text-sm mb-1">
                    {csvFile ? `📄 ${csvFile.name}` : '📂 Click or drag & drop a CSV file'}
                  </p>
                  <p className="text-gray-600 font-mono text-[10px]">
                    {csvFile ? `${parsedAmbassadors.length} valid records · ${csvErrors.length} errors` : 'Supports header row detection'}
                  </p>
                </div>
              </div>

              {/* CSV Parse Errors */}
              {csvErrors.length > 0 && (
                <div className="mb-6 glass-panel border-red-500/20 bg-red-500/5 p-4 rounded">
                  <p className="text-red-400 font-mono text-[10px] uppercase tracking-widest mb-2">⚠ Parse Warnings ({csvErrors.length})</p>
                  <ul className="space-y-1">
                    {csvErrors.map((err, i) => (
                      <li key={i} className="text-red-400/70 font-mono text-[10px]">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {parsedAmbassadors.length > 0 && (
                <div className="mb-6">
                  <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-3">
                    Preview — {parsedAmbassadors.length} Ambassador Records
                  </p>
                  <div className="overflow-x-auto rounded border border-[#7C3AED]/20">
                    <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
                      <thead className="bg-[#05080C] text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="p-3 font-normal">#</th>
                          <th className="p-3 font-normal">Amb. ID</th>
                          <th className="p-3 font-normal">Name</th>
                          <th className="p-3 font-normal">Email</th>
                          <th className="p-3 font-normal">WhatsApp</th>
                          <th className="p-3 font-normal">University</th>
                          <th className="p-3 font-normal">Faculty</th>
                          <th className="p-3 font-normal">Year</th>
                          <th className="p-3 font-normal text-center text-green-500">Delegates</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsedAmbassadors.map((amb, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 text-gray-600">{idx + 1}</td>
                            <td className="p-3 text-[#A78BFA] font-bold tracking-widest">{amb.ambassadorId}</td>
                            <td className="p-3 text-white">{amb.nameWithInitials || `${amb.firstName} ${amb.lastName}`}</td>
                            <td className="p-3 text-gray-400">{amb.email}</td>
                            <td className="p-3 text-gray-400">{amb.whatsapp}</td>
                            <td className="p-3 text-gray-400 max-w-[160px] truncate">{amb.university}</td>
                            <td className="p-3 text-gray-400">{amb.faculty}</td>
                            <td className="p-3 text-gray-400">{amb.yearOfStudy}</td>
                            <td className="p-3 text-center text-green-400 font-bold">0</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 2: Save to Database */}
              {parsedAmbassadors.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-3">
                    Step 2 — Save to Firestore Database
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      onClick={handleSaveAmbassadors}
                      disabled={ambassadorUploadStatus === 'uploading'}
                      className={`py-3 px-6 rounded text-xs font-bold tracking-widest uppercase transition-all ${
                        ambassadorUploadStatus === 'done'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : ambassadorUploadStatus === 'error'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                          : ambassadorUploadStatus === 'uploading'
                          ? 'bg-gray-800 text-gray-500 border border-gray-600 cursor-not-allowed'
                          : 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/50 hover:bg-[#7C3AED]/30'
                      }`}
                    >
                      {ambassadorUploadStatus === 'uploading' ? '⏳ Saving...' : ambassadorUploadStatus === 'done' ? '✓ Saved!' : '💾 Save to Database'}
                    </button>
                    {ambassadorUploadMsg && (
                      <p className={`font-mono text-[11px] ${ambassadorUploadStatus === 'done' ? 'text-green-400' : 'text-red-400'}`}>
                        {ambassadorUploadMsg}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Send Emails */}
              {parsedAmbassadors.length > 0 && (
                <div>
                  <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-3">
                    Step 3 — Send Ambassador Appointment Emails
                  </p>
                  <p className="text-gray-600 font-mono text-[10px] mb-3 leading-relaxed">
                    Each ambassador will receive their unique Ambassador Code and personalized referral link via email.
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      onClick={handleSendAmbassadorEmails}
                      disabled={ambassadorEmailStatus === 'sending'}
                      className={`py-3 px-6 rounded text-xs font-bold tracking-widest uppercase transition-all ${
                        ambassadorEmailStatus === 'done'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : ambassadorEmailStatus === 'error'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                          : ambassadorEmailStatus === 'sending'
                          ? 'bg-gray-800 text-gray-500 border border-gray-600 cursor-not-allowed'
                          : 'bg-[#121822] border border-[#7C3AED]/50 text-[#A78BFA] hover:bg-[#7C3AED]/10'
                      }`}
                    >
                      {ambassadorEmailStatus === 'sending' ? '⏳ Sending...' : ambassadorEmailStatus === 'done' ? '✓ Emails Sent!' : `📧 Send Emails (${parsedAmbassadors.length})`}
                    </button>
                    {ambassadorEmailMsg && (
                      <p className={`font-mono text-[11px] ${ambassadorEmailStatus === 'done' ? 'text-green-400' : 'text-red-400'}`}>
                        {ambassadorEmailMsg}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* === AMBASSADOR DELEGATE REPORT === */}
        <div className="glass-panel border-[#7C3AED]/20 bg-[#121822]/50 p-6 mb-12">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-[#A78BFA] font-mono text-xs tracking-[0.2em] uppercase">
              📊 Ambassador Delegate Report
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!showAmbassadorReport) {
                    setShowAmbassadorReport(true);
                    fetchAmbassadorReport();
                  } else {
                    setShowAmbassadorReport(false);
                  }
                }}
                className="text-xs font-mono tracking-widest uppercase border border-[#7C3AED]/50 text-[#A78BFA] hover:bg-[#7C3AED]/10 px-4 py-2 rounded transition-colors"
              >
                {showAmbassadorReport ? 'COLLAPSE' : 'LOAD REPORT'}
              </button>
              {showAmbassadorReport && (
                <button
                  onClick={fetchAmbassadorReport}
                  disabled={reportLoading}
                  className="text-xs font-mono tracking-widest uppercase border border-gray-600 text-gray-400 hover:bg-gray-800 px-4 py-2 rounded transition-colors"
                >
                  {reportLoading ? '⏳ Refreshing...' : '↻ Refresh'}
                </button>
              )}
            </div>
          </div>

          {showAmbassadorReport && (
            <div className="mt-6 animate-fade-in">
              {reportLoading ? (
                <div className="text-center py-12 text-[#A78BFA] font-mono text-xs tracking-widest animate-pulse">
                  LOADING AMBASSADOR DATA...
                </div>
              ) : ambassadorReport.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-mono text-xs">
                  No ambassador records found. Upload a CSV in the Ambassador Registration panel first.
                </div>
              ) : (
                <>
                  {/* Summary Table */}
                  <div className="overflow-x-auto rounded border border-[#7C3AED]/20 mb-6">
                    <table className="w-full text-left text-sm font-mono whitespace-nowrap">
                      <thead className="bg-[#05080C] text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4 font-normal">Ambassador ID</th>
                          <th className="p-4 font-normal">Name</th>
                          <th className="p-4 font-normal">University</th>
                          <th className="p-4 font-normal text-center text-green-400">Delegates</th>
                          <th className="p-4 font-normal text-center">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {ambassadorReport.map((amb) => (
                          <tr key={amb.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 text-[#A78BFA] font-bold tracking-widest">{amb.ambassadorId}</td>
                            <td className="p-4 text-white">{amb.nameWithInitials || `${amb.firstName || ''} ${amb.lastName || ''}`.trim()}</td>
                            <td className="p-4 text-gray-400 max-w-[200px] truncate">{amb.university || '—'}</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                amb.delegates?.length > 0
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-gray-800 text-gray-500 border border-gray-700'
                              }`}>
                                {amb.delegates?.length || 0}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => setSelectedAmbassador(amb)}
                                disabled={!amb.delegates?.length}
                                className="text-[10px] font-mono font-bold tracking-widest text-[#A78BFA] border border-[#7C3AED]/50 hover:bg-[#7C3AED]/10 px-3 py-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                VIEW
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="flex gap-6 text-xs font-mono">
                    <span className="text-gray-500">
                      Total Ambassadors: <span className="text-white font-bold">{ambassadorReport.length}</span>
                    </span>
                    <span className="text-gray-500">
                      Total Delegates Referred: <span className="text-green-400 font-bold">
                        {ambassadorReport.reduce((s, a) => s + (a.delegates?.length || 0), 0)}
                      </span>
                    </span>
                    <span className="text-gray-500">
                      Ambassadors with 0 referrals: <span className="text-yellow-400 font-bold">
                        {ambassadorReport.filter(a => !a.delegates?.length).length}
                      </span>
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Ambassador Delegate Drill-down Modal */}
        {selectedAmbassador && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#05080C]/90 backdrop-blur-md px-4">
            <div className="glass-panel border-[#7C3AED]/40 max-w-3xl w-full p-8 shadow-[0_0_60px_rgba(124,58,237,0.15)] relative max-h-[90vh] overflow-y-auto animate-fade-in">
              <button
                onClick={() => setSelectedAmbassador(null)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white text-xl"
              >✕</button>

              <div className="mb-6">
                <p className="text-[#A78BFA] font-mono text-[10px] tracking-[0.3em] uppercase mb-1">Ambassador Report</p>
                <h3 className="text-2xl font-display font-black text-white tracking-widest uppercase">
                  {selectedAmbassador.nameWithInitials || `${selectedAmbassador.firstName} ${selectedAmbassador.lastName}`}
                </h3>
                <p className="text-[#A78BFA] font-mono text-xs mt-1">
                  {selectedAmbassador.ambassadorId} · {selectedAmbassador.university}
                </p>
              </div>

              <div className="flex gap-4 mb-6 flex-wrap">
                <div className="glass-panel border-white/5 bg-[#121822]/50 px-5 py-3 text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Total Delegates</p>
                  <p className="text-2xl font-bold text-green-400">{selectedAmbassador.delegates?.length || 0}</p>
                </div>
                <div className="glass-panel border-white/5 bg-[#121822]/50 px-5 py-3 text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Faculty</p>
                  <p className="text-sm font-bold text-white">{selectedAmbassador.faculty || '—'}</p>
                </div>
                <div className="glass-panel border-white/5 bg-[#121822]/50 px-5 py-3 text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Year</p>
                  <p className="text-sm font-bold text-white">{selectedAmbassador.yearOfStudy || '—'}</p>
                </div>
                <div className="glass-panel border-white/5 bg-[#121822]/50 px-5 py-3 text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">WhatsApp</p>
                  <p className="text-sm font-bold text-white">{selectedAmbassador.whatsapp || '—'}</p>
                </div>
              </div>

              <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
                Delegate Registrations ({selectedAmbassador.delegates?.length || 0})
              </p>

              <div className="space-y-3">
                {selectedAmbassador.delegates?.map((reg: any, idx: number) => (
                  <div key={reg.id} className="glass-panel border-[#7C3AED]/20 bg-[#05080C]/50 p-4">
                    <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                      <div>
                        <span className="text-gray-500 font-mono text-[10px] mr-2">#{idx + 1}</span>
                        <span className="text-white font-bold text-sm">
                          {reg.type === 'team' ? reg.teamName : `${reg.leader?.firstName} ${reg.leader?.lastName}`}
                        </span>
                        <span className="ml-2 text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">{reg.type}</span>
                      </div>
                      <span className="text-gray-500 font-mono text-[10px]">
                        {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-gray-400">
                      <span>📧 {reg.email}</span>
                      <span>🏛 {reg.university}</span>
                      <span>👤 Leader: {reg.leader?.firstName} {reg.leader?.lastName}</span>
                      {reg.leader?.phone && <span>📱 {reg.leader.phone}</span>}
                    </div>
                    {reg.type === 'team' && reg.teammates?.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-white/5">
                        <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">Teammates</p>
                        <div className="flex flex-wrap gap-2">
                          {reg.teammates.map((m: any, mi: number) => (
                            <span key={mi} className="text-[10px] font-mono text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                              {m.firstName} {m.lastName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-end mb-4 border-b border-[#121822] pb-4 flex-wrap gap-4">
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

        {/* ============================================================ */}
        {/* EXPORT PANEL                                                  */}
        {/* ============================================================ */}
        <div className="glass-panel border-emerald-500/20 bg-emerald-500/5 p-5 mb-8 rounded-xl">
          <h3 className="text-emerald-400 font-mono text-xs tracking-[0.25em] uppercase mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Export Registration Data
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* All Registrations */}
            <div className="glass-panel border-white/10 bg-[#0a1018]/60 p-4 rounded-lg">
              <p className="text-gray-400 font-mono text-[10px] uppercase tracking-widest mb-1">All Registrations</p>
              <p className="text-white font-bold text-xl mb-3">{allUsers.length} <span className="text-gray-500 text-sm font-normal">records</span></p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportExcel('all')}
                  disabled={exportBusy !== null || allUsers.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-[10px] font-bold tracking-widest uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {exportBusy === 'excel' ? '⏳' : '📊'} Excel
                </button>
                <button
                  onClick={() => handleExportPDF('all')}
                  disabled={exportBusy !== null || allUsers.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-[10px] font-bold tracking-widest uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {exportBusy === 'pdf' ? '⏳' : '📄'} PDF
                </button>
              </div>
            </div>

            {/* Phase 2 Participants */}
            <div className="glass-panel border-[#00E5FF]/15 bg-[#0a1018]/60 p-4 rounded-lg">
              <p className="text-gray-400 font-mono text-[10px] uppercase tracking-widest mb-1">Phase 2 Participants</p>
              <p className="text-[#00E5FF] font-bold text-xl mb-3">{allUsers.filter(u => u.selectedForRound2).length} <span className="text-gray-500 text-sm font-normal">records</span></p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportExcel('phase2')}
                  disabled={exportBusy !== null || allUsers.filter(u => u.selectedForRound2).length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-[10px] font-bold tracking-widest uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {exportBusy === 'excel' ? '⏳' : '📊'} Excel
                </button>
                <button
                  onClick={() => handleExportPDF('phase2')}
                  disabled={exportBusy !== null || allUsers.filter(u => u.selectedForRound2).length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-[10px] font-bold tracking-widest uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {exportBusy === 'pdf' ? '⏳' : '📄'} PDF
                </button>
              </div>
            </div>

            {/* Finalists */}
            <div className="glass-panel border-[var(--gold)]/15 bg-[#0a1018]/60 p-4 rounded-lg">
              <p className="text-gray-400 font-mono text-[10px] uppercase tracking-widest mb-1">🏆 Finalists</p>
              <p className="text-[var(--gold)] font-bold text-xl mb-3">{allUsers.filter(u => u.isFinalist).length} <span className="text-gray-500 text-sm font-normal">records</span></p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportExcel('finalists')}
                  disabled={exportBusy !== null || allUsers.filter(u => u.isFinalist).length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-[10px] font-bold tracking-widest uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {exportBusy === 'excel' ? '⏳' : '📊'} Excel
                </button>
                <button
                  onClick={() => handleExportPDF('finalists')}
                  disabled={exportBusy !== null || allUsers.filter(u => u.isFinalist).length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-[10px] font-bold tracking-widest uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {exportBusy === 'pdf' ? '⏳' : '📄'} PDF
                </button>
              </div>
            </div>
          </div>

          <p className="text-gray-600 font-mono text-[10px] mt-4">
            Excel exports include all fields including teammate details. PDF exports are landscape A3 for maximum readability.
          </p>
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