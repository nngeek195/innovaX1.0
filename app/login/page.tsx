'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Set a session cookie valid for 1 day
      document.cookie = `innovax_session=${user.uid}; path=/; max-age=86400; SameSite=Strict; Secure`;

      // 2. Security Check: Is this user an Admin?
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (adminDoc.exists()) {
        router.push('/admin');
        return; // Stop execution here so they route cleanly to admin
      }

      // 3. Security Check: Is this user a valid registered team/individual?
      const userDoc = await getDoc(doc(db, "registrations", user.uid));
      if (userDoc.exists()) {
        router.push('/dashboard');
        return; // Stop execution here so they route cleanly to dashboard
      }

      // 4. Rejection: They authenticated, but have no database records.
      await signOut(auth);
      setError("Unauthorized. No InnovaX registration found for this account.");

    } catch (err: any) {
      setError("Invalid credentials or account does not exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080C] text-white flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-md glass-panel relative z-10 border-[#00E5FF]/20 shadow-[0_0_30px_rgba(0,229,255,0.05)]">
        <h2 className="text-3xl font-display font-bold text-center mb-8 tracking-wider">
          PORTAL <span className="text-[#00E5FF]">ACCESS</span>
        </h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full bg-[#121822]/50 border border-white/10 rounded-lg p-4 text-white focus:border-[#00E5FF] focus:outline-none transition-colors" 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full bg-[#121822]/50 border border-white/10 rounded-lg p-4 text-white focus:border-[#00E5FF] focus:outline-none transition-colors" 
            required 
          />
          
          <button type="submit" disabled={loading} className="w-full btn-solid-cyan mt-6 justify-center">
            {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
          </button>
        </form>
        
        <p className="text-center text-xs text-gray-500 mt-6 tracking-widest">
          NO ACCOUNT? <Link href="/register" className="text-[#00E5FF] hover:text-white transition-colors">REGISTER HERE</Link>
        </p>
      </div>
    </div>
  );
}