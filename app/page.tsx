'use client';

import React, { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Demo content — swap with real copy once confirmed by the chapter   */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { id: 'gateway', label: 'Gateway' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'treasury', label: 'Treasury' },
  { id: 'journey', label: 'Journey' },
  { id: 'partners', label: 'Partners' },
  { id: 'faq', label: 'FAQ' },
  { id: 'register', label: 'Register' },
]; //

const STATS = [
  { label: 'Prize Pool', value: 'LKR 100K+' },
  { label: 'Proposals Due', value: 'SEP 08' },
  { label: 'Final Round', value: 'OCT 10' },
  { label: 'Open Tracks', value: '03' },
]; //

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
]; //

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
]; //

const PARTNER_TIERS = [
  {
    tier: 'Platinum Partner',
    price: 'LKR 75,000',
    perks: 'Prime stage branding, a 10-minute speaking slot, and a seat on the judging panel.',
  },
  {
    tier: 'Gold Partner',
    price: 'LKR 50,000',
    perks: 'Prominent branding, welcome-kit inclusion, and a 5-minute speaking slot.',
  },
]; //

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
]; //

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                              */
/* ------------------------------------------------------------------ */

function SectorTag({ n, label }: { n: string; label: string }) {
  return <div className="sector-tag">{`SECTOR ${n} — ${label}`}</div>;
} //

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
} //

/* ------------------------------------------------------------------ */

export default function Home() {
  const [activeSection, setActiveSection] = useState('gateway');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const rootRef = useRef<HTMLElement>(null); //

  // --- NEW: Refs for the Scroll Video ---
  const scrollVideoRef = useRef<HTMLVideoElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);

  // --- NEW: Scroll-Scrubbing Logic ---
  // --- NEW: Exact Timestamp Scroll-Scrubbing Logic ---
  useEffect(() => {
    // Define exactly which seconds of the video belong to which section
    const sectionTimestamps = [
      { id: 'chapters', startAt: 0, endAt: 0.8 },    // Plays 0s to 3s
      { id: 'treasury', startAt: 0.8, endAt: 3 },    // Plays 3s to 6s
      { id: 'journey',  startAt: 3, endAt: 7 },    // Plays 6s to 9s
      { id: 'partners', startAt: 7, endAt: 12 },   // Plays 9s to 12s
      { id: 'faq',      startAt: 12, endAt: 14 },  // Plays 12s to 14s
      { id: 'register', startAt: 14, endAt: 15 },  // Plays 14s to 15s
    ];

    const handleScroll = () => {
      if (!scrollVideoRef.current) return;
      
      const video = scrollVideoRef.current;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Loop through our sections to find which one is currently on screen
      for (const section of sectionTimestamps) {
        const element = document.getElementById(section.id);
        if (!element) continue;

        const elementTop = element.offsetTop;
        const elementHeight = element.offsetHeight;

        // Check if this specific section has entered the screen
        if (scrollY + windowHeight >= elementTop && scrollY <= elementTop + elementHeight) {
          
          // Calculate how far the user has scrolled through THIS specific section (0.0 to 1.0)
          const scrolledPast = (scrollY + windowHeight) - elementTop;
          const totalScrollableArea = elementHeight + windowHeight;
          const progress = Math.min(Math.max(scrolledPast / totalScrollableArea, 0), 1);
          
          // Map that progress to the exact seconds allocated for this section
          const durationForSection = section.endAt - section.startAt;
          const targetTime = section.startAt + (durationForSection * progress);
          
          // Update the video
          if (!isNaN(video.duration) && video.duration > 0) {
            window.requestAnimationFrame(() => {
              video.currentTime = targetTime;
            });
          }
          
          // Once we find the active section and update the video, stop the loop
          break; 
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on load to set the initial frame
    handleScroll(); 
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-reveal: fade+rise any .reveal element into view once.
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
  }, []); //

  // Scroll-spy: light up the current section in the bottom nav.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      // This margin ensures the section becomes active when it enters the middle 40% of the screen
      { rootMargin: '-30% 0px -30% 0px', threshold: 0 } 
    );

    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main ref={rootRef} className="relative bg-transparent">
      {/* Background layer — cobalt wash + cartographic grid */}
      <div className="fixed inset-0 w-full h-full -z-20 bg-gradient-to-b from-[#0055FF]/12 via-[#05080C] to-[#05080C]" />
      <div className="fixed inset-0 w-full h-full -z-10 chart-grid" />

      {/* --- NEW: The Scroll-Scrubbing Background Video --- */}
      {/* Kept at z-[-15] so it sits behind the content but above the base background */}
      <div className="fixed inset-0 w-full h-full z-[-15] overflow-hidden bg-[#05080C]">
        <video
          ref={scrollVideoRef}
          src="/scroll-bg.mp4"
          muted
          playsInline
          className="w-full h-full object-cover opacity-15" 
        />
      </div>

      {/* =========================================
          SECTION 1 — GATEWAY
      ========================================= */}
      <section
        id="gateway"
        className="min-h-screen flex items-center p-8 md:p-20 relative z-10 w-full overflow-hidden"
      >
        {/* --- Section 1 Background Video (Independent from scroll) --- */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none bg-[#05080C]">
          <video
            src="/hero-bg.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* --- Dark Overlay to ensure text is readable --- */}
        <div className="absolute inset-0 bg-[#05080C]/70 z-10 pointer-events-none" />

        {/* --- 2-Column Content Wrapper --- */}
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between relative z-20 gap-12">
          
          {/* LEFT COLUMN: Text Content */}
          <div className="max-w-2xl relative z-20 flex-shrink-0">
            <div className="badge-mono border-[#00E5FF]/40 text-[#00E5FF] bg-[#00E5FF]/[0.06] inline-block mb-6">
              IEEE Computer Society · SUSL Chapter Presents
            </div>

            <img
              src="https://github.com/nngeek195/mywork/blob/b1/Pasted%20image.png?raw=true"
              alt="InnovaX Logo"
              className="w-full max-w-sm md:max-w-md mb-4 drop-shadow-[0_0_15px_rgba(0,229,255,0.3)]"
            />

            <h1 className="heading-glow font-display text-2xl md:text-3xl font-semibold text-white/90 tracking-wide mb-5">
              Observe <span className="heading-highlight">Reason</span> Execute
            </h1>

            <p className="text-[var(--mist)] text-sm md:text-base leading-relaxed tracking-wide mb-8 max-w-xl">
              An AI-focused idea hackathon bridging inventive thinking and Agentic AI solutions -
              organised by the IEEE Computer Society Chapter of Sabaragamuwa University of Sri Lanka.
              Form a crew, chart your proposal, and pitch your way to the treasury.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <button className="btn-outline-cyan">
                SUBMIT PROPOSAL
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className="btn-outline-cyan border-white/20 text-white hover:border-[#00E5FF] hover:text-[#05080C] bg-transparent hover:bg-[#00E5FF]">
                SIGN IN
              </button>
            </div>

            {/* Stat strip */}
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

      {/* --- NEW: Scroll Wrapper for Sections 2-7 --- */}
      {/* This wrapper is used to calculate the math for the scrolling video */}
      <div ref={scrollContentRef} className="relative z-10 bg-transparent">
        
        {/* =========================================
            SECTION 2 — CHAPTERS
        ========================================= */}
        <section id="chapters" className="section-container pt-0">
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

        {/* =========================================
            SECTION 3 — TREASURY
        ========================================= */}
        <section id="treasury" className="section-container pt-0">
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
                <p className="text-sm text-[var(--mist)] mb-6">
                  Awarded for outstanding innovation and technical execution.
                </p>
                <p className="text-2xl font-bold text-[#00E5FF] mt-auto">LKR 30,000</p>
              </div>
            </Reveal>

            <Reveal delay={120} className="h-full">
              <div className="glass-panel text-left border-[var(--gold)]/40 relative overflow-hidden transform md:-translate-y-4 h-full scale-115 flex flex-col shadow-[0_0_30px_rgba(0,229,255,0.12)] mt-4 md:mt-4">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/10 to-transparent z-0 pointer-events-none" />
                <span className="badge-mono border-[var(--gold)]/50 text-[var(--gold)] bg-[var(--gold)]/10 absolute top-6 right-6 z-10">
                  Grand Prize
                </span>
                <h3 className="text-xs text-[var(--gold)] tracking-widest uppercase mb-1 relative z-10 font-bold">
                  Championship
                </h3>
                <p className="text-sm text-white mb-6 relative z-10 pr-24">
                  For the team that conquers the toughest Agentic AI challenge on the journey to victory.
                </p>
                <p className="text-3xl font-black text-[var(--gold)] relative z-10 mt-auto">LKR 50,000</p>
              </div>
            </Reveal>

            <Reveal delay={240} className="h-full">
              <div className="glass-panel text-left h-full flex flex-col">
                <h3 className="text-xs text-[var(--mist)] tracking-widest uppercase mb-1">2nd Runner Up</h3>
                <p className="text-sm text-[var(--mist)] mb-6">
                  Celebrating teams that show great potential and sharp problem-solving.
                </p>
                <p className="text-2xl font-bold text-[#00E5FF] mt-auto">LKR 20,000</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* =========================================
            SECTION 4 — JOURNEY
        ========================================= */}
        <section id="journey" className="section-container">
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
                      <div className="w-5/12 text-right pr-8">
                        <h3 className="font-display text-lg font-bold text-white">{item.title}</h3>
                        <p className="text-sm text-[var(--mist)] mt-2">{item.desc}</p>
                      </div>
                      <span
                        className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${
                          item.gold
                            ? 'bg-[var(--gold)] shadow-[0_0_12px_var(--gold)]'
                            : 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]'
                        }`}
                      />
                      <div
                        className={`w-5/12 pl-8 text-left font-mono font-bold text-sm tracking-widest ${
                          item.gold ? 'text-[var(--gold)]' : 'text-[#00E5FF]'
                        }`}
                      >
                        {item.date}
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`w-5/12 text-right pr-8 font-mono font-bold text-sm tracking-widest ${
                          item.gold ? 'text-[var(--gold)]' : 'text-[#00E5FF]'
                        }`}
                      >
                        {item.date}
                      </div>
                      <span
                        className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${
                          item.gold
                            ? 'bg-[var(--gold)] shadow-[0_0_12px_var(--gold)]'
                            : 'bg-white shadow-[0_0_10px_white]'
                        }`}
                      />
                      <div className="w-5/12 pl-8 text-left">
                        {item.tag && (
                          <span className="badge-mono border-[#00E5FF]/50 bg-[#00E5FF] text-[#05080C] mb-2 inline-block">
                            {item.tag}
                          </span>
                        )}
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
            SECTION 5 — PARTNERS
        ========================================= */}
        <section id="partners" className="section-container text-center">
          <Reveal className="w-full flex flex-col items-center">
            <SectorTag n="04" label="PARTNERS" />
            <h2 className="heading-glow justify-center">
              THE <span className="heading-highlight">GUARDIANS</span>
            </h2>
            <p className="text-[var(--mist)] italic text-sm mb-10 text-center max-w-xl">
              &ldquo;These are the guardians whose strength carries every explorer this far.&rdquo;
            </p>
          </Reveal>

          <Reveal className="glass-panel w-full max-w-4xl border-[#00E5FF]/20 border">
            <div className="badge-mono border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10 inline-block mb-8">
              Sponsor Packages
            </div>

            <div className="grid grid-cols-1 gap-6 text-left">
              {PARTNER_TIERS.map((p) => (
                <div
                  key={p.tier}
                  className="flex flex-col md:flex-row items-start md:items-center gap-6 p-4 rounded-xl hover:bg-white/5 transition"
                >
                  <div className="w-32 h-16 bg-[var(--slate-raised)] rounded flex items-center justify-center shrink-0 border border-white/10 font-mono text-xs text-[var(--mist)]">
                    LOGO
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-white">{p.tier}</h3>
                    <p className="text-sm text-[var(--mist)] mt-1">
                      {p.price}. {p.perks}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="mailto:ssomaweera@foc.sab.ac.lk?subject=InnovaX%20Partnership%20Enquiry"
              className="inline-block mt-8 text-xs font-mono tracking-widest uppercase text-[#00E5FF] hover:text-white transition"
            >
              Become a Partner →
            </a>
          </Reveal>
        </section>

        {/* =========================================
            SECTION 6 — FAQ
        ========================================= */}
        <section id="faq" className="section-container">
          <Reveal className="w-full flex flex-col items-center text-center">
            <SectorTag n="05" label="FAQ" />
            <h2 className="heading-glow justify-center">
              KNOWN <span className="heading-highlight">HAZARDS</span>
            </h2>
            <p className="heading-sub text-center">
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
                      <span
                        className={`shrink-0 w-6 h-6 rounded-full border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF] transition-transform duration-300 ${
                          open ? 'rotate-45' : ''
                        }`}
                      >
                        +
                      </span>
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

        {/* =========================================
            SECTION 7 — REGISTER & FOOTER
        ========================================= */}
        <section
          id="register"
          className="flex flex-col items-center justify-center pt-64 w-full text-center relative z-10"
        >
          {/* --- Massive Gradient to spread the black upwards --- */}
          <div className="absolute bottom-0 left-0 w-full h-[150%] bg-gradient-to-b from-transparent via-[#05080C]/90 to-[#05080C] z-[-1]" />

          {/* Register Call to Action */}
          <Reveal className="flex flex-col items-center px-6 mb-32 relative z-10">
            <SectorTag n="06" label="REGISTER" />
            <h2 className="font-display text-4xl md:text-6xl font-black tracking-widest uppercase text-white mb-8">
              READY TO <span className="heading-highlight">DIVE IN?</span>
            </h2>
            <button className="btn-solid-cyan">REGISTER NOW</button>
          </Reveal>

          {/* =========================================
              FOOTER BLOCK
          ========================================= */}
          <div className="w-full bg-[#05080C] pt-12 pb-48 flex flex-col items-center relative z-20 border-t border-[#121822]/50">
            <Reveal className="w-full max-w-4xl flex flex-col items-center px-6">
              
              <p className="text-[var(--mist)] italic text-sm mb-12 text-center">
                &ldquo;Every great journey begins with a conversation.&rdquo;
              </p>

              {/* Email Pills */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <a
                  href="mailto:ssomaweera@foc.sab.ac.lk"
                  className="group border border-[#121822] rounded-full px-6 py-3 text-xs text-[var(--mist)] hover:text-white hover:border-[#00E5FF] bg-[#121822]/50 hover:bg-[#121822] transition-all duration-300 flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-[#00E5FF] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  ssomaweera@foc.sab.ac.lk
                </a>
                <a
                  href="mailto:innovax.susl@gmail.com"
                  className="group border border-[#121822] rounded-full px-6 py-3 text-xs text-[var(--mist)] hover:text-white hover:border-[#00E5FF] bg-[#121822]/50 hover:bg-[#121822] transition-all duration-300 flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-[#00E5FF] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  innovax.susl@gmail.com
                </a>
              </div>

              {/* Social Icons */}
              <div className="flex justify-center gap-4 mb-16">
                {[
                  { name: 'LinkedIn', path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z M2 9h4v12H2z M4 2a2 2 0 11-2 2 2 2 0 012-2z' },
                  { name: 'Facebook', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                  { name: 'YouTube', path: 'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 00-1.94 2C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 001.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 001.94-2C23 15.86 23 12 23 12s0-3.86-.46-5.58z M9.5 15.5v-7l6.5 3.5-6.5 3.5z' },
                  { name: 'Instagram', path: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 6.5h11a3 3 0 013 3v11a3 3 0 01-3 3h-11a3 3 0 01-3-3v-11a3 3 0 013-3z' }
                ].map((social) => (
                  <a 
                    key={social.name} 
                    href="#" 
                    className="w-10 h-10 rounded-full border border-[#121822] flex items-center justify-center hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-[var(--mist)] hover:text-[#00E5FF] transition-all duration-300"
                    aria-label={social.name}
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d={social.path}></path>
                    </svg>
                  </a>
                ))}
              </div>

              {/* Organizer Block with Vertical Divider & Small Logo */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12 w-full">
                
                {/* --- ADDED LOGO NEXT TO TEXT --- */}
                <div className="flex items-center gap-4">
                  <img
                    src="https://github.com/nngeek195/mywork/blob/b1/Pasted%20image.png?raw=true"
                    alt="InnovaX Small Logo"
                    className="h-8 md:h-10 object-contain drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                  />
                </div>

                <span className="hidden md:block w-px h-10 bg-white/20"></span>
                <div className="text-center md:text-left">
                  <p className="text-xs font-bold tracking-widest text-white uppercase mb-1">IEEE Computer Society</p>
                  <p className="text-[10px] text-[var(--mist)] tracking-[0.2em] uppercase">Sabaragamuwa University of Sri Lanka</p>
                </div>
              </div>

              {/* Copyright Text */}
              <div className="text-[10px] text-[var(--mist)]/50 uppercase tracking-widest font-mono flex flex-wrap justify-center items-center gap-3">
                <span>© InnovaX 2026.</span>
                <span className="hidden md:inline">|</span>
                <span>All Rights Reserved.</span>
                <span className="hidden md:inline">|</span>
                <span className="text-center">Organized by Faculty of Computing, SUSL.</span>
              </div>
              
            </Reveal>
          </div>
        </section>

      </div> {/* <-- End of scrollContentRef wrapper --> */}

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
                
                {/* Glowing Underline Indicator */}
                {active && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#00E5FF] shadow-[0_-2px_10px_rgba(0,229,255,1)] rounded-t-md" />
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </main>
  );
}