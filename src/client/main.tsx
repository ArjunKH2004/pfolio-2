import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowRight, Download, ExternalLink, Menu, Minus, Plus, X } from 'lucide-react';
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
  { number:'A-01', title:'Unique World Robotics India', year:'2025-26', status:'GRAPHIC DESIGNER', text:'Created visual assets and brand collateral across print and digital touchpoints for multiple robotics product lines.', lesson:'Experience working across different product identities while maintaining consistency across visual communication.' },
  { number:'A-02', title:'Elenco Corporation', year:'2025', status:'GRAPHIC DESIGNER', text:'Created visual content for marketing campaigns, working within established brand systems and communication requirements.', lesson:'Experience working alongside senior designers within a structured professional design workflow.' },
  { number:'A-03', title:'Svas.pro', year:'2025', status:'UI/UX DESIGNER', text:'Designed interfaces and interactive prototypes for a digital platform, incorporating user testing and feedback into the design process.', lesson:'Worked through Figma handoff with developers and produced 30+ social creatives, contributing to a reported 30% increase in engagement.' },
  { number:'A-04', title:'MuLearn Foundation', year:'2023-25', status:'ASSOCIATE', text:'Worked across social media, campaigns, creative production, and community initiatives within a large student-led learning ecosystem.', lesson:'Contributed to campaigns including Global Game Jam Kerala and Perµte, with reported growth in registrations and engagement.' }
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
  { n: '05', title: 'PRODUCT POLISH.', copy: 'Making rough products easier to trust.' }
];

const profile = {
  name: 'K H Arjun',
  role: 'Product Designer',
  focus: 'UX, interaction design and visual communication',
  currentRole: 'UX Design Intern at Experion Technologies',
  availability: 'Open to junior product design opportunities',
  location: 'Thiruvananthapuram, Kerala, India',
  email: 'kharjun48@gmail.com',
  resumeUrl: '/arjun-kh-cv.pdf',
  linkedinUrl: 'https://linkedin.com/in/kharjun',
  behanceUrl: 'https://behance.net/arjunkh',
  instagramUrl: 'https://www.instagram.com/a.rjunnn._/'
} as const;

const sections = [
  { id: 'boot', label: 'home', path: '/' },
  { id: 'who-am-i', label: 'who-am-i', path: '/who-am-i' },
  { id: 'projects', label: 'projects', path: '/projects' },
  { id: 'archive', label: 'archive', path: '/archive' },
  { id: 'about', label: 'about', path: '/about' },
  { id: 'contact', label: 'contact', path: '/contact' }
] as const;

type SectionId = typeof sections[number]['id'];
type AppRoute =
  | { kind: 'section'; section: SectionId }
  | { kind: 'project'; project: Project }
  | { kind: 'not-found'; path: string };

const sectionById = Object.fromEntries(sections.map(section => [section.id, section])) as Record<SectionId, typeof sections[number]>;
const sectionByPath = Object.fromEntries(sections.map(section => [section.path, section])) as Record<string, typeof sections[number]>;

function normalizePath(pathname: string) {
  const path = pathname || '/';
  return path.length > 1 ? path.replace(/\/+$/, '') : '/';
}

function parseRoute(pathname: string): AppRoute {
  const path = normalizePath(pathname);
  const sectionMatch = sectionByPath[path];
  if (sectionMatch) return { kind: 'section', section: sectionMatch.id };

  const projectMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    try {
      const slug = decodeURIComponent(projectMatch[1]);
      const project = projects.find(item => item.slug === slug);
      if (project) return { kind: 'project', project };
    } catch {
      return { kind: 'not-found', path };
    }
  }

  return { kind: 'not-found', path };
}

function getSectionPath(id: SectionId) {
  return sectionById[id].path;
}

function getProjectPath(project: Project) {
  return `/projects/${project.slug}`;
}

function getMailtoHref() {
  return `mailto:${profile.email}?subject=${encodeURIComponent('Portfolio conversation')}`;
}

function Command({ children }: { children: React.ReactNode }) {
  return <div className="command"><span className="command-user">kharjun@internet</span><span>:~$</span> {children}</div>;
}

function ScrollLetterReveal({ text, breaks = [], as = 'p', id }: { text: string; breaks?: number[]; as?: 'p' | 'h1' | 'h2' | 'h3'; id?: string }) {
  const ref = React.useRef<HTMLElement>(null);
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

  const children = [...text].map((character, index) => (
    <React.Fragment key={index}>
      {breaks.includes(index) && <br/>}
      <span className={index < revealed ? 'revealed' : ''} aria-hidden="true">{character === ' ' ? '\u00a0' : character}</span>
    </React.Fragment>
  ));

  return React.createElement(as, { ref, id, className: 'scroll-letter-reveal', 'aria-label': text }, children);
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
        <div><span>DOCUMENT FILE / RESUME</span><b>/about/arjun-kh-cv.pdf</b></div>
        <div className="resume-header-actions">
          <a href="/arjun-kh-cv.pdf?v=2" download="arjun-kh-cv.pdf" className="resume-header-dl-btn"><Download size={15}/> DOWNLOAD PDF</a>
          <button onClick={requestClose} aria-label="Close resume modal"><X size={20}/></button>
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
  { src: '/photos/arjun-1-800w.webp', srcSet: '/photos/arjun-1-400w.webp 400w, /photos/arjun-1-800w.webp 800w' },
  { src: '/photos/arjun-2-800w.webp', srcSet: '/photos/arjun-2-400w.webp 400w, /photos/arjun-2-800w.webp 800w' },
  { src: '/photos/arjun-3-800w.webp', srcSet: '/photos/arjun-3-400w.webp 400w, /photos/arjun-3-800w.webp 800w' },
  { src: '/photos/arjun-4-800w.webp', srcSet: '/photos/arjun-4-400w.webp 400w, /photos/arjun-4-800w.webp 800w' },
  { src: '/photos/arjun-5-800w.webp', srcSet: '/photos/arjun-5-400w.webp 400w, /photos/arjun-5-800w.webp 800w' },
] as const;

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
        {SLIDESHOW_PHOTOS.map((photo, index) => (
          <img
            key={photo.src}
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="(max-width: 400px) 100vw, 400px"
            width="800"
            height="1000"
            loading="lazy"
            decoding="async"
            alt={`K H Arjun portrait ${index + 1}`}
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



function NotFoundPage({ go }: { go: (id: SectionId) => void }) {
  return (
    <div className="site-shell route-not-found-shell">
      <header className="topbar">
        <a className="wordmark" href="/" onClick={(event) => { event.preventDefault(); go('boot'); }}>K H Arjun</a>
      </header>
      <main className="route-not-found" aria-labelledby="not-found-title">
        <Command>route --status 404</Command>
        <p className="route-not-found__code">404</p>
        <h1 id="not-found-title">This route does not exist.</h1>
        <p>The portfolio could not find that section or project. Use the links below to get back to the authored experience.</p>
        <div className="route-not-found__actions" aria-label="Available routes">
          <a href="/" onClick={(event) => { event.preventDefault(); go('boot'); }}>HOME</a>
          <a href="/projects" onClick={(event) => { event.preventDefault(); go('projects'); }}>PROJECTS</a>
          <a href="/contact" onClick={(event) => { event.preventDefault(); go('contact'); }}>CONTACT</a>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [showResume, setShowResume] = useState(false);
  const [openArchive, setOpenArchive] = useState<number | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [section, setSection] = useState<SectionId>(() => {
    const initialRoute = parseRoute(window.location.pathname);
    return initialRoute.kind === 'project' ? 'projects' : initialRoute.kind === 'section' ? initialRoute.section : 'boot';
  });
  const routeRef = useRef(route);
  const suppressSectionUrlSyncRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);
  const skipNextSectionScrollRef = useRef(false);

  const setRouteFromLocation = React.useCallback(() => {
    setRoute(parseRoute(window.location.pathname));
  }, []);

  const setSuppressSectionUrlSync = React.useCallback((duration = 900) => {
    suppressSectionUrlSyncRef.current = true;
    if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = window.setTimeout(() => {
      suppressSectionUrlSyncRef.current = false;
      suppressTimerRef.current = null;
    }, duration);
  }, []);

  const writeRoute = React.useCallback((path: string, options: { replace?: boolean; prevPath?: string } = {}) => {
    const nextRoute = parseRoute(path);
    const state = { portfolio: true, prevPath: options.prevPath };
    if (options.replace) window.history.replaceState(state, '', path);
    else window.history.pushState(state, '', path);
    setRoute(nextRoute);
    return nextRoute;
  }, []);

  const go = React.useCallback((id: SectionId) => {
    setMobileNav(false);
    setSuppressSectionUrlSync();
    skipNextSectionScrollRef.current = true;
    const path = getSectionPath(id);
    const previousPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    writeRoute(path, { prevPath: previousPath });
    setSection(id);
    requestAnimationFrame(() => {
      const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      if (id === 'boot') window.scrollTo({ top: 0, behavior });
      else document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
    });
  }, [setSuppressSectionUrlSync, writeRoute]);

  const openProject = React.useCallback((project: Project) => {
    setMobileNav(false);
    setSection('projects');
    const previousPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    writeRoute(getProjectPath(project), { prevPath: previousPath });
  }, [writeRoute]);

  const closeProject = React.useCallback(() => {
    const currentRoute = routeRef.current;
    const project = currentRoute.kind === 'project' ? currentRoute.project : null;
    const historyState = window.history.state as { prevPath?: string } | null;
    if (historyState?.prevPath && historyState.prevPath.startsWith('/')) {
      window.history.back();
    } else {
      writeRoute('/projects', { replace: true });
    }
    window.setTimeout(() => {
      if (project) document.querySelector<HTMLElement>(`[data-project-trigger="${project.slug}"]`)?.focus();
    }, 80);
  }, [writeRoute]);

  const openResume = React.useCallback((event?: React.MouseEvent<HTMLAnchorElement>) => {
    event?.preventDefault();
    setShowResume(true);
  }, []);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    if (!window.history.state?.portfolio) {
      window.history.replaceState({ ...(window.history.state || {}), portfolio: true }, '', window.location.href);
    }
    window.addEventListener('popstate', setRouteFromLocation);
    return () => {
      window.removeEventListener('popstate', setRouteFromLocation);
      if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
    };
  }, [setRouteFromLocation]);

  useEffect(() => {
    if (route.kind === 'section') {
      setSection(route.section);
      document.title = route.section === 'boot' ? 'K H Arjun | Product Designer' : `${sectionById[route.section].label} | K H Arjun`;
      if (skipNextSectionScrollRef.current) {
        skipNextSectionScrollRef.current = false;
        return;
      }
      requestAnimationFrame(() => {
        if (route.section === 'boot') window.scrollTo({ top: 0, behavior: 'auto' });
        else document.getElementById(route.section)?.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
      return;
    }

    if (route.kind === 'project') {
      setSection('projects');
      document.title = `${route.project.name} | K H Arjun`;
      return;
    }

    document.title = '404 | K H Arjun';
  }, [route]);

  useEffect(() => {
    const ids: SectionId[] = ['boot', 'who-am-i', 'projects', 'archive', 'about', 'contact'];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.id as SectionId;
      setSection(id);
      if (routeRef.current.kind !== 'section' || suppressSectionUrlSyncRef.current) return;
      const path = getSectionPath(id);
      if (normalizePath(window.location.pathname) !== path) {
        window.history.replaceState({ ...(window.history.state || {}), portfolio: true }, '', path);
      }
    }, { rootMargin: '-28% 0px -58% 0px', threshold: [0.2, 0.4, 0.6] });
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const activeProject = route.kind === 'project' ? route.project : null;
  const navItems = sections.filter(item => ['projects', 'archive', 'about', 'contact'].includes(item.id));
  const isNavCurrent = (id: SectionId) => section === id || (route.kind === 'project' && id === 'projects');
  const emailHref = getMailtoHref();

  if (route.kind === 'not-found') {
    return <NotFoundPage go={go} />;
  }

  return <><div className="site-shell">
    <header className="topbar">
      <a className="wordmark" href="/" onClick={(event) => { event.preventDefault(); go('boot'); }}>K H Arjun</a>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map(item => (
          <a
            key={item.id}
            href={item.path}
            className={isNavCurrent(item.id) ? 'active' : ''}
            aria-current={isNavCurrent(item.id) ? 'page' : undefined}
            onClick={(event) => { event.preventDefault(); go(item.id); }}
          >/{item.label}</a>
        ))}
      </nav>
      <div className="topbar-right">
        <LiveClock />
        <VisitorCounter />
      </div>
      <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation" aria-expanded={mobileNav} aria-controls="mobile-nav">{mobileNav ? <X/> : <Menu/>}</button>
    </header>

    {mobileNav && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">{navItems.map((item, i) => (
      <a key={item.id} href={item.path} aria-current={isNavCurrent(item.id) ? 'page' : undefined} onClick={(event) => { event.preventDefault(); go(item.id); }}><span>0{i+1}</span>/{item.label}<ArrowRight/></a>
    ))}</nav>}

    <main>
      <section id="boot" className="boot-section" aria-labelledby="hero-title">
        <Command>webpage --open</Command>
        <div className="hero-composition">
          <div className="hero-recruiter-copy">
            <p className="hero-kicker">{profile.role} / UX Design Intern</p>
            <h1 id="hero-title">{profile.name}</h1>
            <p className="hero-role-line">{profile.focus}</p>
            <dl className="hero-facts" aria-label="Current role and availability">
              <div><dt>NOW</dt><dd>{profile.currentRole}</dd></div>
              <div><dt>OPEN TO WORK</dt><dd>{profile.availability}</dd></div>
              <div><dt>BASED</dt><dd>{profile.location}</dd></div>
            </dl>
            <div className="hero-cta-row" aria-label="Primary contact actions">
              <a href={emailHref} className="terminal-cta"><span>$</span> email Arjun<ArrowRight size={16}/></a>
              <a href={profile.resumeUrl} className="terminal-cta" onClick={openResume}><span>$</span> view resume<ExternalLink size={16}/></a>
            </div>
          </div>
          <div className="visual" aria-hidden="true">
            <AsciiBlackHoleErrorBoundary>
              <AsciiBlackHole />
            </AsciiBlackHoleErrorBoundary>
          </div>
          <p className="hero-subtext">Some became projects. Some became experience. Some became lessons.</p>
        </div>
        <button className="continue" onClick={() => go('who-am-i')}><ArrowDown size={15}/> continue</button>
        <div className="boot-index">PERSONAL ENVIRONMENT<br/>v.14.10 / ONLINE</div>
      </section>

      <section id="who-am-i" className="who-section section-pad" aria-labelledby="who-heading">
        <Command>who-am-i</Command>
        <div className="section-heading who-heading"><ScrollLetterReveal as="h2" id="who-heading" text="HERE'S WHAT I ACTUALLY WANT YOU TO KNOW." breaks={[23]}/></div>
        <div className="statements">
          {systemStatements.map(s => <article key={s.n} className="statement"><div className="statement-header"><span>{s.n}</span><h3>{s.title}</h3></div><p>{s.copy}</p></article>)}
        </div>
      </section>

      <section id="projects" className="work-section section-pad" aria-labelledby="projects-heading">
        <Command>ls /projects</Command>
        <div className="section-heading work-heading"><ScrollLetterReveal as="h2" id="projects-heading" text="THREE THINGS THAT MADE IT OUT." breaks={[18]}/></div>
        <div className="project-list project-card-grid">
          {projects.map(project => <article key={project.slug} className="project-row project-card">
            <a
              href={getProjectPath(project)}
              className="project-card-link"
              data-project-trigger={project.slug}
              aria-labelledby={`project-card-title-${project.slug}`}
              onClick={(event) => { event.preventDefault(); openProject(project); }}
              onKeyDown={(event) => { if (event.key === ' ') { event.preventDefault(); openProject(project); } }}
            >
              <div className="project-preview"><ProjectVisual slug={project.slug} compact/></div>
              <div className="project-meta"><span>{project.number}</span><span>{project.year}</span><span>{project.kind}</span><span>{project.status}</span></div>
              <h3 id={`project-card-title-${project.slug}`}>{project.name}</h3>
              <p>{project.line}</p>
              <span className="open-command" aria-hidden="true"><span>$</span> open {project.name}<ArrowRight size={16}/></span>
            </a>
          </article>)}
        </div>
        <div className="projects-more-bar">
          <a href={profile.behanceUrl} target="_blank" rel="noreferrer" className="btn-view-more-behance">
            VIEW MORE WORKS <ExternalLink size={16}/>
          </a>
        </div>
      </section>

      <section id="archive" className="archive-section section-pad" aria-labelledby="archive-heading">
        <Command>ls /archive</Command>
        <div className="section-heading archive-heading"><ScrollLetterReveal as="h2" id="archive-heading" text="A HISTORY OF MAKING" breaks={[10]}/><span>STILL BUILDING<br/>STILL LEARNING</span></div>
        <div className="archive-list">
          {archiveItems.map((item, i) => {
            const open = openArchive === i;
            const buttonId = `archive-trigger-${item.number}`;
            const panelId = `archive-panel-${item.number}`;
            return <article key={item.number} className={`archive-item ${open ? 'open' : ''}`}>
              <button id={buttonId} onClick={() => setOpenArchive(open ? null : i)} aria-expanded={open} aria-controls={panelId}>
                <span className="archive-no">{item.number}</span><h3>{item.title}</h3><span className="archive-year">{item.year}</span><span className="archive-status">{item.status}</span>{open ? <Minus/> : <Plus/>}
              </button>
              <div id={panelId} className="archive-detail" role="region" aria-labelledby={buttonId} hidden={!open}><div><span>WHAT I DID</span><p>{item.text}</p></div><div><span>WHAT REMAINED</span><p>{item.lesson}</p></div></div>
            </article>
          })}
        </div>
      </section>

      <section id="about" className="about-section section-pad" aria-labelledby="about-heading">
        <Command>cat /about</Command>
        <div className="about-grid">
          <div className="about-left-col">
            <ScrollLetterReveal as="h2" id="about-heading" text="WHO'S BEHIND ALL THIS?" breaks={[13]}/>
            <AboutSlideshow />
          </div>
          <div className="about-copy"><p>I'm Arjun, a product designer working across product UX, interaction design and visual systems. I use research, mapping and prototyping to make complex flows easier to understand and use.</p><dl><div><dt>NOW</dt><dd>UX Design Intern<br/><small className="about-subtext">Experion Technologies</small></dd></div><div><dt>BASED</dt><dd>Thiruvananthapuram, Kerala, India<br/><small className="about-subtext">Open to junior product design opportunities</small></dd></div><div><dt>EXPERIENCE</dt><dd>2+ years across product, brand and digital communication</dd></div><div><dt>EDUCATION</dt><dd>B.Tech in Artificial Intelligence & Machine Learning<br/><small className="about-subtext">Marian Engineering College, affiliated to APJ Abdul Kalam Technological University</small></dd></div></dl></div>
        </div>
      </section>

      <section className="capabilities-section section-pad" aria-labelledby="capabilities-heading">
        <Command>./what-i-do</Command>
        <div className="section-heading capabilities-heading">
          <ScrollLetterReveal as="h2" id="capabilities-heading" text="I CAN HELP WITH" breaks={[6]}/>
        </div>
        <div className="statements capabilities-statements">
          {capabilitiesList.map(s => (
            <article key={s.n} className="statement capability-statement">
              <span>{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.copy}</p>
            </article>
          ))}
        </div>
        <p className="tools-line"><span>Things I use along the way:</span> Figma, code, research, paper, and unreasonable amounts of iteration.</p>
      </section>

      <section className="resume-section section-pad" aria-labelledby="resume-heading">
        <div><p id="resume-heading">WANT THE PDF VERSION?</p><a href={profile.resumeUrl} onClick={openResume}>VIEW RESUME <ExternalLink size={17}/></a></div>
      </section>

      <section id="contact" className="contact-section section-pad" aria-labelledby="contact-heading">
        <Command>./contact</Command>
        <ScrollLetterReveal as="h2" id="contact-heading" text="FOR ROLES, COLLABORATION, OR QUESTIONS ABOUT THE WORK, REACH OUT." breaks={[10,25,44]}/>
        <div className="contact-cta-row" aria-label="Contact actions">
          <a href={emailHref} className="terminal-cta contact-primary"><span>$</span> email {profile.email}<ArrowRight size={16}/></a>
          <a href={profile.resumeUrl} className="terminal-cta" onClick={openResume}><span>$</span> view resume<ExternalLink size={16}/></a>
        </div>

        <div className="site-footer">
          <div className="site-footer-connect">
            <span className="footer-col-label">CONNECT</span>
            <ul className="footer-link-list">
              <li><a href={profile.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a></li>
              <li><a href={profile.behanceUrl} target="_blank" rel="noreferrer">Behance</a></li>
              <li><a href={profile.instagramUrl} target="_blank" rel="noreferrer">Instagram</a></li>
              <li><a href={emailHref}>Email</a></li>
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
