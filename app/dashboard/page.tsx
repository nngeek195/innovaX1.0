'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Submission States
  const [proposalUploaded, setProposalUploaded] = useState(false);
  const [videoLink, setVideoLink] = useState('');

  // 1. Authenticate & Fetch Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Listen to User Data
        const docRef = doc(db, "registrations", user.uid);
        const unsubscribeUser = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setProposalUploaded(data.proposalUploaded || false);
            setVideoLink(data.prototypeLink || '');
          }
        });

        // Listen to Global System Config
        const sysRef = doc(db, "settings", "system");
        const unsubscribeSys = onSnapshot(sysRef, (sysSnap) => {
          if (sysSnap.exists()) {
            setSystemConfig(sysSnap.data());
          }
          setLoading(false);
        });

        return () => {
          unsubscribeUser();
          unsubscribeSys();
        };
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Handlers for Submissions
  const handleProposalCheck = async (checked: boolean) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "registrations", auth.currentUser!.uid), {
        proposalUploaded: checked
      });
      setProposalUploaded(checked);
    } catch (err) {
      alert("Failed to update status.");
    }
    setUpdating(false);
  };

  const handleVideoSubmit = async () => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "registrations", auth.currentUser!.uid), {
        prototypeLink: videoLink
      });
      alert("Video link submitted successfully!");
    } catch (err) {
      alert("Failed to submit link.");
    }
    setUpdating(false);
  };

  if (loading) return <div className="min-h-screen bg-[#05080C] flex items-center justify-center text-[#00E5FF] font-mono tracking-widest">LOADING SECURE DATA...</div>;

  return (
    <div className="min-h-screen bg-[#05080C] text-white pt-24 px-6 pb-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-12 border-b border-[#121822] pb-6">
          <div>
            <h1 className="text-4xl font-display font-black tracking-widest uppercase">
              {userData.type === 'team' ? userData.teamName : `${userData.leader.firstName} ${userData.leader.lastName}`}
            </h1>
            <p className="text-[#00E5FF] tracking-widest text-sm mt-2 uppercase font-mono">{userData.university}</p>
          </div>
          <button onClick={() => signOut(auth)} className="text-xs text-gray-500 hover:text-white border border-gray-700 px-4 py-2 rounded transition-colors tracking-widest">LOGOUT</button>
        </div>

        {/* --- PHASE 1: PROPOSAL SUBMISSION --- */}
        {systemConfig?.phase1Open && (
          <div className="glass-panel border-[#00E5FF]/40 mb-8 bg-[#00E5FF]/5">
            <h2 className="text-[#00E5FF] font-display font-bold text-xl mb-2">PHASE 1: PROPOSAL SUBMISSION</h2>
            <p className="text-sm text-gray-400 mb-6">Upload your proposal document to our secure drive folder. Once uploaded, confirm your submission below.</p>
            
            <a href="https://drive.google.com/drive/folders/YOUR_FOLDER_ID" target="_blank" rel="noopener noreferrer" className="btn-outline-cyan inline-block mb-6">
              OPEN UPLOAD FOLDER
            </a>

            <label className="flex items-center gap-4 p-4 border border-[#121822] rounded-lg bg-[#05080C] cursor-pointer hover:border-gray-600 transition-colors">
              <input 
                type="checkbox" 
                checked={proposalUploaded}
                onChange={(e) => handleProposalCheck(e.target.checked)}
                disabled={updating}
                className="w-5 h-5 accent-[#00E5FF] bg-[#121822] border-white/10"
              />
              <span className="text-sm tracking-wide">I confirm that my team has uploaded the proposal document to the drive.</span>
            </label>
          </div>
        )}

        {/* --- PHASE 2: PROTOTYPE & VIDEO SUBMISSION --- */}
        {systemConfig?.phase2Open && userData.selectedForRound2 && (
          <div className="glass-panel border-[#00E5FF]/40 mb-8 shadow-[0_0_30px_rgba(0,229,255,0.1)]">
            <h2 className="text-[#00E5FF] font-display font-bold text-xl mb-2">PHASE 2: PROTOTYPE & VIDEO</h2>
            <p className="text-sm text-gray-400 mb-6">Congratulations on advancing! Paste the public URL to your social media pitch video below.</p>
            
            <div className="flex gap-4">
              <input 
                type="url" 
                placeholder="e.g., https://youtube.com/watch?v=..." 
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                className="flex-1 bg-[#121822]/50 border border-white/10 rounded-lg p-3 text-white focus:border-[#00E5FF] focus:outline-none transition-colors"
              />
              <button 
                onClick={handleVideoSubmit}
                disabled={updating || !videoLink}
                className="btn-solid-cyan px-8 py-3 rounded-lg"
              >
                SUBMIT LINK
              </button>
            </div>
          </div>
        )}

        {/* --- EXISTING USER DATA SECTIONS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel border-white/10">
            <h3 className="text-[#00E5FF] font-mono text-xs tracking-[0.2em] mb-6 uppercase">Primary Contact</h3>
            <div className="space-y-4">
              <div><p className="text-xs text-gray-500">NAME</p><p>{userData.leader.firstName} {userData.leader.lastName}</p></div>
              <div><p className="text-xs text-gray-500">ID CARD</p><p className="font-mono">{userData.leader.idCard}</p></div>
              <div><p className="text-xs text-gray-500">WHATSAPP</p><p className="font-mono text-[#00E5FF]">{userData.leader.phone}</p></div>
              <div><p className="text-xs text-gray-500">EMAIL</p><p>{userData.email}</p></div>
            </div>
          </div>

          {userData.type === 'team' && userData.teammates.length > 0 && (
            <div className="glass-panel">
              <h3 className="text-gray-400 font-mono text-xs tracking-[0.2em] mb-6 uppercase">Squad Roster</h3>
              <div className="space-y-6">
                {userData.teammates.map((mate: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-[#121822] pl-4">
                    <p className="font-bold">{mate.firstName} {mate.lastName}</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">ID: {mate.idCard}</p>
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