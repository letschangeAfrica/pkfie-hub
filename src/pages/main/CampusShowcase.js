import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import {
  FiHeart, FiX, FiChevronLeft, FiChevronRight,
  FiCamera, FiTrendingUp, FiGrid, FiVideo, FiAlertCircle, FiRefreshCw,
} from 'react-icons/fi';

const formatDate = (d) => d
  ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  : '';

const sortMedia = (arr, by) => {
  if (by === 'liked')  return [...arr].sort((a, b) => b.likes - a.likes);
  if (by === 'newest') return [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (by === 'oldest') return [...arr].sort((a, b) => new Date(a.date) - new Date(b.date));
  return arr;
};

const LIKED_KEY = 'pkfie_gallery_liked';

/* ── Media thumb (shared) ── */
const MediaThumb = ({ item, className = '' }) =>
  item.type === 'video' ? (
    <video
      src={item.videoSrc}
      poster={item.thumbnail || undefined}
      className={`w-full h-full object-cover ${className}`}
      muted
      playsInline
      preload="metadata"
    />
  ) : (
    <img
      src={item.src}
      alt={item.caption}
      className={`w-full h-full object-cover ${className}`}
      loading="lazy"
      onError={e => { e.currentTarget.style.display = 'none'; }}
    />
  );

export default function CampusShowcase() {
  const [media,          setMedia]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [occasionFilter, setOccasionFilter] = useState('All');
  const [sortBy,         setSortBy]         = useState('liked');
  const [likes,          setLikes]          = useState({});
  // Persist liked state across page refreshes
  const [liked, setLiked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LIKED_KEY) || '{}'); }
    catch { return {}; }
  });
  const [lightbox, setLightbox] = useState({ open: false, idx: 0, items: [] });

  useEffect(() => {
    try { localStorage.setItem(LIKED_KEY, JSON.stringify(liked)); }
    catch {}
  }, [liked]);

  const fetchMedia = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/gallery/media/')
      .then(res => {
        const loaded = (res.data || []).map(item => ({
          ...item,
          type:     item.media_type,
          id:       item.id ? String(item.id) : Math.random().toString(36).slice(2),
          src:      item.media_type === 'photo' ? item.file : undefined,
          videoSrc: item.media_type === 'video' ? item.file : undefined,
          caption:  item.caption || item.title || '',
          occasion: item.occasion?.name || 'Other',
          likes:    item.likes || 0,
        }));
        setMedia(loaded);
        const lk = {};
        loaded.forEach(m => { lk[m.id] = m.likes; });
        setLikes(lk);
      })
      .catch(() => setError('Could not load media. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleLike = (id) => {
    if (liked[id]) return;
    const item = media.find(m => m.id === id);
    if (!item) return;
    api.post('/gallery/likes/', { media: item.id }).catch(() => {});
    setLikes(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
    setLiked(p => ({ ...p, [id]: true }));
  };

  const uniqueOccasions = Array.from(new Set(media.map(m => m.occasion))).filter(Boolean).sort();
  const filters = ['All', ...uniqueOccasions];

  const filtered = sortMedia(
    media.filter(m => occasionFilter === 'All' || m.occasion === occasionFilter),
    sortBy,
  );

  // Trending: items from the past 7 days ranked by likes; fall back to all-time if fewer than 3
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentMedia = media.filter(m => m.date && new Date(m.date) >= weekAgo);
  const trendingSource = recentMedia.length >= 3 ? recentMedia : media;
  const trendingLabel  = recentMedia.length >= 3 ? 'Trending This Week' : 'Most Popular';
  const trending = sortMedia([...trendingSource], 'liked').slice(0, 3);

  /* Lightbox */
  const openLightbox = useCallback((idx, items) =>
    setLightbox({ open: true, idx, items }), []);
  const closeLightbox = useCallback(() =>
    setLightbox({ open: false, idx: 0, items: [] }), []);
  const prevLb = useCallback(() =>
    setLightbox(l => ({ ...l, idx: (l.idx + l.items.length - 1) % l.items.length })), []);
  const nextLb = useCallback(() =>
    setLightbox(l => ({ ...l, idx: (l.idx + 1) % l.items.length })), []);

  const lightboxRef = useRef();
  useEffect(() => {
    if (!lightbox.open) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  prevLb();
      if (e.key === 'ArrowRight') nextLb();
      if (e.key === 'Escape')     closeLightbox();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox.open, prevLb, nextLb, closeLightbox]);

  const lbItem = lightbox.items[lightbox.idx];

  return (
    <div className="bg-slate-50 dark:bg-navy-950 min-h-full">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#000D2E 0%,#001F5B 60%,#001840 100%)' }}
      >
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg,rgba(255,215,0,.03) 0,rgba(255,215,0,.03) 1px,transparent 0,transparent 50%),
              repeating-linear-gradient(-45deg,rgba(255,215,0,.03) 0,rgba(255,215,0,.03) 1px,transparent 0,transparent 50%)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div aria-hidden="true" className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'rgba(255,215,0,.1)', border: '1px solid rgba(255,215,0,.2)' }}>
            <FiCamera size={28} className="text-gold" aria-hidden="true" />
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5
            border border-gold/25 bg-gold/8 text-[11px] font-black tracking-widest uppercase text-gold">
            Campus Showcase
          </span>
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            Campus <span className="text-gold">Life &amp; Moments</span>
          </h1>
          <p className="text-white/55 text-base leading-relaxed max-w-xl mx-auto">
            Experience the vibrant life at PKFokam Institute of Excellence — watch, relive,
            and share our best moments.
          </p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md
        border-b border-slate-200 dark:border-navy-700/40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3">
          {/* Filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin flex-1 pb-0.5">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setOccasionFilter(f)}
                aria-pressed={occasionFilter === f}
                className={[
                  'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap',
                  occasionFilter === f
                    ? 'text-navy-900 shadow-sm'
                    : 'text-slate-500 dark:text-navy-400 bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700',
                ].join(' ')}
                style={occasionFilter === f ? { background: 'linear-gradient(135deg,#FFD700,#FFEE55)' } : undefined}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold
              bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700/50
              text-slate-700 dark:text-navy-200
              focus:outline-none focus:border-gold/50 transition-all"
            aria-label="Sort media"
          >
            <option value="liked">Most Liked</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* ── Trending ── */}
        {!error && trending.length > 0 && (
          <section aria-labelledby="trending-heading">
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp size={16} className="text-gold" aria-hidden="true" />
              <h2 id="trending-heading" className="text-lg font-black text-slate-900 dark:text-white">
                {trendingLabel}
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {trending.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => {
                    // Always open lightbox with the full media array so navigation
                    // isn't restricted to the current occasion filter
                    const idx = media.findIndex(x => x.id === m.id);
                    openLightbox(idx > -1 ? idx : 0, media);
                  }}
                  className="group relative text-left rounded-2xl overflow-hidden
                    border border-slate-200 dark:border-navy-700/40
                    hover:border-gold/40 hover:shadow-lg transition-all
                    bg-white dark:bg-navy-900 focus-visible:ring-2 focus-visible:ring-gold"
                  style={{ animationDelay: `${i * 80}ms` }}
                  aria-label={`View ${m.caption}`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <MediaThumb item={m} className="group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 60%)' }}
                      aria-hidden="true"
                    />
                    {m.type === 'video' && (
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm
                        flex items-center justify-center">
                        <FiVideo size={13} className="text-white" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug mb-1 truncate">
                      {m.title || m.caption}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-navy-500">
                      <span>{formatDate(m.date)}</span>
                      <span className="flex items-center gap-1 text-gold font-bold">
                        <FiHeart size={11} fill="#FFD700" aria-hidden="true" />
                        {likes[m.id] ?? m.likes}
                      </span>
                    </div>
                    <span className="mt-2 inline-block px-2 py-0.5 rounded-full
                      text-[10px] font-bold bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-300">
                      {m.occasion}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Main Gallery ── */}
        <section aria-labelledby="gallery-heading">
          <div className="flex items-center gap-2 mb-4">
            <FiGrid size={16} className="text-gold" aria-hidden="true" />
            <h2 id="gallery-heading" className="text-lg font-black text-slate-900 dark:text-white">
              Gallery
              {!loading && !error && (
                <span className="ml-2 text-sm font-bold text-slate-400 dark:text-navy-500">
                  ({filtered.length})
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white dark:bg-navy-900 border border-slate-100 dark:border-navy-700/40">
                  <div className="h-44 bg-slate-100 dark:bg-navy-800 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-slate-100 dark:bg-navy-800 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-slate-100 dark:bg-navy-800 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <FiAlertCircle size={36} className="mx-auto mb-3 text-red-400" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-600 dark:text-navy-300 mb-4">{error}</p>
              <button
                onClick={fetchMedia}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold
                  text-navy-900 transition-all hover:-translate-y-px active:translate-y-0"
                style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55)' }}
              >
                <FiRefreshCw size={14} aria-hidden="true" />
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-navy-500">
              <FiCamera size={36} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
              <p className="text-sm">No media found for this filter.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((m, idx) => (
                <div
                  key={m.id}
                  className="group relative bg-white dark:bg-navy-900 rounded-2xl overflow-hidden
                    border border-slate-100 dark:border-navy-700/40
                    hover:border-gold/30 hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  {/* Thumb — clickable */}
                  <button
                    onClick={() => openLightbox(idx, filtered)}
                    className="block relative w-full h-44 overflow-hidden focus-visible:ring-2 focus-visible:ring-gold"
                    aria-label={`View ${m.caption}`}
                  >
                    <MediaThumb item={m} className="group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/10 transition-colors" aria-hidden="true" />
                    {m.type === 'video' && (
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm
                        flex items-center justify-center">
                        <FiVideo size={13} className="text-white" aria-hidden="true" />
                      </div>
                    )}
                  </button>

                  {/* Info */}
                  <div className="p-4">
                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug mb-1.5 truncate">
                      {m.title || m.caption}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-slate-400 dark:text-navy-500">{formatDate(m.date)}</span>
                        <span className="text-[10px] font-bold text-navy-600 dark:text-navy-400 bg-navy-50 dark:bg-navy-800
                          px-2 py-0.5 rounded-full w-fit border border-navy-100 dark:border-navy-700/40">
                          {m.occasion}
                        </span>
                      </div>

                      {/* Like button */}
                      <button
                        onClick={() => handleLike(m.id)}
                        disabled={liked[m.id]}
                        aria-label={liked[m.id] ? 'Liked' : 'Like this photo'}
                        className={[
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                          liked[m.id]
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-500 cursor-default border border-red-100 dark:border-red-500/20'
                            : 'bg-slate-50 dark:bg-navy-800 text-slate-500 dark:text-navy-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 border border-slate-200 dark:border-navy-700/40 hover:border-red-100',
                        ].join(' ')}
                      >
                        <FiHeart
                          size={12}
                          aria-hidden="true"
                          fill={liked[m.id] ? 'currentColor' : 'transparent'}
                        />
                        {likes[m.id] ?? m.likes}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Lightbox ── */}
      {lightbox.open && lbItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`Viewing: ${lbItem.caption}`}
        >
          <div
            ref={lightboxRef}
            className="relative w-full max-w-4xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              aria-label="Close lightbox"
              className="absolute -top-12 right-0 w-10 h-10 rounded-xl
                bg-white/10 hover:bg-white/20 flex items-center justify-center
                text-white transition-colors"
            >
              <FiX size={18} aria-hidden="true" />
            </button>

            {/* Prev */}
            <button
              onClick={prevLb}
              aria-label="Previous"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14
                w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20
                flex items-center justify-center text-white transition-colors
                max-sm:hidden"
            >
              <FiChevronLeft size={20} aria-hidden="true" />
            </button>

            {/* Media */}
            <div className="rounded-2xl overflow-hidden bg-black" style={{ maxHeight: '75vh' }}>
              {lbItem.type === 'video' ? (
                <video
                  src={lbItem.videoSrc}
                  poster={lbItem.thumbnail || undefined}
                  controls autoPlay
                  className="w-full max-h-[75vh] object-contain"
                />
              ) : (
                <img
                  src={lbItem.src}
                  alt={lbItem.caption}
                  className="w-full max-h-[75vh] object-contain"
                />
              )}
            </div>

            {/* Next */}
            <button
              onClick={nextLb}
              aria-label="Next"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14
                w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20
                flex items-center justify-center text-white transition-colors
                max-sm:hidden"
            >
              <FiChevronRight size={20} aria-hidden="true" />
            </button>

            {/* Caption bar */}
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">{lbItem.title || lbItem.caption}</p>
                <p className="text-white/50 text-xs mt-0.5">
                  {lbItem.occasion} · {formatDate(lbItem.date)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Mobile arrows */}
                <button onClick={prevLb} aria-label="Previous" className="sm:hidden w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <FiChevronLeft size={16} aria-hidden="true" />
                </button>
                <button onClick={nextLb} aria-label="Next" className="sm:hidden w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <FiChevronRight size={16} aria-hidden="true" />
                </button>
                {/* Like in lightbox */}
                <button
                  onClick={() => handleLike(lbItem.id)}
                  disabled={liked[lbItem.id]}
                  aria-label={liked[lbItem.id] ? 'Liked' : 'Like'}
                  className={[
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                    liked[lbItem.id]
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-default'
                      : 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 border border-white/20',
                  ].join(' ')}
                >
                  <FiHeart size={14} aria-hidden="true" fill={liked[lbItem.id] ? 'currentColor' : 'transparent'} />
                  {likes[lbItem.id] ?? lbItem.likes}
                </button>
              </div>
            </div>

            {/* Counter */}
            <p className="text-center text-white/30 text-xs mt-2">
              {lightbox.idx + 1} / {lightbox.items.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
