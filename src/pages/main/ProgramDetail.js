import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiBook, FiClock, FiFileText,
  FiTrendingUp, FiDollarSign, FiCheckCircle,
  FiCompass, FiMail,
} from 'react-icons/fi';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/pathfinder';

const Sk = ({ className = '' }) => (
  <div className={`bg-slate-100 dark:bg-navy-700/60 rounded-xl animate-pulse ${className}`} />
);

const InfoCard = ({ icon: Icon, label, children, color = 'text-navy-600 dark:text-gold' }) => (
  <div className="bg-white dark:bg-navy-900 rounded-2xl p-5
    border border-slate-100 dark:border-navy-700/40">
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} aria-hidden="true" className={`flex-shrink-0 ${color}`} />
      <h3 className="text-xs font-black tracking-widest uppercase text-slate-400 dark:text-navy-500">
        {label}
      </h3>
    </div>
    <div className="text-sm text-slate-700 dark:text-navy-200 leading-relaxed">
      {children}
    </div>
  </div>
);

export default function ProgramDetail() {
  const { code }    = useParams();
  const navigate    = useNavigate();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setProgram(null);
    setError('');
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/programs/?code=${code}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const found = data.find(p => String(p.code).toLowerCase() === String(code).toLowerCase());
        setProgram(found || null);
        if (!found) setError('Program not found.');
      })
      .catch(() => setError('Could not load program details.'))
      .finally(() => setLoading(false));
  }, [code]);

  /* Loading */
  if (loading) return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <Sk className="h-4 w-20" />
      <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#001020 0%,#001F5B 100%)' }}>
        <div className="p-10 space-y-4">
          <Sk className="h-8 w-2/3" />
          <Sk className="h-5 w-24" />
          <Sk className="h-4 w-full" />
          <Sk className="h-4 w-5/6" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <Sk key={i} className="h-32" />)}
      </div>
    </div>
  );

  /* Error / not found */
  if (error || !program) return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
        <FiBook size={28} className="text-red-400" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">
        {error || 'Program not found'}
      </h2>
      <button
        onClick={() => navigate(-1)}
        className="mt-4 flex items-center gap-2 mx-auto text-sm font-bold text-slate-500 dark:text-navy-400 hover:text-gold transition-colors"
      >
        <FiArrowLeft size={14} aria-hidden="true" />
        Go back
      </button>
    </div>
  );

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

      {/* Hero header */}
      <div
        className="relative rounded-3xl overflow-hidden mb-6"
        style={{ background: 'linear-gradient(135deg,#000D2E 0%,#001F5B 60%,#001840 100%)' }}
      >
        {/* Adinkra grid */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg,rgba(255,215,0,.03) 0,rgba(255,215,0,.03) 1px,transparent 0,transparent 50%),
              repeating-linear-gradient(-45deg,rgba(255,215,0,.03) 0,rgba(255,215,0,.03) 1px,transparent 0,transparent 50%)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative px-8 py-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,215,0,.12)', border: '1px solid rgba(255,215,0,.2)' }}>
              <FiBook size={22} className="text-gold" aria-hidden="true" />
            </div>
            {program.code && (
              <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-widest
                border border-gold/30 bg-gold/10 text-gold">
                {program.code}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-white leading-tight mb-3">
            {program.name}
          </h1>
          {program.description && (
            <p className="text-white/60 text-base leading-relaxed max-w-xl">
              {program.description}
            </p>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {program.duration_years && (
          <InfoCard icon={FiClock} label="Duration">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {program.duration_years}
            </span>
            <span className="text-slate-400 dark:text-navy-500 ml-1">
              year{program.duration_years !== 1 ? 's' : ''}
            </span>
          </InfoCard>
        )}

        {(program.tuition_fee || program.additional_fees) && (
          <InfoCard icon={FiDollarSign} label="Tuition &amp; Fees" color="text-emerald-600 dark:text-emerald-400">
            {program.tuition_fee && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 dark:text-navy-500">Tuition</span>
                <strong className="text-slate-900 dark:text-white">${program.tuition_fee}</strong>
              </div>
            )}
            {program.additional_fees && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 dark:text-navy-500">Additional Fees</span>
                <strong className="text-slate-900 dark:text-white">${program.additional_fees}</strong>
              </div>
            )}
          </InfoCard>
        )}

        {program.requirements && (
          <InfoCard icon={FiFileText} label="Admission Requirements">
            {program.requirements}
          </InfoCard>
        )}

        {program.career_opportunities && (
          <InfoCard icon={FiTrendingUp} label="Career Opportunities" color="text-violet-600 dark:text-violet-400">
            {program.career_opportunities}
          </InfoCard>
        )}
      </div>

      {/* Features */}
      {program.features?.length > 0 && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-6
          border border-slate-100 dark:border-navy-700/40 mb-6">
          <h3 className="text-xs font-black tracking-widest uppercase text-slate-400 dark:text-navy-500 mb-4">
            Program Features
          </h3>
          <ul className="space-y-3">
            {program.features.map(f => (
              <li key={f.id} className="flex items-start gap-3">
                <FiCheckCircle
                  size={16}
                  aria-hidden="true"
                  className="flex-shrink-0 mt-0.5 text-emerald-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {f.feature_name}
                  </span>
                  {f.feature_description && (
                    <span className="text-sm text-slate-500 dark:text-navy-400">
                      : {f.feature_description}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills */}
      {program.skills?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-black tracking-widest uppercase text-slate-400 dark:text-navy-500 mb-3">
            Skills You'll Gain
          </h3>
          <div className="flex flex-wrap gap-2">
            {program.skills.map(skill => (
              <span key={skill}
                className="px-3 py-1.5 rounded-xl text-xs font-bold
                  bg-white dark:bg-navy-900 text-slate-700 dark:text-navy-200
                  border border-slate-200 dark:border-navy-700/40">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/pathfinder"
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm
            text-slate-700 dark:text-navy-200
            border border-slate-200 dark:border-navy-700/40
            hover:bg-slate-50 dark:hover:bg-navy-800 hover:border-gold/30 transition-all"
        >
          <FiCompass size={15} aria-hidden="true" />
          Take Pathfinder Again
        </Link>
        <a
          href={`mailto:admissions@pkfokam.edu?subject=Interested in ${program.name}`}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm text-navy-900
            transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
        >
          <FiMail size={15} aria-hidden="true" />
          Contact Admissions
        </a>
      </div>
    </div>
  );
}
