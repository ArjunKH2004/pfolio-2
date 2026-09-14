import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowRight, Camera, Download, ExternalLink, Menu, Minus, Plus, Volume2, VolumeX, X } from 'lucide-react';
import './styles.css';
import AsciiBlackHole, { AsciiBlackHoleErrorBoundary } from './AsciiBlackHole';

type Project = {
  slug: string;
  number: string;
  name: string;
  year: string;
  kind: string;
  status: string;
  line: string;
  accent: string;
  summary: string;
  role: string;
  observed: string;
  question: string;
  tried: string;
  result: string;
  learned: string;
  link: string;
};

type ArchiveItem = {
  number: string;
  title: string;
  year: string;
  status: string;
  text: string;
  lesson: string;
};

const projects: Project[] = [
  { slug:'ksrtc-workflow', number:'01', name:'ksrtc-workflow', year:'2026', kind:'UX research', status:'INDEPENDENT STUDY', accent:'#ED7C22', line:'A payment error that happens before the ticket exists.', role:'Field research, journey mapping, interaction design', summary:'A self-initiated study of a recurring payment-mode error in the KSRTC Chalo ETM workflow. Not affiliated with KSRTC or Chalo.', observed:'Regular bus travel exposed a payment-mode failure before passenger confirmation, with no clear recovery after printing.', question:'How might payment be confirmed without slowing an already pressured ticketing workflow?', tried:'I combined field observation with a contextual interview, then mapped the journey across six stages.', result:'A lightweight confirmation before printing, supported by a Recent Tickets log for eligible cash corrections while preserving the audit trail.', learned:'When failure occurs before the visible output, prevention is usually more useful than repair. Feedback is welcome. This study may contain mistakes.', link:'https://www.behance.net/gallery/253455687/Rethinking-the-KSRTC-Chalo-ETM-Workflow' },
  { slug:'tejasvi-26', number:'02', name:'tejasvi-26', year:'2026', kind:'Brand system', status:'VERIFIED PROJECT', accent:'#C4161C', line:'A festival identity built around The Ritual of Fire.', role:'Design direction, identity, visual system', summary:'The end-to-end identity for Tejasvi 2026, Marian Engineering College’s intercollegiate cultural festival.', observed:'The festival needed a visual identity that could hold together many teams, formats and event moments.', question:'How can fire behave as a system instead of appearing as decoration?', tried:'I developed a Promethean flame mark, a Bella Sophie wordmark and a connected language of colour, typography and iconography.', result:'A complete visual system spanning posters, event communication and merchandise.', learned:'An identity becomes useful when other people can extend it without weakening it.', link:'https://www.behance.net/gallery/244949181/Tejasvi-2026-MEC-Intercollegiate-Fest' },
  { slug:'growit', number:'03', name:'growit', year:'2026', kind:'Product design', status:'PROJECT', accent:'#3D889D', line:'One distributor experience instead of disconnected workflows.', role:'Product design, information architecture, prototyping', summary:'A unified digital platform concept for mutual fund distributors.', observed:'Essential distributor activities were spread across fragmented workflows, increasing effort and reducing clarity.', question:'What should a distributor see and do when the product behaves like one system?', tried:'I reorganised key activities, clarified the information hierarchy and prototyped a consistent navigation model.', result:'A unified interface that gives essential activities a shared structure while keeping each workflow legible.', learned:'Consistency is not cosmetic. It reduces the amount of product logic a person has to relearn.', link:'https://www.behance.net/gallery/254159901/GrowIt-A-Unified-Distributor-Experience' }
];

const archiveItems: ArchiveItem[] = [
  { number:'A-01', title:'Unique World Robotics India', year:'2025–26', status:'GRAPHIC DESIGNER', text:'Created visual assets and brand collateral across print and digital touchpoints for multiple robotics product lines.', lesson:'Experience working across different product identities while maintaining consistency across visual communication.' },
  { number:'A-02', title:'Elenco Corporation', year:'2025', status:'GRAPHIC DESIGNER', text:'Created visual content for marketing campaigns, working within established brand systems and communication requirements.', lesson:'Experience working alongside senior designers within a structured professional design workflow.' },
  { number:'A-03', title:'Svas.pro', year:'2025', status:'UI/UX DESIGNER', text:'Designed interfaces and interactive prototypes for a digital platform, incorporating user testing and feedback into the design process.', lesson:'Worked through Figma handoff with developers and produced 30+ social creatives, contributing to a reported 30% increase in engagement.' },
  { number:'A-04', title:'MuLearn Foundation', year:'2023–25', status:'ASSOCIATE', text:'Worked across social media, campaigns, creative production, and community initiatives within a large student-led learning ecosystem.', lesson:'Contributed to campaigns including Global Game Jam Kerala and Perµte, with reported growth in registrations and engagement.' }
];

const systemStatements = [
  { n: '01', title: "I LIKE PROBLEMS THAT DON'T COME WITH INSTRUCTIONS.", copy: "Ambiguous problems are usually more interesting than well-defined ones. That's where most of my work starts." },
  { n: '02', title: 'I CARE ABOUT HOW THINGS WORK, NOT JUST HOW THEY LOOK.', copy: 'Interfaces are the visible part. The decisions underneath them are usually more interesting.' },
  { n: '03', title: 'I MAKE A LOT OF THINGS THAT NEVER SHIP.', copy: 'Some become products. Some become prototypes. Some teach me what not to do.' }
];

const capabilitiesList = [
  { n: '01', title: 'MESSY PROBLEMS.', copy: 'Making sense of ambiguous challenges.' },
  { n: '02', title: 'IDEAS TO INTERFACES.', copy: 'Turning raw concepts into intuitive UI.' },
  { n: '03', title: "WHY IT FAILS.", copy: "Figuring out why something isn't working." },
  { n: '04', title: "PROTOTYPING.", copy: "Building proofs when words aren't enough." },
  { n: '05', title: 'PRODUCT POLISH.', copy: 'Making ugly products less ugly.' }
];

function Command({ children }: { children: React.ReactNode }) {
  return <div className="command"><span className="command-user">kharjun@internet</span><span>:~$</span> {children}</div>;
}

function ScrollLetterReveal({ text, breaks = [] }: { text: string; breaks?: number[] }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (reduced) { setRevealed(text.length); return; }
      const rect = element.getBoundingClientRect();
      const start = window.innerHeight * 0.88;
      const end = window.innerHeight * 0.28;
      const progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end)));
      setRevealed(Math.round(progress * text.length));
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    return () => { removeEventListener('scroll', request); removeEventListener('resize', request); if (frame) cancelAnimationFrame(frame); };
  }, [text]);
  return <p ref={ref} className="scroll-letter-reveal" aria-label={text}>{[...text].map((character, index) => <React.Fragment key={index}>{breaks.includes(index) && <br/>}<span className={index < revealed ? 'revealed' : ''} aria-hidden="true">{character === ' ' ? '\u00a0' : character}</span></React.Fragment>)}</p>;
}

function ProjectVisual({ slug, compact = false }: { slug: string; compact?: boolean }) {
  if (slug === 'ksrtc-workflow') return (
    <div className={`project-visual image-project-visual ${compact ? 'compact' : ''}`}>
      <img src="/projects/ksrtc-cover.webp" alt="Rethinking the KSRTC Chalo ticketing workflow case study cover" loading={compact ? 'lazy' : 'eager'}/>
    </div>
  );
  if (slug === 'tejasvi-26') return (
    <div className={`project-visual image-project-visual tejasvi-project-visual ${compact ? 'compact' : ''}`}>
      <img src="/projects/tejasvi-cover.webp" alt="Tejasvi 26, The Ritual of Fire brand identity artwork" loading={compact ? 'lazy' : 'eager'}/>
    </div>
  );
  return (
    <div className={`project-visual image-project-visual growit-project-visual ${compact ? 'compact' : ''}`}>
      <img src="/projects/growit-cover.png" alt="GrowIt - Unified Platform for Mutual Fund Distributors" loading={compact ? 'lazy' : 'eager'}/>
    </div>
  );
}

function ProjectDetail({ project, close }: { project: Project; close: () => void }) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(close);
  const closingRef = React.useRef(false);
  const [closing, setClosing] = useState(false);
  closeRef.current = close;
  const requestClose = React.useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setClosing(true);
    window.setTimeout(() => closeRef.current(), reduced ? 0 : 180);
  }, []);
  useEffect(() => {
    const scrollPosition = window.scrollY;
    const body = document.body;
    const root = document.documentElement;
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      rootOverflow: root.style.overflow,
      rootOverscroll: root.style.overscrollBehavior
    };
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    body.style.position = 'fixed';
    body.style.top = `-${scrollPosition}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])') || []);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
      if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    addEventListener('keydown', onKey);
    return () => {
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
      root.style.overflow = previous.rootOverflow;
      root.style.overscrollBehavior = previous.rootOverscroll;
      removeEventListener('keydown', onKey);
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    };
  }, [requestClose]);

  return <div className={`project-modal-backdrop ${closing ? 'is-closing' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) requestClose(); }}>
    <div ref={dialogRef} className={`project-modal ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby={`project-title-${project.slug}`} style={{'--project-accent': project.accent} as React.CSSProperties}>
      <header className="project-modal-header"><div><span>PROJECT FILE / {project.number}</span><b>/projects/{project.name}</b></div><button onClick={requestClose} aria-label={`Close ${project.name}`}><X size={20}/></button></header>
      <div className="project-modal-scroll">
        <section className="project-modal-intro"><div className="project-modal-title"><span>{project.year} / {project.kind} / {project.status}</span><h1 id={`project-title-${project.slug}`}>{project.name}</h1><p>{project.line}</p></div><div className="project-modal-meta"><div><span>ROLE</span><b>{project.role}</b></div><div><span>STATUS</span><b>{project.status}</b></div></div></section>
        <div className="project-modal-media"><ProjectVisual slug={project.slug}/></div>
        <section className="project-modal-story-grid-section">
          <div className="section-heading-mini"><span>04 STAGES / RESEARCH & DIRECTION</span></div>
          <div className="statements ksrtc-steps-grid">
            <article className="statement capability-statement">
              <span>01</span>
              <h2>OBSERVED CHALLENGE.</h2>
              <p>{project.observed}</p>
            </article>
            <article className="statement capability-statement">
              <span>02</span>
              <h2>KEY QUESTION.</h2>
              <p>{project.question}</p>
            </article>
            <article className="statement capability-statement">
              <span>03</span>
              <h2>EXPLORED APPROACH.</h2>
              <p>{project.tried}</p>
            </article>
            <article className="statement capability-statement">
              <span>04</span>
              <h2>FINAL DIRECTION.</h2>
              <p>{project.result}</p>
            </article>
          </div>
        </section>
        <section className="project-modal-learning"><span>WHAT I LEARNED</span><h2>{project.learned}</h2></section>
        <footer className="project-modal-footer"><p>Full project documentation is available on Behance.</p><a href={project.link} target="_blank" rel="noreferrer">READ MORE <ExternalLink size={17}/></a><button onClick={requestClose}><ArrowLeft size={16}/> BACK TO PROJECTS</button></footer>
      </div>
    </div>
  </div>;
}

function ResumeDetail({ close }: { close: () => void }) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(close);
  const closingRef = React.useRef(false);
  const [closing, setClosing] = useState(false);
  closeRef.current = close;
  const requestClose = React.useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setClosing(true);
    window.setTimeout(() => closeRef.current(), reduced ? 0 : 180);
  }, []);
  useEffect(() => {
    const scrollPosition = window.scrollY;
    const body = document.body;
    const root = document.documentElement;
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      rootOverflow: root.style.overflow,
      rootOverscroll: root.style.overscrollBehavior
    };
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    body.style.position = 'fixed';
    body.style.top = `-${scrollPosition}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])') || []);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
      if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    addEventListener('keydown', onKey);
    return () => {
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
      root.style.overflow = previous.rootOverflow;
      root.style.overscrollBehavior = previous.rootOverscroll;
      removeEventListener('keydown', onKey);
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    };
  }, [requestClose]);

  return <div className={`project-modal-backdrop ${closing ? 'is-closing' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) requestClose(); }}>
    <div ref={dialogRef} className={`project-modal resume-modal ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-label="Resume PDF Document" style={{'--project-accent': '#0077B5'} as React.CSSProperties}>
      <header className="project-modal-header">
        <div><span>DOCUMENT FILE / RÉSUMÉ</span><b>/about/arjun-kh-cv.pdf</b></div>
        <div className="resume-header-actions">
          <a href="/arjun-kh-cv.pdf?v=2" download="arjun-kh-cv.pdf" className="resume-header-dl-btn"><Download size={15}/> DOWNLOAD PDF</a>
          <button onClick={requestClose} aria-label="Close résumé modal"><X size={20}/></button>
        </div>
      </header>
      <div className="project-modal-scroll">
        <div className="project-modal-media resume-pdf-container">
          <object data="/arjun-kh-cv.pdf?v=2" type="application/pdf" className="resume-pdf-object">
            <iframe src="/arjun-kh-cv.pdf?v=2" title="Arjun KH Resume PDF" className="resume-pdf-iframe">
              <p>PDF preview unavailable. <a href="/arjun-kh-cv.pdf?v=2" download="arjun-kh-cv.pdf">Download PDF document</a>.</p>
            </iframe>
          </object>
        </div>
      </div>
    </div>
  </div>;
}





function LiveClock() {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const partsMap: Record<string, string> = {};
  formatter.formatToParts(time).forEach(({ type, value }) => {
    partsMap[type] = value;
  });

  const dayName = (partsMap.weekday || '').toUpperCase();
  const dayNum = partsMap.day || '01';
  const monthName = (partsMap.month || '').toUpperCase();
  const year = partsMap.year || '2026';

  const hours = partsMap.hour || '12';
  const minutes = partsMap.minute || '00';
  const seconds = partsMap.second || '00';
  const period = (partsMap.dayPeriod || 'AM').toUpperCase();

  return (
    <div className="live-clock" title="Current IST Time & Date">
      <span className="clock-date">{dayName} {dayNum} {monthName} {year}</span>
      <span className="clock-sep">/</span>
      <span className="clock-time">{hours}:{minutes}:{seconds} {period}</span>
      <span className="clock-tz">IST</span>
    </div>
  );
}

function VisitorCounter() {
  const [count, setCount] = useState<number>(() => {
    const LOCAL_KEY = 'kha_visitor_count';
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        return parsed;
      }
    }
    return 1;
  });

  const hasExecutedRef = React.useRef(false);

  useEffect(() => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    const SESSION_KEY = 'kha_session_recorded';
    const LOCAL_KEY = 'kha_visitor_count';
    const isNewSession = !sessionStorage.getItem(SESSION_KEY);
    const endpoint = isNewSession
      ? 'https://countapi.mileshilliard.com/api/v1/hit/arjunkh_anti_portfolio_visits_v1'
      : 'https://countapi.mileshilliard.com/api/v1/get/arjunkh_anti_portfolio_visits_v1';

    if (isNewSession) {
      sessionStorage.setItem(SESSION_KEY, 'true');
    }

    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.value === 'number' && data.value >= 1) {
          setCount(data.value);
          localStorage.setItem(LOCAL_KEY, String(data.value));
        }
      })
      .catch(err => {
        console.warn('Visitor counter API unreachable, falling back to local count:', err);
      });
  }, []);

  const formatted = String(count).padStart(4, '0');

  return (
    <div className="visitor-count" title="Visitor Count">
      <i className="visitor-dot" />
      <div className="visitor-count-text">
        <span className="visitor-count-label">YOU'RE VISITOR NUMBER:</span>
        <span className="visitor-count-num">{formatted}</span>
      </div>
    </div>
  );
}

const SLIDESHOW_PHOTOS = [
  '/photos/arjun-1.jpg',
  '/photos/arjun-2.jpg',
  '/photos/arjun-3.jpg',
  '/photos/arjun-4.jpg',
  '/photos/arjun-5.jpg',
];

function AboutSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDESHOW_PHOTOS.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="vhs-slideshow-container" aria-label="Arjun KH photo slideshow with CRT VHS scanlines filter">
      <div className="vhs-slideshow-track">
        {SLIDESHOW_PHOTOS.map((src, index) => (
          <img
            key={src}
            src={src}
            alt={`Arjun KH portrait ${index + 1}`}
            className={`vhs-slide-img ${index === currentIndex ? 'is-active' : ''}`}
          />
        ))}
      </div>

      {/* CRT Scanlines & Old VHS TV Retro Filter */}
      <div className="vhs-crt-overlay" aria-hidden="true">
        <div className="vhs-scanlines" />
        <div className="vhs-vignette" />
        <div className="vhs-cool-tint" />
        <div className="vhs-static-beam" />
      </div>
    </div>
  );
}



const FINAL_ASCII_ART = `K   K  H   H       A       RRRR     JJJJJ  U   U  N   N
K  K   H   H      A A      R   R      J    U   U  NN  N
KK     HHHHH     AAAAA     RRRR       J    U   U  N N N
K  K   H   H    A     A    R  R    J  J    U   U  N  NN
K   K  H   H   A       A   R   R    JJ      UUU   N   N`;

function AsciiStartup({ storageKey = 'kha-startup-seen' }: { storageKey?: string }) {
  const [hidden, setHidden] = useState<boolean>(false);
  const [leaving, setLeaving] = useState<boolean>(false);
  const [artText, setArtText] = useState<string>(FINAL_ASCII_ART);
  const [progress, setProgress] = useState<number>(0);
  const [stepState, setStepState] = useState<Array<'WAIT' | 'READ' | 'OK'>>(['WAIT', 'WAIT', 'WAIT']);
  const runningRef = React.useRef<boolean>(true);
  const frameRef = React.useRef<number>(0);
  const timerRef = React.useRef<number>(0);
  const frameNumRef = React.useRef<number>(0);

  const noise = "/\\|+*.:01[]";

  const finish = React.useCallback((remember = true) => {
    if (!runningRef.current) return;
    runningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (remember) {
      try { localStorage.setItem(storageKey, '1'); } catch {}
    }

    setLeaving(true);
    document.documentElement.classList.remove('ascii-startup-active');
    document.body.classList.remove('ascii-startup-active');

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    timerRef.current = window.setTimeout(() => {
      setHidden(true);
      setLeaving(false);
      document.dispatchEvent(new CustomEvent('ascii-startup:complete'));
    }, reduced ? 0 : 190);
  }, [storageKey]);

  const startAnimation = React.useCallback((force = false) => {
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === '1'; } catch {}
    if (!force && seen) {
      setHidden(true);
      runningRef.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setHidden(false);
    setLeaving(false);
    document.documentElement.classList.add('ascii-startup-active');
    document.body.classList.add('ascii-startup-active');
    runningRef.current = true;
    frameNumRef.current = 0;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setProgress(1);
      setStepState(['OK', 'OK', 'OK']);
      setArtText(FINAL_ASCII_ART);
      timerRef.current = window.setTimeout(() => finish(), 250);
      return;
    }

    const startedAt = performance.now();
    let isFullyLoaded = document.readyState === 'complete';

    const onWindowLoad = () => { isFullyLoaded = true; };
    if (!isFullyLoaded) {
      window.addEventListener('load', onWindowLoad, { once: true });
    }

    const computeRealProgress = () => {
      if (isFullyLoaded || document.readyState === 'complete') return 1.0;

      const imgs = Array.from(document.images);
      const totalImgs = imgs.length || 1;
      const loadedImgs = imgs.filter(img => img.complete).length;
      const imgRatio = loadedImgs / totalImgs;

      if (document.readyState === 'interactive') {
        return 0.5 + 0.45 * imgRatio;
      }
      return 0.15 + 0.3 * imgRatio;
    };

    const tick = (now: number) => {
      if (!runningRef.current) return;

      const timeP = Math.min(1, (now - startedAt) / 1650);
      const realP = computeRealProgress();
      const p = Math.min(1, Math.min(timeP, realP));
      frameNumRef.current += 1;

      const revealAt = Math.floor(FINAL_ASCII_ART.length * Math.min(1, p * 1.18));
      const newArt = [...FINAL_ASCII_ART].map((char, index) => {
        if (char === '\n' || char === ' ') return char;
        if (index < revealAt) return char;
        return noise[(index * 7 + frameNumRef.current) % noise.length];
      }).join('');

      setArtText(newArt);
      setProgress(p);

      const activeStep = Math.min(2, Math.floor(p * 3));
      const steps: Array<'WAIT' | 'READ' | 'OK'> = [0, 1, 2].map((idx) => {
        const isDone = idx < activeStep || p === 1;
        const isActive = idx === activeStep && p !== 1;
        return isDone ? 'OK' : isActive ? 'READ' : 'WAIT';
      });
      setStepState(steps);

      if (p < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        window.removeEventListener('load', onWindowLoad);
        timerRef.current = window.setTimeout(() => finish(), 1000);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [finish, storageKey]);

  React.useLayoutEffect(() => {
    startAnimation(true);

    const handleKeyOrClick = () => {
      finish();
    };
    window.addEventListener('keydown', handleKeyOrClick);
    window.addEventListener('click', handleKeyOrClick);

    return () => {
      window.removeEventListener('keydown', handleKeyOrClick);
      window.removeEventListener('click', handleKeyOrClick);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      document.documentElement.classList.remove('ascii-startup-active');
      document.body.classList.remove('ascii-startup-active');
    };
  }, [finish, startAnimation]);

  if (hidden) return null;

  const filledCount = Math.round(progress * 20);
  const barStr = `[${'#'.repeat(filledCount)}${'.'.repeat(20 - filledCount)}]`;
  const percentStr = `${String(Math.round(progress * 100)).padStart(3, '0')}%`;

  return (
    <section
      className={`ascii-startup ${leaving ? 'is-leaving' : ''}`}
      aria-label="Portfolio startup"
      aria-live="polite"
      onClick={() => finish()}
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="ascii-startup__top">
        <span>KHA/PORTFOLIO_OS</span>
      </div>

      <div className="ascii-startup__core">
        <pre className="ascii-startup__art" aria-hidden="true">
          {artText}
        </pre>

        <div className="ascii-startup__log" aria-hidden="true">
          <div className={`ascii-startup__row ${stepState[0] === 'READ' ? 'is-live' : ''} ${stepState[0] === 'OK' ? 'is-done' : ''}`}>
            <span className="ascii-startup__index">01</span>
            <span>reading working files</span>
            <span className="ascii-startup__result">{stepState[0]}</span>
          </div>
          <div className={`ascii-startup__row ${stepState[1] === 'READ' ? 'is-live' : ''} ${stepState[1] === 'OK' ? 'is-done' : ''}`}>
            <span className="ascii-startup__index">02</span>
            <span>mapping projects and experiments</span>
            <span className="ascii-startup__result">{stepState[1]}</span>
          </div>
          <div className={`ascii-startup__row ${stepState[2] === 'READ' ? 'is-live' : ''} ${stepState[2] === 'OK' ? 'is-done' : ''}`}>
            <span className="ascii-startup__index">03</span>
            <span>opening personal environment</span>
            <span className="ascii-startup__result">{stepState[2]}</span>
          </div>

          <div className="ascii-startup__progress">
            <span>{barStr}</span> <span className="ascii-startup__percent">{percentStr}</span>
          </div>
        </div>
      </div>

      <div className="ascii-startup__bottom">
        <span><span className="ascii-startup__signal">●</span> LOCAL SESSION</span>
      </div>
    </section>
  );
}



function App() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showResume, setShowResume] = useState(false);
  const [openArchive, setOpenArchive] = useState<number | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [section, setSection] = useState('boot');

  useEffect(() => {
    const ids = ['boot', 'who-am-i', 'projects', 'archive', 'about', 'contact'];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => entry.isIntersecting && setSection(entry.target.id));
    }, { rootMargin: '-30% 0px -60% 0px' });
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const go = (id: string) => {
    setMobileNav(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const closeProject = () => {
    const slug = activeProject?.slug;
    setActiveProject(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-project-trigger="${slug}"]`)?.focus());
  };

  return <><AsciiStartup /><div className="site-shell">
    <header className="topbar">
      <button className="wordmark" onClick={() => go('boot')}>K H Arjun</button>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {['projects', 'archive', 'about', 'contact'].map(item => <button key={item} className={section === item ? 'active' : ''} onClick={() => go(item)}>/{item}</button>)}
      </nav>
      <div className="topbar-right">
        <LiveClock />
        <VisitorCounter />
      </div>
      <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav ? <X/> : <Menu/>}</button>
    </header>

    {mobileNav && <div className="mobile-nav">{['projects','archive','about','contact'].map((item, i) => <button key={item} onClick={() => go(item)}><span>0{i+1}</span>/{item}<ArrowRight/></button>)}</div>}

    <main>
      <section id="boot" className="boot-section">
        <Command>webpage --open</Command>
        <div className="hero-composition">
          <h1>I'VE BEEN MAKING THINGS FOR A WHILE.</h1>
          <div className="visual">
            <AsciiBlackHoleErrorBoundary>
              <AsciiBlackHole />
            </AsciiBlackHoleErrorBoundary>
          </div>
          <p className="hero-subtext">Some became projects. Some became experience. Some became lessons.</p>
        </div>
        <button className="continue" onClick={() => go('who-am-i')}><ArrowDown size={15}/> continue</button>
        <div className="boot-index">PERSONAL ENVIRONMENT<br/>v.14.10 / ONLINE</div>
      </section>

      <section id="who-am-i" className="who-section section-pad">
        <Command>who-am-i</Command>
        <div className="section-heading who-heading"><ScrollLetterReveal text="HERE'S WHAT I ACTUALLY WANT YOU TO KNOW." breaks={[23]}/></div>
        <div className="statements">
          {systemStatements.map(s => <article key={s.n} className="statement"><div className="statement-header"><span>{s.n}</span><h2>{s.title}</h2></div><p>{s.copy}</p></article>)}
        </div>
      </section>

      <section id="projects" className="work-section section-pad">
        <Command>ls /projects</Command>
        <div className="section-heading work-heading"><ScrollLetterReveal text="THREE THINGS THAT MADE IT OUT." breaks={[18]}/></div>
        <div className="project-list project-card-grid">
          {projects.map(project => <article key={project.slug} className="project-row project-card">
            <div className="project-preview"><ProjectVisual slug={project.slug} compact/></div>
            <div className="project-meta"><span>{project.number}</span><span>{project.year}</span><span>{project.kind}</span><span>{project.status}</span></div>
            <h2>{project.name}</h2>
            <p>{project.line}</p>
            <button className="open-command" data-project-trigger={project.slug} onClick={() => setActiveProject(project)}><span>$</span> open {project.name}<ArrowRight size={16}/></button>
          </article>)}
        </div>
        <div className="projects-more-bar">
          <a href="https://behance.net/arjunkh" target="_blank" rel="noreferrer" className="btn-view-more-behance">
            VIEW MORE WORKS <ExternalLink size={16}/>
          </a>
        </div>
      </section>

      <section id="archive" className="archive-section section-pad">
        <Command>ls /archive</Command>
        <div className="section-heading archive-heading"><ScrollLetterReveal text="A HISTORY OF MAKING" breaks={[10]}/><span>STILL BUILDING<br/>STILL LEARNING</span></div>
        <div className="archive-list">
          {archiveItems.map((item, i) => {
            const open = openArchive === i;
            return <article key={item.number} className={`archive-item ${open ? 'open' : ''}`}>
              <button onClick={() => setOpenArchive(open ? null : i)} aria-expanded={open}>
                <span className="archive-no">{item.number}</span><h3>{item.title}</h3><span className="archive-year">{item.year}</span><span className="archive-status">{item.status}</span>{open ? <Minus/> : <Plus/>}
              </button>
              <div className="archive-detail"><div><span>WHAT I DID</span><p>{item.text}</p></div><div><span>WHAT REMAINED</span><p>{item.lesson}</p></div></div>
            </article>
          })}
        </div>
      </section>

      <section id="about" className="about-section section-pad">
        <Command>cat /about</Command>
        <div className="about-grid">
          <div className="about-left-col">
            <ScrollLetterReveal text="WHO'S BEHIND ALL THIS?" breaks={[13]}/>
            <AboutSlideshow />
          </div>
          <div className="about-copy"><p>I'm Arjun, a product designer working across UI/UX, interaction design and visual communication. I use field research, journey mapping and prototypes to turn evidence into clearer decisions.</p><dl><div><dt>NOW</dt><dd>UX Design Intern<br/><small className="about-subtext">Experion Technologies</small></dd></div><div><dt>BASED</dt><dd>Thiruvananthapuram, Kerala, India<br/><small className="about-subtext">Open to junior product design opportunities</small></dd></div><div><dt>EXPERIENCE</dt><dd>2+ years across product, brand and digital communication</dd></div><div><dt>EDUCATION</dt><dd>B.Tech in Artificial Intelligence & Machine Learning<br/><small className="about-subtext">Marian Engineering College, affiliated to APJ Abdul Kalam Technological University</small></dd></div></dl></div>
        </div>
      </section>

      <section className="capabilities-section section-pad">
        <Command>./what-i-do</Command>
        <div className="section-heading capabilities-heading">
          <ScrollLetterReveal text="I CAN HELP WITH" breaks={[6]}/>
        </div>
        <div className="statements capabilities-statements">
          {capabilitiesList.map(s => (
            <article key={s.n} className="statement capability-statement">
              <span>{s.n}</span>
              <h2>{s.title}</h2>
              <p>{s.copy}</p>
            </article>
          ))}
        </div>
        <p className="tools-line"><span>Things I use along the way:</span> Figma, code, research, paper, and unreasonable amounts of iteration.</p>
      </section>

      <section className="resume-section section-pad">
        <div><p>WANT THE BORING VERSION?</p><a href="/arjun-kh-cv.pdf" onClick={(e) => { e.preventDefault(); setShowResume(true); }}>VIEW RÉSUMÉ <ExternalLink size={17}/></a></div>
      </section>

      <section id="contact" className="contact-section section-pad">
        <Command>./contact</Command>
        <ScrollLetterReveal text="IF YOU HAVE A PROBLEM WORTH SOLVING, LET'S TALK." breaks={[21,36]}/>

        <div className="site-footer">
          <div className="site-footer-connect">
            <span className="footer-col-label">CONNECT</span>
            <ul className="footer-link-list">
              <li><a href="https://linkedin.com/in/kharjun" target="_blank" rel="noreferrer">LinkedIn</a></li>
              <li><a href="https://behance.net/arjunkh" target="_blank" rel="noreferrer">Behance</a></li>
              <li><a href="https://www.instagram.com/a.rjunnn._/" target="_blank" rel="noreferrer">Instagram</a></li>
              <li><a href="https://wa.me/918848043184" target="_blank" rel="noreferrer">WhatsApp</a></li>
              <li><a href="https://buymeacoffee.com/kharjun" target="_blank" rel="noreferrer">Buy Me a Coffee</a></li>
            </ul>
          </div>

          <div className="site-footer-bottom">
            <span>Arjun here!</span>
            <span>DESIGNED TO BE EXPLORED.<br/>BUILT TO GET OUT OF THE WAY.</span>
            <button onClick={() => go('boot')} className="btn-back-to-top">↑ top</button>
          </div>
        </div>
      </section>
    </main>
  </div>
  {activeProject && <ProjectDetail project={activeProject} close={closeProject}/>}
  {showResume && <ResumeDetail close={() => setShowResume(false)}/>}
  </>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
