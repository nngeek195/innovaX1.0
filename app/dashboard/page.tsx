'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "registrations", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
        setLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel border-[#00E5FF]/20">
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