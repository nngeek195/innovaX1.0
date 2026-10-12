'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

const UNIVERSITIES = [
  'University of Colombo (UOC)', 'University of Peradeniya (UOP)', 'University of Sri Jayewardenepura (USJ)',
  'University of Kelaniya (UOK)', 'University of Moratuwa (UOM)', 'University of Jaffna (UOJ)',
  'University of Ruhuna (UOR)', 'The Open University of Sri Lanka (OUSL)', 'Eastern University, Sri Lanka (EUSL)',
  'South Eastern University of Sri Lanka (SEUSL)', 'Rajarata University of Sri Lanka (RUSL)',
  'Sabaragamuwa University of Sri Lanka (SUSL)', 'Wayamba University of Sri Lanka (WUSL)',
  'Uva Wellassa University (UWU)', 'University of the Visual and Performing Arts (UVPA)',
  'Gampaha Wickramarachchi University of Indigenous Medicine (GWUIM)', 'University of Vavuniya (UOV)', 'Other',
];

const STEP_LABELS = ['Details', 'Credentials', 'Verify'];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="reg-page">
      <div className="fixed inset-0 w-full h-full z-[1] reg-grid pointer-events-none" />
      <div className="reg-vignette" />

      <Link
        href="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-gray-400 hover:text-[#00E5FF] transition-all duration-300 group"
      >
        <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Return Home
      </Link>

      <div className="relative z-10">{children}</div>

      <style jsx global>{`
        .reg-page {
          position: relative;
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% 0%, rgba(0, 229, 255, 0.08), transparent 50%),
            linear-gradient(180deg, #05080c 0%, #030406 100%);
        }

        .reg-vignette {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(3, 4, 6, 0.8) 100%);
        }

        .reg-grid {
          background-image:
            linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(ellipse 100% 100% at 50% 0%, black, transparent 80%);
        }
      `}</style>
    </div>
  );
}

function FieldInput({
  label,
  icon,
  hint,
  className = '',
  ...props
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-[10px] font-mono tracking-widest text-[#00E5FF]/80 uppercase flex items-center gap-1.5 h-[14px]">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          className={`w-full bg-black/40 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white focus:border-[#00E5FF]/60 focus:bg-[#00E5FF]/[0.02] outline-none transition-all duration-200 placeholder-white/20 h-[44px] ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {hint && <p className="text-[10px] font-mono text-[var(--mist)]/50 mt-0.5">{hint}</p>}
    </div>
  );
}

function FieldSelect({
  label,
  icon,
  children,
  className = '',
  ...props
}: {
  label: string;
  icon?: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-[10px] font-mono tracking-widest text-[#00E5FF]/80 uppercase flex items-center gap-1.5 h-[14px]">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          {...props}
          className="w-full bg-black/40 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white focus:border-[#00E5FF]/60 focus:bg-[#00E5FF]/[0.02] outline-none transition-all duration-200 appearance-none h-[44px] cursor-pointer"
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00E5FF]/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-md mb-8 text-sm font-medium animate-fade-in">
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export default function Register() {
  const router = useRouter();

  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [checkingSystem, setCheckingSystem] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [type, setType] = useState('team');
  const [teamName, setTeamName] = useState('');
  const [memberCount, setMemberCount] = useState(2);
  const [university, setUniversity] = useState(UNIVERSITIES[0]);
  const [otherUniversity, setOtherUniversity] = useState('');
  const [leader, setLeader] = useState({ firstName: '', lastName: '', idCard: '', phone: '' });
  const [members, setMembers] = useState([
    { firstName: '', lastName: '', idCard: '' },
    { firstName: '', lastName: '', idCard: '' },
  ]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ambassadorCode, setAmbassadorCode] = useState('');
  const [ambassadorLookup, setAmbassadorLookup] = useState<{ firstName: string; lastName: string; university: string } | null>(null);
  const [ambassadorLookupLoading, setAmbassadorLookupLoading] = useState(false);
  const [ambassadorNotFound, setAmbassadorNotFound] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [userOTP, setUserOTP] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setAmbassadorCode(ref);
  }, []);

  useEffect(() => {
    const code = ambassadorCode.trim();
    if (!code) {
      setAmbassadorLookup(null);
      setAmbassadorNotFound(false);
      setAmbassadorLookupLoading(false);
      return;
    }

    setAmbassadorLookupLoading(true);
    setAmbassadorLookup(null);
    setAmbassadorNotFound(false);

    const timer = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(db, 'ambassadors', code));
        if (snap.exists()) {
          const data = snap.data();
          setAmbassadorLookup({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            university: data.university || '',
          });
          setAmbassadorNotFound(false);
        } else {
          setAmbassadorLookup(null);
          setAmbassadorNotFound(true);
        }
      } catch {
        setAmbassadorLookup(null);
        setAmbassadorNotFound(false);
      } finally {
        setAmbassadorLookupLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [ambassadorCode]);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => setCheckingSystem(false), 5000);
    const unsub = onSnapshot(
      doc(db, 'settings', 'public'),
      (docSnap) => {
        if (docSnap.exists()) setSystemConfig(docSnap.data());
        clearTimeout(fallbackTimer);
        setCheckingSystem(false);
      },
      () => {
        clearTimeout(fallbackTimer);
        setCheckingSystem(false);
      }
    );
    return () => {
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 3) setTimeout(() => otpRefs.current[0]?.focus(), 150);
  }, [step]);

  const requestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: leader.firstName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUserOTP('');
      setStep(3);
      setCooldown(300);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const otpDoc = await getDoc(doc(db, 'otp_tracking', email));
      if (!otpDoc.exists() || otpDoc.data().otp !== userOTP) {
        throw new Error('Invalid or expired code.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      document.cookie = `innovax_session=${user.uid}; path=/; max-age=86400; SameSite=Strict; Secure`;

      const finalUniversity = university === 'Other' ? otherUniversity : university;
      const teammates = type === 'team' ? members.slice(0, memberCount - 1) : [];
      const trimmedCode = ambassadorCode.trim();

      await setDoc(doc(db, 'registrations', user.uid), {
        uid: user.uid,
        type,
        teamName: type === 'team' ? teamName : null,
        memberCount: type === 'team' ? memberCount : 1,
        university: finalUniversity,
        leader,
        teammates,
        email,
        createdAt: new Date().toISOString(),
        proposalUploaded: false,
        selectedForRound2: false,
        prototypeLink: '',
        isFinalist: false,
        ambassadorCode: trimmedCode || null,
      });

      if (trimmedCode) {
        try {
          const ambRef = doc(db, 'ambassadors', trimmedCode);
          const ambSnap = await getDoc(ambRef);
          if (ambSnap.exists()) {
            const currentCount = ambSnap.data().delegateCount || 0;
            await setDoc(ambRef, { delegateCount: currentCount + 1 }, { merge: true });
          }
        } catch { }
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const otpDigits = Array.from({ length: 6 }, (_, i) => userOTP[i] || '');

  const handleOtpChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setUserOTP((prev) => {
      const arr = prev.padEnd(6, ' ').split('');
      arr[idx] = digit || ' ';
      return arr.join('').replace(/\s+$/, '');
    });
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;
    setUserOTP(paste);
    const nextIdx = Math.min(paste.length, 5);
    otpRefs.current[nextIdx]?.focus();
  };

  if (checkingSystem) {
    return (
      <Shell>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-[#00E5FF] font-mono tracking-widest">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border border-[#00E5FF]/20" />
            <div className="absolute inset-0 rounded-full border border-transparent border-t-[#00E5FF] animate-spin" />
          </div>
          <span className="text-xs animate-pulse">ESTABLISHING SECURE CONNECTION...</span>
        </div>
      </Shell>
    );
  }

  if (systemConfig && !systemConfig.registrationOpen) {
    return (
      <Shell>
        <div className="min-h-screen flex flex-col justify-center items-center px-6">
          <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-red-500/20 shadow-2xl text-center py-12 px-10 rounded-xl">
            <div className="w-12 h-12 mx-auto mb-6 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-mono font-bold mb-3 tracking-wider text-red-500 uppercase">
              Gateway Sealed
            </h2>
            <p className="text-[var(--mist)] font-mono text-xs tracking-widest mb-8 leading-relaxed opacity-70">
              Registration for this sector is currently offline. Await further directives.
            </p>
            <Link href="/" className="btn-outline-cyan inline-block w-full py-3 rounded-md font-mono uppercase tracking-widest text-xs">
              Abort to Base
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="min-h-screen flex flex-col items-center pt-24 pb-20 px-4 md:px-6">
        
        {/* Header Section */}
        <div className={`flex flex-col items-center mb-10 reg-reveal ${mounted ? 'reg-reveal-in' : ''}`}>
          <div className="border border-[#00E5FF]/30 text-[#00E5FF] bg-[#00E5FF]/10 inline-block mb-4 text-[10px] font-mono tracking-widest uppercase px-3 py-1 rounded-sm">
            Agent Enrollment
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-[0.15em] uppercase text-white text-center">
            INNOVA<span className="text-[#00E5FF]">X</span> Reg
          </h1>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent mt-5" />
        </div>

        {/* Stepper */}
        <div className={`w-full max-w-lg flex items-center mb-10 px-4 reg-reveal ${mounted ? 'reg-reveal-in' : ''}`}>
          {STEP_LABELS.map((label, i) => {
            const idx = i + 1;
            const state = idx < step ? 'done' : idx === step ? 'current' : 'upcoming';
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div
                    className={`w-8 h-8 rounded-sm border flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${
                      state === 'done'
                        ? 'bg-[#00E5FF] border-[#00E5FF] text-black shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                        : state === 'current'
                        ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                        : 'border-white/15 text-gray-500 bg-black'
                    }`}
                  >
                    {state === 'done' ? '✓' : idx}
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase tracking-[0.2em] absolute -bottom-5 whitespace-nowrap ${
                      state === 'upcoming' ? 'text-gray-600' : 'text-gray-300'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length && (
                  <div className="flex-1 h-px mx-2 bg-white/10 relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-[#00E5FF] transition-all duration-500"
                      style={{ width: idx < step ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form Panel */}
        <div className={`w-full max-w-3xl bg-black/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl relative reg-reveal-delay ${mounted ? 'reg-reveal-in' : ''}`}>
          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-70" />
          
          <div className="p-6 md:p-10">
            {error && <ErrorBanner message={error} />}

            <form
              onSubmit={
                step === 1 ? (e) => { e.preventDefault(); setStep(2); }
                  : step === 2 ? requestOTP : verifyAndRegister
              }
              key={step}
              className="animate-step-fade"
            >
              {/* STEP 1: Details */}
              {step === 1 && (
                <div className="space-y-8">
                  
                  {/* Segmented Control */}
                  <div className="flex bg-white/5 border border-white/10 rounded-md p-1 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => setType('team')}
                      className={`flex-1 py-2 text-xs font-mono tracking-widest uppercase rounded-sm transition-all duration-200 ${
                        type === 'team' ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 shadow-inner' : 'text-gray-400 hover:text-white border border-transparent'
                      }`}
                    >
                      Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('individual')}
                      className={`flex-1 py-2 text-xs font-mono tracking-widest uppercase rounded-sm transition-all duration-200 ${
                        type === 'individual' ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 shadow-inner' : 'text-gray-400 hover:text-white border border-transparent'
                      }`}
                    >
                      Individual
                    </button>
                  </div>

                  <FieldSelect label="University" value={university} onChange={(e) => setUniversity(e.target.value)}>
                    {UNIVERSITIES.map((u) => (
                      <option key={u} value={u} className="bg-[#05080C] text-white">
                        {u}
                      </option>
                    ))}
                  </FieldSelect>

                  {university === 'Other' && (
                    <FieldInput
                      label="Your University"
                      type="text"
                      placeholder="Type your university name"
                      value={otherUniversity}
                      onChange={(e) => setOtherUniversity(e.target.value)}
                      required
                    />
                  )}

                  {type === 'team' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <FieldInput
                        label="Team Name"
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        required
                      />
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono tracking-widest text-[#00E5FF]/80 uppercase h-[14px]">
                          Team Size
                        </label>
                        <div className="flex gap-3 h-[44px]">
                          {[2, 3].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setMemberCount(n)}
                              className={`flex-1 border rounded-md text-sm font-medium transition-all duration-200 ${
                                memberCount === n
                                  ? 'bg-[#00E5FF]/10 border-[#00E5FF]/60 text-[#00E5FF]'
                                  : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'
                              }`}
                            >
                              {n} Members
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Leader Subcard */}
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-lg">
                    <h3 className="flex items-center gap-3 text-xs font-mono tracking-widest uppercase text-[#00E5FF] mb-6">
                      <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-[#00E5FF]/20 border border-[#00E5FF]/50 text-[10px]">L</span>
                      {type === 'team' ? 'Team Leader Details' : 'Agent Details'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FieldInput label="First Name" type="text" placeholder="Niranga" value={leader.firstName} onChange={(e) => setLeader({ ...leader, firstName: e.target.value })} required />
                      <FieldInput label="Last Name" type="text" placeholder="Nayanajith" value={leader.lastName} onChange={(e) => setLeader({ ...leader, lastName: e.target.value })} required />
                      <FieldInput label="ID Card Number (NIC)" type="text" placeholder="200012345678" value={leader.idCard} onChange={(e) => setLeader({ ...leader, idCard: e.target.value })} required />
                      <FieldInput label="WhatsApp Number" type="tel" placeholder="+94 7X XXX XXXX" value={leader.phone} onChange={(e) => setLeader({ ...leader, phone: e.target.value })} required />
                    </div>
                  </div>

                  {/* Teammates */}
                  {type === 'team' &&
                    Array.from({ length: memberCount - 1 }).map((_, index) => (
                      <div key={index} className="bg-black/30 border border-white/5 p-6 rounded-lg">
                        <h3 className="flex items-center gap-3 text-xs font-mono tracking-widest uppercase text-gray-400 mb-6">
                          <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-white/10 border border-white/20 text-[10px]">{index + 2}</span>
                          Teammate {index + 1}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FieldInput label="First Name" type="text" value={members[index].firstName} onChange={(e) => { const newM = [...members]; newM[index].firstName = e.target.value; setMembers(newM); }} required />
                          <FieldInput label="Last Name" type="text" value={members[index].lastName} onChange={(e) => { const newM = [...members]; newM[index].lastName = e.target.value; setMembers(newM); }} required />
                          <FieldInput label="ID Card (NIC)" type="text" value={members[index].idCard} onChange={(e) => { const newM = [...members]; newM[index].idCard = e.target.value; setMembers(newM); }} required />
                        </div>
                      </div>
                    ))}

                  {/* Ambassador Section */}
                  <div className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-lg">
                    <h3 className="flex items-center gap-3 text-xs font-mono tracking-widest uppercase text-purple-400 mb-6">
                      <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-purple-500/20 border border-purple-500/50 text-[10px]">🎖</span>
                      Ambassador Referral (Optional)
                    </h3>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono tracking-widest text-purple-300/70 uppercase">
                        Ambassador Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. InnovaX2026##"
                          value={ambassadorCode}
                          onChange={(e) => setAmbassadorCode(e.target.value)}
                          className={`w-full bg-black/40 border rounded-md px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-200 h-[44px] ${
                            ambassadorLookup ? 'border-green-500/50 focus:border-green-400' : ambassadorNotFound ? 'border-red-500/50 focus:border-red-400' : 'border-purple-500/30 focus:border-purple-400 focus:bg-purple-500/5'
                          }`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          {ambassadorLookupLoading && <svg className="animate-spin w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                          {!ambassadorLookupLoading && ambassadorLookup && <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                          {!ambassadorLookupLoading && ambassadorNotFound && <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>}
                        </div>
                      </div>
                      {!ambassadorCode && <p className="text-[10px] font-mono text-purple-300/40 mt-1">Leave blank if you were not referred.</p>}
                    </div>

                    {ambassadorLookup && (
                      <div className="mt-4 flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-md p-3">
                        <div>
                          <p className="text-[10px] font-mono text-green-400 tracking-wider uppercase mb-1">Found Ambassador</p>
                          <p className="text-sm font-semibold text-white">{ambassadorLookup.firstName} {ambassadorLookup.lastName}</p>
                        </div>
                        <button type="button" onClick={() => setAmbassadorCode('')} className="text-xs font-mono text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-500/30 rounded-sm bg-red-500/10 transition-colors">
                          CLEAR
                        </button>
                      </div>
                    )}

                    {ambassadorNotFound && (
                      <p className="mt-3 text-[11px] font-mono text-red-400 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        Invalid code. Please verify or clear the field.
                      </p>
                    )}
                  </div>

                  <button type="submit" className="w-full bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] hover:bg-[#00E5FF] hover:text-black font-mono font-bold tracking-widest text-xs uppercase py-3.5 rounded-md transition-all duration-300 flex items-center justify-center gap-3 mt-4">
                    Proceed to Credentials
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>
              )}

              {/* STEP 2: Credentials */}
              {step === 2 && (
                <div className="space-y-6 md:px-8 py-4">
                  <div className="text-center mb-8">
                    <h3 className="text-sm text-[#00E5FF] mb-2 font-mono font-bold tracking-widest uppercase">Set Access Credentials</h3>
                    <p className="text-xs text-[var(--mist)]/70">Establish your secure login for the portal.</p>
                  </div>

                  <FieldInput
                    label="Email Address"
                    type="email"
                    placeholder="agent@innovax.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div className="relative">
                    <FieldInput
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                      hint="Minimum 6 characters required."
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-[34px] text-gray-500 hover:text-[#00E5FF] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 border border-white/20 text-white/70 hover:bg-white/5 hover:text-white font-mono text-xs uppercase tracking-widest rounded-md py-3.5 transition-all"
                    >
                      Back
                    </button>
                    <button type="submit" disabled={loading} className="w-2/3 bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] hover:bg-[#00E5FF] hover:text-black font-mono font-bold tracking-widest text-xs uppercase py-3.5 rounded-md transition-all duration-300 flex items-center justify-center">
                      {loading ? (
                        <span className="flex items-center gap-3"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> TRANSMITTING...</span>
                      ) : (
                        'Verify Email'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Verify */}
              {step === 3 && (
                <div className="text-center md:px-8 py-4">
                  <div className="w-12 h-12 mx-auto mb-6 rounded-sm bg-[#00E5FF]/10 border border-[#00E5FF]/40 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm text-[#00E5FF] mb-2 font-mono font-bold tracking-widest uppercase">Authorization Code</h3>
                  <p className="text-xs text-[var(--mist)]/70 mb-8 leading-relaxed">
                    A 6-digit access token has been deployed to<br />
                    <strong className="text-white font-mono mt-1 inline-block">{email}</strong>
                  </p>

                  <div className="flex justify-center gap-2 sm:gap-3 mb-8" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-mono font-bold text-white bg-black/40 border border-white/20 rounded-md focus:border-[#00E5FF] focus:bg-[#00E5FF]/5 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] outline-none transition-all"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || userOTP.length < 6}
                    className="w-full bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] hover:bg-[#00E5FF] hover:text-black disabled:opacity-50 disabled:hover:bg-[#00E5FF]/10 disabled:hover:text-[#00E5FF] font-mono font-bold tracking-widest text-xs uppercase py-4 rounded-md transition-all duration-300 flex items-center justify-center"
                  >
                    {loading ? (
                      <span className="flex items-center gap-3"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> AUTHENTICATING...</span>
                    ) : (
                      'Finalize Registration'
                    )}
                  </button>

                  <div className="mt-8 pt-6 border-t border-white/10">
                    {cooldown > 0 ? (
                      <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">
                        Resend in {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                      </p>
                    ) : (
                      <button type="button" onClick={requestOTP} disabled={loading} className="text-xs font-mono tracking-widest uppercase text-[#00E5FF]/70 hover:text-[#00E5FF] transition-colors underline decoration-[#00E5FF]/30 underline-offset-4">
                        Resend Token
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        <p className={`text-[10px] md:text-xs text-[var(--mist)]/70 tracking-[0.15em] uppercase text-center mt-8 reg-reveal-delay ${mounted ? 'reg-reveal-in' : ''}`}>
          Already initialized?{' '}
          <Link href="/login" className="text-[#00E5FF] hover:text-white transition-colors font-bold ml-1">
            Access Portal
          </Link>
        </p>

        <div className={`text-center mt-12 reg-reveal-delay ${mounted ? 'reg-reveal-in' : ''}`}>
          <span className="font-mono text-[9px] tracking-[0.4em] text-white/30 uppercase">
            InnovaX 1.0 · IEEE CS SUSL
          </span>
        </div>
      </div>

      <style jsx>{`
        .reg-reveal,
        .reg-reveal-delay {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .reg-reveal-delay {
          transition-delay: 0.15s;
        }
        .reg-reveal-in {
          opacity: 1;
          transform: translateY(0);
        }
        
        .animate-step-fade {
          animation: stepFade 0.3s ease-out forwards;
        }
        
        @keyframes stepFade {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .reg-reveal, .reg-reveal-delay, .animate-step-fade {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </Shell>
  );
}