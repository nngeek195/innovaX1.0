'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FieldInput, FieldSelect, ErrorBanner } from '@/app/components/FormFields';
import { HOST_UNIVERSITY, UNIVERSITIES } from '@/lib/universities';
import { JUDGE_TITLES, type JudgeCategory, type JudgeTitle } from '@/lib/judges';

const STEP_LABELS = ['Profile', 'Credentials', 'Verify'];
const REQUEST_TIMEOUT_MS = 60_000;

const friendlyError = (err: unknown) =>
  err instanceof DOMException && err.name === 'TimeoutError'
    ? 'The server is taking too long to respond. Please check your internet connection and try again.'
    : err instanceof Error ? err.message : 'Something went wrong.';
const OTHER_UNIVERSITIES = UNIVERSITIES.filter(u => u !== HOST_UNIVERSITY);

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function JudgeRegister() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Profile
  const [title, setTitle] = useState<JudgeTitle | ''>('');
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState<JudgeCategory | ''>('');
  const [university, setUniversity] = useState(HOST_UNIVERSITY);
  const [otherUniversity, setOtherUniversity] = useState('');
  const [company, setCompany] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');

  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 3) setTimeout(() => otpRefs.current[0]?.focus(), 150);
  }, [step]);

  const normalisedEmail = email.trim().toLowerCase();
  const isHost = category === 'lecturer' && university === HOST_UNIVERSITY;

  // ── Step 1 → 2 ───────────────────────────────────────────────────────────────
  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title) return setError('Please select your title (Mr. / Ms. / Dr. …).');
    if (!category) return setError('Please tell us whether you are a Lecturer or an Industry Expert.');
    if (category === 'lecturer' && university === 'Other' && !otherUniversity.trim()) {
      return setError('Please enter your university name.');
    }
    if (category === 'industry' && !company.trim()) return setError('Please enter your company / organization.');
    setStep(2);
  };

  // ── Step 2 → 3: send verification email ─────────────────────────────────────
  const requestOTP = async (e?: React.FormEvent, isResend = false) => {
    e?.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      // The email was already checked before the first code was sent.
      if (!isResend) {
        const check = await fetch('/api/auth/check-email', {
          method: 'POST',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalisedEmail }),
        }).then(r => r.json());
        if (check.exists) throw new Error('This email is already registered. Please sign in instead.');
      }

      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalisedEmail, name: `${title} ${fullName.trim()}`, audience: 'judge' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send the verification email.');
      setOtp('');
      setStep(3);
      setCooldown(300);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: verify + create account ─────────────────────────────────────────
  const verifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/judge/register', {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, fullName, category,
          university: category === 'lecturer' ? university : undefined,
          otherUniversity: category === 'lecturer' && university === 'Other' ? otherUniversity : undefined,
          company: category === 'industry' ? company : undefined,
          designation, phone,
          email: normalisedEmail, password, otp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      const cred = await signInWithEmailAndPassword(auth, normalisedEmail, password);
      document.cookie = `innovax_session=${cred.user.uid}; path=/; max-age=86400; SameSite=Strict; Secure`;
      router.push('/judge-dashboard?welcome=1');
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  };

  // ── OTP input helpers ───────────────────────────────────────────────────────
  const otpDigits = Array.from({ length: 6 }, (_, i) => otp[i] || '');
  const handleOtpChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setOtp(prev => {
      const arr = prev.padEnd(6, ' ').split('');
      arr[idx] = digit || ' ';
      return arr.join('').replace(/\s+$/, '');
    });
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;
    setOtp(paste);
    otpRefs.current[Math.min(paste.length, 5)]?.focus();
  };

  const primaryBtn = 'bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] hover:bg-[#00E5FF] hover:text-black disabled:opacity-50 disabled:hover:bg-[#00E5FF]/10 disabled:hover:text-[#00E5FF] font-mono font-bold tracking-widest text-xs uppercase py-3.5 rounded-md transition-all duration-300 flex items-center justify-center gap-3';
  const backBtn = 'border border-white/20 text-white/70 hover:bg-white/5 hover:text-white font-mono text-xs uppercase tracking-widest rounded-md py-3.5 transition-all';

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(0,229,255,0.08),transparent_50%),linear-gradient(180deg,#05080c_0%,#030406_100%)]">
      <Link
        href="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-gray-400 hover:text-[#00E5FF] transition-all duration-300 group"
      >
        <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Return Home
      </Link>

      <div className="relative z-10 min-h-screen flex flex-col items-center pt-24 pb-20 px-4 md:px-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="border border-[var(--gold)]/40 text-[var(--gold)] bg-[var(--gold)]/10 inline-block mb-4 text-[10px] font-mono tracking-widest uppercase px-3 py-1 rounded-sm">
            ⚖️ Judge Board Enrollment
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-[0.15em] uppercase text-white">
            INNOVA<span className="text-[#00E5FF]">X</span> Judges
          </h1>
          <p className="text-[var(--mist)]/70 text-xs md:text-sm mt-4 max-w-lg leading-relaxed">
            Join the expert panel evaluating the next generation of agentic AI innovators.
            Your registration will be reviewed by the organizing committee.
          </p>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent mt-5" />
        </div>

        {/* Stepper */}
        <div className="w-full max-w-lg flex items-center mb-10 px-4">
          {STEP_LABELS.map((label, i) => {
            const idx = i + 1;
            const state = idx < step ? 'done' : idx === step ? 'current' : 'upcoming';
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div className={`w-8 h-8 rounded-sm border flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${
                    state === 'done' ? 'bg-[#00E5FF] border-[#00E5FF] text-black'
                      : state === 'current' ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5'
                      : 'border-white/15 text-gray-500 bg-black'}`}>
                    {state === 'done' ? '✓' : idx}
                  </div>
                  <span className={`text-[9px] font-mono uppercase tracking-[0.2em] absolute -bottom-5 whitespace-nowrap ${state === 'upcoming' ? 'text-gray-600' : 'text-gray-300'}`}>
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length && (
                  <div className="flex-1 h-px mx-2 bg-white/10 relative">
                    <div className="absolute inset-y-0 left-0 bg-[#00E5FF] transition-all duration-500" style={{ width: idx < step ? '100%' : '0%' }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form card */}
        <div className="w-full max-w-3xl bg-black/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-70" />
          <div className="p-6 md:p-10">
            {error && <ErrorBanner message={error} />}

            {/* ── STEP 1: Profile ── */}
            {step === 1 && (
              <form onSubmit={submitProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6">
                  <FieldSelect label="Title" value={title} onChange={e => setTitle(e.target.value as JudgeTitle)} required>
                    <option value="" disabled className="bg-[#05080C]">Select</option>
                    {JUDGE_TITLES.map(t => <option key={t} value={t} className="bg-[#05080C] text-white">{t}</option>)}
                  </FieldSelect>
                  <FieldInput label="Full Name" type="text" placeholder="e.g. Nimal Perera" value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-mono tracking-widest text-[#00E5FF]/80 uppercase">I am joining as</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {([
                      { value: 'lecturer', icon: '🎓', label: 'Lecturer / Academic', desc: 'Faculty member of a university' },
                      { value: 'industry', icon: '💼', label: 'Industry Expert', desc: 'Professional from industry' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCategory(opt.value)}
                        aria-pressed={category === opt.value}
                        className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                          category === opt.value
                            ? 'border-[#00E5FF]/70 bg-[#00E5FF]/10 shadow-[0_0_20px_rgba(0,229,255,0.12)]'
                            : 'border-white/10 bg-black/30 hover:border-white/30'}`}
                      >
                        <div className="text-2xl mb-2">{opt.icon}</div>
                        <p className={`font-mono text-xs font-bold tracking-widest uppercase ${category === opt.value ? 'text-[#00E5FF]' : 'text-white'}`}>{opt.label}</p>
                        <p className="text-[11px] text-gray-500 mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lecturer → university (SUSL featured) */}
                {category === 'lecturer' && (
                  <div className="space-y-4 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setUniversity(HOST_UNIVERSITY)}
                      aria-pressed={isHost}
                      className={`w-full text-left p-5 rounded-lg border transition-all duration-300 relative overflow-hidden ${
                        isHost
                          ? 'border-[var(--gold)]/70 bg-gradient-to-r from-[var(--gold)]/15 to-[#00E5FF]/5 shadow-[0_0_30px_rgba(255,215,0,0.12)]'
                          : 'border-[var(--gold)]/25 bg-[var(--gold)]/[0.03] hover:border-[var(--gold)]/50'}`}
                    >
                      <span className="absolute top-3 right-3 text-[9px] font-mono tracking-widest uppercase text-[var(--gold)] border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-2 py-0.5 rounded-sm">
                        ★ Host University
                      </span>
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isHost ? 'border-[var(--gold)]' : 'border-white/30'}`}>
                          {isHost && <div className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" />}
                        </div>
                        <div className="pr-24">
                          <p className="text-white font-bold text-sm md:text-base">Sabaragamuwa University of Sri Lanka</p>
                          <p className="text-[11px] text-gray-400 mt-1">Belihuloya · Home of InnovaX &amp; the IEEE CS SUSL Chapter</p>
                        </div>
                      </div>
                    </button>

                    <FieldSelect
                      label={isHost ? 'Or select a different university' : 'University'}
                      value={isHost ? '' : university}
                      onChange={e => setUniversity(e.target.value || HOST_UNIVERSITY)}
                    >
                      <option value="" className="bg-[#05080C] text-gray-400">— Another university —</option>
                      {OTHER_UNIVERSITIES.map(u => <option key={u} value={u} className="bg-[#05080C] text-white">{u}</option>)}
                    </FieldSelect>

                    {university === 'Other' && (
                      <FieldInput label="Your University" type="text" placeholder="Type your university name" value={otherUniversity} onChange={e => setOtherUniversity(e.target.value)} required />
                    )}
                  </div>
                )}

                {/* Industry → company */}
                {category === 'industry' && (
                  <div className="animate-fade-in">
                    <FieldInput label="Company / Organization" type="text" placeholder="e.g. WSO2, IFS, 99x" value={company} onChange={e => setCompany(e.target.value)} required />
                  </div>
                )}

                {category && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <FieldInput
                      label="Designation (optional)"
                      type="text"
                      placeholder={category === 'lecturer' ? 'e.g. Senior Lecturer' : 'e.g. Senior Software Architect'}
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                    />
                    <FieldInput label="Contact Number (optional)" type="tel" placeholder="+94 7X XXX XXXX" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                )}

                <button type="submit" className={`w-full ${primaryBtn}`}>
                  Proceed to Credentials
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </form>
            )}

            {/* ── STEP 2: Credentials ── */}
            {step === 2 && (
              <form onSubmit={requestOTP} className="space-y-6 md:px-8 py-4">
                <div className="text-center mb-8">
                  <h3 className="text-sm text-[#00E5FF] mb-2 font-mono font-bold tracking-widest uppercase">Set Access Credentials</h3>
                  <p className="text-xs text-[var(--mist)]/70">We&apos;ll send a verification code to this email address.</p>
                </div>
                <FieldInput label="Email Address" type="email" placeholder="you@university.ac.lk" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                <div className="relative">
                  <FieldInput
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
                    hint="Minimum 6 characters required."
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3.5 top-[34px] text-gray-500 hover:text-[#00E5FF] transition-colors text-[10px] font-mono uppercase" tabIndex={-1}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <FieldInput
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => { setError(''); setStep(1); }} className={`w-1/3 ${backBtn}`}>Back</button>
                  <button type="submit" disabled={loading} className={`w-2/3 ${primaryBtn}`}>
                    {loading ? <><Spinner /> Sending code…</> : 'Verify Email'}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: Verify ── */}
            {step === 3 && (
              <form onSubmit={verifyAndRegister} className="text-center md:px-8 py-4">
                <h3 className="text-sm text-[#00E5FF] mb-2 font-mono font-bold tracking-widest uppercase">Verify Your Email</h3>
                <p className="text-xs text-[var(--mist)]/70 mb-8 leading-relaxed">
                  A 6-digit verification code has been sent to<br />
                  <strong className="text-white font-mono mt-1 inline-block">{normalisedEmail}</strong>
                </p>
                <div className="flex justify-center gap-2 sm:gap-3 mb-8" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Digit ${i + 1}`}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-mono font-bold text-white bg-black/40 border border-white/20 rounded-md focus:border-[#00E5FF] focus:bg-[#00E5FF]/5 outline-none transition-all"
                    />
                  ))}
                </div>
                <button type="submit" disabled={loading || otp.length < 6} className={`w-full ${primaryBtn} py-4`}>
                  {loading ? <><Spinner /> Creating your judge account…</> : 'Complete Registration'}
                </button>
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                  <button type="button" onClick={() => { setError(''); setStep(2); }} className="text-xs font-mono tracking-widest uppercase text-gray-500 hover:text-white">
                    ← Change email
                  </button>
                  {cooldown > 0 ? (
                    <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">
                      Resend in {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                    </p>
                  ) : (
                    <button type="button" onClick={() => requestOTP(undefined, true)} disabled={loading} className="text-xs font-mono tracking-widest uppercase text-[#00E5FF]/70 hover:text-[#00E5FF] underline underline-offset-4">
                      Resend code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="text-[10px] md:text-xs text-[var(--mist)]/70 tracking-[0.15em] uppercase text-center mt-8">
          Already registered as a judge?{' '}
          <Link href="/login" className="text-[#00E5FF] hover:text-white transition-colors font-bold ml-1">Sign in</Link>
        </p>
        <div className="text-center mt-12">
          <span className="font-mono text-[9px] tracking-[0.4em] text-white/30 uppercase">InnovaX 1.0 · IEEE CS SUSL</span>
        </div>
      </div>
    </div>
  );
}
