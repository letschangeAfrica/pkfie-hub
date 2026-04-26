import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  FiChevronLeft, FiChevronRight, FiPlus, FiX,
  FiClock, FiMapPin, FiUser, FiSearch,
  FiCalendar, FiGrid, FiList,
} from 'react-icons/fi';

/* ─── helpers ─────────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TYPE_COLOR = {
  academic:      'bg-sky-500',
  social:        'bg-emerald-500',
  career:        'bg-violet-500',
  workshop:      'bg-amber-500',
  personal:      'bg-rose-500',
  deadline:      'bg-red-600',
  holiday:       'bg-teal-500',
  meeting:       'bg-indigo-500',
  announcement:  'bg-orange-500',
  institutional: 'bg-gold/80',
};
const TYPE_TEXT = {
  academic:      'text-sky-400',
  social:        'text-emerald-400',
  career:        'text-violet-400',
  workshop:      'text-amber-400',
  personal:      'text-rose-400',
  deadline:      'text-red-400',
  holiday:       'text-teal-400',
  meeting:       'text-indigo-400',
  announcement:  'text-orange-400',
  institutional: 'text-gold',
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

/* ─── mini calendar ────────────────────────────────────── */
function MiniCal({ current, selected, onSelect, onChangeMonth }) {
  const year  = current.getFullYear();
  const month = current.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));

  return (
    <div className="px-3 py-4 select-none">
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={() => onChangeMonth(-1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-navy-400
            hover:text-white hover:bg-navy-700/50 transition-colors"
        >
          <FiChevronLeft size={14} />
        </button>
        <span className="text-xs font-black text-white">
          {MONTHS[month].slice(0, 3)} {year}
        </span>
        <button
          onClick={() => onChangeMonth(1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-navy-400
            hover:text-white hover:bg-navy-700/50 transition-colors"
        >
          <FiChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="h-7 flex items-center justify-center
            text-[10px] font-black text-navy-500 uppercase tracking-wider">
            {d[0]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const isToday   = isSameDay(date, today);
          const isSel     = selected && isSameDay(date, selected);
          return (
            <button
              key={i}
              onClick={() => onSelect(date)}
              className={[
                'h-7 w-full rounded-lg text-[11px] font-bold transition-all',
                isToday && !isSel ? 'text-gold ring-1 ring-gold/40 bg-gold/10' : '',
                isSel   ? 'bg-gold text-navy-900' : 'text-navy-300 hover:bg-navy-700/50 hover:text-white',
              ].join(' ')}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── event dot list for mini cal ─────────────────────── */
/* ─── event card (compact) ────────────────────────────── */
function EventChip({ event, onClick }) {
  const color = TYPE_COLOR[event.event_type] || 'bg-gold/80';
  return (
    <button
      onClick={() => onClick(event)}
      className={`w-full text-left px-2 py-0.5 rounded text-[11px] font-semibold
        text-white truncate mb-0.5 hover:opacity-90 transition-opacity ${color}`}
    >
      {fmtTime(event.start_time)} {event.title}
    </button>
  );
}

/* ─── Month view ───────────────────────────────────────── */
function MonthView({ current, events, selectedDate, onSelectDate, onEventClick, onAddOnDate }) {
  const year  = current.getFullYear();
  const month = current.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsForDay = (date) =>
    date
      ? events.filter(e => isSameDay(new Date(e.start_time), date))
      : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-navy-700/40 flex-shrink-0">
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-black text-navy-500 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(auto-fill,minmax(0,1fr))] overflow-hidden">
        {cells.map((date, i) => {
          const dayEvents   = eventsForDay(date);
          const isToday     = date && isSameDay(date, today);
          const isSelected  = date && selectedDate && isSameDay(date, selectedDate);
          const isOtherMon  = !date;

          return (
            <div
              key={i}
              onClick={() => date && onSelectDate(date)}
              className={[
                'border-r border-b border-navy-700/30 p-1 min-h-[100px] cursor-pointer transition-colors overflow-hidden',
                isOtherMon ? 'bg-navy-900/30' : 'hover:bg-navy-700/10',
                isSelected  ? 'bg-gold/5 ring-1 ring-inset ring-gold/20' : '',
              ].join(' ')}
            >
              {date && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={[
                        'w-7 h-7 flex items-center justify-center rounded-full text-xs font-black transition-colors',
                        isToday   ? 'bg-gold text-navy-900' : 'text-navy-400 hover:text-white',
                      ].join(' ')}
                      onClick={e => { e.stopPropagation(); onSelectDate(date); }}
                    >
                      {date.getDate()}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); onAddOnDate(date); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded
                        flex items-center justify-center text-navy-500 hover:text-gold hover:bg-navy-700/50 transition-all"
                    >
                      <FiPlus size={10} />
                    </button>
                  </div>
                  {dayEvents.slice(0, 3).map(e => (
                    <EventChip key={e.id} event={e} onClick={onEventClick} />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-navy-500 pl-1 font-semibold">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Week view ────────────────────────────────────────── */
function WeekView({ current, events, onEventClick }) {
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - current.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
  const today = new Date();

  const eventsForDay = (date) =>
    events.filter(e => isSameDay(new Date(e.start_time), date));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header row */}
      <div className="grid border-b border-navy-700/40 flex-shrink-0"
        style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
        <div className="border-r border-navy-700/40" />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={i} className="py-2 text-center border-r border-navy-700/40 last:border-r-0">
              <div className="text-[10px] font-black text-navy-500 uppercase tracking-widest">
                {DAYS_SHORT[d.getDay()]}
              </div>
              <div className={[
                'w-8 h-8 mx-auto mt-1 rounded-full flex items-center justify-center',
                'text-sm font-black transition-colors',
                isToday ? 'bg-gold text-navy-900' : 'text-white',
              ].join(' ')}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          {/* Hour labels */}
          <div className="col-start-1">
            {HOURS.map(h => (
              <div key={h} className="h-14 border-b border-navy-700/20 flex items-start pt-1 pr-2
                justify-end text-[10px] font-bold text-navy-600">
                {h === 0 ? '' : `${h}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => (
            <div key={di} className="col-start-auto border-r border-navy-700/30 last:border-r-0 relative">
              {HOURS.map(h => (
                <div key={h} className="h-14 border-b border-navy-700/20" />
              ))}
              {/* Events */}
              {eventsForDay(d).map(e => {
                const start = new Date(e.start_time);
                const end   = new Date(e.end_time);
                const top   = (start.getHours() + start.getMinutes() / 60) * 56;
                const dur   = Math.max(0.5, (end - start) / 3600000);
                const height= Math.min(dur * 56, 56 * 8);
                return (
                  <button
                    key={e.id}
                    onClick={() => onEventClick(e)}
                    style={{ top, height, minHeight: 24 }}
                    className={[
                      'absolute left-0.5 right-0.5 rounded px-1 text-left overflow-hidden',
                      'text-white text-[10px] font-bold cursor-pointer z-10',
                      'hover:opacity-90 transition-opacity',
                      TYPE_COLOR[e.event_type] || 'bg-gold/80',
                    ].join(' ')}
                  >
                    <div className="truncate">{e.title}</div>
                    <div className="opacity-80">{fmtTime(e.start_time)}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Day view ─────────────────────────────────────────── */
function DayView({ current, events, onEventClick }) {
  const today = new Date();
  const isToday = isSameDay(current, today);
  const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), current));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-navy-700/40 flex-shrink-0">
        <div className={[
          'w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black',
          isToday ? 'bg-gold text-navy-900' : 'bg-navy-700/50 text-white',
        ].join(' ')}>
          {current.getDate()}
        </div>
        <div>
          <div className="text-lg font-black text-white">
            {DAYS_SHORT[current.getDay()]}, {MONTHS[current.getMonth()]} {current.getDate()}
          </div>
          <div className="text-xs text-navy-400 font-medium">
            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* Hours */}
          <div className="w-14 flex-shrink-0">
            {HOURS.map(h => (
              <div key={h} className="h-16 border-b border-navy-700/20 flex items-start pt-1 pr-2
                justify-end text-[10px] font-bold text-navy-600">
                {h === 0 ? '' : `${h}:00`}
              </div>
            ))}
          </div>
          {/* Event lane */}
          <div className="flex-1 relative border-l border-navy-700/30">
            {HOURS.map(h => (
              <div key={h} className="h-16 border-b border-navy-700/20" />
            ))}
            {dayEvents.map(e => {
              const start  = new Date(e.start_time);
              const end    = new Date(e.end_time);
              const top    = (start.getHours() + start.getMinutes() / 60) * 64;
              const dur    = Math.max(0.5, (end - start) / 3600000);
              const height = Math.min(dur * 64, 64 * 8);
              return (
                <button
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  style={{ top, height, minHeight: 32 }}
                  className={[
                    'absolute left-2 right-2 rounded-xl px-3 py-1 text-left overflow-hidden',
                    'text-white cursor-pointer hover:opacity-90 transition-opacity z-10',
                    TYPE_COLOR[e.event_type] || 'bg-gold/80',
                  ].join(' ')}
                >
                  <div className="text-sm font-black truncate">{e.title}</div>
                  <div className="text-[11px] opacity-80">
                    {fmtTime(e.start_time)} – {fmtTime(e.end_time)}
                  </div>
                  {e.location && (
                    <div className="text-[10px] opacity-70 truncate mt-0.5">{e.location}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Event detail panel ───────────────────────────────── */
function EventPanel({ event, onClose }) {
  if (!event) return null;
  const color = TYPE_COLOR[event.event_type] || 'bg-gold/80';
  const textColor = TYPE_TEXT[event.event_type] || 'text-gold';

  return (
    <div className="w-80 flex-shrink-0 border-l border-navy-700/40 bg-navy-900
      flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Color bar */}
      <div className={`h-1.5 w-full ${color}`} />

      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${textColor}`}>
            {event.event_type}
          </span>
          <h2 className="text-base font-black text-white mt-1 leading-snug pr-6">
            {event.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
            text-navy-400 hover:text-white hover:bg-navy-700/50 transition-colors"
        >
          <FiX size={14} />
        </button>
      </div>

      <div className="px-5 pb-5 space-y-3 overflow-y-auto flex-1">
        <div className="flex items-start gap-3 text-sm">
          <FiClock size={14} className="text-navy-400 flex-shrink-0 mt-0.5" />
          <div className="text-navy-200">
            <div>{fmtDate(event.start_time)}</div>
            <div className="text-navy-400 text-xs mt-0.5">
              {fmtTime(event.start_time)} – {fmtTime(event.end_time)}
            </div>
          </div>
        </div>

        {event.location && (
          <div className="flex items-start gap-3 text-sm">
            <FiMapPin size={14} className="text-navy-400 flex-shrink-0 mt-0.5" />
            <span className="text-navy-200">{event.location}</span>
          </div>
        )}

        {event.organizer && (
          <div className="flex items-start gap-3 text-sm">
            <FiUser size={14} className="text-navy-400 flex-shrink-0 mt-0.5" />
            <span className="text-navy-200">{event.organizer}</span>
          </div>
        )}

        {event.description && (
          <div className="pt-3 border-t border-navy-700/40">
            <p className="text-sm text-navy-300 leading-relaxed">{event.description}</p>
          </div>
        )}

        {event.max_attendees && (
          <div className="flex items-center justify-between py-3 border-t border-navy-700/40">
            <span className="text-xs text-navy-500">Capacity</span>
            <span className="text-xs font-black text-white">{event.max_attendees} attendees</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Add-event modal ──────────────────────────────────── */
function AddEventModal({ initialDate, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '',
    event_type: 'personal',
    start_time: initialDate
      ? `${initialDate.toISOString().slice(0, 10)}T09:00`
      : new Date().toISOString().slice(0, 16),
    end_time: initialDate
      ? `${initialDate.toISOString().slice(0, 10)}T10:00`
      : new Date().toISOString().slice(0, 16),
    location: '',
    description: '',
    is_all_day: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/calendar/events/', {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time:   new Date(form.end_time).toISOString(),
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.non_field_errors?.[0] || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `w-full px-3 py-2 rounded-xl bg-navy-800 border border-navy-700/50 text-white
    text-sm placeholder-navy-600 focus:outline-none focus:border-gold/50 transition-colors`;

  const EVENT_TYPES = [
    'personal','academic','social','career','workshop',
    'deadline','holiday','meeting','announcement','institutional',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-navy-900 rounded-2xl shadow-2xl
        border border-navy-700/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/40">
          <h2 className="text-base font-black text-white">New Event</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center
              text-navy-400 hover:text-white hover:bg-navy-700/50 transition-colors"
          >
            <FiX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Event title"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className={`${inputCls} text-base font-bold`}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy-400 mb-1.5">Start</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-navy-400 mb-1.5">End</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-400 mb-1.5">Type</label>
            <select
              value={form.event_type}
              onChange={e => set('event_type', e.target.value)}
              className={inputCls}
            >
              {EVENT_TYPES.map(t => (
                <option key={t} value={t} className="bg-navy-800 capitalize">{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-400 mb-1.5">Location</label>
            <input
              type="text"
              placeholder="Optional"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-400 mb-1.5">Description</label>
            <textarea
              rows={3}
              placeholder="Optional"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs font-semibold">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-navy-700/60 text-sm
                font-bold text-navy-300 hover:text-white hover:border-navy-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-navy-900
                disabled:opacity-50 transition-all hover:-translate-y-px active:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
            >
              {saving ? 'Saving…' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Calendar page ───────────────────────────────── */
export default function Calendar() {
  const [view, setView]             = useState('month');
  const [current, setCurrent]       = useState(new Date());
  const [miniCurrent, setMiniCurrent] = useState(new Date());
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [addDate, setAddDate]       = useState(null);
  const [search, setSearch]         = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();

      const [calRes, eventsRes] = await Promise.allSettled([
        api.get('/calendar/events/', { params }),
        api.get('/events/', { params: { ...params, page_size: 100 } }),
      ]);

      const calItems   = calRes.status   === 'fulfilled' ? (calRes.value.data?.results   || calRes.value.data   || []) : [];
      const eventItems = eventsRes.status === 'fulfilled' ? (eventsRes.value.data?.results || eventsRes.value.data || []) : [];

      // Normalize events app items to CalendarEvent shape
      const normalized = eventItems.map(e => ({
        id:         `evt-${e.id}`,
        title:      e.title,
        start_time: e.start_time || e.start_date,
        end_time:   e.end_time   || e.end_date,
        event_type: e.event_type || 'academic',
        location:   e.location   || '',
        description:e.description|| '',
        organizer:  e.organizer || '',
        _source:    'events',
      }));

      // Merge: calItems first, then events not already present by title+date
      const calTitles = new Set(calItems.map(c => `${c.title}__${c.start_time?.slice(0,10)}`));
      const unique = normalized.filter(e => !calTitles.has(`${e.title}__${e.start_time?.slice(0,10)}`));

      setEvents([...calItems, ...unique]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const navigate = (dir) => {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrent(d);
    setMiniCurrent(new Date(d));
  };

  const goToday = () => {
    const t = new Date();
    setCurrent(t);
    setMiniCurrent(t);
    setSelectedDate(t);
  };

  const handleMiniSelect = (date) => {
    setSelectedDate(date);
    setCurrent(new Date(date));
  };

  const handleAddOnDate = (date) => {
    setAddDate(date);
    setShowAddModal(true);
  };

  const headerTitle = () => {
    if (view === 'month') return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === 'week') {
      const start = new Date(current);
      start.setDate(current.getDate() - current.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      if (start.getMonth() === end.getMonth())
        return `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
      return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${DAYS_SHORT[current.getDay()]}, ${MONTHS[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`;
  };

  const today = new Date();
  const todayEvents = events.filter(e => isSameDay(new Date(e.start_time), today));

  return (
    <div className="flex h-full bg-navy-950 overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 border-r border-navy-700/40 bg-navy-900
        flex flex-col overflow-y-auto">

        {/* Add event CTA */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => { setAddDate(null); setShowAddModal(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-sm font-black text-navy-900 transition-all hover:-translate-y-px active:translate-y-0
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
          >
            <FiPlus size={16} />
            New Event
          </button>
        </div>

        {/* Mini calendar */}
        <MiniCal
          current={miniCurrent}
          selected={selectedDate}
          onSelect={handleMiniSelect}
          onChangeMonth={dir => {
            const d = new Date(miniCurrent);
            d.setMonth(d.getMonth() + dir);
            setMiniCurrent(d);
          }}
        />

        {/* Today's events */}
        <div className="px-3 pt-2 pb-4 border-t border-navy-700/40 mt-2 flex-1">
          <p className="text-[10px] font-black text-navy-500 uppercase tracking-widest mb-2">
            Today
          </p>
          {todayEvents.length === 0 ? (
            <p className="text-xs text-navy-600 italic">No events today</p>
          ) : (
            todayEvents.slice(0, 5).map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedEvent(e)}
                className="w-full text-left mb-1.5 group"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_COLOR[e.event_type] || 'bg-gold'}`} />
                  <span className="text-xs text-navy-300 group-hover:text-white truncate transition-colors">
                    {e.title}
                  </span>
                </div>
                <div className="text-[10px] text-navy-600 pl-4">{fmtTime(e.start_time)}</div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3
          border-b border-navy-700/40 bg-navy-900/80 backdrop-blur-sm flex-shrink-0">

          {/* Left: nav + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-xl border border-navy-700/60 text-xs font-black
                text-navy-300 hover:text-white hover:border-navy-600 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-l-xl flex items-center justify-center
                  bg-navy-800/50 border border-navy-700/60 text-navy-400
                  hover:text-white hover:bg-navy-700/50 transition-colors"
              >
                <FiChevronLeft size={15} />
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-8 h-8 rounded-r-xl flex items-center justify-center
                  bg-navy-800/50 border border-l-0 border-navy-700/60 text-navy-400
                  hover:text-white hover:bg-navy-700/50 transition-colors"
              >
                <FiChevronRight size={15} />
              </button>
            </div>
            <h1 className="text-base font-black text-white">{headerTitle()}</h1>
          </div>

          {/* Right: search + view switcher */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events…"
                className="pl-8 pr-3 py-1.5 w-44 bg-navy-800/50 border border-navy-700/50 rounded-xl
                  text-xs text-white placeholder-navy-600 focus:outline-none focus:border-gold/40 transition-colors"
              />
            </div>
            <div className="flex bg-navy-800/50 rounded-xl border border-navy-700/50 p-0.5">
              {[
                { key: 'month', icon: FiGrid,     label: 'Month' },
                { key: 'week',  icon: FiCalendar, label: 'Week'  },
                { key: 'day',   icon: FiList,     label: 'Day'   },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  title={label}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all',
                    view === key
                      ? 'bg-gold text-navy-900'
                      : 'text-navy-400 hover:text-white',
                  ].join(' ')}
                >
                  <Icon size={13} />
                  <span className="hidden md:block">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading bar */}
        {loading && (
          <div className="h-0.5 bg-navy-700/40 flex-shrink-0">
            <div className="h-full bg-gold animate-pulse w-1/2" />
          </div>
        )}

        {/* View + event panel */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
            {view === 'month' && (
              <MonthView
                current={current}
                events={events}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onEventClick={setSelectedEvent}
                onAddOnDate={handleAddOnDate}
              />
            )}
            {view === 'week' && (
              <WeekView
                current={current}
                events={events}
                onEventClick={setSelectedEvent}
              />
            )}
            {view === 'day' && (
              <DayView
                current={current}
                events={events}
                onEventClick={setSelectedEvent}
              />
            )}
          </div>

          {/* Event detail panel */}
          {selectedEvent && (
            <EventPanel
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </div>
      </div>

      {/* Add event modal */}
      {showAddModal && (
        <AddEventModal
          initialDate={addDate}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchEvents(); }}
        />
      )}
    </div>
  );
}
