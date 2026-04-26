import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCompass, FiChevronRight, FiChevronLeft, FiRefreshCw,
  FiBook, FiCheckCircle, FiAward, FiArrowRight,
} from 'react-icons/fi';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/pathfinder';

/* ── Skeleton card ── */
const Sk = ({ className = '' }) => (
  <div className={`bg-slate-100 dark:bg-navy-700/60 rounded-xl animate-pulse ${className}`} />
);

export default function Pathfinder() {
  const [quizStarted,    setQuizStarted]    = useState(false);
  const [currentQ,       setCurrentQ]       = useState(0);
  const [answers,        setAnswers]        = useState({});
  const [showResults,    setShowResults]    = useState(false);
  const [questions,      setQuestions]      = useState([]);
  const [programs,       setPrograms]       = useState({});
  const [loading,        setLoading]        = useState(true);
  const [backendResults, setBackendResults] = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [qRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/questions/`, { headers }),
          fetch(`${API_BASE}/programs/`,  { headers }),
        ]);
        if (!qRes.ok || !pRes.ok) throw new Error('Failed to load Pathfinder data');

        const [qData, pData] = await Promise.all([qRes.json(), pRes.json()]);
        const pMap = {};
        pData.forEach(p => { pMap[p.code || p.id] = p; });
        setQuestions(qData);
        setPrograms(pMap);
      } catch {
        setError('Could not load Pathfinder data. Please try again later.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentQ(0);
    setAnswers({});
    setShowResults(false);
    setBackendResults(null);
  };

  const restartQuiz = () => {
    setQuizStarted(false);
    setCurrentQ(0);
    setAnswers({});
    setShowResults(false);
    setBackendResults(null);
  };

  const selectAnswer = (optId) => setAnswers(p => ({ ...p, [currentQ]: optId }));

  const goNext = () => {
    if (currentQ < questions.length - 1) { setCurrentQ(q => q + 1); }
    else { calculateResults(); }
  };

  const goPrev = () => { if (currentQ > 0) setCurrentQ(q => q - 1); };

  const calculateResults = async () => {
    setSubmitting(true);
    setShowResults(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      const sessionRes = await fetch(`${API_BASE}/sessions/`, {
        method: 'POST', headers,
        body: JSON.stringify({ completed: true, results: {} }),
      });
      if (!sessionRes.ok) throw new Error('Session error');
      const session = await sessionRes.json();

      const payload = Object.entries(answers).map(([qIdx, optId]) => {
        const question = questions[qIdx];
        const opt = question?.options?.find(o => o.id === optId || o.option_value === optId);
        return { question: question.id, option: opt?.id, answer_value: opt?.option_value || optId };
      });

      const answersRes = await fetch(`${API_BASE}/sessions/${session.id}/answers/`, {
        method: 'POST', headers,
        body: JSON.stringify({ answers: payload }),
      });
      if (!answersRes.ok) throw new Error('Answers error');
      const data = await answersRes.json();
      setBackendResults(data.results?.program_matches || null);
    } catch {
      /* fallback scoring handled by getProgramMatches() */
    } finally {
      setSubmitting(false);
    }
  };

  const getProgramMatches = () => {
    const scores = {};
    Object.values(programs).forEach(p => { scores[p.code || p.id] = 0; });
    Object.entries(answers).forEach(([qIdx, optId]) => {
      const q = questions[qIdx];
      const opt = q?.options?.find(o => o.id === optId || o.option_value === optId);
      if (opt?.program_weights) {
        Object.entries(opt.program_weights).forEach(([code, w]) => {
          scores[code] = (scores[code] || 0) + w;
        });
      }
    });
    const max = questions.length * 3 || 1;
    return Object.keys(scores)
      .map(code => {
        const p = programs[code];
        if (!p) return null;
        return { ...p, match: Math.min(100, Math.round((scores[code] / max) * 100)) };
      })
      .filter(Boolean)
      .sort((a, b) => b.match - a.match);
  };

  const progress = questions.length ? ((currentQ + 1) / questions.length) * 100 : 0;

  /* ── Loading ── */
  if (loading) return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <Sk className="h-10 w-2/3" />
      <Sk className="h-5 w-full" />
      <Sk className="h-5 w-5/6" />
      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        {[...Array(4)].map((_, i) => <Sk key={i} className="h-32" />)}
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
        <FiCompass size={28} className="text-red-400" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">Pathfinder Unavailable</h2>
      <p className="text-sm text-slate-500 dark:text-navy-400">{error}</p>
    </div>
  );

  /* ── Results ── */
  if (showResults) {
    const matches = backendResults || getProgramMatches();
    const top = matches[0];
    const others = matches.slice(1, 4);

    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
            bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30
            text-[11px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4">
            <FiCheckCircle size={11} aria-hidden="true" />
            Assessment Complete
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            Your Recommended Program
          </h1>
          <p className="text-slate-500 dark:text-navy-400">
            Based on your answers, here's your best academic match at PKFokam.
          </p>
        </div>

        {submitting && (
          <div className="text-center py-12 text-slate-500 dark:text-navy-400">
            <span className="inline-block w-6 h-6 border-2 border-slate-300 border-t-gold rounded-full animate-spin mb-3" />
            <p className="text-sm">Calculating your matches…</p>
          </div>
        )}

        {!submitting && top && (
          <>
            {/* Top match */}
            <div className="bg-white dark:bg-navy-900 rounded-3xl border border-slate-100 dark:border-navy-700/40
              overflow-hidden shadow-lg mb-8">
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg,#FFD700,#FFEE66,#FFD700)' }} aria-hidden="true" />
              <div className="p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0
                    bg-navy-100 dark:bg-navy-800">
                    <FiAward size={28} className="text-gold" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {top.name}
                      </h2>
                      <span className="px-3 py-1 rounded-full text-sm font-black text-emerald-700 bg-emerald-100
                        dark:bg-emerald-900/30 dark:text-emerald-400">
                        {top.match}% Match
                      </span>
                    </div>

                    {/* Match bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${top.match}%`, background: 'linear-gradient(90deg,#FFD700,#FFEE55)' }}
                      />
                    </div>

                    <p className="text-slate-600 dark:text-navy-300 leading-relaxed mb-4">
                      {top.description}
                    </p>
                    {top.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {top.skills.map(skill => (
                          <span key={skill}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold
                              bg-navy-50 dark:bg-navy-800 text-navy-700 dark:text-navy-200
                              border border-navy-100 dark:border-navy-700/40">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      to={`/programs/${top.code || top.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                        font-black text-sm text-navy-900 transition-all hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
                    >
                      View Program Details
                      <FiArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Other matches */}
            {others.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                  Other Programs You Might Like
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {others.map(prog => (
                    <div key={prog.code || prog.id}
                      className="bg-white dark:bg-navy-900 rounded-2xl p-5
                        border border-slate-100 dark:border-navy-700/40 hover:shadow-md
                        hover:border-gold/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                          {prog.name}
                        </h4>
                        <span className="text-xs font-black text-gold whitespace-nowrap ml-2">
                          {prog.match}%
                        </span>
                      </div>
                      {/* Mini match bar */}
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${prog.match}%`, background: '#FFD700' }}
                        />
                      </div>
                      <Link
                        to={`/programs/${prog.code || prog.id}`}
                        className="flex items-center gap-1.5 text-xs font-bold text-gold hover:underline"
                      >
                        Learn more <FiArrowRight size={11} aria-hidden="true" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={restartQuiz}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm
                  text-slate-700 dark:text-navy-200
                  border border-slate-200 dark:border-navy-700/40
                  hover:bg-slate-50 dark:hover:bg-navy-800 transition-all"
              >
                <FiRefreshCw size={14} aria-hidden="true" />
                Take Again
              </button>
              <Link
                to={`/programs/${top.code || top.id}`}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-navy-900
                  transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
              >
                <FiBook size={14} aria-hidden="true" />
                View Top Program
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Quiz in progress ── */
  if (quizStarted) {
    const question = questions[currentQ];
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-400 dark:text-navy-500 uppercase tracking-widest">
              Question {currentQ + 1} of {questions.length}
            </span>
            <span className="text-xs font-bold text-gold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#FFD700,#FFEE55)' }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white dark:bg-navy-900 rounded-3xl border border-slate-100 dark:border-navy-700/40
          shadow-md overflow-hidden mb-6">
          <div className="h-1" style={{ background: 'linear-gradient(90deg,#FFD700,#FFEE66,#FFD700)' }} aria-hidden="true" />
          <div className="p-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 leading-snug">
              {question?.question_text}
            </h2>
            <div className="space-y-3" role="radiogroup" aria-label="Answer options">
              {question?.options?.map((opt, i) => {
                const isSelected = answers[currentQ] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectAnswer(opt.id)}
                    role="radio"
                    aria-checked={isSelected}
                    className={[
                      'group w-full flex items-center gap-4 px-5 py-4 rounded-2xl',
                      'text-left text-sm font-semibold transition-all duration-150 border-2',
                      isSelected
                        ? 'border-gold bg-gold/5 dark:bg-gold/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-navy-700/40 text-slate-700 dark:text-navy-200 hover:border-gold/40 hover:bg-slate-50 dark:hover:bg-navy-800/60',
                    ].join(' ')}
                  >
                    {/* Option letter */}
                    <span className={[
                      'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center',
                      'text-xs font-black transition-all',
                      isSelected
                        ? 'bg-gold text-navy-900'
                        : 'bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-navy-400 group-hover:bg-gold/20 group-hover:text-gold',
                    ].join(' ')} aria-hidden="true">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt.option_text}
                    {isSelected && (
                      <FiCheckCircle size={16} className="ml-auto flex-shrink-0 text-gold" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentQ === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm
              text-slate-600 dark:text-navy-300
              border border-slate-200 dark:border-navy-700/40
              hover:bg-slate-50 dark:hover:bg-navy-800
              disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <FiChevronLeft size={16} aria-hidden="true" />
            Previous
          </button>
          <button
            onClick={goNext}
            disabled={!answers[currentQ]}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-navy-900
              transition-all hover:-translate-y-0.5
              disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
          >
            {currentQ === questions.length - 1 ? 'See Results' : 'Next'}
            <FiChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  /* ── Intro + programs overview ── */
  return (
    <div className="bg-slate-50 dark:bg-navy-950 min-h-full">

      {/* Hero */}
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
          <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>
            <FiCompass size={36} className="text-gold" aria-hidden="true" />
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
            border border-gold/25 bg-gold/8 text-[11px] font-black tracking-widest uppercase text-gold mb-5">
            Program Pathfinder
          </span>
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Find Your{' '}
            <span className="text-gold">Academic Path</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Take our short assessment to discover which PKFokam program best matches your interests,
            skills, and career aspirations. Your journey starts here.
          </p>
          <button
            onClick={startQuiz}
            disabled={questions.length === 0}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base text-navy-900
              transition-all hover:-translate-y-0.5 active:translate-y-0
              disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
          >
            Start Assessment
            <FiChevronRight size={18} aria-hidden="true" />
          </button>
          {questions.length > 0 && (
            <p className="text-white/30 text-xs mt-4 font-medium">
              {questions.length} question{questions.length !== 1 ? 's' : ''} · Takes about 2 minutes
            </p>
          )}
        </div>
      </div>

      {/* Programs overview */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
          Explore All Programs
        </h2>
        {Object.values(programs).length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-navy-500">
            <FiBook size={36} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
            <p className="text-sm">No programs available yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.values(programs).map(prog => (
              <div key={prog.id}
                className="group bg-white dark:bg-navy-900 rounded-2xl p-6
                  border border-slate-100 dark:border-navy-700/40
                  hover:border-gold/30 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4
                  bg-navy-100 dark:bg-navy-800 group-hover:bg-gold/10 transition-colors">
                  <FiBook size={18} className="text-navy-600 dark:text-navy-300 group-hover:text-gold transition-colors" aria-hidden="true" />
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-base mb-2 leading-snug">
                  {prog.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-navy-400 leading-relaxed mb-4 line-clamp-3">
                  {prog.description}
                </p>
                <Link
                  to={`/programs/${prog.code || prog.id}`}
                  className="flex items-center gap-1.5 text-sm font-bold text-gold hover:underline"
                >
                  Learn more
                  <FiArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
