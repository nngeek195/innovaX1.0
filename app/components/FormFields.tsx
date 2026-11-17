'use client';
/** Form primitives shared by participant and judge registration. */
import React from 'react';

export function FieldInput({
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

export function FieldSelect({
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

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-md mb-8 text-sm font-medium animate-fade-in">
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
