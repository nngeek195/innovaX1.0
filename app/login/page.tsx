'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  // Mount animation for the UI
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log("--- LOGIN INITIATED ---");

      // Check if the email exists in the system first
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();

      if (!checkData.exists) {
        setError('This email is not registered. Please register first.');
        setLoading(false);
        return;
      }

      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("Authenticated User ID:", user.uid);

      // Set a session cookie valid for 1 day
      document.cookie = `innovax_session=${user.uid}; path=/; max-age=86400; SameSite=Strict; Secure`;

      // 2. Security Check: Is this user an Admin?
      console.log("Checking Admin database...");
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (adminDoc.exists()) {
        console.log("Access Granted: Admin");
        router.push('/admin');
        return; // Stop execution here so they route cleanly to admin
      }

      // 3. Security Check: Is this user a valid registered team/individual?
      console.log("Checking Registrations database...");
      const userDoc = await getDoc(doc(db, "registrations", user.uid));
      if (userDoc.exists()) {
        console.log("Access Granted: User Dashboard");
        router.push('/dashboard');
        return; // Stop execution here so they route cleanly to dashboard
      }

      // 4. Rejection: They authenticated, but have no database records.
      console.warn("Access Denied: No database records found for this UID.");
      await signOut(auth);
      setError("Unauthorized. No InnovaX registration found for this account.");

    } catch (err: any) {
      console.error("LOGIN FAILED!", err);
      // Since we already verified the email exists, a failure here means wrong password
      setError("Wrong password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ===== FULL-PAGE VIDEO BACKGROUND ===== */}
      <div className="login-video-bg">
        <video
          src="/video_this_cyber_oql_fly_the.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="login-video"
        />
        <div className="login-video-overlay" />
      </div>

      {/* ===== CHART GRID OVERLAY ===== */}
      <div className="fixed inset-0 w-full h-full z-[1] chart-grid pointer-events-none" />

      {/* ===== GRADIENT VIGNETTE ===== */}
      <div className="login-vignette" />

      {/* ===== BACK TO HOME ===== */}
      <Link
        href="/"
        className="fixed top-5 left-5 z-50 flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-gray-400 hover:text-[#00E5FF] border border-white/10 hover:border-[#00E5FF]/40 bg-[#05080C]/70 backdrop-blur-sm px-4 py-2 rounded-lg transition-all duration-200 group"
      >
        <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </Link>

      {/* ===== MAIN CONTENT ===== */}
      <div className="login-content">
        
        {/* --- LEFT: Branding Panel --- */}
        <div className={`login-owl-panel ${mounted ? 'panel-visible' : ''}`}>
          <div className="owl-branding flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="badge-mono border-[#00E5FF]/40 text-[#00E5FF] bg-[#00E5FF]/[0.06] inline-block mb-4 text-[10px]">
              SECURITY PROTOCOL ENGAGED
            </div>
            <img 
              src="https://github.com/nngeek195/mywork/blob/b1/Pasted%20image.png?raw=true" 
              alt="InnovaX Logo" 
              className="w-full max-w-[280px] md:max-w-[320px] drop-shadow-[0_0_15px_rgba(0,229,255,0.3)] mt-2"
            />
          </div>
        </div>

        {/* --- RIGHT: Sign-In Form --- */}
        <div className={`login-form-panel ${mounted ? 'panel-visible' : ''}`}>
          <div className="login-form-card glass-panel border-[#00E5FF]/20 shadow-[0_0_40px_rgba(0,229,255,0.06)]">
            
            {/* Top accent line */}
            <div className="login-card-accent" />

            <h2 className="text-2xl md:text-3xl font-extrabold tracking-[0.12em] uppercase text-white mb-2 text-left">
              PORTAL <span className="text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">ACCESS</span>
            </h2>
            <p className="text-[var(--mist)] text-xs tracking-widest uppercase mb-8 text-left">
              AUTHENTICATE TO ACCESS THE COMMAND CENTER
            </p>

            {error && (
              <div className="login-error flex items-start gap-3 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6 text-sm">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              {/* Email Field */}
              <div className="login-field login-field-1">
                <label className="login-label">
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
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="login-input"
                  required
                  autoComplete="email"
                />
                <div className={`login-input-glow ${focusedField === 'email' ? 'glow-on' : ''}`} />
              </div>

              {/* Password Field */}
              <div className="login-field login-field-2">
                <label className="login-label">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="login-input pr-10"
                    required
                    autoComplete="current-password"
                  />
                  {/* Eye toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#00E5FF] transition-colors duration-200"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className={`login-input-glow ${focusedField === 'password' ? 'glow-on glow-secure' : ''}`} />
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end -mt-2 mb-2">
                <Link
                  href="/forgot-password"
                  className="text-[10px] font-mono tracking-[0.15em] uppercase text-gray-500 hover:text-[#00E5FF] transition-colors duration-200"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="login-submit btn-solid-cyan w-full justify-center"
              >
                {loading ? (
                  <span className="flex items-center gap-3 justify-center">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    AUTHENTICATING...
                  </span>
                ) : (
                  <span className="flex items-center gap-3 justify-center">
                    SIGN IN
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="login-footer mt-8">
              <div className="login-divider">
                <div className="login-divider-line" />
                <span className="login-divider-text">OR</span>
                <div className="login-divider-line" />
              </div>
              <p className="text-xs text-[var(--mist)] tracking-[0.2em] uppercase text-center mt-6">
                NO ACCOUNT?{' '}
                <Link
                  href="/register"
                  className="text-[#00E5FF] hover:text-white transition-colors duration-300 font-bold ml-2"
                >
                  REGISTER HERE
                </Link>
              </p>
            </div>
          </div>

          {/* Bottom attribution */}
          <div className="login-attribution text-center mt-6">
            <span className="font-mono text-[9px] tracking-[0.3em] text-[var(--mist)]/40 uppercase">
              InnovaX 1.0 · IEEE CS SUSL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
