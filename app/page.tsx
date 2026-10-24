'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FaPlus } from "react-icons/fa";
import { FaInstagram, FaLinkedinIn, FaYoutube, FaFacebookF, FaLock } from "react-icons/fa6";
import dynamic from 'next/dynamic';
import Script from 'next/script';
import CSChapterLogo from '../public/CSChapterLogo.png'
import first from '../public/1st.png'
import second from '../public/2nd.png'
import third from '../public/3rd.png'
import LoadingAnimation from './components/LoadingAnimation';

const SmoothFollower = dynamic(() => import('./components/SmoothFollower'), { 
  ssr: false 
});

/* ------------------------------------------------------------------ */
/*  Demo content                                                      */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { id: 'gateway', label: 'Gateway' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'treasury', label: 'Treasury' },
  { id: 'journey', label: 'Journey' },
  { id: 'partners', label: 'Partners' },
  { id: 'faq', label: 'FAQ' },
  { id: 'register', label: 'Register' },
];

const STATS = [
  { label: 'Prize Pool', value: 'LKR 50K+' },
  { label: 'Proposals Due', value: 'NOV 26' },
  { label: 'Final Round', value: 'DEC 13' },
  { label: 'Open Tracks', value: '03' },
];

const TRACKS = [
  {
    code: 'TRK.01',
    status: 'CLASSIFIED',
    title: 'Smart Environment & Physical Systems',
    desc: 'Environmental monitoring, disaster alerts, smart agriculture, and predictive',
  },
  {
    code: 'TRK.02',
    status: 'CLASSIFIED',
    title: 'Education & HumanCapabilities',
    desc: 'Personalized learning, research assistants, accessibility, and Sinhala/Tamil language learning support.',
  },
  {
    code: 'TRK.03',
    status: 'CLASSIFIED',
    title: 'Civic Services & Community Wellbeing ',
    desc: 'Government services, financial inclusion, health information, and small business support.',
  },
];

// --- UPDATED TIMELINE ROADMAP ---
const TIMELINE = [
  {
    date: 'October 14',
    title: 'Registration Opening',
    desc: 'The gates open. Form your crew of 1–3 and claim your team slot before it fills.',
    side: 'right',
  },
  {
    date: 'October 20',
    title: 'Registration Deadline',
    desc: 'The final call to secure your spot. Registrations officially close at midnight.',
    side: 'left',
  },
  {
    date: 'October 10',
    title: 'Technical Session 02',
    desc: 'Join our expert speakers for a deep dive into building Agentic workflows and structuring your proposal.',
    side: 'right',
  },
  {
    date: 'October 26',
    title: 'Proposal Submission',
    desc: 'Submit your architecture and technical plan. This single document decides who advances to the next stage.',
    side: 'left',
    tag: 'Crucial Phase',
  },
  {
    date: 'November 04',
    title: 'Idea Submission Deadline',
    desc: 'Finalize and submit your refined model concepts for the upcoming prototype phase.',
    side: 'right',
  },
  {
    date: 'November 15',
    title: 'Announce Top 10 Teams',
    desc: 'The judging panel reveals the official InnovaX Finalists who will compete in the live showdown.',
    side: 'left',
  },
  {
    date: 'December 13',
    title: 'Final Round',
    desc: 'The Top 10 teams pitch and demo their Agentic AI builds live to the judging panel. Winners are announced!',
    side: 'right',
    gold: true,
  },
];

const PARTNERS = [
  {
    tier: 'Bronze',
    badge: '/bronze.png',
    logo: '/sponsors/rathganga.png',
    logoBg: '#FFFFFF',
    company: 'Rathganga Studio and Colour Lab',
    description: 'Rathganga Studio and Colour Lab is a professional photography studio offering photography, photo printing, and colour lab services with quality and creativity.',
  },
  {
    tier: 'Knowllege',
    badge: '/KnowllegePartner.png',
    logo: '/sponsors/loonsLab.png',
    logoBg: '#FFFFFF',
    company: 'Loons Lab',
    description: 'Loons Lab is an engineering-first software company dedicated to designing digital solutions that transform industries, enhance healthcare, and empower governments.',
  },
  {
    tier: 'Leisure',
    badge: '/LeisurePartner.png',
    logo: '/sponsors/pearlbay.png',
    logoBg: '#FFFFFF',
    company: 'Pearl Bay',
    description: 'Pearl Bay is a premier leisure park under the David Pieris Group of Companies, offering world-class attractions, professional services, and unforgettable experiences in a safe and enjoyable environment.',
  },
  {
    tier: 'Media',
    badge: '/MediaPartner.png',
    logo: '/sponsors/HackSL.png',
    logoBg: '#FFFFFF',
    company: 'HackSL',
    description: 'HackSL is a prominent Sri Lankan tech community focused on hackathons and tech events, connecting over 2,000 members across private and public universities nationwide',
  },
  // {
  //   tier: 'Silver',
  //   badge: '/silver.png',
  //   logo: '/sponsors/keels.png',
  //   logoBg: '#72ff4f',
  //   company: 'Keells',
  //   description: 'Keells is one of Sri Lanka\'s largest supermarket chains with 132 stores located across the island.',
  // },
];

const FAQS = [
  {
    q: 'Who can take part in InnovaX?',
    a: 'Any undergraduate team of 1–3 students from a recognised university is welcome. Mixed-university teams are allowed, and first-time hackers are encouraged to apply.',
  },
  {
    q: 'Is there a registration fee?',
    a: 'No. Participation is completely free, including the final round, meals during the event, and all workshop materials.',
  },
  {
    q: 'Do we need a working prototype to submit a proposal?',
    a: 'No — the proposal stage only needs a clear idea, problem statement, and technical approach. Working builds are expected only from teams shortlisted for the Final Round.',
  },
  {
    q: 'What exactly counts as "Agentic AI"?',
    a: 'Any system where an AI model plans and takes actions toward a goal with limited step-by-step supervision — think task-executing agents, tool-using copilots, or autonomous workflow bots, across any of the three tracks.',
  },
  {
    q: 'Where does the Final Round take place?',
    a: 'On university premises, Sabaragamuwa University of Sri Lanka. Remote pitching may be arranged for exceptional cases — contact the organisers in advance.',
  },
];

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                              */
/* ------------------------------------------------------------------ */

function SectorTag({ n, label }: { n: string; label: string }) {
  return <div className="sector-tag">{`SECTOR ${n} — ${label}`}</div>;
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Glass Shatter Helper                                              */
/* ------------------------------------------------------------------ */
function GlassOverlay({ isShattered }: { isShattered: boolean }) {
  const [shardStyles, setShardStyles] = useState<React.CSSProperties[]>([]);

  useEffect(() => {
    const generatedStyles = Array.from({ length: 36 }).map(() => ({
      '--x': `${(Math.random() - 0.5) * 400}px`,
      '--y': `${(Math.random() - 0.5) * 400}px`,
      '--r': `${(Math.random() - 0.5) * 180}deg`,
      '--d': `${Math.random() * 0.1}s`,
    }));
    setShardStyles(generatedStyles as React.CSSProperties[]);
  }, []);

  return (
    <div className={`glass-shatter-container ${isShattered ? 'shattered pointer-events-none' : ''}`}>
      {shardStyles.length > 0 
        ? shardStyles.map((style, i) => (
            <div key={i} className="shard" style={style} />
          ))
        : Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="shard" />
          ))
      }
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [activeSection, setActiveSection] = useState('gateway');
  const [videosLoaded, setVideosLoaded] = useState({
    gateway: false,
    scrollVideo: false,
  });

  const handleVideoLoaded = (video: "gateway" | "scroll") => {
    setVideosLoaded((prev) => ({
      ...prev,
      [video]: true,
    }));
  };

  const allVideosLoaded =
    videosLoaded.gateway &&
    videosLoaded.scrollVideo;
  
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activePartner, setActivePartner] = useState(0);
  const [brokenPartnerLogos, setBrokenPartnerLogos] = useState<Record<string, boolean>>({});
  const [isShattered, setIsShattered] = useState(false);
  
  const rootRef = useRef<HTMLElement>(null);
  const scrollVideoRef = useRef<HTMLVideoElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const gatewayVideoRef = useRef<HTMLVideoElement>(null); 

  // Track 2: Partners & FAQ
  const horizontalContainerRef2 = useRef<HTMLDivElement>(null);
  const horizontalTrackRef2 = useRef<HTMLDivElement>(null);
  const currentPartner = PARTNERS[activePartner];
  const currentLogoBroken = Boolean(brokenPartnerLogos[currentPartner.logo]);




  // ==========================================
  // UNIFIED SCROLL LOGIC
  // ==========================================
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // 1. Shatter Logic (Gateway)
      if (scrollY > 50 && !isShattered) {
        setIsShattered(true);
      } else if (scrollY <= 10 && isShattered) {
        setIsShattered(false); 
      }

      // 2B. Horizontal Scroll 2 (Partners & FAQ)
      if (horizontalContainerRef2.current && horizontalTrackRef2.current) {
        const rect2 = horizontalContainerRef2.current.getBoundingClientRect();
        const scrollDistance2 = rect2.height - windowHeight;
        
        let hProgress2 = -rect2.top / scrollDistance2;
        hProgress2 = Math.max(0, Math.min(1, hProgress2));

        // Use the first half of this zone to complete the sponsor rotation.
        const partnerProgress = Math.min(1, hProgress2 * 2);
        setActivePartner(Math.min(PARTNERS.length - 1, Math.floor(partnerProgress * PARTNERS.length)));
        
        const faqProgress = Math.max(0, (hProgress2 - 0.5) * 2);
        horizontalTrackRef2.current.style.transform = `translateX(calc(-${faqProgress * 50}%))`;
      }

      // 3. Video Scrubbing Logic (Constrained to Sections 2 through 5)
      const video = scrollVideoRef.current;
      const startZone = document.getElementById('chapters');
      const endZone = document.getElementById('partners-faq');

      if (video && startZone && endZone) {
        const startPos = startZone.offsetTop;
        const endPos = endZone.offsetTop + endZone.offsetHeight;
        
        // Calculate the total scrolling distance across Sections 2 to 5
        const scrollDistance = endPos - startPos - windowHeight;

        if (scrollDistance > 0) {
          const scrolledPast = scrollY - startPos;
          const progress = Math.max(0, Math.min(1, scrolledPast / scrollDistance));

          // Scrub video only if we are past the start point
          if (!isNaN(video.duration) && video.duration > 0) {
            window.requestAnimationFrame(() => {
              video.currentTime = progress * video.duration;
            });
          }

          // Fade video out if we scroll past Section 5 (down into Section 6)
          if (scrollY >= startPos - windowHeight && scrollY <= endPos) {
            video.style.opacity = '0.15';
          } else {
            video.style.opacity = '0';
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); 
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isShattered]);

  useEffect(() => {
    if (gatewayVideoRef.current && gatewayVideoRef.current.readyState >= 3) {
      handleVideoLoaded("gateway");
    }
    if (scrollVideoRef.current && scrollVideoRef.current.readyState >= 3) {
      handleVideoLoaded("scroll");
    }

    // Never block the site longer than 8 seconds
    const timeout = setTimeout(() => {
      setVideosLoaded({ gateway: true, scrollVideo: true });
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  // ==========================================
  // REVEAL ANIMATIONS
  // ==========================================
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // ==========================================
  // NAVBAR SPY
  // ==========================================
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-30% 0px -30% 0px', threshold: 0 } 
    );

    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
    <SmoothFollower />
    {!allVideosLoaded && <LoadingAnimation />}
    <main ref={rootRef} className="relative bg-transparent">
      {/* --- Base Backgrounds --- */}
      <div className="fixed inset-0 w-full h-full -z-20 bg-gradient-to-b from-[#0055FF]/12 via-[#05080C] to-[#05080C]" />
      <div className="fixed inset-0 w-full h-full -z-10 chart-grid" />
      
      {/* --- Scroll Scrubbing Video (Hidden by default, fades in at Section 2) --- */}
      <div className="fixed inset-0 w-full h-full z-[-15] overflow-hidden bg-[#05080C]">
        <video
          ref={scrollVideoRef}
          src="/video_this_cyber_oql_fly_the.mp4"
          muted
          playsInline
          preload="auto"
          onCanPlay={() => handleVideoLoaded("scroll")}
          className="w-full h-full object-cover opacity-0 transition-opacity duration-700"
        />
      </div>

      {/* --- Top Layer Effects --- */}
      <GlassOverlay isShattered={isShattered} />

      {/* =========================================
          SECTION 1 — GATEWAY
      ========================================= */}
      <div className={`fixed inset-0 w-full h-screen z-40 transition-all duration-[1200ms] ease-[cubic-bezier(0.25,1,0.5,1)] origin-center
        ${isShattered ? 'opacity-0 scale-[1.7] blur-xl pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
        
        <section id="gateway" className="h-full flex items-center p-4 sm:p-8 md:p-20 py-8 sm:py-12 relative z-10 w-full overflow-hidden">
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none bg-[#05080C]">
            <video
              src="/section1.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onCanPlay={() => handleVideoLoaded("gateway")}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-[#05080C]/70 z-10 pointer-events-none" />

          <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between relative z-20 gap-8 lg:gap-12 my-auto">
            <div className="max-w-2xl relative z-20 flex-shrink-0">
              <div className="badge-mono border-[#00E5FF]/40 text-[#00E5FF] bg-[#00E5FF]/[0.06] inline-block mb-3 sm:mb-6 text-[10px] sm:text-xs">
                IEEE Computer Society · SUSL Chapter Presents
              </div>
              <img src="https://github.com/nngeek195/mywork/blob/b1/Pasted%20image.png?raw=true" alt="InnovaX Logo" className="w-full max-w-[220px] sm:max-w-sm md:max-w-md mb-3 sm:mb-4 drop-shadow-[0_0_15px_rgba(0,229,255,0.3)]" />
              <h1 className="heading-glow font-display text-xl sm:text-2xl md:text-3xl font-semibold text-white/90 tracking-wide mb-3 sm:mb-5 !text-left !justify-start">
                Observe <span className="heading-highlight">Reason</span> Execute
              </h1>
              <p className="text-[var(--mist)] text-xs sm:text-sm md:text-base leading-relaxed tracking-wide mb-6 sm:mb-8 max-w-xl">
                An AI-focused idea hackathon bridging inventive thinking and Agentic AI solutions -
                organised by the IEEE Computer Society Chapter of Sabaragamuwa University of Sri Lanka.
                Form a crew, chart your proposal, and pitch your way to the treasury.
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-12">
                <a href="/dashboard" className="btn-outline-cyan w-full sm:w-auto text-center justify-center">SUBMIT PROPOSAL</a>
                <a href="/login" className="btn-outline-cyan border-white/20 text-white hover:border-[#00E5FF] hover:text-[#05080C] bg-transparent hover:bg-[#00E5FF] w-full sm:w-auto text-center justify-center">SIGN IN</a>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-lg border-t border-white/10 pt-5 sm:pt-8">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <p className="font-mono text-base sm:text-lg md:text-xl font-semibold text-[#00E5FF]">{s.value}</p>
                    <p className="font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-[var(--mist)] mt-1">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div ref={scrollContentRef} className={`relative z-30 pt-32 transition-all duration-[1200ms] ease-[cubic-bezier(0.25,1,0.5,1)] 
        ${isShattered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.95] translate-y-10 pointer-events-none'}`}>
      </div>
        
        {/* =========================================
            HORIZONTAL ZONE 1 (Chapters -> Treasury)
        ========================================= */}
        {/* =========================================
    CHAPTERS (Sector 01) - Vertical
========================================= */}
<section
  id="chapters"
  className="section-container py-16 sm:py-20 w-full relative z-20"
>
  <Reveal className="w-full flex flex-col items-center text-center mb-8 sm:mb-10">
    <SectorTag n="01" label="CHAPTERS" />

    <h2 className="heading-glow justify-center">
      WHO&apos;S ON THIS{' '}
      <span className="heading-highlight">EXPEDITION</span>
    </h2>

    <p className="heading-sub text-center">
      InnovaX is run by student volunteers of the IEEE Computer Society
      Chapter at Sabaragamuwa University of Sri Lanka. Teams of 1 – 3
      undergraduates pick one track below and spend six weeks turning an
      idea into a working Agentic AI proposal.
    </p>

    <a href="/InnovaX 1.0 Delegate Booklet.pdf" download="InnovaX 1.0 Delegate Booklet.pdf" className="btn-outline-cyan border-[#00E5FF] text-white hover:border-[#00E5FF] hover:text-[#05080C] bg-transparent hover:bg-[#00E5FF] w-full sm:w-auto text-center justify-center mt-[30]">Download</a>
  </Reveal>
          
{/* EMBEDDED GUIDEBOOK */}
<Script
  src="https://static.anyflip.com/plugin/LightBox/js/anyflp-light-box-api-min.js"
  strategy="lazyOnload"
/>

<Reveal className="w-full flex flex-col items-center max-w-5xl mx-auto px-2 sm:px-4">
  {/* Terminal / Cyber Header Bar */}
  <div className="w-full bg-[#0a1018] border border-[#00E5FF]/30 rounded-t-xl sm:rounded-t-2xl px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between shadow-[0_0_30px_rgba(0,229,255,0.1)]">
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80 inline-block" />
        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/80 inline-block" />
        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/80 inline-block" />
      </div>

      <span className="font-mono text-[11px] sm:text-xs text-[#00E5FF] tracking-wider uppercase truncate max-w-[180px] sm:max-w-none">
        DOC.VIEWER // INNOVAX_PROPOSAL_BOOKLET
      </span>
    </div>

    <div className="flex items-center gap-2 sm:gap-4">
      <span className="font-mono text-[10px] text-[var(--mist)] uppercase tracking-widest hidden md:inline-block">
        INTERACTIVE FLIPBOOK
      </span>

      <a
        href="https://online.anyflip.com/fmmmx/vbhr/index.html"
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[11px] sm:text-xs text-[#00E5FF] hover:text-white bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/40 rounded-full px-3 py-1 transition-all duration-300 flex items-center gap-1.5 shrink-0"
        title="Open booklet in full window"
      >
        <span>FULLSCREEN</span>

        <svg
          className="w-3 h-3 sm:w-3.5 sm:h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  </div>

  {/* Iframe Frame Container */}
  <div className="w-full relative bg-[#05080C] border-x border-b border-[#00E5FF]/30 rounded-b-xl sm:rounded-b-2xl p-1.5 sm:p-3 shadow-[0_10px_60px_rgba(0,229,255,0.15)] overflow-hidden">
    <div className="w-full h-[360px] sm:h-[460px] md:h-[540px] lg:h-[600px] rounded-lg sm:rounded-xl overflow-hidden bg-black/60 relative">
      <iframe
        src="https://online.anyflip.com/xrsxp/qqxr/index.html"
        title="InnovaX Proposal Booklet"
        className="absolute inset-0 w-full h-full border-0"
        scrolling="no"
        allow="fullscreen"
        allowFullScreen
      />
    </div>
  </div>

  {/* Guide Controls Hint */}
  <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-mono text-[var(--mist)] text-center">
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
      Click or drag page corners to flip
    </span>

    <span className="hidden sm:inline text-white/20">•</span>

    <span>
      Use bottom toolbar inside reader to zoom or expand full view
    </span>
  </div>

  {/* TRACK CARDS */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 w-full mt-10 sm:mt-14">
    {TRACKS.map((t) => (
      <div
        key={t.code}
        className="relative flex flex-col justify-between group overflow-hidden rounded-2xl p-6 sm:p-7 bg-[#121822]/40 backdrop-blur-md border border-dashed border-[#00E5FF]/25 hover:border-[#00E5FF]/60 hover:bg-[#121822]/60 hover:shadow-[0_0_30px_rgba(0,229,255,0.18)] transition-all duration-500"
      >
        {/* Ghost ambient glow in the corner */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#00E5FF]/10 rounded-full blur-3xl group-hover:bg-[#00E5FF]/20 transition-all duration-500 pointer-events-none" />

        {/* Ghost background watermark lock */}
        <FaLock className="absolute -bottom-3 -right-2 text-white/[0.03] group-hover:text-[#00E5FF]/[0.08] text-7xl sm:text-8xl transition-all duration-500 pointer-events-none select-none -rotate-12" />

        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/25 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,229,255,0.1)]">
                <FaLock className="text-[10px] text-[#00E5FF]/80" />
                {t.code}
              </span>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 font-mono text-[10px] tracking-wider text-[var(--mist)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5FF] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00E5FF]" />
                </span>
                <span className="text-[#00E5FF]/90 font-semibold">{t.status}</span>
              </div>
            </div>

            <h3 className="font-display text-lg sm:text-xl font-bold text-white/90 mb-2 sm:mb-2.5 tracking-wide group-hover:text-[#00E5FF] transition-colors">
              {t.title}
            </h3>

            <p className="text-xs sm:text-sm text-[var(--mist)]/80 leading-relaxed font-sans">
              {t.desc}
            </p>
          </div>

          {/* Ghost / Encrypted placeholder telemetry */}
          <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] text-[#00E5FF]/60 uppercase tracking-widest">
              <span>Transmission</span>
              <span className="animate-pulse">Awaiting Signal...</span>
            </div>
            <div className="space-y-1.5 opacity-40 group-hover:opacity-75 transition-opacity duration-300">
              <div className="h-1 bg-gradient-to-r from-[#00E5FF]/40 via-white/10 to-transparent rounded-full w-full" />
              <div className="h-1 bg-gradient-to-r from-[#00E5FF]/25 via-white/5 to-transparent rounded-full w-3/4" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</Reveal>
</section>



{/* =========================================
    TREASURY (Sector 02) - Vertical
========================================= */}
<section
  id="treasury"
  className="section-container pt-20 pb-20 w-full"
>
  <Reveal className="w-full flex flex-col items-center text-center">
    <SectorTag n="02" label="TREASURY" />

    <h2 className="heading-glow justify-center mb-8">
      THE <span className="heading-highlight">PRIZE POOL</span>
    </h2>

    <p className="heading-sub text-center mb-8">
      Every finalist walks away with a certificate and mentorship access -
      the treasury below is reserved for the teams who make it to the top
      of the leaderboard.
    </p>
  </Reveal>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-10 w-full max-w-5xl mx-auto items-stretch mt-8">

    {/* 1st Runner Up: order-2 on mobile, order-1 on desktop */}
    <Reveal delay={0} className="h-full order-2 md:order-1">
      <div className="glass-panel text-center h-full flex flex-col items-center justify-between p-6">
        <div>
          <h3 className="text-base sm:text-lg text-[var(--gold)] tracking-widest uppercase font-bold">
            1st Runner Up
          </h3>
          <img
            src={second.src}
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain mx-auto mt-2"
            alt="1st Runner Up"
          />
        </div>
        <p className="text-xl sm:text-2xl font-bold text-[#00E5FF] mt-4">
          LKR 20,000
        </p>
      </div>
    </Reveal>

    {/* Championship: order-1 on mobile, order-2 on desktop */}
    <Reveal delay={120} className="h-full order-1 md:order-2 md:-translate-y-3">
      <div className="glass-panel text-center border-[var(--gold)]/40 relative overflow-hidden h-full flex flex-col items-center justify-between p-6 shadow-[0_0_30px_rgba(0,229,255,0.18)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/10 to-transparent z-0 pointer-events-none" />

        <div className="relative z-10">
          <h3 className="text-lg sm:text-xl text-[var(--gold)] tracking-widest uppercase font-bold">
            Championship
          </h3>
          <img
            src={first.src}
            className="w-36 h-36 sm:w-44 sm:h-44 object-contain relative z-10 mx-auto mt-2"
            alt="Championship"
          />
        </div>

        <p className="text-2xl sm:text-3xl font-black text-[var(--gold)] relative z-10 mt-4">
          LKR 30,000
        </p>
      </div>
    </Reveal>

    {/* 2nd Runner Up: order-3 */}
    <Reveal delay={240} className="h-full order-3 md:order-3">
      <div className="glass-panel text-center h-full flex flex-col items-center justify-between p-6">
        <div>
          <h3 className="text-base sm:text-lg text-[var(--gold)] tracking-widest uppercase font-bold">
            2nd Runner Up
          </h3>
          <img
            src={third.src}
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain mx-auto mt-2"
            alt="2nd Runner Up"
          />
        </div>
        <p className="text-xl sm:text-2xl font-bold text-[#00E5FF] mt-4">
          LKR 10,000
        </p>
      </div>
    </Reveal>

  </div>
</section>

        {/* =========================================
            JOURNEY (Sector 03) - Vertical Scroll
        ========================================= */}
        <section id="journey" className="section-container pt-16 sm:pt-20 pb-16 sm:pb-20">
          <Reveal className="w-full flex flex-col items-center text-center">
            <SectorTag n="03" label="JOURNEY" />
            <h2 className="heading-glow justify-center">
              THE <span className="heading-highlight">ROUTE</span> AHEAD
            </h2>
            <p className="text-[var(--mist)] italic text-sm mb-6 text-center max-w-xl">
              &ldquo;Every milestone tells a story. Follow the journey to the final treasure.&rdquo;
            </p>
          </Reveal>

          <div className="relative w-full max-w-3xl mx-auto py-6 sm:py-10 px-2 sm:px-0">
            {/* Timeline track: left-4 on mobile, center on desktop */}
            <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-[#00E5FF]/60 via-white/10 to-[var(--gold)]/60" />

            {TIMELINE.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="relative flex items-center w-full mb-8 sm:mb-12 group cursor-default">
                  {/* Bubble Lights up on track */}
                  <span className={`absolute left-4 md:left-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full animate-ping transition-all duration-300 group-hover:!bg-white group-hover:!shadow-[0_0_20px_#ffffff] z-10 ${item.gold ? 'bg-[var(--gold)] shadow-[0_0_12px_var(--gold)]' : 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]'}`} />
                  <span className={`absolute left-4 md:left-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-300 group-hover:!bg-white group-hover:!shadow-[0_0_20px_#ffffff] z-10 ${item.gold ? 'bg-[var(--gold)] shadow-[0_0_12px_var(--gold)]' : 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]'}`} />

                  {item.side === 'right' ? (
                    <div className="w-full flex items-center md:justify-between">
                      {/* Desktop: Left side card */}
                      <div className="hidden md:block w-5/12 text-right pr-6 lg:pr-8 bg-[#121822] p-4 lg:p-5 rounded-xl transition-colors duration-300 group-hover:bg-[#1a2233]">
                        <div className={`font-mono font-bold text-xs sm:text-sm tracking-widest ${item.gold ? 'text-[var(--gold)]' : 'text-[#00E5FF]'}`}>
                          {item.date}
                        </div>
                        {item.tag && <span className="badge-mono border-[#00E5FF]/50 bg-[#00E5FF] text-[#05080C] mt-1.5 mb-1 inline-block">{item.tag}</span>}
                        <h3 className="font-display text-base sm:text-lg font-bold text-white inline-block relative after:absolute after:bottom-0 after:left-0 after:w-0 group-hover:after:w-full after:h-[2px] after:bg-[#00E5FF] after:transition-all after:duration-300 mt-1">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--mist)] mt-2">{item.desc}</p>
                      </div>

                      <div className="hidden md:block w-5/12" />

                      {/* Mobile: Full-width card to the right of track */}
                      <div className="md:hidden w-[calc(100%-2.25rem)] ml-9 text-left bg-[#121822] p-4 rounded-xl transition-colors duration-300 group-hover:bg-[#1a2233]">
                        <div className={`font-mono font-bold text-xs tracking-widest ${item.gold ? 'text-[var(--gold)]' : 'text-[#00E5FF]'}`}>
                          {item.date}
                        </div>
                        {item.tag && <span className="badge-mono border-[#00E5FF]/50 bg-[#00E5FF] text-[#05080C] my-1 inline-block text-[10px]">{item.tag}</span>}
                        <h3 className="font-display text-base font-bold text-white block mt-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[var(--mist)] mt-1.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex items-center md:justify-between">
                      <div className="hidden md:block w-5/12 text-right pr-8" />

                      {/* Desktop: Right side card */}
                      <div className="hidden md:block w-5/12 pl-6 lg:pl-8 text-left bg-[#121822] p-4 lg:p-5 rounded-xl transition-colors duration-300 group-hover:bg-[#1a2233]">
                        <div className={`font-mono font-bold text-xs sm:text-sm tracking-widest ${item.gold ? 'text-[var(--gold)]' : 'text-[#00E5FF]'}`}>
                          {item.date}
                        </div>
                        {item.tag && <span className="badge-mono border-[#00E5FF]/50 bg-[#00E5FF] text-[#05080C] mt-1.5 mb-1 inline-block">{item.tag}</span>}
                        <h3 className="font-display text-base sm:text-lg font-bold text-white inline-block relative after:absolute after:bottom-0 after:left-0 after:w-0 group-hover:after:w-full after:h-[2px] after:bg-[#00E5FF] after:transition-all after:duration-300 mt-1">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--mist)] mt-2">{item.desc}</p>
                      </div>

                      {/* Mobile: Full-width card to the right of track */}
                      <div className="md:hidden w-[calc(100%-2.25rem)] ml-9 text-left bg-[#121822] p-4 rounded-xl transition-colors duration-300 group-hover:bg-[#1a2233]">
                        <div className={`font-mono font-bold text-xs tracking-widest ${item.gold ? 'text-[var(--gold)]' : 'text-[#00E5FF]'}`}>
                          {item.date}
                        </div>
                        {item.tag && <span className="badge-mono border-[#00E5FF]/50 bg-[#00E5FF] text-[#05080C] my-1 inline-block text-[10px]">{item.tag}</span>}
                        <h3 className="font-display text-base font-bold text-white block mt-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[var(--mist)] mt-1.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* =========================================
            HORIZONTAL ZONE 2 (Partners -> FAQ)
        ========================================= */}
        <div id="horizontal-scroll-zone-2" ref={horizontalContainerRef2} className="relative h-[250vh] w-full z-20">
          <div className="sticky top-0 h-screen w-full overflow-hidden">
            <div 
              ref={horizontalTrackRef2} 
              className="flex h-full w-[200vw] will-change-transform ease-out"
              style={{ transform: 'translateX(0%)' }} 
            >
              
              {/* LEFT: PARTNERS (Sector 04) */}
<div className="w-screen h-full flex items-center justify-center overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
  
 
        <section id="partners" className="section-container text-center">
          <Reveal className="w-full flex flex-col items-center">
            <SectorTag n="04" label="PARTNERS" />
            <h2 className="heading-glow justify-center mb-8">
              THE <span className="heading-highlight">GUARDIANS</span>
            </h2>
            <p className="text-[var(--mist)] italic text-sm mb-10 text-center max-w-xl">
              &ldquo;These are the guardians whose strength carries every explorer this far.&rdquo;
            </p>
          </Reveal>

                  <Reveal className="w-full max-w-6xl">
                    <div className="partners-stage">
                      <div className="partners-carousel" style={{ '--carousel-angle': `${-activePartner * 90}deg` } as React.CSSProperties}>
                        {PARTNERS.map((partner, index) => {
                          return (
                          <div
                            key={partner.tier}
                            className={`partner-card ${index === activePartner ? 'is-active' : ''}`}
                            style={{ '--partner-angle': `${index * 90}deg`, zIndex: index === activePartner ? 10 : 1 } as React.CSSProperties}
                          >
                            <button type="button" className="partner-badge-button" onClick={() => setActivePartner(index)} aria-label={`${partner.tier} partner: ${partner.company}`}>
                              <img src={partner.badge} alt={`${partner.tier} Partner`} className="partner-badge" />
                            </button>
                          </div>
                          );
                        })}
                      </div>
                      <div className="partner-details flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5" aria-live="polite">
                        <div className="partner-logo-frame shrink-0" style={{ backgroundColor: currentPartner.logoBg }}>
                          {!currentLogoBroken && (
                            <img
                              key={currentPartner.logo}
                              src={currentPartner.logo}
                              alt={`${currentPartner.company} logo`}
                              className="partner-logo"
                              loading="eager"
                              decoding="async"
                              onLoad={() => {
                                setBrokenPartnerLogos((prev) => {
                                  if (!prev[currentPartner.logo]) {
                                    return prev;
                                  }
                                  const next = { ...prev };
                                  delete next[currentPartner.logo];
                                  return next;
                                });
                              }}
                              onError={() => {
                                setBrokenPartnerLogos((prev) => ({ ...prev, [currentPartner.logo]: true }));
                              }}
                            />
                          )}
                          {currentLogoBroken && (
                            <span className="partner-logo-fallback" aria-hidden="true">{currentPartner.company.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="partner-tier">{currentPartner.tier} Partner</p>
                          <h3 className="partner-company font-display text-lg sm:text-xl md:text-2xl font-bold">{currentPartner.company}</h3>
                          <p className="text-xs sm:text-sm text-[var(--mist)] mt-2 leading-relaxed max-w-xl">{currentPartner.description}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </section>
              </div>

              {/* RIGHT: FAQ (Sector 05) */}
<div className="w-screen h-full flex items-center justify-center overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <section id="faq" className="section-container">
                  <Reveal className="w-full flex flex-col items-center text-center">
                    <SectorTag n="05" label="FAQ" />
                    <h2 className="heading-glow justify-center mb-2">
                      KNOWN <span className="heading-highlight">HAZARDS</span>
                    </h2>
                    <p className="heading-sub text-center mb-8">
                      Answers to what most explorers ask before setting off.
                    </p>
                  </Reveal>

                  <div className="w-full max-w-3xl flex flex-col gap-2.5 sm:gap-3 px-2 sm:px-0">
                    {FAQS.map((f, i) => {
                      const open = openFaq === i;
                      return (
                        <Reveal key={f.q} delay={i * 60}>
                          <div className="glass-panel !p-0 overflow-hidden">
                            <button
                              onClick={() => setOpenFaq(open ? null : i)}
                              aria-expanded={open}
                              className="w-full flex items-center justify-between gap-3 text-left px-4 sm:px-6 py-4 sm:py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]/60"
                            >
                              <span className="font-display text-xs sm:text-sm md:text-base font-semibold text-white">
                                {f.q}
                              </span>
                              <div
                                className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-[#00E5FF] flex items-center justify-center text-[#00E5FF]`}
                              >
                                <FaPlus className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 ${
                                  open ? 'rotate-45' : ''
                                }`} />
                              </div>
                            </button>
                            <div
                              className="grid transition-all duration-300 ease-out"
                              style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                            >
                              <div className="overflow-hidden">
                                <p className="text-xs sm:text-sm text-[var(--mist)] leading-relaxed px-4 sm:px-6 pb-4 sm:pb-6">{f.a}</p>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                      );
                    })}
                  </div>
                </section>
              </div>

            </div>
          </div>
        </div>

        {/* =========================================
            DARK MARGIN (System Checkpoint Spacer)
        ========================================= */}
        <div className="w-full h-24 sm:h-32 bg-[#05080C] relative z-30 border-y border-[#121822] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center">
          <div className="w-full max-w-7xl mx-auto px-6 flex items-center gap-4 opacity-40">
            <div className="h-px bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent flex-1" />
            <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.3em] text-[#00E5FF]">SYSTEM CHECKPOINT</span>
            <div className="h-px bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent flex-1" />
          </div>
        
        </div>

        {/* =========================================
            REGISTER & FOOTER (Sector 06) w/ Video BG & Mist
        ========================================= */}
        <div className="relative w-full flex flex-col items-center justify-center overflow-hidden z-20">
          <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
            <video
              src="/blue_power_owl.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 bg-[#05080C]/60 backdrop-blur-[2px]" />
            <div className="absolute bottom-0 left-0 w-full h-[60vh] bg-gradient-to-t from-[#05080C] via-[#05080C]/95 to-transparent z-10" />
          </div>

          <section id="register" className="flex flex-col items-center justify-center pt-16 pb-2 w-full text-center relative z-10">
            <Reveal className="flex flex-col items-center px-4 sm:px-6">
              <SectorTag n="06" label="REGISTER" />
              <h2 className="font-display text-3xl sm:text-4xl md:text-6xl font-black tracking-widest uppercase text-white mb-6 sm:mb-8 text-center px-2">
                READY TO <span className="heading-highlight">DIVE IN?</span>
              </h2>
              
              <a 
                href="/register" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-solid-cyan inline-block mb-0 text-center"
              >
                REGISTER NOW
              </a>
            </Reveal>
          </section>

          <div className="w-full pt-12 pb-44 sm:pb-48 flex flex-col items-center relative z-20 border-t border-[#121822]/50">
            <Reveal className="w-full max-w-4xl flex flex-col items-center px-4 sm:px-6">
              <p className="text-[var(--mist)] italic text-xs sm:text-sm mb-10 sm:mb-12 text-center">
                &ldquo;Every great journey begins with a conversation.&rdquo;
              </p>

              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 max-w-full px-2">
                <a href="mailto:ssomaweera@foc.sab.ac.lk" className="group border border-[#121822] rounded-full px-4 sm:px-6 py-2.5 sm:py-3 text-[11px] sm:text-xs text-[var(--mist)] hover:text-white hover:border-[#00E5FF] bg-[#121822]/50 hover:bg-[#121822] transition-all duration-300 flex items-center gap-2 sm:gap-3 max-w-full truncate">
                  <svg className="w-4 h-4 text-[#00E5FF] group-hover:scale-110 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">ssomaweera@foc.sab.ac.lk</span>
                </a>
                <a href="mailto:ieeecschaptersusl@gmail.com" className="group border border-[#121822] rounded-full px-4 sm:px-6 py-2.5 sm:py-3 text-[11px] sm:text-xs text-[var(--mist)] hover:text-white hover:border-[#00E5FF] bg-[#121822]/50 hover:bg-[#121822] transition-all duration-300 flex items-center gap-2 sm:gap-3 max-w-full truncate">
                  <svg className="w-4 h-4 text-[#00E5FF] group-hover:scale-110 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">ieeecschaptersusl@gmail.com</span>
                </a>
              </div>

              <div className="flex justify-center gap-3 sm:gap-4 mb-12 sm:mb-16">
                {[
                  { name: "LinkedIn", icon: <FaLinkedinIn />, href: "https://www.linkedin.com/company/ieee-cs-student-branch-chapter-susl" },
                  { name: "Facebook", icon: <FaFacebookF />, href: "https://www.facebook.com/profile.php?id=61565615188093" },
                  { name: "Instagram", icon: <FaInstagram />, href: "https://www.instagram.com/ieee_cs_susl?stkn=MWx2d2k4Y2FkaHU2eQ==" },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#FFFFFF] flex items-center justify-center
                              hover:border-[#00E5FF] hover:bg-[#00E5FF]/10
                              text-[var(--mist)] hover:text-[#00E5FF]
                              hover:scale-110 hover:rotate-10"
                    aria-label={social.name}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-8 w-full">
                <div className="flex items-center gap-4">
                  <img src="https://github.com/nngeek195/mywork/blob/b1/Pasted%20image.png?raw=true" alt="InnovaX Small Logo" className="h-7 sm:h-9 md:h-10 object-contain drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]" />
                </div>
                <span className="hidden sm:block w-px h-8 sm:h-10 bg-white/20"></span>
                <div><img src={CSChapterLogo.src} alt="IEEE Computer Society Chapter Logo" className="h-8 sm:h-10 w-auto object-contain" /></div>
              </div>

              <div className="text-[9px] sm:text-[10px] text-[var(--mist)]/50 uppercase tracking-widest font-mono flex flex-wrap justify-center items-center gap-2 sm:gap-3 px-2">
                <span>© InnovaX 2026.</span>
                <span className="hidden md:inline">|</span>
                <span>All Rights Reserved.</span>
                <span className="hidden md:inline">|</span>
                <span className="text-center">Organized by Faculty of Computing, SUSL.</span>
              </div>
            </Reveal>
          </div>
        </div>

      {/* =========================================
          BOTTOM FIXED NAVIGATION
      ========================================= */}
      <div className="fixed bottom-0 left-0 w-full h-14 sm:h-16 bg-[#05080C]/90 backdrop-blur-md border-t border-white/10 z-[100] flex items-center justify-start md:justify-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <nav className="flex items-center gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 text-[11px] sm:text-xs font-mono tracking-widest uppercase min-w-max h-full">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`relative h-full flex items-center px-2 transition-colors duration-300 ${
                  active
                    ? 'text-[#00E5FF] font-bold drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]'
                    : 'text-[var(--mist)] hover:text-white'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#00E5FF] shadow-[0_-2px_10px_rgba(0,229,255,1)] rounded-t-md" />
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </main>
  </>
  );
}