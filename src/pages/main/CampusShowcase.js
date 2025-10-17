import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./CampusShowcase.css";

// Backend API base (adjust as needed)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api/gallery/";

const OCCASION_COLORS = {
  "Tech Week": "#4e90ff",
  "Sports Gala": "#fca311",
  "Arts & Culture": "#d72660",
  "Annual Talent Show": "#8e54e9",
  "Graduation": "#ffd700",
  "Community Service": "#2ecc40",
  "Guest Lecture": "#00b894",
  "Innovation Challenge": "#ff7675",
  All: "#1d2540"
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const opts = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString(undefined, opts);
};

function dynamicBg(occasion) {
  switch (occasion) {
    case "Tech Week": return "linear-gradient(120deg, #e9f5ff 80%, #4e90ff22 100%)";
    case "Sports Gala": return "linear-gradient(120deg, #fff5e0 80%, #fca31122 100%)";
    case "Arts & Culture": return "linear-gradient(120deg, #fce8f1 80%, #d7266022 100%)";
    case "Annual Talent Show": return "linear-gradient(120deg, #f3ecff 80%, #8e54e922 100%)";
    case "Graduation": return "linear-gradient(120deg, #fffbe8 80%, #ffd70022 100%)";
    case "Community Service": return "linear-gradient(120deg, #e8fff3 80%, #2ecc4022 100%)";
    case "Guest Lecture": return "linear-gradient(120deg, #e8fff6 80%, #00b89422 100%)";
    case "Innovation Challenge": return "linear-gradient(120deg, #ffe8ec 80%, #ff767522 100%)";
    default: return "linear-gradient(120deg, #f7fafc 70%, #e4efff 100%)";
  }
}

function LikeBurst({ show }) {
  if (!show) return null;
  return (
    <span className="cs-like-burst">
      <span className="cs-like-heart" style={{ left: "8%", animationDelay: "0ms" }} />
      <span className="cs-like-heart" style={{ left: "48%", animationDelay: "80ms" }} />
      <span className="cs-like-heart" style={{ left: "78%", animationDelay: "150ms" }} />
      <span className="cs-like-heart" style={{ left: "28%", animationDelay: "100ms" }} />
      <span className="cs-like-heart" style={{ left: "68%", animationDelay: "180ms" }} />
    </span>
  );
}

const sortMedia = (arr, sortBy) => {
  if (sortBy === "liked") return [...arr].sort((a, b) => b.likes - a.likes);
  if (sortBy === "newest") return [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sortBy === "oldest") return [...arr].sort((a, b) => new Date(a.date) - new Date(b.date));
  return arr;
};

const trendingMedia = (arr) => sortMedia([...arr], "liked").slice(0, 3);

const CampusShowcase = () => {
  // State
  const [media, setMedia] = useState([]);
  const [, setOccasions] = useState([]); // occasions currently unused
  const [loading, setLoading] = useState(true);

  const [occasionFilter, setOccasionFilter] = useState("All");
  const [sortBy, setSortBy] = useState("liked");
  const [likes, setLikes] = useState({});
  const [liked, setLiked] = useState({});
  const [likeBurst, setLikeBurst] = useState({});
  const [lightbox, setLightbox] = useState({ open: false, idx: 0, filtered: [] });

  // Fetch data from backend
  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}media/`),
      axios.get(`${API_BASE}occasions/`)
    ]).then(([mediaRes, occRes]) => {
      const loadedMedia = (mediaRes.data || []).map(item => ({
        ...item,
        type: item.media_type, // "photo" or "video"
        id: item.id ? String(item.id) : Math.random().toString(36).substring(2, 12),
        src: item.media_type === "photo" ? item.file : undefined,
        videoSrc: item.media_type === "video" ? item.file : undefined,
        thumbnail: item.thumbnail,
        caption: item.caption || item.title,
        date: item.date,
        occasion: item.occasion?.name || "Other",
        likes: item.likes || 0,
      }));
      setMedia(loadedMedia);
      setOccasions(occRes.data || []);
      // Set likes/liked state
      const likeInit = {};
      const likedInit = {};
      loadedMedia.forEach(m => {
        likeInit[m.id] = m.likes;
        likedInit[m.id] = false;
      });
      setLikes(likeInit);
      setLiked(likedInit);
    }).finally(() => setLoading(false));
  }, []);

  // Get unique occasions for filters
  const uniqueOccasions = Array.from(new Set(media.map(m => m.occasion))).filter(Boolean).sort();
  const filters = [{ label: "All", value: "All" }, ...uniqueOccasions.map(o => ({ label: o, value: o }))];

  // Filter and sort media
  const filtered = sortMedia(
    media.filter(
      m => occasionFilter === "All" || m.occasion === occasionFilter
    ),
    sortBy
  );

  // Trending/featured
  const trending = trendingMedia(media);

  // Like handler
  function handleLike(id, type) {
    if (liked[id]) return;
    // Find media object for API
    const mediaItem = media.find(m => m.id === id);
    if (!mediaItem) return;
    axios.post(`${API_BASE}likes/`, { media: mediaItem.id })
      .catch(() => {})
      .then(() => {
        setLikes(likes => ({ ...likes, [id]: (likes[id] || 0) + 1 }));
        setLiked(liked => ({ ...liked, [id]: true }));
        setLikeBurst(lb => ({ ...lb, [id]: true }));
        setTimeout(() => setLikeBurst(lb => ({ ...lb, [id]: false })), 700);
      });
  }

  // Lightbox handlers
  const openLightbox = idx =>
    setLightbox({ open: true, idx, filtered });
  const closeLightbox = () =>
    setLightbox({ open: false, idx: 0, filtered: [] });

  // Keyboard navigation for lightbox
  const lightboxRef = useRef();
  useEffect(() => {
    if (!lightbox.open) return;
    function handleKey(e) {
      if (e.key === "ArrowLeft") prevLightbox();
      if (e.key === "ArrowRight") nextLightbox();
      if (e.key === "Escape") closeLightbox();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line
  }, [lightbox]);

  function prevLightbox() {
    setLightbox(l => ({
      ...l,
      idx: (l.idx + l.filtered.length - 1) % l.filtered.length
    }));
  }
  function nextLightbox() {
    setLightbox(l => ({
      ...l,
      idx: (l.idx + 1) % l.filtered.length
    }));
  }

  // Dynamic background
  const bg = dynamicBg(occasionFilter);

  return (
    <div className="campus-showcase" style={{ background: bg }}>
      {/* Hero */}
      <section className="cs-hero">
        <div className="cs-hero-bg"></div>
        <h2>
          <span className="cs-anim-text">Campus Showcase</span>
        </h2>
        <p>
          Experience the vibrant life at PKFokam Institute of Excellence—watch, relive, and share our best moments!
        </p>
        <div className="cs-floating-balls">
          <span className="cs-ball cs-ball1"></span>
          <span className="cs-ball cs-ball2"></span>
          <span className="cs-ball cs-ball3"></span>
        </div>
      </section>

      {/* Filters & Sort */}
      <div className="cs-controls">
        <div className="cs-filter-group">
          {filters.map(f => (
            <button
              key={f.value}
              className={`cs-filter-btn${occasionFilter === f.value ? " active" : ""}`}
              style={{ "--filter-color": OCCASION_COLORS[f.value] || "#1d2540" }}
              onClick={() => setOccasionFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="cs-sort-group">
          <select value={sortBy} className="cs-sort-select" onChange={e => setSortBy(e.target.value)}>
            <option value="liked">Most Liked</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Trending Section */}
      <section className="cs-section cs-trending">
        <h3>🔥 Trending This Week</h3>
        <div className="cs-trending-cards">
          {trending.map((m, i) => (
            <div
              className={`cs-trending-card animated-card`}
              style={{
                "--trend-color": OCCASION_COLORS[m.occasion] || "#ffd700",
                animationDelay: `${i * 0.13 + 0.1}s`
              }}
              key={m.id}
              tabIndex={0}
              onClick={() => {
                const idx = filtered.findIndex(f => f.id === m.id);
                openLightbox(idx > -1 ? idx : 0);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const idx = filtered.findIndex(f => f.id === m.id);
                  openLightbox(idx > -1 ? idx : 0);
                }
              }}
            >
              <div className="cs-media-thumb">
                {m.type === "video" ? (
                  <video
                    className="cs-media-video"
                    src={m.videoSrc}
                    poster={m.thumbnail}
                    controls
                    style={{
                      width: "95%",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "9px",
                      display: "block",
                      background: "#111"
                    }}
                  />
                ) : (
                  <img
                    src={m.src}
                    alt={m.caption}
                    className="cs-media-img"
                    style={{
                      width: "95%",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "9px",
                      display: "block"
                    }}
                  />
                )}
                <span className="cs-glow"></span>
              </div>
              <div className="cs-trend-info">
                <div className="cs-trend-title">{m.title || m.caption}</div>
                <div className="cs-card-meta">
                  <span className="cs-date">{formatDate(m.date)}</span>
                  <span className="cs-occasion">{m.occasion}</span>
                </div>
                <div className="cs-trend-likes">
                  <span role="img" aria-label="like">❤️</span> {likes[m.id] || m.likes}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Gallery */}
      <section className="cs-section">
        <h3>Gallery</h3>
        {loading ? (
          <div style={{ textAlign: "center", fontWeight: "bold" }}>Loading...</div>
        ) : (
          <div className="cs-gallery">
            {filtered.map((m, idx) => (
              <div
                className={`cs-card animated-card${m.type === "video" ? " cs-video-card" : " cs-photo-card"}`}
                key={m.id}
                style={{ animationDelay: `${idx * 0.08 + 0.2}s` }}
                tabIndex={0}
                onClick={() => openLightbox(idx)}
                onKeyDown={e => { if (e.key === "Enter") openLightbox(idx); }}
              >
                <div className="cs-media-thumb">
                  {m.type === "video" ? (
                    <video
                      className="cs-media-video"
                      src={m.videoSrc}
                      poster={m.thumbnail}
                      controls
                      style={{
                        width: "95%",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "9px",
                        display: "block",
                        background: "#111"
                      }}
                    />
                  ) : (
                    <img
                      src={m.src}
                      alt={m.caption}
                      className="cs-media-img"
                      style={{
                        width: "95%",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "9px",
                        display: "block"
                      }}
                    />
                  )}
                  <span className="cs-glow"></span>
                </div>
                <div className="cs-card-title">{m.title || m.caption}</div>
                <div className="cs-card-meta">
                  <span className="cs-date">{formatDate(m.date)}</span>
                  <span className="cs-occasion">{m.occasion}</span>
                </div>
                <button
                  className={`cs-like-btn${liked[m.id] ? " liked" : ""}`}
                  onClick={e => { e.stopPropagation(); handleLike(m.id, m.type); }}
                  title={liked[m.id] ? "You liked this!" : "Like"}
                  aria-label="Like"
                  tabIndex={0}
                  disabled={liked[m.id]}
                >
                  <span role="img" aria-label="like">❤️</span>
                  <span className="cs-like-count">{likes[m.id]}</span>
                  <LikeBurst show={likeBurst[m.id]} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {lightbox.open && (
        <div className="cs-lightbox" onClick={closeLightbox}>
          <div
            className="cs-lightbox-content"
            onClick={e => e.stopPropagation()}
            ref={lightboxRef}
            style={{
              maxWidth: "98vw",
              maxHeight: "95vh",
              padding: "1.5rem 1.5rem 1rem 1.5rem"
            }}
          >
            <button className="cs-lightbox-close" onClick={closeLightbox}>&times;</button>
            <button className="cs-lightbox-arrow left" onClick={prevLightbox}>&#8592;</button>
            <button className="cs-lightbox-arrow right" onClick={nextLightbox}>&#8594;</button>
            {lightbox.filtered[lightbox.idx]?.type === "video" ? (
              <video
                className="cs-lightbox-media"
                src={lightbox.filtered[lightbox.idx]?.videoSrc}
                poster={lightbox.filtered[lightbox.idx]?.thumbnail}
                controls
                autoPlay
                style={{
                  width: "100%",
                  maxWidth: "85vw",
                  maxHeight: "75vh",
                  objectFit: "contain",
                  borderRadius: "16px",
                  background: "#111",
                  display: "block",
                  margin: "0 auto"
                }}
              />
            ) : (
              <img
                src={lightbox.filtered[lightbox.idx]?.src}
                alt={lightbox.filtered[lightbox.idx]?.caption}
                className="cs-lightbox-media"
                style={{
                  width: "100%",
                  maxWidth: "85vw",
                  maxHeight: "75vh",
                  objectFit: "contain",
                  borderRadius: "16px",
                  display: "block",
                  margin: "0 auto"
                }}
              />
            )}
            <div className="cs-lightbox-caption">
              <div className="cs-lb-title">{lightbox.filtered[lightbox.idx]?.title || lightbox.filtered[lightbox.idx]?.caption}</div>
              <div className="cs-lb-meta">
                <span className="cs-date">{formatDate(lightbox.filtered[lightbox.idx]?.date)}</span>
                <span className="cs-occasion">{lightbox.filtered[lightbox.idx]?.occasion}</span>
                <button
                  className={`cs-like-btn${liked[lightbox.filtered[lightbox.idx]?.id] ? " liked" : ""}`}
                  onClick={e => { e.stopPropagation(); handleLike(lightbox.filtered[lightbox.idx]?.id, lightbox.filtered[lightbox.idx]?.type); }}
                  title={liked[lightbox.filtered[lightbox.idx]?.id] ? "You liked this!" : "Like"}
                  aria-label="Like"
                  tabIndex={0}
                  disabled={liked[lightbox.filtered[lightbox.idx]?.id]}
                >
                  <span role="img" aria-label="like">❤️</span>
                  <span className="cs-like-count">{likes[lightbox.filtered[lightbox.idx]?.id]}</span>
                  <LikeBurst show={likeBurst[lightbox.filtered[lightbox.idx]?.id]} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusShowcase;