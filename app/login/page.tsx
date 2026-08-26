'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { auth } from '@/lib/firebase';
// import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Main Login Component                                               */
/* ------------------------------------------------------------------ */

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeField, setActiveField] = useState<'idle' | 'email' | 'password'>('idle');

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Invalid credentials or account does not exist.');
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

      {/* ===== MAIN CONTENT ===== */}
      <div className="login-content">
        
        {/* --- LEFT: Logo Panel --- */}
        <div className={`login-owl-panel ${mounted ? 'panel-visible' : ''} flex flex-col justify-center items-center`}>
          <div className="flex flex-col items-center justify-center w-full flex-1">
            <div className="relative group">
              {/* Background glowing rings for the logo */}
              <div className="absolute inset-0 bg-[#00E5FF]/15 blur-[80px] rounded-[100%] scale-[1.2] group-hover:scale-[1.4] transition-transform duration-700 pointer-events-none" />
              
              <img 
                src="/innovax-logo.png" 
                alt="InnovaX 1.0 Logo" 
                className="w-72 md:w-96 h-auto object-contain relative z-10 drop-shadow-[0_0_20px_rgba(0,229,255,0.6)] animate-pulse"
                style={{ animationDuration: '4s' }}
              />
            </div>
            
            {/* --- NEW COMPETITOR TEXT --- */}
            <div className="mt-12 text-center relative z-10 flex flex-col items-center gap-3">
              <div className="badge-mono border-[#00E5FF]/40 text-[#00E5FF] bg-[#00E5FF]/[0.06] inline-block px-3 py-1 text-[10px] tracking-widest uppercase">
                COMPETITION ARENA
              </div>
              <h2 className="text-xl md:text-2xl font-light tracking-[0.25em] text-white uppercase mt-1">
                Competitor <span className="text-[#00E5FF] font-bold">Portal</span>
              </h2>
              <p className="text-[var(--mist)]/60 text-[10px] tracking-[0.15em] uppercase max-w-[320px] leading-relaxed">
                Step into the arena. The ultimate AI hackathon by IEEE CS SUSL awaits.
              </p>
            </div>
          </div>
        </div>

        {/* --- RIGHT: Sign-In Form --- */}
        <div className={`login-form-panel ${mounted ? 'panel-visible' : ''}`}>
          <div className="login-form-card glass-panel border-[#00E5FF]/20 shadow-[0_0_40px_rgba(0,229,255,0.06)]">
            
            {/* Top accent line */}
            <div className="login-card-accent" />

            <h2 className="text-2xl md:text-3xl font-extrabold tracking-[0.12em] uppercase text-white mb-2 text-left">
              SIGN <span className="text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">IN</span>
            </h2>
            <p className="text-[var(--mist)] text-xs tracking-widest uppercase mb-8 text-left">
              AUTHENTICATE TO ACCESS YOUR WORKSPACE
            </p>

            {error && (
              <div className="login-error">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              {/* Email Field */}
              <div className="login-field login-field-1">
                <label className="login-label">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  placeholder="innovax@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setActiveField('email')}
                  onBlur={() => setActiveField('idle')}
                  className="login-input"
                  required
                  autoComplete="email"
                />
                <div className={`login-input-glow ${activeField === 'email' ? 'glow-on' : ''}`} />
              </div>

              {/* Password Field */}
              <div className="login-field login-field-2">
                <label className="login-label">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  PASSWORD
                </label>
                <input
                  type="password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setActiveField('password')}
                  onBlur={() => setActiveField('idle')}
                  className="login-input"
                  required
                  autoComplete="current-password"
                />
                <div className={`login-input-glow ${activeField === 'password' ? 'glow-on glow-secure' : ''}`} />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="login-submit btn-solid-cyan"
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
                    INITIATE SESSION
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="login-footer">
              <div className="login-divider">
                <div className="login-divider-line" />
                <span className="login-divider-text">OR</span>
                <div className="login-divider-line" />
              </div>
              <p className="text-xs text-gray-500 tracking-[0.2em] uppercase">
                NO ACCOUNT?{' '}
                <Link
                  href="/register"
                  className="text-[#00E5FF] hover:text-white transition-colors duration-300 font-bold"
                >
                  REGISTER HERE
                </Link>
              </p>
            </div>
          </div>

          {/* Bottom attribution */}
          <div className="login-attribution">
            <span className="font-mono text-[9px] tracking-[0.3em] text-[var(--mist)]/40 uppercase">
              InnovaX 1.0 · IEEE CS SUSL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}