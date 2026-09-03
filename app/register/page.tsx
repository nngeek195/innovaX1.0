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

// Defined at module scope (not inside Register) so React never remounts it on
// re-render — otherwise the <video> would restart/freeze on every keystroke.
// Structured to match the login page's video background 1:1 (plain autoplay
// video, no JS-driven fade), since that version is confirmed glitch-free.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="reg-page">
      {/* Background video removed — clean, stable static background */}
      <div className="fixed inset-0 w-full h-full z-[1] reg-grid pointer-events-none" />
      <div className="reg-vignette" />

      <div className="relative z-10">{children}</div>

      <style jsx global>{`
        .reg-page {
          position: relative;
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% -10%, rgba(0, 229, 255, 0.12), transparent 42%),
            linear-gradient(180deg, #071018 0%, #05080c 55%, #030507 100%);
        }

        .reg-vignette {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(
            ellipse 80% 60% at 50% 0%,
            transparent 0%,
            rgba(5, 8, 12, 0.35) 100%
          );
        }

        .reg-grid {
          background-image:
            linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(
            ellipse 80% 60% at 50% 0%,
            black,
            transparent 70%
          );
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Small reusable field components (self-contained focus glow, matches the
// login page's input treatment)
// ============================================================================

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
  const [focused, setFocused] = useState(false);
  return (
    <div className={`reg-field ${className}`}>
      <label className="reg-label">
        {icon}
        {label}
      </label>
      <input
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        className="reg-input"
      />
      <div className={`reg-input-glow ${focused ? 'glow-on' : ''}`} />
      {hint && <p className="text-[10px] font-mono text-[var(--mist)]/60 mt-1.5">{hint}</p>}
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
  const [focused, setFocused] = useState(false);
  return (
    <div className={`reg-field ${className}`}>
      <label className="reg-label">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className="reg-input reg-select"
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#00E5FF]/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div className={`reg-input-glow ${focused ? 'glow-on' : ''}`} />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6 text-sm animate-fade-in">
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

// ============================================================================
// Register
// ============================================================================

export default function Register() {
  const router = useRouter();

  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [checkingSystem, setCheckingSystem] = useState(true);
  const [mounted, setMounted] = useState(false);

  // 1 = Details, 2 = Email/Password, 3 = OTP Verification
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
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
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [userOTP, setUserOTP] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setCheckingSystem(false);
    }, 5000);

    const unsub = onSnapshot(
      doc(db, 'settings', 'public'),
      (docSnap) => {
        if (docSnap.exists()) setSystemConfig(docSnap.data());
        clearTimeout(fallbackTimer);
        setCheckingSystem(false);
      },
      () => {
        clearTimeout(fallbackTimer);
        // Keep the page usable even when the settings document is temporarily unavailable.
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
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- OTP box handlers ---
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
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[#00E5FF] font-mono tracking-widest">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-[#00E5FF]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00E5FF] animate-spin" />
          </div>
          <span className="text-xs animate-pulse">VERIFYING SYSTEM STATUS...</span>
        </div>
      </Shell>
    );
  }

  if (systemConfig && !systemConfig.registrationOpen) {
    return (
      <Shell>
        <div className="min-h-screen flex flex-col justify-center items-center px-6">
          <div className="w-full max-w-md glass-panel border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.06)] text-center py-12 px-8">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 tracking-wider text-red-400">
              Registration Closed
            </h2>
            <p className="text-[var(--mist)] font-mono text-sm tracking-widest mb-8 leading-relaxed">
              The gateway is currently sealed. Keep an eye on our announcements for when the portal opens.
            </p>
            <Link href="/" className="btn-outline-cyan inline-block">
              Return to base
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="min-h-screen flex flex-col items-center pt-20 md:pt-24 pb-16 px-4 md:px-6">
        {/* Branding */}
        <div className={`flex flex-col items-center mb-8 reg-reveal ${mounted ? 'reg-reveal-in' : ''}`}>
          <div className="badge-mono border-[#00E5FF]/40 text-[#00E5FF] bg-[#00E5FF]/[0.06] inline-block mb-5 text-[10px]">
            New Agent Enrollment
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black tracking-[0.1em] uppercase text-white text-center">
            INNOVA<span className="text-[#00E5FF] drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]">X</span> Registration
          </h1>
          <p className="text-[var(--mist)] text-xs tracking-[0.25em] uppercase mt-2">Command Center Enrollment</p>
        </div>

        {/* Stepper */}
        <div className={`w-full max-w-xl flex items-center mb-8 px-2 reg-reveal ${mounted ? 'reg-reveal-in' : ''}`}>
          {STEP_LABELS.map((label, i) => {
            const idx = i + 1;
            const state = idx < step ? 'done' : idx === step ? 'current' : 'upcoming';
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-2 relative">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${
                      state === 'done'
                        ? 'bg-[#00E5FF] border-[#00E5FF] text-[#05080C]'
                        : state === 'current'
                        ? 'border-[#00E5FF] text-[#00E5FF] step-pulse'
                        : 'border-white/15 text-gray-600'
                    }`}
                  >
                    {state === 'done' ? '✓' : idx}
                  </div>
                  <span
                    className={`text-[9px] md:text-[10px] font-mono uppercase tracking-widest absolute -bottom-5 whitespace-nowrap ${
                      state === 'upcoming' ? 'text-gray-600' : 'text-gray-300'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length && (
                  <div className="flex-1 h-px mx-2 bg-white/10 relative overflow-hidden">
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

        {/* Card */}
        <div className={`w-full max-w-2xl glass-panel relative border-[#00E5FF]/20 shadow-[0_0_40px_rgba(0,229,255,0.06)] reg-reveal-delay ${mounted ? 'reg-reveal-in' : ''}`}>
          <div className="reg-card-accent" />
          <div className="p-6 md:p-10">
            {error && <ErrorBanner message={error} />}

            <form
              onSubmit={
                step === 1
                  ? (e) => {
                      e.preventDefault();
                      setStep(2);
                    }
                  : step === 2
                  ? requestOTP
                  : verifyAndRegister
              }
              key={step}
              className="step-transition"
            >
              {/* STEP 1: Details */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Team / Individual segmented toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setType('team')}
                      className={`reg-toggle ${type === 'team' ? 'reg-toggle-active' : ''}`}
                    >
                      <span className="text-lg">👥</span>
                      <span>Team</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('individual')}
                      className={`reg-toggle ${type === 'individual' ? 'reg-toggle-active' : ''}`}
                    >
                      <span className="text-lg">🧑</span>
                      <span>Individual</span>
                    </button>
                  </div>

                  <FieldSelect
                    label="University"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                  >
                    {UNIVERSITIES.map((u) => (
                      <option key={u} value={u} className="bg-[#05080C]">
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
                      className="animate-fade-in"
                    />
                  )}

                  {type === 'team' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FieldInput
                        label="Team Name"
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        required
                      />
                      <div className="reg-field">
                        <label className="reg-label">Team Size</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[2, 3].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setMemberCount(n)}
                              className={`reg-pill ${memberCount === n ? 'reg-pill-active' : ''}`}
                            >
                              {n} members
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="reg-subcard">
                    <h3 className="reg-subcard-title">
                      <span className="reg-avatar">L</span>
                      {type === 'team' ? 'Team Leader Details' : 'Your Details'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FieldInput
                        label="First Name"
                        type="text"
                        placeholder="Amara"
                        value={leader.firstName}
                        onChange={(e) => setLeader({ ...leader, firstName: e.target.value })}
                        required
                      />
                      <FieldInput
                        label="Last Name"
                        type="text"
                        placeholder="Perera"
                        value={leader.lastName}
                        onChange={(e) => setLeader({ ...leader, lastName: e.target.value })}
                        required
                      />
                      <FieldInput
                        label="ID Card Number (NIC)"
                        type="text"
                        placeholder="200012345678"
                        value={leader.idCard}
                        onChange={(e) => setLeader({ ...leader, idCard: e.target.value })}
                        required
                      />
                      <FieldInput
                        label="WhatsApp Number"
                        type="tel"
                        placeholder="+94 7X XXX XXXX"
                        value={leader.phone}
                        onChange={(e) => setLeader({ ...leader, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {type === 'team' &&
                    Array.from({ length: memberCount - 1 }).map((_, index) => (
                      <div key={index} className="reg-subcard">
                        <h3 className="reg-subcard-title reg-subcard-title-muted">
                          <span className="reg-avatar reg-avatar-muted">{index + 2}</span>
                          Teammate {index + 1}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <FieldInput
                            label="First Name"
                            type="text"
                            value={members[index].firstName}
                            onChange={(e) => {
                              const newM = [...members];
                              newM[index].firstName = e.target.value;
                              setMembers(newM);
                            }}
                            required
                          />
                          <FieldInput
                            label="Last Name"
                            type="text"
                            value={members[index].lastName}
                            onChange={(e) => {
                              const newM = [...members];
                              newM[index].lastName = e.target.value;
                              setMembers(newM);
                            }}
                            required
                          />
                          <FieldInput
                            label="ID Card (NIC)"
                            type="text"
                            value={members[index].idCard}
                            onChange={(e) => {
                              const newM = [...members];
                              newM[index].idCard = e.target.value;
                              setMembers(newM);
                            }}
                            required
                          />
                        </div>
                      </div>
                    ))}

                  <button type="submit" className="btn-solid-cyan w-full justify-center mt-2">
                    <span className="flex items-center gap-3 justify-center">
                      Continue to Credentials
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </div>
              )}

              {/* STEP 2: Credentials */}
              {step === 2 && (
                <div className="space-y-5">
                  <h3 className="text-sm text-[#00E5FF] mb-2 font-bold tracking-widest text-center uppercase">
                    Create Portal Account
                  </h3>
                  <p className="text-xs text-[var(--mist)] text-center mb-6">
                    This becomes your login for the InnovaX dashboard.
                  </p>

                  <FieldInput
                    label="Email Address"
                    icon={
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    }
                    type="email"
                    placeholder="agent@innovax.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />

                  <div className="relative">
                    <FieldInput
                      label="Password"
                      icon={
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      }
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                      autoComplete="new-password"
                      hint="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-[38px] text-gray-500 hover:text-[#00E5FF] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn-outline-cyan w-1/3 justify-center"
                    >
                      Back
                    </button>
                    <button type="submit" disabled={loading} className="btn-solid-cyan w-2/3 justify-center">
                      {loading ? (
                        <span className="flex items-center gap-3 justify-center">
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending code...
                        </span>
                      ) : (
                        'Verify Email'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: OTP Verification */}
              {step === 3 && (
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm text-[#00E5FF] mb-2 font-bold tracking-widest uppercase">
                    Enter Access Code
                  </h3>
                  <p className="text-xs text-[var(--mist)] mb-7">
                    A 6-digit code has been sent to
                    <br />
                    <strong className="text-white">{email}</strong>
                  </p>

                  <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="reg-otp-box"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || userOTP.length < 6}
                    className="w-full btn-solid-cyan justify-center"
                  >
                    {loading ? (
                      <span className="flex items-center gap-3 justify-center">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      'Finalize Registration'
                    )}
                  </button>

                  <div className="mt-7 pt-6 border-t border-white/10">
                    {cooldown > 0 ? (
                      <p className="text-xs text-gray-500 font-mono">
                        Resend code available in {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={requestOTP}
                        disabled={loading}
                        className="text-xs text-[#00E5FF] hover:text-white transition-colors underline decoration-[#00E5FF]/30 underline-offset-4"
                      >
                        Resend access code
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        <p className={`text-xs text-[var(--mist)] tracking-[0.15em] uppercase text-center mt-8 reg-reveal-delay ${mounted ? 'reg-reveal-in' : ''}`}>
          Already registered?{' '}
          <Link href="/login" className="text-[#00E5FF] hover:text-white transition-colors font-bold ml-1">
            Sign in
          </Link>
        </p>

        <div className={`text-center mt-6 reg-reveal-delay ${mounted ? 'reg-reveal-in' : ''}`}>
          <span className="font-mono text-[9px] tracking-[0.3em] text-[var(--mist)]/40 uppercase">
            InnovaX 1.0 · IEEE CS SUSL
          </span>
        </div>
      </div>

      <style jsx>{`
        .reg-reveal,
        .reg-reveal-delay {
          opacity: 0;
          transform: translateY(-8px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .reg-reveal-delay {
          transition-delay: 0.15s;
        }
        .reg-reveal-in {
          opacity: 1;
          transform: translateY(0);
        }

        .step-transition {
          animation: stepFade 0.3s ease-out both;
        }
        @keyframes stepFade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .step-pulse {
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

        .glass-panel {
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          background: rgba(8, 14, 20, 0.78);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
        }

        .reg-card-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00e5ff, transparent);
        }

        .reg-field {
          position: relative;
          text-align: left;
        }
        .reg-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(0, 229, 255, 0.75);
          margin-bottom: 0.5rem;
          font-family: var(--font-mono, monospace);
        }
        .reg-input {
          width: 100%;
          background: rgba(18, 24, 34, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0.75rem 0.9rem;
          color: white;
          font-size: 0.875rem;
          transition: border-color 0.25s ease;
        }
        .reg-input:focus {
          outline: none;
          border-color: #00e5ff;
        }
        .reg-select {
          appearance: none;
          padding-right: 2.25rem;
          cursor: pointer;
        }
        .reg-input-glow {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 1px;
          width: 0%;
          background: #00e5ff;
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
          transition: width 0.3s ease;
        }
        .reg-input-glow.glow-on {
          width: 100%;
        }

        .reg-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.85rem;
          border-radius: 0.6rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #9ca3af;
          font-weight: 700;
          letter-spacing: 0.1em;
          font-size: 0.8rem;
          text-transform: uppercase;
          transition: all 0.2s ease;
          background: rgba(18, 24, 34, 0.3);
        }
        .reg-toggle-active {
          background: rgba(0, 229, 255, 0.12);
          border-color: #00e5ff;
          color: #00e5ff;
          box-shadow: 0 0 16px rgba(0, 229, 255, 0.12);
        }

        .reg-pill {
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #9ca3af;
          font-size: 0.75rem;
          font-family: var(--font-mono, monospace);
          background: rgba(18, 24, 34, 0.3);
          transition: all 0.2s ease;
        }
        .reg-pill-active {
          background: rgba(0, 229, 255, 0.12);
          border-color: #00e5ff;
          color: #00e5ff;
        }

        .reg-subcard {
          padding: 1.25rem;
          border: 1px solid #121822;
          border-radius: 0.75rem;
          background: rgba(5, 8, 12, 0.5);
        }
        .reg-subcard-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.8rem;
          color: #00e5ff;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 1.1rem;
        }
        .reg-subcard-title-muted {
          color: #9ca3af;
        }
        .reg-avatar {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          background: rgba(0, 229, 255, 0.15);
          border: 1px solid rgba(0, 229, 255, 0.4);
          color: #00e5ff;
        }
        .reg-avatar-muted {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          color: #9ca3af;
        }

        .reg-otp-box {
          width: 2.75rem;
          height: 3.25rem;
          text-align: center;
          font-size: 1.4rem;
          font-family: var(--font-mono, monospace);
          color: #00e5ff;
          background: rgba(18, 24, 34, 0.5);
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 0.6rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .reg-otp-box:focus {
          outline: none;
          border-color: #00e5ff;
          box-shadow: 0 0 12px rgba(0, 229, 255, 0.35);
        }

        @media (prefers-reduced-motion: reduce) {
          .reg-reveal,
          .reg-reveal-delay,
          .step-transition,
          .step-pulse {
            animation: none !important;
          }
        }
      `}</style>
    </Shell>
  );
}