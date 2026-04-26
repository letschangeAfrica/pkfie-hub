import { useState, useEffect } from 'react';
import api from '../../services/api';
import { marked } from 'marked';
import PKFLogo from '../../components/PKFLogo';
import {
  FiChevronRight, FiChevronDown, FiSearch,
  FiDownload, FiZoomIn, FiZoomOut, FiMaximize2,
  FiFileText, FiBookOpen, FiUsers, FiMonitor, FiClock,
} from 'react-icons/fi';

/* ── Configure marked for clean output ── */
marked.setOptions({ breaks: true, gfm: true });

const CATEGORIES = [
  {
    id: 'academic-policies',
    label: 'Academic Policies',
    icon: FiBookOpen,
    docs: [
      { id: 'policies',   label: 'Academic Integrity Code',   ref: 'ACAD-POL-2024-01', date: 'September 1, 2024' },
      { id: 'academics',  label: 'Grading System & Criteria', ref: 'ACAD-POL-2024-04', date: 'September 1, 2024' },
      { id: 'admissions', label: 'Admissions & Enrollment',   ref: 'ACAD-POL-2024-02', date: 'August 15, 2024'   },
      { id: 'fees',       label: 'Examination Rules',         ref: 'ACAD-POL-2024-03', date: 'September 1, 2024' },
    ],
  },
  {
    id: 'student-life',
    label: 'Student Life',
    icon: FiUsers,
    docs: [
      { id: 'campus',    label: 'Campus Life & Services', ref: 'SL-2024-01', date: 'October 1, 2024' },
      { id: 'resources', label: 'Student Resources',      ref: 'SL-2024-02', date: 'October 1, 2024' },
    ],
  },
  {
    id: 'it-facilities',
    label: 'IT & Facilities',
    icon: FiMonitor,
    docs: [],
  },
];

const ZOOM = [75, 100, 125, 150];

const Skeleton = ({ className = '' }) => (
  <div className={`rounded animate-pulse dark:bg-navy-700/60 bg-slate-200 ${className}`} />
);

const AdinkraWatermark = ({ dark }) => (
  <svg
    aria-hidden="true"
    className="absolute bottom-0 right-0 pointer-events-none w-80 h-80"
    style={{ opacity: dark ? 0.05 : 0.04 }}
    viewBox="0 0 200 200" fill="none"
  >
    <circle cx="100" cy="100" r="90" stroke="#FFD700" strokeWidth="1.5" />
    <circle cx="100" cy="100" r="70" stroke="#FFD700" strokeWidth="1" />
    <circle cx="100" cy="100" r="50" stroke="#FFD700" strokeWidth="1" />
    <line x1="10"  y1="100" x2="190" y2="100" stroke="#FFD700" strokeWidth="1" />
    <line x1="100" y1="10"  x2="100" y2="190" stroke="#FFD700" strokeWidth="1" />
    <line x1="29"  y1="29"  x2="171" y2="171" stroke="#FFD700" strokeWidth="0.8" />
    <line x1="171" y1="29"  x2="29"  y2="171" stroke="#FFD700" strokeWidth="0.8" />
    <polygon
      points="100,20 120,60 165,60 130,85 145,130 100,105 55,130 70,85 35,60 80,60"
      stroke="#FFD700" strokeWidth="1" fill="none"
    />
  </svg>
);

export default function Handbook() {
  const [openCats, setOpenCats]   = useState({ 'academic-policies': true });
  const [activeDoc, setActiveDoc] = useState(CATEGORIES[0].docs[1]);
  const [cache, setCache]         = useState({});
  const [loading, setLoading]     = useState(false);
  const [zoomIdx, setZoomIdx]     = useState(1);
  const [search, setSearch]       = useState('');
  const [dark, setDark]           = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  /* sync dark state with document class */
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!activeDoc || cache[activeDoc.id] !== undefined) return;
    setLoading(true);
    api.get(`/handbook/${activeDoc.id}/`)
      .then(res  => setCache(p => ({ ...p, [activeDoc.id]: res.data })))
      .catch(()  => setCache(p => ({ ...p, [activeDoc.id]: null  })))
      .finally(() => setLoading(false));
  }, [activeDoc, cache]);

  const zoom      = ZOOM[zoomIdx];
  const docContent = cache[activeDoc?.id];
  const activeCat  = CATEGORIES.find(c => c.docs.some(d => d.id === activeDoc?.id));

  const q = search.toLowerCase();
  const filtered = CATEGORIES.map(cat => ({
    ...cat,
    docs: q ? cat.docs.filter(d => d.label.toLowerCase().includes(q)) : cat.docs,
  }));

  /* ── theme-dependent tokens ─────────────────────────── */
  const page    = dark ? 'bg-navy-950'  : 'bg-slate-100';
  const header  = dark ? 'bg-navy-900'  : 'bg-white border-slate-200';
  const sidebar = dark ? 'bg-navy-900 border-navy-700/40'  : 'bg-white border-slate-200';
  const toolbar = dark ? 'bg-navy-900/90 border-navy-700/40' : 'bg-white/90 border-slate-200';
  const txt     = dark ? 'text-white'   : 'text-slate-900';
  const sub     = dark ? 'text-navy-400' : 'text-slate-500';
  const catBtn  = dark
    ? 'text-white/70 hover:text-white hover:bg-navy-700/40'
    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';
  const docCard = dark
    ? 'bg-gradient-to-b from-[#080f20] to-[#001040] border border-gold/10 shadow-[0_24px_64px_rgba(0,0,0,.6)]'
    : 'bg-white border border-slate-200 shadow-[0_8px_40px_rgba(0,0,0,.1)]';
  const divider = dark ? 'border-navy-700/50' : 'border-slate-200';
  const tableHd = dark ? 'bg-navy-800/60 border-navy-700/50' : 'bg-slate-50 border-slate-200';
  const tableRow= dark ? 'hover:bg-navy-700/25 border-navy-700/25' : 'hover:bg-slate-50 border-slate-100';
  const inputCls= dark
    ? 'bg-navy-800 border-navy-700/50 text-white placeholder-navy-500 focus:border-gold/40'
    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-gold/50';

  /* prose classes applied to dangerouslySetInnerHTML content */
  const proseCls = dark
    ? [
        'text-navy-200 text-sm leading-relaxed',
        '[&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-white [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:leading-tight',
        '[&_h2]:text-xl [&_h2]:font-black [&_h2]:text-white [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:leading-snug',
        '[&_h3]:text-base [&_h3]:font-black [&_h3]:text-white/90 [&_h3]:mt-5 [&_h3]:mb-2',
        '[&_h4]:text-sm [&_h4]:font-black [&_h4]:text-gold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:uppercase [&_h4]:tracking-wide',
        '[&_p]:mb-4 [&_p]:leading-relaxed',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1.5',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1.5',
        '[&_li]:leading-relaxed',
        '[&_strong]:text-white [&_strong]:font-bold',
        '[&_em]:text-navy-300 [&_em]:italic',
        '[&_a]:text-gold [&_a]:underline [&_a]:hover:text-gold/80',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-gold/40 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-4 [&_blockquote]:text-navy-300 [&_blockquote]:italic',
        '[&_code]:bg-navy-700/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-gold [&_code]:text-xs [&_code]:font-mono',
        '[&_pre]:bg-navy-800 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-4',
        '[&_hr]:border-navy-700/40 [&_hr]:my-6',
        '[&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-5 [&_img]:mx-auto [&_img]:block',
        '[&_table]:w-full [&_table]:my-5 [&_table]:text-sm',
        '[&_th]:bg-navy-800/60 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-black [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-gold [&_th]:border [&_th]:border-navy-700/40',
        '[&_td]:px-4 [&_td]:py-2.5 [&_td]:border [&_td]:border-navy-700/30 [&_td]:text-navy-200',
        '[&_tr:nth-child(even)_td]:bg-navy-800/20',
      ].join(' ')
    : [
        'text-slate-700 text-sm leading-relaxed',
        '[&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-slate-900 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:leading-tight',
        '[&_h2]:text-xl [&_h2]:font-black [&_h2]:text-slate-800 [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:leading-snug',
        '[&_h3]:text-base [&_h3]:font-black [&_h3]:text-slate-700 [&_h3]:mt-5 [&_h3]:mb-2',
        '[&_h4]:text-sm [&_h4]:font-black [&_h4]:text-amber-600 [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:uppercase [&_h4]:tracking-wide',
        '[&_p]:mb-4 [&_p]:leading-relaxed',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1.5',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1.5',
        '[&_li]:leading-relaxed',
        '[&_strong]:text-slate-900 [&_strong]:font-bold',
        '[&_em]:text-slate-500 [&_em]:italic',
        '[&_a]:text-amber-600 [&_a]:underline [&_a]:hover:text-amber-700',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-amber-400/60 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-4 [&_blockquote]:text-slate-500 [&_blockquote]:italic',
        '[&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-amber-700 [&_code]:text-xs [&_code]:font-mono',
        '[&_pre]:bg-slate-100 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-4',
        '[&_hr]:border-slate-200 [&_hr]:my-6',
        '[&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-5 [&_img]:mx-auto [&_img]:block [&_img]:shadow-md',
        '[&_table]:w-full [&_table]:my-5 [&_table]:text-sm',
        '[&_th]:bg-slate-50 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-black [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-amber-700 [&_th]:border [&_th]:border-slate-200',
        '[&_td]:px-4 [&_td]:py-2.5 [&_td]:border [&_td]:border-slate-100 [&_td]:text-slate-600',
        '[&_tr:nth-child(even)_td]:bg-slate-50/60',
      ].join(' ');

  return (
    <div className={`flex flex-col h-full ${page} overflow-hidden`}>

      {/* ── Page header ───────────────────────────────────── */}
      <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${header}`}>
        <div>
          <h1 className={`text-xl font-black tracking-tight ${txt}`}>Digital Handbook</h1>
          <p className={`text-[11px] mt-0.5 font-medium ${sub}`}>
            PKFokam Institute of Excellence — Official Documents
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className={`flex items-center gap-3 text-xs ${sub}`}>
            <span className="flex items-center gap-1.5">
              <FiFileText size={12} className="text-gold" aria-hidden="true" />
              <strong className={`font-black ${txt}`}>128</strong> Documents
            </span>
            <span className={dark ? 'text-navy-700' : 'text-slate-300'}>·</span>
            <span className="flex items-center gap-1.5">
              <FiClock size={12} aria-hidden="true" />
              Updated Oct 24
            </span>
          </div>
          <div className="relative">
            <FiSearch
              size={13}
              aria-hidden="true"
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${sub}`}
            />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search handbook documents..."
              aria-label="Search handbook documents"
              className={`pl-8 pr-8 py-2 w-64 border rounded-xl text-sm
                focus:outline-none focus:ring-1 focus:ring-gold/25 transition-all ${inputCls}`}
            />
          </div>
        </div>
      </div>

      {/* ── Body: tree + viewer ───────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Document tree */}
        <nav
          aria-label="Document categories"
          className={`w-56 flex-shrink-0 border-r overflow-y-auto py-2 scrollbar-thin ${sidebar}`}
        >
          {filtered.map(cat => (
            <div key={cat.id}>
              <button
                onClick={() => setOpenCats(p => ({ ...p, [cat.id]: !p[cat.id] }))}
                aria-expanded={!!openCats[cat.id]}
                className={`w-full flex items-center gap-2 px-4 py-2.5
                  text-sm font-bold transition-colors ${catBtn}`}
              >
                {openCats[cat.id]
                  ? <FiChevronDown size={14} className="flex-shrink-0 text-gold" aria-hidden="true" />
                  : <FiChevronRight size={14} className={`flex-shrink-0 ${dark ? 'text-navy-600' : 'text-slate-400'}`} aria-hidden="true" />
                }
                <span className="text-left leading-tight">{cat.label}</span>
              </button>

              {openCats[cat.id] && (
                <ul role="list">
                  {cat.docs.length === 0 ? (
                    <li className={`pl-9 pr-4 py-2 text-xs italic ${dark ? 'text-navy-600' : 'text-slate-400'}`}>
                      No documents yet
                    </li>
                  ) : cat.docs.map(doc => {
                    const isActive = activeDoc?.id === doc.id;
                    return (
                      <li key={doc.id}>
                        <button
                          onClick={() => setActiveDoc(doc)}
                          aria-current={isActive ? 'page' : undefined}
                          className={[
                            'w-full flex items-start gap-2.5 pl-8 pr-4 py-2.5',
                            'text-[13px] leading-tight transition-all duration-150 border-l-2',
                            isActive
                              ? dark
                                ? 'bg-navy-700/60 text-white border-gold'
                                : 'bg-amber-50 text-amber-700 border-amber-500'
                              : dark
                                ? 'text-navy-400 hover:text-white hover:bg-navy-700/30 border-transparent'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-transparent',
                          ].join(' ')}
                        >
                          <FiFileText
                            size={13}
                            aria-hidden="true"
                            className={`flex-shrink-0 mt-0.5 ${isActive
                              ? dark ? 'text-gold' : 'text-amber-500'
                              : dark ? 'text-navy-600' : 'text-slate-400'
                            }`}
                          />
                          <span>{doc.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </nav>

        {/* Document viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Viewer toolbar */}
          <div className={`flex items-center justify-between px-5 py-2.5 border-b
            backdrop-blur-sm flex-shrink-0 ${toolbar}`}>

            {/* Breadcrumb */}
            <nav aria-label="Document breadcrumb" className="flex items-center gap-1.5 text-xs">
              {activeCat && (
                <>
                  <span className={`font-semibold ${sub}`}>{activeCat.label}</span>
                  <FiChevronRight size={11} className={sub} aria-hidden="true" />
                </>
              )}
              <span className="text-gold font-bold">{activeDoc?.label}</span>
            </nav>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomIdx(i => Math.max(0, i - 1))}
                disabled={zoomIdx === 0}
                aria-label="Zoom out"
                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${sub}
                  ${dark ? 'hover:text-white hover:bg-navy-700/50' : 'hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <FiZoomOut size={14} aria-hidden="true" />
              </button>
              <span className={`text-xs font-bold w-10 text-center tabular-nums select-none ${sub}`}>
                {zoom}%
              </span>
              <button
                onClick={() => setZoomIdx(i => Math.min(ZOOM.length - 1, i + 1))}
                disabled={zoomIdx === ZOOM.length - 1}
                aria-label="Zoom in"
                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${sub}
                  ${dark ? 'hover:text-white hover:bg-navy-700/50' : 'hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <FiZoomIn size={14} aria-hidden="true" />
              </button>
              <div className={`w-px h-4 mx-1.5 ${dark ? 'bg-navy-700/80' : 'bg-slate-200'}`} aria-hidden="true" />
              <button
                aria-label="Fullscreen"
                className={`p-1.5 rounded-lg transition-colors ${sub}
                  ${dark ? 'hover:text-white hover:bg-navy-700/50' : 'hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <FiMaximize2 size={14} aria-hidden="true" />
              </button>
              <button
                aria-label="Download PDF"
                className="ml-2 flex items-center gap-2 px-4 py-1.5 rounded-xl
                  text-[13px] font-black text-navy-900 transition-all hover:-translate-y-px
                  active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
              >
                <FiDownload size={14} aria-hidden="true" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Scrollable document area */}
          <div className={`flex-1 overflow-auto p-8 ${dark ? 'bg-navy-950' : 'bg-slate-100'}`}>
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
                marginBottom: zoom > 100 ? `${(zoom - 100) * 6}px` : 0,
              }}
            >
              {loading ? (
                <div className="max-w-3xl mx-auto space-y-4 pt-4">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className={`h-px my-6 ${dark ? 'bg-navy-700/40' : 'bg-slate-200'}`} />
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-3/4' : 'w-full'}`} />
                  ))}
                  <Skeleton className="h-4 w-5/6 mt-8" />
                  <div className={`rounded-xl border overflow-hidden mt-6 ${dark ? 'border-navy-700/40' : 'border-slate-200'}`}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`flex gap-4 px-4 py-3 border-b ${dark ? 'border-navy-700/20' : 'border-slate-100'}`}>
                        {[...Array(4)].map((_, j) => (
                          <Skeleton key={j} className="h-4 flex-1" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : docContent ? (

                /* Document card */
                <article
                  aria-label={`Document: ${activeDoc?.label}`}
                  className={`relative max-w-3xl mx-auto rounded-2xl overflow-hidden ${docCard}`}
                >
                  <AdinkraWatermark dark={dark} />

                  <div className="relative px-10 pt-10 pb-14">

                    {/* Document header row */}
                    <div className="flex items-start justify-between mb-10">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: dark
                            ? 'linear-gradient(135deg, #001F5B 0%, #002B80 100%)'
                            : 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                          border: '1px solid rgba(255,215,0,.25)',
                          boxShadow: dark ? '0 8px 24px rgba(0,31,91,.5)' : '0 8px 24px rgba(30,58,138,.2)',
                        }}
                      >
                        <PKFLogo size={36} />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black tracking-widest uppercase text-gold">
                          Official Policy
                        </p>
                        <p className={`text-xs mt-1 font-mono ${dark ? 'text-navy-500' : 'text-slate-400'}`}>
                          REF:&nbsp;{activeDoc?.ref || 'ACAD-POL-2024-00'}
                        </p>
                      </div>
                    </div>

                    {/* Title */}
                    <h1 className={`text-4xl font-black leading-tight mb-3 ${txt}`}>
                      {docContent.title}
                    </h1>
                    <p className="text-sm italic text-gold/70 mb-7">
                      Effective Date: {activeDoc?.date}
                    </p>
                    <hr className={`mb-9 ${divider}`} />

                    {/* Content blocks */}
                    {docContent.blocks
                      ?.slice()
                      .sort((a, b) => a.order - b.order)
                      .map((block, i) => (
                        <div key={i} className="mb-10">
                          {block.title && (
                            <h2 className={`text-2xl font-black mb-4 pb-2 border-b ${txt} ${divider}`}>
                              {block.title}
                            </h2>
                          )}
                          <div
                            className={proseCls}
                            dangerouslySetInnerHTML={{ __html: marked.parse(block.body || '') }}
                          />
                        </div>
                      ))
                    }

                    {/* Tables */}
                    {docContent.tables
                      ?.slice()
                      .sort((a, b) => a.order - b.order)
                      .map((table, i) => {
                        const sorted = [...(table.rows || [])].sort((a, b) => a.order - b.order);
                        const header = sorted[0];
                        const rows   = sorted.slice(1);
                        return (
                          <div key={i} className="mb-10">
                            {table.title && (
                              <h2 className={`text-2xl font-black mb-4 pb-2 border-b ${txt} ${divider}`}>
                                {table.title}
                              </h2>
                            )}
                            <div className={`overflow-x-auto rounded-xl border ${dark ? 'border-navy-700/40' : 'border-slate-200'}`}>
                              <table className="w-full text-sm border-collapse">
                                {header && (
                                  <thead>
                                    <tr className={`border-b ${tableHd}`}>
                                      {header.values.map((cell, k) => (
                                        <th
                                          key={k}
                                          scope="col"
                                          className={`px-5 py-3 text-left text-[11px]
                                            font-black tracking-widest uppercase text-gold`}
                                        >
                                          {cell}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                )}
                                <tbody className={`divide-y ${dark ? 'divide-navy-700/25' : 'divide-slate-100'}`}>
                                  {rows.map((row, j) => (
                                    <tr key={j} className={`transition-colors ${tableRow}`}>
                                      {row.values.map((cell, k) => (
                                        <td
                                          key={k}
                                          className={[
                                            'px-5 py-3',
                                            k === 0
                                              ? 'text-gold font-bold'
                                              : k === 2
                                                ? dark ? 'text-emerald-400 font-semibold' : 'text-emerald-600 font-semibold'
                                                : dark ? 'text-navy-200' : 'text-slate-600',
                                          ].join(' ')}
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </article>

              ) : docContent === null ? (
                <div className="max-w-3xl mx-auto text-center py-24">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4
                    ${dark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                    <FiFileText size={24} className="text-red-400" aria-hidden="true" />
                  </div>
                  <p className={`font-bold text-lg mb-1 ${txt}`}>Failed to load document</p>
                  <p className={`text-sm ${sub}`}>Could not retrieve this document from the server.</p>
                  <button
                    onClick={() => setCache(p => { const n = { ...p }; delete n[activeDoc.id]; return n; })}
                    className="mt-5 px-5 py-2 rounded-xl text-sm font-bold text-navy-900 transition hover:-translate-y-px"
                    style={{ background: '#FFD700' }}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto text-center py-24">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4
                    ${dark ? 'bg-navy-800 border border-navy-700/40' : 'bg-white border border-slate-200'}`}>
                    <FiBookOpen size={24} className={dark ? 'text-navy-500' : 'text-slate-400'} aria-hidden="true" />
                  </div>
                  <p className={`text-sm ${sub}`}>Select a document from the panel to view its contents</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
