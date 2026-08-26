'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, onSnapshot, updateDoc } from 'firebase/firestore';

// Note: Ensure you wrap this in an Auth check to verify they are an admin!

export default function AdminDashboard() {
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // 1. Fetch Global Settings
  useEffect(() => {
    const unsubscribeSys = onSnapshot(doc(db, "settings", "system"), (docSnap) => {
      if (docSnap.exists()) setSystemConfig(docSnap.data());
    });
    return () => unsubscribeSys();
  }, []);

  // 2. Fetch All Teams/Individuals
  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "registrations"));
      const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(users);
    };
    fetchUsers();
  }, []);

  // 3. Toggle Global States
  const toggleSetting = async (field: string, currentValue: boolean) => {
    await updateDoc(doc(db, "settings", "system"), {
      [field]: !currentValue
    });
  };

  return (
    <div className="p-10 text-white min-h-screen bg-[#05080C]">
      <h1 className="text-3xl font-bold mb-8 text-[#00E5FF]">Admin Command Center</h1>
      
      {/* Global Controls */}
      <div className="flex gap-4 mb-12 p-6 border border-white/10 rounded-lg">
        <button 
          onClick={() => toggleSetting('registrationOpen', systemConfig?.registrationOpen)}
          className={`px-4 py-2 rounded ${systemConfig?.registrationOpen ? 'bg-green-500' : 'bg-gray-700'}`}
        >
          {systemConfig?.registrationOpen ? 'Close Event' : 'Open Event'}
        </button>

        <button 
          onClick={() => toggleSetting('phase1Open', systemConfig?.phase1Open)}
          className={`px-4 py-2 rounded ${systemConfig?.phase1Open ? 'bg-green-500' : 'bg-gray-700'}`}
        >
          {systemConfig?.phase1Open ? 'Close Proposal Phase' : 'Open Proposals'}
        </button>

        <button 
          onClick={() => toggleSetting('phase2Open', systemConfig?.phase2Open)}
          className={`px-4 py-2 rounded ${systemConfig?.phase2Open ? 'bg-green-500' : 'bg-gray-700'}`}
        >
          {systemConfig?.phase2Open ? 'Close Phase 2' : 'Start Round 2'}
        </button>
      </div>

      {/* Build your Tables here mapping through `allUsers` */}
      <div className="text-gray-400">Total Applicants: {allUsers.length}</div>
    </div>
  );
}