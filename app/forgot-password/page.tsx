'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 'email' | 'otp' | 'reset' | 'success';

export default function ForgotPassword() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Email step
  const [email, setEmail] = useState('');

  // OTP step
  const [userOTP, setUserOTP] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Reset step
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs.current[0]?.focus(), 150);
  }, [step]);

  // --- Step 1: Submit email ---
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setStep('otp');
      setCooldown(120);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Resend OTP ---
  const resendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setUserOTP('');
      setCooldown(120);
      setSuccessMsg('A new code has been sent.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Verify OTP ---
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: userOTP }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setStep('reset');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Reset password ---
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: userOTP, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- OTP Input Handlers ---
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

  // --- Eye toggle icon ---
  const EyeIcon = ({ show, onClick }: { show: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#00E5FF] transition-colors"
      tabIndex={-1}
    >
      {show ? (
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
  );

  // --- Step label for visual indicator ---
  const stepLabels = ['Email', 'Verify', 'Reset'];
  const stepIndex = step === 'email' ? 1 : step === 'otp' ? 2 : step === 'reset' ? 3 : 3;

  return (
    <div className="forgot-page">
      {/* Grid overlay */}
      <div className="fixed inset-0 w-full h-full z-[1] forgot-grid pointer-events-none" />
      <div className="forgot-vignette" />

      {/* Back to login */}
      <Link
        href="/login"
        className="fixed top-5 left-5 z-50 flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-gray-400 hover:text-[#00E5FF] border border-white/10 hover:border-[#00E5FF]/40 bg-[#05080C]/70 backdrop-blur-sm px-4 py-2 rounded-lg transition-all duration-200 group"
      >
        <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Login
      </Link>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <div className={`flex flex-col items-center mb-10 forgot-reveal ${mounted ? 'forgot-reveal-in' : ''}`}>
          <div className="border border-[#FF6B35]/30 text-[#FF6B35] bg-[#FF6B35]/10 inline-block mb-4 text-[10px] font-mono tracking-widest uppercase px-3 py-1 rounded-sm">
            Password Recovery
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-[0.12em] uppercase text-white text-center">
            RESET <span className="text-[#FF6B35] drop-shadow-[0_0_8px_rgba(255,107,53,0.4)]">ACCESS</span>
          </h1>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#FF6B35]/50 to-transparent mt-5" />
        </div>

        {/* Stepper (hide on success) */}
        {step !== 'success' && (
          <div className={`w-full max-w-sm flex items-center mb-10 px-4 forgot-reveal ${mounted ? 'forgot-reveal-in' : ''}`}>
            {stepLabels.map((label, i) => {
              const idx = i + 1;
              const state = idx < stepIndex ? 'done' : idx === stepIndex ? 'current' : 'upcoming';
              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-3 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-sm border flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${
                        state === 'done'
                          ? 'bg-[#FF6B35] border-[#FF6B35] text-black shadow-[0_0_10px_rgba(255,107,53,0.3)]'
                          : state === 'current'
                          ? 'border-[#FF6B35] text-[#FF6B35] bg-[#FF6B35]/5 shadow-[0_0_8px_rgba(255,107,53,0.2)]'
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
                  {idx < stepLabels.length && (
                    <div className="flex-1 h-px mx-2 bg-white/10 relative">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#FF6B35] transition-all duration-500"
                        style={{ width: idx < stepIndex ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Form Card */}
        <div className={`w-full max-w-md bg-black/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl relative forgot-reveal-delay ${mounted ? 'forgot-reveal-in' : ''}`}>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B35] to-transparent opacity-70" />

          <div className="p-6 md:p-10">
            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-md mb-6 text-sm font-medium animate-fade-in">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success message (inline) */}
            {successMsg && step !== 'success' && (
              <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-md mb-6 text-sm font-medium">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {/* STEP: Email */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="animate-step-fade">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-sm bg-[#FF6B35]/10 border border-[#FF6B35]/40 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#FF6B35]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm text-[#FF6B35] mb-2 font-mono font-bold tracking-widest uppercase">Enter Your Email</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    We&apos;ll send a verification code to your registered email address.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-[10px] font-mono tracking-widest text-[#FF6B35]/80 uppercase flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    placeholder="agent@innovax.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white focus:border-[#FF6B35]/60 focus:bg-[#FF6B35]/[0.02] outline-none transition-all duration-200 placeholder-white/20 h-[44px]"
                    required
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF6B35]/10 border border-[#FF6B35]/50 text-[#FF6B35] hover:bg-[#FF6B35] hover:text-black disabled:opacity-50 font-mono font-bold tracking-widest text-xs uppercase py-3.5 rounded-md transition-all duration-300 flex items-center justify-center"
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      CHECKING...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      SEND RESET CODE
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* STEP: OTP */}
            {step === 'otp' && (
              <form onSubmit={handleOTPSubmit} className="animate-step-fade">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-sm bg-[#FF6B35]/10 border border-[#FF6B35]/40 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#FF6B35]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-sm text-[#FF6B35] mb-2 font-mono font-bold tracking-widest uppercase">Verify Identity</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    A 6-digit code has been sent to<br />
                    <strong className="text-white font-mono mt-1 inline-block">{email}</strong>
                  </p>
                </div>

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
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-mono font-bold text-white bg-black/40 border border-white/20 rounded-md focus:border-[#FF6B35] focus:bg-[#FF6B35]/5 focus:shadow-[0_0_10px_rgba(255,107,53,0.2)] outline-none transition-all"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || userOTP.length < 6}
                  className="w-full bg-[#FF6B35]/10 border border-[#FF6B35]/50 text-[#FF6B35] hover:bg-[#FF6B35] hover:text-black disabled:opacity-50 disabled:hover:bg-[#FF6B35]/10 disabled:hover:text-[#FF6B35] font-mono font-bold tracking-widest text-xs uppercase py-3.5 rounded-md transition-all duration-300 flex items-center justify-center"
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      VERIFYING...
                    </span>
                  ) : (
                    'VERIFY CODE'
                  )}
                </button>

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                  {cooldown > 0 ? (
                    <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">
                      Resend in {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={resendOTP}
                      disabled={loading}
                      className="text-xs font-mono tracking-widest uppercase text-[#FF6B35]/70 hover:text-[#FF6B35] transition-colors underline decoration-[#FF6B35]/30 underline-offset-4"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setUserOTP(''); }}
                  className="w-full mt-4 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-mono text-[10px] uppercase tracking-widest rounded-md py-2.5 transition-all"
                >
                  ← Change Email
                </button>
              </form>
            )}

            {/* STEP: New Password */}
            {step === 'reset' && (
              <form onSubmit={handleResetSubmit} className="animate-step-fade">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-sm bg-[#FF6B35]/10 border border-[#FF6B35]/40 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#FF6B35]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h3 className="text-sm text-[#FF6B35] mb-2 font-mono font-bold tracking-widest uppercase">Set New Password</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Create a strong new password for your account.
                  </p>
                </div>

                {/* New Password Field */}
                <div className="flex flex-col gap-2 mb-4">
                  <label className="text-[10px] font-mono tracking-widest text-[#FF6B35]/80 uppercase flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    NEW PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white focus:border-[#FF6B35]/60 focus:bg-[#FF6B35]/[0.02] outline-none transition-all duration-200 placeholder-white/20 h-[44px] pr-10"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <EyeIcon show={showNewPassword} onClick={() => setShowNewPassword(s => !s)} />
                  </div>
                  <p className="text-[10px] font-mono text-gray-500 mt-0.5">Minimum 6 characters required.</p>
                </div>

                {/* Confirm Password Field */}
                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-[10px] font-mono tracking-widest text-[#FF6B35]/80 uppercase flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    CONFIRM PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full bg-black/40 border rounded-md px-4 py-2.5 text-sm text-white focus:bg-[#FF6B35]/[0.02] outline-none transition-all duration-200 placeholder-white/20 h-[44px] pr-10 ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-500/50 focus:border-red-500'
                          : confirmPassword && confirmPassword === newPassword
                          ? 'border-green-500/50 focus:border-green-500'
                          : 'border-white/10 focus:border-[#FF6B35]/60'
                      }`}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <EyeIcon show={showConfirmPassword} onClick={() => setShowConfirmPassword(s => !s)} />
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[10px] font-mono text-red-400 flex items-center gap-1.5 mt-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Passwords do not match
                    </p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="text-[10px] font-mono text-green-400 flex items-center gap-1.5 mt-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="w-full bg-[#FF6B35]/10 border border-[#FF6B35]/50 text-[#FF6B35] hover:bg-[#FF6B35] hover:text-black disabled:opacity-50 disabled:hover:bg-[#FF6B35]/10 disabled:hover:text-[#FF6B35] font-mono font-bold tracking-widest text-xs uppercase py-3.5 rounded-md transition-all duration-300 flex items-center justify-center"
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      RESETTING...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      RESET PASSWORD
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* STEP: Success */}
            {step === 'success' && (
              <div className="text-center animate-step-fade py-4">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 border border-green-500/40 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg text-green-400 mb-2 font-mono font-bold tracking-widest uppercase">
                  Password Reset Complete
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-8">
                  Your password has been successfully updated.<br />
                  You can now sign in with your new credentials.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] hover:bg-[#00E5FF] hover:text-black font-mono font-bold tracking-widest text-xs uppercase py-3.5 rounded-md transition-all duration-300 flex items-center justify-center gap-3"
                >
                  GO TO LOGIN
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`text-center mt-10 forgot-reveal-delay ${mounted ? 'forgot-reveal-in' : ''}`}>
          <span className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase">
            InnovaX 1.0 · IEEE CS SUSL
          </span>
        </div>
      </div>

      <style jsx>{`
        .forgot-page {
          position: relative;
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 107, 53, 0.06), transparent 50%),
            linear-gradient(180deg, #05080c 0%, #030406 100%);
        }

        .forgot-vignette {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(3, 4, 6, 0.8) 100%);
        }

        .forgot-grid {
          background-image:
            linear-gradient(rgba(255, 107, 53, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 107, 53, 0.02) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(ellipse 100% 100% at 50% 0%, black, transparent 80%);
        }

        .forgot-reveal,
        .forgot-reveal-delay {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .forgot-reveal-delay {
          transition-delay: 0.15s;
        }
        .forgot-reveal-in {
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
          .forgot-reveal, .forgot-reveal-delay, .animate-step-fade {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
