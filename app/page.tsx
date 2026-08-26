'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FaPlus } from "react-icons/fa";
import { FaInstagram, FaLinkedinIn, FaYoutube, FaFacebookF} from "react-icons/fa6";
import SmoothFollower from './components/SmoothFollower';

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
  { label: 'Prize Pool', value: 'LKR 100K+' },
  { label: 'Proposals Due', value: 'SEP 08' },
  { label: 'Final Round', value: 'OCT 10' },
  { label: 'Open Tracks', value: '03' },
];

const TRACKS = [
  {
    code: 'TRK.01',
    title: 'Autonomous Agents',
    desc: 'Multi-step agents that plan, reason, and act - from task copilots to fully self-directed workflows.',
  },
  {
    code: 'TRK.02',
    title: 'AI For Impact',
    desc: 'Applied solutions for healthcare, agriculture, and education built for Sri Lankan communities.',
  },
  {
    code: 'TRK.03',
    title: 'Enterprise Automation',
    desc: 'Agentic tools that cut busywork out of real operations - support, finance, logistics, and ops.',
  },
];

const TIMELINE = [
  {
    date: 'AUGUST 25',
    title: 'Registration Opens',
    desc: 'The gates open. Form your crew of 2–4 and claim your team slot before it fills.',
    side: 'right',
  },
  {
    date: 'SEPTEMBER 08',
    title: 'Proposal Submission',
    desc: 'Submit your idea and technical plan. This single document decides who advances.',
    side: 'left',
    tag: 'Crucial Phase',
  },
  {
    date: 'OCTOBER 10 — AM',
    title: 'Final Round',
    desc: 'The Top 10 teams pitch and demo their Agentic AI builds live to the judging panel.',
    side: 'right',
  },
  {
    date: 'OCTOBER 10 — PM',
    title: 'Results & Closing',
    desc: 'Winners are announced and the prize pool is awarded at the closing ceremony.',
    side: 'left',
    gold: true,
  },
];

const PARTNERS = [
  {
    tier: 'Platinum',
    badge: '/Platinum.png',
    logo: '/sponsors/platinum-logo.png',
    company: 'Platinum Sponsor Name',
    description: 'Add two or three lines about the platinum sponsor, their work, and how they support innovation in the community.',
  },
  {
    tier: 'Gold',
    badge: '/gold.png',
    logo: '/sponsors/gold-logo.png',
    company: 'Gold Sponsor Name',
    description: 'Add two or three lines about the gold sponsor, their work, and how they support the InnovaX community.',
  },
  {
    tier: 'Silver',
    badge: '/silver.png',
    logo: '/sponsors/silver-logo.png',
    company: 'Silver Sponsor Name',
    description: 'Add two or three lines about the silver sponsor, their work, and their contribution to this competition.',
  },
  {
    tier: 'Bronze',
    badge: '/bronze.png',
    logo: '/sponsors/bronze-logo.png',
    company: 'Bronze Sponsor Name',
    description: 'Add two or three lines about the bronze sponsor, their work, and the value they bring to the explorer community.',
  },
];

const FAQS = [
  {
    q: 'Who can take part in InnovaX?',
    a: 'Any undergraduate team of 2–4 students from a recognised university is welcome. Mixed-university teams are allowed, and first-time hackers are encouraged to apply.',
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
    a: 'On campus at the Faculty of Computing, Sabaragamuwa University of Sri Lanka. Remote pitching may be arranged for exceptional cases — contact the organisers in advance.',
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activePartner, setActivePartner] = useState(0);
  const [isShattered, setIsShattered] = useState(false);
  
  const rootRef = useRef<HTMLElement>(null);
  const scrollVideoRef = useRef<HTMLVideoElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  
  // Track 1: Chapters & Treasury
  const horizontalContainerRef = useRef<HTMLDivElement>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);

  // Track 2: Partners & FAQ
  const horizontalContainerRef2 = useRef<HTMLDivElement>(null);
  const horizontalTrackRef2 = useRef<HTMLDivElement>(null);

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

      // 2A. Horizontal Scroll 1 (Chapters & Treasury)
      if (horizontalContainerRef.current && horizontalTrackRef.current) {
        const rect = horizontalContainerRef.current.getBoundingClientRect();
        const scrollDistance = rect.height - windowHeight;
        
        let hProgress = -rect.top / scrollDistance;
        hProgress = Math.max(0, Math.min(1, hProgress));
        
        horizontalTrackRef.current.style.transform = `translateX(calc(-50% + ${hProgress * 50}%))`;
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
      const startZone = horizontalContainerRef.current;
      const endZone = horizontalContainerRef2.current;

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
        
        <section id="gateway" className="h-full flex items-center p-8 md:p-20 relative z-10 w-full overflow-hidden">
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none bg-[#05080C]">
            <video src="/section1.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-[#05080C]/70 z-10 pointer-events-none" />

          <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between relative z-20 gap-12">
            <div className="max-w-2xl relative z-20 flex-shrink-0">
              <div className="badge-mono border-[#00E5FF]/40 text-[#00E5FF] bg-[#00E5FF]/[0.06] inline-block mb-6">
                IEEE Computer Society · SUSL Chapter Presents
              </div>
              <img src="https://github.com/nngeek195/mywork/blob/b1/Pasted%20image.png?raw=true" alt="InnovaX Logo" className="w-full max-w-sm md:max-w-md mb-4 drop-shadow-[0_0_15px_rgba(0,229,255,0.3)]" />
              <h1 className="heading-glow font-display text-2xl md:text-3xl font-semibold text-white/90 tracking-wide mb-5">
                Observe <span className="heading-highlight">Reason</span> Execute
              </h1>
              <p className="text-[var(--mist)] text-sm md:text-base leading-relaxed tracking-wide mb-8 max-w-xl">
                An AI-focused idea hackathon bridging inventive thinking and Agentic AI solutions -
                organised by the IEEE Computer Society Chapter of Sabaragamuwa University of Sri Lanka.
                Form a crew, chart your proposal, and pitch your way to the treasury.
              </p>
              <div className="flex flex-wrap gap-4 mb-12">
                <a href="/dashboard" className="btn-outline-cyan">SUBMIT PROPOSAL</a>
                <a href="/login" className="btn-outline-cyan border-white/20 text-white hover:border-[#00E5FF] hover:text-[#05080C] bg-transparent hover:bg-[#00E5FF]">SIGN IN</a>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-lg border-t border-white/10 pt-8">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <p className="font-mono text-lg md:text-xl font-semibold text-[#00E5FF]">{s.value}</p>
                    <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--mist)] mt-1">
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
        
        {/* =========================================
            HORIZONTAL ZONE 1 (Chapters -> Treasury)
        ========================================= */}
        <div id="horizontal-scroll-zone-1" ref={horizontalContainerRef} className="relative h-[250vh] w-full z-20">
          <div className="sticky top-0 h-screen w-full overflow-hidden">
            <div 
              ref={horizontalTrackRef} 
              className="flex h-full w-[200vw] will-change-transform ease-out"
              style={{ transform: 'translateX(-50%)' }} 
            >
              
              {/* LEFT: TREASURY (Sector 03) */}
              <div className="w-screen h-full flex items-center justify-center overflow-y-auto">
                <section id="treasury" className="section-container pt-0 w-full">
                  <Reveal className="w-full flex flex-col items-center text-center">
                    <SectorTag n="03" label="TREASURY" />
                    <h2 className="heading-glow justify-center mb-8">
                      THE <span className="heading-highlight">PRIZE POOL</span>
                    </h2>
                    <p className="heading-sub text-center mb-8">
                      Every finalist walks away with a certificate and mentorship access - the treasury below is
                      reserved for the teams who make it to the top of the leaderboard.
                    </p>
                  </Reveal>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-14 w-full max-w-5xl items-stretch mt-8">
                    <Reveal delay={0} className="h-full">
                      <div className="glass-panel text-left h-full flex flex-col">
                        <h3 className="text-xs text-[var(--mist)] tracking-widest uppercase mb-1">1st Runner Up</h3>
                        <p className="text-sm text-[var(--mist)] mb-6">Awarded for outstanding innovation and technical execution.</p>
                        <p className="text-2xl font-bold text-[#00E5FF] mt-auto">LKR 30,000</p>
                      </div>
                    </Reveal>
                    <Reveal delay={120} className="h-full">
                      <div className="glass-panel text-left border-[var(--gold)]/40 relative overflow-hidden transform md:-translate-y-4 h-full scale-115 flex flex-col shadow-[0_0_30px_rgba(0,229,255,0.12)] mt-4 md:mt-4">
                        <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/10 to-transparent z-0 pointer-events-none" />
                        <span className="badge-mono border-[var(--gold)]/50 text-[var(--gold)] bg-[var(--gold)]/10 absolute top-6 right-6 z-10">Grand Prize</span>
                        <h3 className="text-xs text-[var(--gold)] tracking-widest uppercase mb-1 relative z-10 font-bold">Championship</h3>
                        <p className="text-sm text-white mb-6 relative z-10 pr-24">For the team that conquers the toughest Agentic AI challenge on the journey to victory.</p>
                        <p className="text-3xl font-black text-[var(--gold)] relative z-10 mt-auto">LKR 50,000</p>
                      </div>
                    </Reveal>
                    <Reveal delay={240} className="h-full">
                      <div className="glass-panel text-left h-full flex flex-col">
                        <h3 className="text-xs text-[var(--mist)] tracking-widest uppercase mb-1">2nd Runner Up</h3>
                        <p className="text-sm text-[var(--mist)] mb-6">Celebrating teams that show great potential and sharp problem-solving.</p>
                        <p className="text-2xl font-bold text-[#00E5FF] mt-auto">LKR 20,000</p>
                      </div>
                    </Reveal>
                  </div>
                </section>
              </div>

              {/* RIGHT: CHAPTERS (Sector 01) */}
              <div className="w-screen h-full flex items-center justify-center overflow-y-auto">
                <section id="chapters" className="section-container pt-0 w-full">
                  <Reveal className="w-full flex flex-col items-center text-center">
                    <SectorTag n="01" label="CHAPTERS" />
                    <h2 className="heading-glow justify-center">
                      WHO&apos;S ON THIS <span className="heading-highlight">EXPEDITION</span>
                    </h2>
                    <p className="heading-sub text-center mb-10">
                      InnovaX is run by student volunteers of the IEEE Computer Society Chapter at Sabaragamuwa
                      University of Sri Lanka. Teams of 2 – 4 undergraduates pick one track below and spend six
                      weeks turning an idea into a working Agentic AI proposal.
                    </p>
                  </Reveal>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
                    {TRACKS.map((t, i) => (
                      <Reveal key={t.code} delay={i * 120}>
                        <div className="glass-panel h-full text-left flex flex-col hover:scale-105">
                          <span className="font-mono text-xs text-[#00E5FF]/70 tracking-widest mb-4">{t.code}</span>
                          <h3 className="font-display text-lg font-semibold text-white mb-3">{t.title}</h3>
                          <p className="text-sm text-[var(--mist)] leading-relaxed">{t.desc}</p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </section>
              </div>

            </div>
          </div>
        </div>
        </div>

        {/* =========================================
            JOURNEY (Sector 03) - Vertical Scroll
        ========================================= */}
        <section id="journey" className="section-container pt-20 pb-20">
          <Reveal className="w-full flex flex-col items-center text-center">
            <SectorTag n="03" label="JOURNEY" />
            <h2 className="heading-glow justify-center">
              THE <span className="heading-highlight">ROUTE</span> AHEAD
            </h2>
            <p className="text-[var(--mist)] italic text-sm mb-6 text-center max-w-xl">
              &ldquo;Every milestone tells a story. Follow the journey to the final treasure.&rdquo;
            </p>
          </Reveal>

          <div className="relative w-full max-w-3xl mx-auto py-10">
            <div className="absolute left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-[#00E5FF]/60 via-white/10 to-[var(--gold)]/60" />

            {TIMELINE.map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="relative flex items-center justify-between w-full mb-12">
                  {item.side === 'right' ? (
                    <>
                      <div className="w-5/12 text-right pr-8 bg-[#121822] pt-4 pb-4 rounded-xl">
                        <div className={`w-8/12 pl-8 text-left font-mono font-bold text-sm tracking-widest ${item.gold ? 'text-[var(--gold)]' : 'text-[#00E5FF]'}`}>
                          {item.date}
                        </div>
                        <h3 className="font-display text-lg font-bold text-white">{item.title}</h3>
                        <p className="text-sm text-[var(--mist)] mt-2">{item.desc}</p>
                      </div>
                      <span className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${item.gold ? 'bg-[var(--gold)] shadow-[0_0_12px_var(--gold)]' : 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]'}`} />
                      <div className="w-5/12"></div>
                    </>
                  ) : (
                    <>
                      <div className="w-5/12 text-right pr-8"></div>
                      <span className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${item.gold ? 'bg-[var(--gold)] shadow-[0_0_12px_var(--gold)]' : 'bg-white shadow-[0_0_10px_white]'}`} />
                      <div className="w-5/12 pl-8 text-left bg-[#121822] pt-4 pb-4 rounded-xl">
                        <div className={`w-8/12 text-left pr-6 pb-4 font-mono font-bold text-sm tracking-widest ${item.gold ? 'text-[var(--gold)]' : 'text-[#00E5FF]'}`}>
                          {item.date}
                        </div>
                        {item.tag && <span className="badge-mono border-[#00E5FF]/50 bg-[#00E5FF] text-[#05080C] mb-2 inline-block">{item.tag}</span>}
                        <h3 className="font-display text-lg font-bold text-white">{item.title}</h3>
                        <p className="text-sm text-[var(--mist)] mt-2">{item.desc}</p>
                      </div>
                    </>
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
                <div className="w-screen h-full flex items-center justify-center overflow-y-auto">
  
 
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
                      <div className="partner-details" aria-live="polite">
                        <div className="partner-logo-frame">
                          <img
                            src={PARTNERS[activePartner].logo}
                            alt={`${PARTNERS[activePartner].company} logo`}
                            className="partner-logo"
                            onError={(event) => { event.currentTarget.style.display = 'none'; }}
                          />
                          <span className="partner-logo-fallback" aria-hidden="true">{PARTNERS[activePartner].company.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="partner-tier">{PARTNERS[activePartner].tier} Partner</p>
                          <h3 className="font-display text-xl md:text-2xl font-bold text-white">{PARTNERS[activePartner].company}</h3>
                          <p className="text-sm text-[var(--mist)] mt-2 leading-relaxed max-w-xl">{PARTNERS[activePartner].description}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </section>
              </div>

              {/* RIGHT: FAQ (Sector 05) */}
              <div className="w-screen h-full flex items-center justify-center overflow-y-auto">
                <section id="faq" className="section-container">
                  <Reveal className="w-full flex flex-col items-center text-center">
                    <SectorTag n="05" label="FAQ" />
                    <h2 className="heading-glow justify-center mb-2">
                      KNOWN <span className="heading-highlight">HAZARDS</span>
                    </h2>
                    <p className="heading-sub text-center mb-8">
                      Answers to what most explorers ask before setting off. Still stuck? Reach the crew below.
                    </p>
                  </Reveal>

                  <div className="w-full max-w-3xl flex flex-col gap-3">
                    {FAQS.map((f, i) => {
                      const open = openFaq === i;
                      return (
                        <Reveal key={f.q} delay={i * 60}>
                          <div className="glass-panel !p-0 overflow-hidden">
                            <button
                              onClick={() => setOpenFaq(open ? null : i)}
                              aria-expanded={open}
                              className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]/60"
                            >
                              <span className="font-display text-sm md:text-base font-semibold text-white">
                                {f.q}
                              </span>
                              <div
                                className={`shrink-0 w-7 h-7 rounded-full border border-[#00E5FF] flex items-center justify-center text-[#00E5FF]`}
                              >
                                <FaPlus className={`w-4 h-4 transition-transform duration-300 ${
                                  open ? 'rotate-45' : ''
                                }`} />
                              </div>
                            </button>
                            <div
                              className="grid transition-all duration-300 ease-out"
                              style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                            >
                              <div className="overflow-hidden">
                                <p className="text-sm text-[var(--mist)] leading-relaxed px-6 pb-6">{f.a}</p>
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
        <div className="w-full h-32 bg-[#05080C] relative z-30 border-y border-[#121822] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center">
          <div className="w-full max-w-7xl mx-auto px-6 flex items-center gap-4 opacity-40">
            <div className="h-px bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent flex-1" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-[#00E5FF]">SYSTEM CHECKPOINT</span>
            <div className="h-px bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent flex-1" />
          </div>
        
        </div>

        {/* =========================================
            REGISTER & FOOTER (Sector 06) w/ Video BG & Mist
        ========================================= */}
        <div className="relative w-full flex flex-col items-center justify-center overflow-hidden z-20">
          <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
            <video src="/blue_power_owl.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
            
            <div className="absolute inset-0 bg-[#05080C]/60 backdrop-blur-[2px]" />
            <div className="absolute bottom-0 left-0 w-full h-[60vh] bg-gradient-to-t from-[#05080C] via-[#05080C]/95 to-transparent z-10" />
          </div>

          <section id="register" className="flex flex-col items-center justify-center pt-16 pb-2 w-full text-center relative z-10">
            <Reveal className="flex flex-col items-center px-6">
              <SectorTag n="06" label="REGISTER" />
              <h2 className="font-display text-4xl md:text-6xl font-black tracking-widest uppercase text-white mb-8">
                READY TO <span className="heading-highlight">DIVE IN?</span>
              </h2>
              
              {/* Replace the '#' with your actual Google Form or registration link */}
              <a 
                href="/register" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-solid-cyan inline-block mb-0"
              >
                REGISTER NOW
              </a>
            </Reveal>
          </section>

          <div className="w-full pt-12 pb-48 flex flex-col items-center relative z-20 border-t border-[#121822]/50">
            <Reveal className="w-full max-w-4xl flex flex-col items-center px-6">
              <p className="text-[var(--mist)] italic text-sm mb-12 text-center">
                &ldquo;Every great journey begins with a conversation.&rdquo;
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <a href="mailto:ssomaweera@foc.sab.ac.lk" className="group border border-[#121822] rounded-full px-6 py-3 text-xs text-[var(--mist)] hover:text-white hover:border-[#00E5FF] bg-[#121822]/50 hover:bg-[#121822] transition-all duration-300 flex items-center gap-3">
                  <svg className="w-4 h-4 text-[#00E5FF] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  ssomaweera@foc.sab.ac.lk
                </a>
                <a href="mailto:innovax.susl@gmail.com" className="group border border-[#121822] rounded-full px-6 py-3 text-xs text-[var(--mist)] hover:text-white hover:border-[#00E5FF] bg-[#121822]/50 hover:bg-[#121822] transition-all duration-300 flex items-center gap-3">
                  <svg className="w-4 h-4 text-[#00E5FF] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  innovax.susl@gmail.com
                </a>
              </div>

              <div className="flex justify-center gap-4 mb-16">
                {[
                  { name: "LinkedIn", icon: <FaLinkedinIn />, href: "#" },
                  { name: "Facebook", icon: <FaFacebookF />, href: "#" },
                  { name: "YouTube", icon: <FaYoutube />, href: "#" },
                  { name: "Instagram", icon: <FaInstagram />, href: "#" },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-10 h-10 rounded-full border border-[#FFFFFF] flex items-center justify-center
                              hover:border-[#00E5FF] hover:bg-[#00E5FF]/10
                              text-[var(--mist)] hover:text-[#00E5FF]
                              hover:scale-110 hover:rotate-10"
                    aria-label={social.name}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8 w-full">
                <div className="flex items-center gap-4">
                  <img src="https://github.com/nngeek195/mywork/blob/b1/Pasted%20image.png?raw=true" alt="InnovaX Small Logo" className="h-8 md:h-10 object-contain drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]" />
                </div>
                <span className="hidden md:block w-px h-10 bg-white/20"></span>
                <div className="text-center md:text-left">
                  <p className="text-xs font-bold tracking-widest text-white uppercase mb-1">IEEE Computer Society</p>
                  <p className="text-[10px] text-[var(--mist)] tracking-[0.2em] uppercase">Sabaragamuwa University of Sri Lanka</p>
                </div>
              </div>

              <div className="text-[10px] text-[var(--mist)]/50 uppercase tracking-widest font-mono flex flex-wrap justify-center items-center gap-3">
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
      <div className="fixed bottom-0 left-0 w-full h-16 bg-[#05080C]/90 backdrop-blur-md border-t border-white/10 z-[100] flex items-center justify-center overflow-x-auto">
        <nav className="flex items-center gap-8 px-6 text-xs font-mono tracking-widest uppercase min-w-max h-full">
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