'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const UNIVERSITIES = [
  "University of Colombo (UOC)", "University of Peradeniya (UOP)", "University of Sri Jayewardenepura (USJ)",
  "University of Kelaniya (UOK)", "University of Moratuwa (UOM)", "University of Jaffna (UOJ)",
  "University of Ruhuna (UOR)", "The Open University of Sri Lanka (OUSL)", "Eastern University, Sri Lanka (EUSL)",
  "South Eastern University of Sri Lanka (SEUSL)", "Rajarata University of Sri Lanka (RUSL)",
  "Sabaragamuwa University of Sri Lanka (SUSL)", "Wayamba University of Sri Lanka (WUSL)",
  "Uva Wellassa University (UWU)", "University of the Visual and Performing Arts (UVPA)",
  "Gampaha Wickramarachchi University of Indigenous Medicine (GWUIM)", "University of Vavuniya (UOV)", "Other"
];

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [type, setType] = useState('team');
  const [teamName, setTeamName] = useState('');
  const [memberCount, setMemberCount] = useState(2);
  const [university, setUniversity] = useState(UNIVERSITIES[0]);
  const [otherUniversity, setOtherUniversity] = useState('');
  const [leader, setLeader] = useState({ firstName: '', lastName: '', idCard: '', phone: '' });
  const [members, setMembers] = useState([{ firstName: '', lastName: '', idCard: '' }, { firstName: '', lastName: '', idCard: '' }]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Prepare Data
      const finalUniversity = university === 'Other' ? otherUniversity : university;
      const teammates = type === 'team' ? members.slice(0, memberCount - 1) : [];

      // 3. Save to Firestore
      await setDoc(doc(db, "registrations", user.uid), {
        uid: user.uid,
        type,
        teamName: type === 'team' ? teamName : null,
        memberCount: type === 'team' ? memberCount : 1,
        university: finalUniversity,
        leader,
        teammates,
        email,
        createdAt: new Date().toISOString()
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#121822]/50 border border-white/10 rounded-lg p-3 text-white focus:border-[#00E5FF] focus:outline-none mb-4 transition-colors";

  return (
    <div className="min-h-screen bg-[#05080C] text-white flex flex-col items-center pt-24 pb-12 px-6">
      <div className="w-full max-w-2xl glass-panel relative z-10 border-[#00E5FF]/20 shadow-[0_0_30px_rgba(0,229,255,0.05)]">
        <h2 className="text-3xl font-display font-bold text-center mb-8 tracking-wider">
          INNOVA<span className="text-[#00E5FF]">X</span> REGISTRATION
        </h2>

        {error && <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-6 text-sm">{error}</div>}

        <form onSubmit={step === 2 ? handleRegister : (e) => { e.preventDefault(); setStep(2); }}>
          
          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex gap-4 mb-6">
                <button type="button" onClick={() => setType('team')} className={`flex-1 py-3 rounded-lg border font-bold tracking-widest ${type === 'team' ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]' : 'border-white/10 text-gray-400'}`}>TEAM</button>
                <button type="button" onClick={() => setType('individual')} className={`flex-1 py-3 rounded-lg border font-bold tracking-widest ${type === 'individual' ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]' : 'border-white/10 text-gray-400'}`}>INDIVIDUAL</button>
              </div>

              <div>
                <label className="block text-xs text-[#00E5FF] mb-2 uppercase tracking-widest">University</label>
                <select value={university} onChange={(e) => setUniversity(e.target.value)} className={inputClass}>
                  {UNIVERSITIES.map(u => <option key={u} value={u} className="bg-[#05080C]">{u}</option>)}
                </select>
                {university === 'Other' && (
                  <input type="text" placeholder="Type your university name" value={otherUniversity} onChange={(e) => setOtherUniversity(e.target.value)} className={inputClass} required />
                )}
              </div>

              {type === 'team' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#00E5FF] mb-2 uppercase tracking-widest">Team Name</label>
                      <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className={inputClass} required />
                    </div>
                    <div>
                      <label className="block text-xs text-[#00E5FF] mb-2 uppercase tracking-widest">Team Size</label>
                      <select value={memberCount} onChange={(e) => setMemberCount(Number(e.target.value))} className={inputClass}>
                        <option value={2} className="bg-[#05080C]">2 Members</option>
                        <option value={3} className="bg-[#05080C]">3 Members</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="p-4 border border-[#121822] rounded-lg bg-[#05080C]/50">
                <h3 className="text-sm text-[#00E5FF] mb-4 font-bold tracking-widest">{type === 'team' ? 'TEAM LEADER DETAILS' : 'YOUR DETAILS'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="First Name" value={leader.firstName} onChange={(e) => setLeader({...leader, firstName: e.target.value})} className={inputClass} required />
                  <input type="text" placeholder="Last Name" value={leader.lastName} onChange={(e) => setLeader({...leader, lastName: e.target.value})} className={inputClass} required />
                  <input type="text" placeholder="ID Card Number (NIC)" value={leader.idCard} onChange={(e) => setLeader({...leader, idCard: e.target.value})} className={inputClass} required />
                  <input type="tel" placeholder="WhatsApp Number" value={leader.phone} onChange={(e) => setLeader({...leader, phone: e.target.value})} className={inputClass} required />
                </div>
              </div>

              {type === 'team' && Array.from({ length: memberCount - 1 }).map((_, index) => (
                <div key={index} className="p-4 border border-[#121822] rounded-lg bg-[#05080C]/50">
                  <h3 className="text-sm text-gray-400 mb-4 font-bold tracking-widest">TEAM MATE {index + 1}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="First Name" value={members[index].firstName} onChange={(e) => { const newM = [...members]; newM[index].firstName = e.target.value; setMembers(newM); }} className={inputClass} required />
                    <input type="text" placeholder="Last Name" value={members[index].lastName} onChange={(e) => { const newM = [...members]; newM[index].lastName = e.target.value; setMembers(newM); }} className={inputClass} required />
                    <input type="text" placeholder="ID Card (NIC)" value={members[index].idCard} onChange={(e) => { const newM = [...members]; newM[index].idCard = e.target.value; setMembers(newM); }} className={inputClass} required />
                  </div>
                </div>
              ))}
              
              <button type="submit" className="w-full btn-solid-cyan mt-6">NEXT STEP →</button>
            </div>
          )}

          {/* STEP 2: Account Creation */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm text-[#00E5FF] mb-6 font-bold tracking-widest text-center">CREATE PORTAL ACCOUNT</h3>
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} minLength={6} required />
              </div>
              
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setStep(1)} className="btn-outline-cyan w-1/3 justify-center">BACK</button>
                <button type="submit" disabled={loading} className="btn-solid-cyan w-2/3 justify-center">
                  {loading ? 'PROCESSING...' : 'COMPLETE REGISTRATION'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}