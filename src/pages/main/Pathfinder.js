import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  FiCompass, FiChevronRight, FiChevronLeft, FiRefreshCw,
  FiBook, FiCheckCircle, FiAward, FiArrowRight, FiSkipForward,
  FiTarget, FiStar,
} from 'react-icons/fi';

const Sk = ({ className = '' }) => (
  <div className={`bg-slate-100 dark:bg-navy-700/60 rounded-xl animate-pulse ${className}`} />
);

const maxWeightFromQuestions = (questions) => {
  let max = 0;
  questions.forEach(q => {
    const weights = q.options?.flatMap(o => Object.values(o.program_weights || {}));
    if (weights?.length) max += Math.max(0, ...weights);
  });
  return max || (questions.length * 3) || 1;
};

export default function Pathfinder() {
  const [quizStarted,    setQuizStarted]    = useState(false);
  const [currentQ,       setCurrentQ]       = useState(0);
  const [answers,        setAnswers]        = useState({});
  const [skipped,        setSkipped]        = useState(new Set());
  const [showResults,    setShowResults]    = useState(false);
  const [questions,      setQuestions]      = useState([]);
  const [programs,       setPrograms]       = useState({});
  const [loading,        setLoading]        = useState(true);
  const [backendResults, setBackendResults] = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState('');
  const [slideDir,       setSlideDir]       = useState('right');
  const [animKey,        setAnimKey]        = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [qRes, pRes] = await Promise.all([
          api.get('/pathfinder/questions/'),
          api.get('/pathfinder/programs/'),
        ]);
        const pMap = {};
        pRes.data.forEach(p => { pMap[p.code || p.id] = p; });
        setQuestions(qRes.data);
        setPrograms(pMap);
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
          err?.message ||
          'Could not load Pathfinder data. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentQ(0);
    setAnswers({});
    setSkipped(new Set());
    setShowResults(false);
    setBackendResults(null);
    setSlideDir('right');
    setAnimKey(k => k + 1);
  };

  const restartQuiz = () => {
    setQuizStarted(false);
    setCurrentQ(0);
    setAnswers({});
    setSkipped(new Set());
    setShowResults(false);
    setBackendResults(null);
  };

  const navigate = (dir) => {
    setSlideDir(dir > 0 ? 'right' : 'left');
    setAnimKey(k => k + 1);
    setCurrentQ(q => q + dir);
  };

  const selectAnswer = (optId) => {
    setAnswers(p => ({ ...p, [currentQ]: optId }));
    setSkipped(s => { const n = new Set(s); n.delete(currentQ); return n; });
  };

  const skipQuestion = () => {
    setSkipped(s => new Set([...s, currentQ]));
    setAnswers(p => { const n = { ...p }; delete n[currentQ]; return n; });
    if (currentQ < questions.length - 1) navigate(1);
    else calculateResults();
  };

  const goNext = () => {
    if (currentQ < questions.length - 1) navigate(1);
    else calculateResults();
  };

  const goPrev = () => { if (currentQ > 0) navigate(-1); };

  const calculateResults = async () => {
    setSubmitting(true);
    setShowResults(true);
    try {
      const payload = Object.entries(answers).map(([qIdx, optId]) => {
        const question = questions[qIdx];
        const opt = question?.options?.find(o => o.id === optId || o.option_value === optId);
        return { question: question.id, option: opt?.id, answer_value: opt?.option_value || optId };
      });

      const scores = {};
      Object.values(programs).forEach(p => { scores[p.code || p.id] = 0; });
      payload.forEach(({ question: qId, option: optId }) => {
        const q = questions.find(q => q.id === qId);
        const opt = q?.options?.find(o => o.id === optId);
        if (opt?.program_weights) {
          Object.entries(opt.program_weights).forEach(([code, w]) => {
            scores[code] = (scores[code] || 0) + w;
          });
        }
      });

      const sessionRes = await api.post('/pathfinder/sessions/', { completed: true, results: scores });
      const session = sessionRes.data;

      const answersRes = await api.post(`/pathfinder/sessions/${session.id}/answers/`, { answers: payload });
      setBackendResults(answersRes.data?.results?.program_matches || null);
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
    const max = maxWeightFromQuestions(questions);
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
  const answeredCount = Object.keys(answers).length;

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
    const skippedCount = skipped.size;

    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <style>{`
          @keyframes celebrate {
            0%   { transform: scale(0.7) rotate(-10deg); opacity: 0; }
            60%  { transform: scale(1.08) rotate(2deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(24px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          @keyframes barGrow {
            from { width: 0%; }
          }
          .celebrate  { animation: celebrate 0.6s cubic-bezier(0.34,1.56,0.64,1) both; }
          .slide-up   { animation: slideUp 0.5s ease both; }
          .slide-up-1 { animation: slideUp 0.5s 0.12s ease both; opacity: 0; animation-fill-mode: both; }
          .slide-up-2 { animation: slideUp 0.5s 0.24s ease both; opacity: 0; animation-fill-mode: both; }
        `}</style>

        <div className="text-center mb-8 celebrate">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
            bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30
            text-[11px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4">
            <FiCheckCircle size={11} aria-hidden="true" />
            Assessment Complete
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            Your Recommended Program
          </h1>
          <p className="text-slate-500 dark:text-navy-400 text-sm">
            Based on {answeredCount} answered question{answeredCount !== 1 ? 's' : ''}
            {skippedCount > 0 ? ` · ${skippedCount} skipped` : ''} — here's your best academic match.
          </p>
        </div>

        {submitting && (
          <div className="text-center py-14 text-slate-500 dark:text-navy-400">
            <span className="inline-block w-8 h-8 border-2 border-slate-300 border-t-gold rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold">Analysing your answers…</p>
          </div>
        )}

        {!submitting && top && (
          <>
            {/* Top match */}
            <div className="bg-white dark:bg-navy-900 rounded-3xl border border-slate-100 dark:border-navy-700/40
              overflow-hidden shadow-lg mb-8 slide-up">
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg,#FFD700,#FFEE66,#FFD700)' }} aria-hidden="true" />
              <div className="p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0
                    bg-gold/10 border border-gold/20">
                    <FiStar size={28} className="text-gold" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {top.name}
                      </h2>
                      <span className={`px-3 py-1 rounded-full text-sm font-black ${
                        top.match >= 70
                          ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : top.match >= 40
                          ? 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'text-slate-600 bg-slate-100 dark:bg-navy-800 dark:text-navy-300'
                      }`}>
                        {top.match}% Match
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${top.match}%`,
                          background: 'linear-gradient(90deg,#FFD700,#FFEE55)',
                          transition: 'width 1.2s cubic-bezier(0.25,1,0.5,1) 0.3s',
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-navy-500 mb-4">
                      {top.match >= 70
                        ? 'Excellent match — this program aligns strongly with your profile.'
                        : top.match >= 40
                        ? 'Good match — this program suits several of your preferences.'
                        : 'Possible match — explore more details to confirm it fits your goals.'}
                    </p>

                    <p className="text-slate-600 dark:text-navy-300 leading-relaxed mb-4">
                      {top.description}
                    </p>

                    {Array.isArray(top.skills) && top.skills.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-black text-slate-400 dark:text-navy-500 uppercase tracking-widest mb-2">
                          Skills You'll Develop
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {top.skills.map(skill => (
                            <span key={skill}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold
                                bg-navy-50 dark:bg-navy-800 text-navy-700 dark:text-navy-200
                                border border-navy-100 dark:border-navy-700/40">
                              {skill}
                            </span>
                          ))}
                        </div>
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
              <div className="mb-8 slide-up-1">
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
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${prog.match}%`,
                            background: '#FFD700',
                            transition: 'width 0.9s ease 0.4s',
                          }}
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
            <div className="flex flex-wrap gap-3 justify-center slide-up-2">
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

        {!submitting && !top && (
          <div className="text-center py-16 text-slate-400 dark:text-navy-500">
            <FiAward size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
            <p className="text-sm">No matches found. Try answering more questions.</p>
            <button
              onClick={restartQuiz}
              className="mt-5 flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm mx-auto
                text-slate-700 dark:text-navy-200 border border-slate-200 dark:border-navy-700/40
                hover:bg-slate-50 dark:hover:bg-navy-800 transition-all"
            >
              <FiRefreshCw size={14} aria-hidden="true" />
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── Quiz in progress ── */
  if (quizStarted) {
    const question = questions[currentQ];
    const isLast = currentQ === questions.length - 1;
    const hasAnswer = answers[currentQ] !== undefined;
    const showDots = questions.length <= 14;

    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <style>{`
          @keyframes slideInRight { from { transform: translateX(48px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes slideInLeft  { from { transform: translateX(-48px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          .slide-in-right { animation: slideInRight 0.22s ease both; }
          .slide-in-left  { animation: slideInLeft  0.22s ease both; }
        `}</style>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-400 dark:text-navy-500 uppercase tracking-widest">
              Question {currentQ + 1} / {questions.length}
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

        {/* Dot indicators */}
        {showDots && (
          <div className="flex gap-1.5 justify-center mb-6 flex-wrap">
            {Array.from({ length: questions.length }, (_, i) => (
              <button
                key={i}
                onClick={() => { setSlideDir(i > currentQ ? 'right' : 'left'); setAnimKey(k => k+1); setCurrentQ(i); }}
                aria-label={`Go to question ${i + 1}`}
                title={`Q${i+1}${answers[i] !== undefined ? ' — answered' : skipped.has(i) ? ' — skipped' : ''}`}
                className={[
                  'rounded-full transition-all duration-200 outline-none',
                  i === currentQ
                    ? 'w-6 h-2.5 bg-gold'
                    : answers[i] !== undefined
                    ? 'w-2.5 h-2.5 bg-emerald-400 dark:bg-emerald-500'
                    : skipped.has(i)
                    ? 'w-2.5 h-2.5 bg-slate-300 dark:bg-navy-600'
                    : 'w-2.5 h-2.5 bg-slate-200 dark:bg-navy-700 hover:bg-slate-300 dark:hover:bg-navy-600',
                ].join(' ')}
              />
            ))}
          </div>
        )}

        {/* Animated question card */}
        <div key={animKey} className={slideDir === 'right' ? 'slide-in-right' : 'slide-in-left'}>
          <div className="bg-white dark:bg-navy-900 rounded-3xl border border-slate-100 dark:border-navy-700/40
            shadow-md overflow-hidden mb-6">
            <div className="h-1" style={{ background: 'linear-gradient(90deg,#FFD700,#FFEE66,#FFD700)' }} aria-hidden="true" />
            <div className="p-8">

              {/* Category tag */}
              {question?.category && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                  bg-navy-50 dark:bg-navy-800 text-[11px] font-black tracking-wide
                  text-navy-600 dark:text-navy-300 border border-navy-100 dark:border-navy-700/40 mb-4">
                  <FiTarget size={10} aria-hidden="true" />
                  {question.category}
                </span>
              )}

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
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
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
            onClick={skipQuestion}
            title="Skip this question"
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-xs
              text-slate-400 dark:text-navy-500 hover:text-slate-600 dark:hover:text-navy-300
              hover:bg-slate-50 dark:hover:bg-navy-800 transition-all"
          >
            <FiSkipForward size={13} aria-hidden="true" />
            Skip
          </button>

          <button
            onClick={goNext}
            disabled={!hasAnswer}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-navy-900
              transition-all hover:-translate-y-0.5
              disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
          >
            {isLast ? 'See Results' : 'Next'}
            <FiChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-navy-600 mt-5">
          {answeredCount} of {questions.length} answered
          {skipped.size > 0 ? ` · ${skipped.size} skipped` : ''}
        </p>
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

          {questions.length > 0 && (
            <div className="flex justify-center gap-8 mb-8 flex-wrap">
              {[
                { label: `${questions.length} Questions`, sub: 'to answer'                          },
                { label: '~2 min',                        sub: 'to complete'                        },
                { label: `${Object.values(programs).length} Programs`, sub: 'to match against'      },
              ].map(({ label, sub }) => (
                <div key={label} className="text-center">
                  <p className="text-white font-black text-lg leading-none">{label}</p>
                  <p className="text-white/40 text-xs mt-1">{sub}</p>
                </div>
              ))}
            </div>
          )}

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
          {questions.length === 0 && (
            <p className="text-white/30 text-xs mt-4">No questions available yet — check back later.</p>
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
