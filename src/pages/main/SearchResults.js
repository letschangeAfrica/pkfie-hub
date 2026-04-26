import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiSearch, FiBook, FiArrowRight,
  FiClock, FiDollarSign,
} from 'react-icons/fi';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/pathfinder';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Sk = ({ className = '' }) => (
  <div className={`bg-slate-100 dark:bg-navy-800 rounded-xl animate-pulse ${className}`} />
);

export default function SearchResults() {
  const query    = useQuery().get('q') || '';
  const navigate = useNavigate();
  const [loading,  setLoading]  = useState(false);
  const [programs, setPrograms] = useState([]);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!query.trim()) { setPrograms([]); return; }
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/programs/?search=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setPrograms(data))
      .catch(() => { setError('Could not load results. Please try again.'); setPrograms([]); })
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-navy-400
          hover:text-slate-900 dark:hover:text-white transition-colors mb-6"
      >
        <FiArrowLeft size={15} aria-hidden="true" />
        Back
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          bg-navy-100 dark:bg-navy-800">
          <FiSearch size={18} className="text-navy-600 dark:text-gold" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            {query
              ? <>Results for <span className="text-gold">"{query}"</span></>
              : 'Search Programs'
            }
          </h1>
          {!loading && query && (
            <p className="text-xs text-slate-400 dark:text-navy-500 mt-0.5">
              {programs.length} program{programs.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-navy-900 rounded-2xl p-6
              border border-slate-100 dark:border-navy-700/40 space-y-3">
              <div className="flex justify-between">
                <Sk className="h-5 w-1/2" />
                <Sk className="h-5 w-16" />
              </div>
              <Sk className="h-4 w-full" />
              <Sk className="h-4 w-3/4" />
              <div className="flex gap-4">
                <Sk className="h-4 w-20" />
                <Sk className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-16 text-red-400">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Empty query */}
      {!loading && !query.trim() && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-navy-800
            flex items-center justify-center mx-auto mb-4">
            <FiSearch size={28} className="text-slate-300 dark:text-navy-600" aria-hidden="true" />
          </div>
          <p className="text-slate-500 dark:text-navy-400 text-sm">
            Type something in the search bar to find programs.
          </p>
        </div>
      )}

      {/* No results */}
      {!loading && query.trim() && programs.length === 0 && !error && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-navy-800
            flex items-center justify-center mx-auto mb-4">
            <FiBook size={28} className="text-slate-300 dark:text-navy-600" aria-hidden="true" />
          </div>
          <p className="text-slate-900 dark:text-white font-bold mb-1">No programs found</p>
          <p className="text-slate-500 dark:text-navy-400 text-sm">
            Try a different search term or browse all programs in the Pathfinder.
          </p>
          <Link
            to="/pathfinder"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl font-black text-sm text-navy-900
              transition-all hover:-translate-y-px"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
          >
            Browse All Programs
            <FiArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Results */}
      {!loading && programs.length > 0 && (
        <div className="space-y-4">
          {programs.map(prog => (
            <Link
              to={`/programs/${prog.code}`}
              key={prog.code || prog.id}
              className="group flex items-start gap-5 bg-white dark:bg-navy-900 rounded-2xl p-6
                border border-slate-100 dark:border-navy-700/40
                hover:border-gold/40 hover:shadow-md transition-all hover:-translate-y-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0
                bg-navy-100 dark:bg-navy-800 group-hover:bg-gold/10 transition-colors">
                <FiBook
                  size={18}
                  aria-hidden="true"
                  className="text-navy-600 dark:text-navy-300 group-hover:text-gold transition-colors"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h2 className="font-black text-slate-900 dark:text-white text-base leading-snug
                    group-hover:text-gold transition-colors">
                    {prog.name}
                  </h2>
                  {prog.code && (
                    <span className="flex-shrink-0 px-2.5 py-0.5 rounded-lg text-[11px] font-black
                      bg-navy-50 dark:bg-navy-800 text-navy-600 dark:text-navy-400
                      border border-navy-100 dark:border-navy-700/40">
                      {prog.code}
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500 dark:text-navy-400 leading-relaxed mb-3 line-clamp-2">
                  {prog.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400 dark:text-navy-500">
                  {prog.duration_years && (
                    <span className="flex items-center gap-1.5">
                      <FiClock size={12} aria-hidden="true" />
                      {prog.duration_years} year{prog.duration_years !== 1 ? 's' : ''}
                    </span>
                  )}
                  {prog.tuition_fee && (
                    <span className="flex items-center gap-1.5">
                      <FiDollarSign size={12} aria-hidden="true" />
                      <strong className="text-slate-700 dark:text-navy-200">${prog.tuition_fee}</strong> tuition
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1 text-gold font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    View Program <FiArrowRight size={12} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
