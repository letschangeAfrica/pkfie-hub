import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import {
  FiChevronLeft, FiChevronRight, FiPlus, FiX,
  FiClock, FiMapPin, FiUser, FiSearch,
  FiCalendar, FiGrid, FiList, FiEdit2, FiTrash2,
} from 'react-icons/fi';

/* ─── constants ────────────────────────────────────────── */
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const HOURS      = Array.from({ length: 24 }, (_, i) => i);

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
  institutional: 'bg-yellow-400',
};
const TYPE_TEXT = {
  academic:      'text-sky-500',
  social:        'text-emerald-500',
  career:        'text-violet-500',
  workshop:      'text-amber-500',
  personal:      'text-rose-500',
  deadline:      'text-red-500',
  holiday:       'text-teal-500',
  meeting:       'text-indigo-500',
  announcement:  'text-orange-500',
  institutional: 'text-yellow-500',
};
const TYPE_LABELS = {
  academic:      'Academic',
  social:        'Social',
  career:        'Career',
  workshop:      'Workshop',
  personal:      'Personal',
  deadline:      'Deadline',
  holiday:       'Holiday',
  meeting:       'Meeting',
  announcement:  'Announcement',
  institutional: 'Institutional',
};
const EVENT_TYPES = Object.keys(TYPE_LABELS);

/* ─── helpers ──────────────────────────────────────────── */
const isSameDay = (a, b) => {
  if (!a || !b || isNaN(a) || isNaN(b)) return false;
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
};

const fmtTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const toLocalDateStr = (date) => {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};

const toLocalDatetimeInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Column layout for overlapping events in time-grid views
function layoutEvents(dayEvents) {
  if (!dayEvents.length) return [];
  const sorted = [...dayEvents].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const colEnds = [];
  const result  = sorted.map(event => {
    const start = new Date(event.start_time);
    const end   = new Date(event.end_time);
    let col = colEnds.findIndex(t => t <= start);
    if (col === -1) { col = colEnds.length; colEnds.push(end); }
    else colEnds[col] = end;
    return { event, col, maxCols: 1 };
  });
  for (let i = 0; i < result.length; i++) {
    const si = new Date(result[i].event.start_time);
    const ei = new Date(result[i].event.end_time);
    let maxCol = result[i].col;
    for (let j = 0; j < result.length; j++) {
      const sj = new Date(result[j].event.start_time);
      const ej = new Date(result[j].event.end_time);
      if (si < ej && ei > sj) maxCol = Math.max(maxCol, result[j].col);
    }
    result[i].maxCols = maxCol + 1;
  }
  return result;
}

/* ─── shared class shorthands ──────────────────────────── */
// Sidebar section divider
const divider = 'border-t border-slate-200 dark:border-navy-700/40';
// Clickable row in sidebar
const sideRow  = 'w-full text-left mb-1.5 group';

/* ─── MiniCal ──────────────────────────────────────────── */
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
    <div className="px-3 py-3 select-none">
      <div className="flex items-center justify-between mb-3 px-1">
        <button onClick={() => onChangeMonth(-1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center
            text-slate-400 dark:text-navy-400
            hover:text-slate-700 dark:hover:text-white
            hover:bg-slate-100 dark:hover:bg-navy-700/50 transition-colors">
          <FiChevronLeft size={14} />
        </button>
        <span className="text-xs font-black text-slate-700 dark:text-white">
          {MONTHS[month].slice(0, 3)} {year}
        </span>
        <button onClick={() => onChangeMonth(1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center
            text-slate-400 dark:text-navy-400
            hover:text-slate-700 dark:hover:text-white
            hover:bg-slate-100 dark:hover:bg-navy-700/50 transition-colors">
          <FiChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="h-6 flex items-center justify-center
            text-[10px] font-black text-slate-400 dark:text-navy-500 uppercase">
            {d[0]}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const isToday = isSameDay(date, today);
          const isSel   = selected && isSameDay(date, selected);
          return (
            <button key={i} onClick={() => onSelect(date)}
              className={[
                'h-7 w-full rounded-lg text-[11px] font-bold transition-all',
                isSel   ? 'bg-gold text-navy-900'
                : isToday ? 'text-gold ring-1 ring-gold/50 bg-gold/10'
                : 'text-slate-600 dark:text-navy-300 hover:bg-slate-100 dark:hover:bg-navy-700/50 hover:text-slate-900 dark:hover:text-white',
              ].join(' ')}>
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── EventChip ────────────────────────────────────────── */
function EventChip({ event, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(event); }}
      className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-semibold
        text-white truncate mb-0.5 hover:opacity-80 transition-opacity
        ${TYPE_COLOR[event.event_type] || 'bg-yellow-400'}`}>
      {fmtTime(event.start_time)} {event.title}
    </button>
  );
}

/* ─── MonthView ────────────────────────────────────────── */
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

  const weekCount  = Math.ceil(cells.length / 7);
  const eventsForDay = (date) =>
    date ? events.filter(e => e.start_time && isSameDay(new Date(e.start_time), date)) : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-navy-700/40 flex-shrink-0 bg-slate-50 dark:bg-navy-900/60">
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-black
            text-slate-400 dark:text-navy-500 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — rows sized to fill available height evenly */}
      <div
        className="flex-1 grid grid-cols-7 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${weekCount}, minmax(90px, 1fr))` }}
      >
        {cells.map((date, i) => {
          const dayEvents  = eventsForDay(date);
          const isToday    = date && isSameDay(date, today);
          const isSelected = date && selectedDate && isSameDay(date, selectedDate);

          return (
            <div
              key={i}
              onClick={() => date && onSelectDate(date)}
              className={[
                'group border-r border-b border-slate-200 dark:border-navy-700/30',
                'p-1 overflow-hidden transition-colors',
                date ? 'cursor-pointer' : '',
                !date
                  ? 'bg-slate-50/70 dark:bg-navy-900/30'
                  : isSelected
                  ? 'bg-gold/5 ring-1 ring-inset ring-gold/30'
                  : 'hover:bg-slate-50 dark:hover:bg-navy-700/10 bg-white dark:bg-transparent',
              ].join(' ')}
            >
              {date && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      onClick={e => { e.stopPropagation(); onSelectDate(date); }}
                      className={[
                        'w-7 h-7 flex items-center justify-center rounded-full',
                        'text-xs font-black cursor-pointer transition-colors',
                        isToday
                          ? 'bg-gold text-navy-900'
                          : 'text-slate-600 dark:text-navy-200 hover:bg-slate-200 dark:hover:bg-navy-700',
                      ].join(' ')}
                    >
                      {date.getDate()}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); onAddOnDate(date); }}
                      aria-label={`Add event on ${date.toLocaleDateString()}`}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded
                        flex items-center justify-center transition-all
                        text-slate-400 dark:text-navy-500
                        hover:text-gold hover:bg-slate-100 dark:hover:bg-navy-700/50">
                      <FiPlus size={10} />
                    </button>
                  </div>

                  {dayEvents.slice(0, 3).map(e => (
                    <EventChip key={e.id} event={e} onClick={onEventClick} />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] pl-1 font-semibold text-slate-400 dark:text-navy-500">
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

/* ─── WeekView ─────────────────────────────────────────── */
const WEEK_ROW_H = 56;

function WeekView({ current, events, onEventClick }) {
  const scrollRef = useRef();
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    scrollRef.current.scrollTop = Math.max(0,
      (now.getHours() + now.getMinutes() / 60) * WEEK_ROW_H - 120);
  }, []);

  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - current.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
  const today = new Date();
  const eventsForDay = d =>
    events.filter(e => e.start_time && isSameDay(new Date(e.start_time), d));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-transparent">
      {/* Day header */}
      <div className="grid border-b border-slate-200 dark:border-navy-700/40 flex-shrink-0 bg-slate-50 dark:bg-navy-900/60"
        style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
        <div className="border-r border-slate-200 dark:border-navy-700/40" />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={i} className="py-2 text-center border-r border-slate-200 dark:border-navy-700/40 last:border-r-0">
              <div className="text-[10px] font-black text-slate-400 dark:text-navy-500 uppercase tracking-widest">
                {DAYS_SHORT[d.getDay()]}
              </div>
              <div className={[
                'w-8 h-8 mx-auto mt-1 rounded-full flex items-center justify-center text-sm font-black',
                isToday ? 'bg-gold text-navy-900' : 'text-slate-700 dark:text-white',
              ].join(' ')}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          {/* Hour labels */}
          <div>
            {HOURS.map(h => (
              <div key={h} className="h-14 border-b border-slate-100 dark:border-navy-700/20
                flex items-start pt-1 pr-2 justify-end
                text-[10px] font-bold text-slate-400 dark:text-navy-600">
                {h === 0 ? '' : `${h}:00`}
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((d, di) => {
            const layout = layoutEvents(eventsForDay(d));
            return (
              <div key={di} className="border-r border-slate-200 dark:border-navy-700/30 last:border-r-0 relative">
                {HOURS.map(h => (
                  <div key={h} className="h-14 border-b border-slate-100 dark:border-navy-700/20" />
                ))}
                {layout.map(({ event: e, col, maxCols }) => {
                  const start  = new Date(e.start_time);
                  const end    = new Date(e.end_time);
                  const top    = (start.getHours() + start.getMinutes() / 60) * WEEK_ROW_H;
                  const dur    = Math.max(0.5, (end - start) / 3600000);
                  const height = Math.min(dur * WEEK_ROW_H, WEEK_ROW_H * 8);
                  const colW   = 100 / maxCols;
                  return (
                    <button key={e.id} onClick={() => onEventClick(e)}
                      style={{ top, height, minHeight: 22, left: `${col * colW + 0.5}%`, right: `${(maxCols - col - 1) * colW + 0.5}%` }}
                      className={`absolute rounded px-1 text-left overflow-hidden z-10
                        text-white text-[10px] font-bold hover:opacity-80 transition-opacity
                        ${TYPE_COLOR[e.event_type] || 'bg-yellow-400'}`}>
                      <div className="truncate">{e.title}</div>
                      <div className="opacity-80">{fmtTime(e.start_time)}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── DayView ──────────────────────────────────────────── */
const DAY_ROW_H = 64;

function DayView({ current, events, onEventClick }) {
  const scrollRef = useRef();
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    scrollRef.current.scrollTop = Math.max(0,
      (now.getHours() + now.getMinutes() / 60) * DAY_ROW_H - 120);
  }, []);

  const today     = new Date();
  const isToday   = isSameDay(current, today);
  const dayEvents = events.filter(e => e.start_time && isSameDay(new Date(e.start_time), current));
  const layout    = layoutEvents(dayEvents);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-transparent">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-200 dark:border-navy-700/40
        bg-slate-50 dark:bg-navy-900/60 flex-shrink-0">
        <div className={[
          'w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black',
          isToday ? 'bg-gold text-navy-900' : 'bg-slate-100 dark:bg-navy-700/50 text-slate-800 dark:text-white',
        ].join(' ')}>
          {current.getDate()}
        </div>
        <div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {DAYS_SHORT[current.getDay()]}, {MONTHS[current.getMonth()]} {current.getDate()}
          </div>
          <div className="text-xs text-slate-500 dark:text-navy-400 font-medium">
            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="flex">
          <div className="w-14 flex-shrink-0">
            {HOURS.map(h => (
              <div key={h} className="h-16 border-b border-slate-100 dark:border-navy-700/20
                flex items-start pt-1 pr-2 justify-end
                text-[10px] font-bold text-slate-400 dark:text-navy-600">
                {h === 0 ? '' : `${h}:00`}
              </div>
            ))}
          </div>
          <div className="flex-1 relative border-l border-slate-200 dark:border-navy-700/30">
            {HOURS.map(h => (
              <div key={h} className="h-16 border-b border-slate-100 dark:border-navy-700/20" />
            ))}
            {layout.map(({ event: e, col, maxCols }) => {
              const start  = new Date(e.start_time);
              const end    = new Date(e.end_time);
              const top    = (start.getHours() + start.getMinutes() / 60) * DAY_ROW_H;
              const dur    = Math.max(0.5, (end - start) / 3600000);
              const height = Math.min(dur * DAY_ROW_H, DAY_ROW_H * 8);
              const colW   = 100 / maxCols;
              return (
                <button key={e.id} onClick={() => onEventClick(e)}
                  style={{ top, height, minHeight: 32, left: `${col * colW + 1}%`, right: `${(maxCols - col - 1) * colW + 1}%` }}
                  className={`absolute rounded-xl px-3 py-1 text-left overflow-hidden z-10
                    text-white hover:opacity-80 transition-opacity
                    ${TYPE_COLOR[e.event_type] || 'bg-yellow-400'}`}>
                  <div className="text-sm font-black truncate">{e.title}</div>
                  <div className="text-[11px] opacity-80">{fmtTime(e.start_time)} – {fmtTime(e.end_time)}</div>
                  {e.location && <div className="text-[10px] opacity-70 truncate mt-0.5">{e.location}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── EventPanel ───────────────────────────────────────── */
function EventPanel({ event, onClose, onEdit, onDeleted }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState('');

  const color   = TYPE_COLOR[event.event_type] || 'bg-yellow-400';
  const txtCol  = TYPE_TEXT[event.event_type]  || 'text-yellow-500';
  const isAuto  = event.is_auto_generated || event._source === 'events';

  const handleDelete = async () => {
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(`/calendar/events/${event.id}/`);
      onDeleted(event.id);
    } catch {
      setDeleteError('Could not delete. Try again.');
      setDeleting(false); setConfirmDelete(false);
    }
  };

  return (
    <div className="w-80 flex-shrink-0 bg-white dark:bg-navy-900
      border-l border-slate-200 dark:border-navy-700/40 flex flex-col overflow-hidden">
      <div className={`h-1.5 w-full ${color}`} />

      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div className="flex-1 min-w-0 pr-4">
          <span className={`text-[10px] font-black uppercase tracking-widest ${txtCol}`}>
            {TYPE_LABELS[event.event_type] || event.event_type}
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white mt-1 leading-snug">
            {event.title}
          </h2>
        </div>
        <button onClick={onClose}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
            text-slate-400 dark:text-navy-400
            hover:text-slate-700 dark:hover:text-white
            hover:bg-slate-100 dark:hover:bg-navy-700/50 transition-colors">
          <FiX size={14} />
        </button>
      </div>

      <div className="px-5 pb-4 space-y-3 overflow-y-auto flex-1">
        <div className="flex items-start gap-3 text-sm">
          <FiClock size={14} className="text-slate-400 dark:text-navy-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-slate-700 dark:text-navy-200">{fmtDate(event.start_time)}</div>
            <div className="text-slate-500 dark:text-navy-400 text-xs mt-0.5">
              {fmtTime(event.start_time)} – {fmtTime(event.end_time)}
            </div>
          </div>
        </div>

        {event.location && (
          <div className="flex items-start gap-3 text-sm">
            <FiMapPin size={14} className="text-slate-400 dark:text-navy-400 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700 dark:text-navy-200">{event.location}</span>
          </div>
        )}

        {event.organizer && (
          <div className="flex items-start gap-3 text-sm">
            <FiUser size={14} className="text-slate-400 dark:text-navy-400 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700 dark:text-navy-200">{event.organizer}</span>
          </div>
        )}

        {event.description && (
          <div className="pt-3 border-t border-slate-100 dark:border-navy-700/40">
            <p className="text-sm text-slate-600 dark:text-navy-300 leading-relaxed">{event.description}</p>
          </div>
        )}

        {event.max_attendees && (
          <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-navy-700/40">
            <span className="text-xs text-slate-400 dark:text-navy-500">Capacity</span>
            <span className="text-xs font-black text-slate-800 dark:text-white">{event.max_attendees} attendees</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-navy-700/40">
        {!isAuto ? (
          <div className="space-y-2">
            {deleteError && <p className="text-red-500 text-xs font-semibold">{deleteError}</p>}
            {confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-xs font-black text-white
                    bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold
                    text-slate-600 dark:text-navy-300
                    border border-slate-200 dark:border-navy-700/60
                    hover:text-slate-900 dark:hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => onEdit(event)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                    text-xs font-bold transition-colors
                    text-slate-600 dark:text-navy-300
                    border border-slate-200 dark:border-navy-700/60
                    hover:text-slate-900 dark:hover:text-white
                    hover:border-slate-300 dark:hover:border-navy-600">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => setConfirmDelete(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                    text-xs font-bold transition-colors
                    text-red-500 border border-red-200 dark:border-red-500/20
                    hover:bg-red-50 dark:hover:bg-red-900/20
                    hover:border-red-300 dark:hover:border-red-500/40">
                  <FiTrash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 dark:text-navy-600 italic">
            This event is system-generated and cannot be edited here.
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── EventModal (create & edit) ──────────────────────── */
function EventModal({ event, initialDate, onClose, onSaved }) {
  const isEdit = !!event;

  const [form, setForm] = useState(() => {
    if (isEdit) return {
      title:       event.title       || '',
      event_type:  event.event_type  || 'personal',
      start_time:  toLocalDatetimeInput(event.start_time),
      end_time:    toLocalDatetimeInput(event.end_time),
      location:    event.location    || '',
      description: event.description || '',
      is_all_day:  event.is_all_day  || false,
    };
    const startBase = initialDate ? `${toLocalDateStr(initialDate)}T09:00` : toLocalDatetimeInput(new Date());
    const endBase   = initialDate ? `${toLocalDateStr(initialDate)}T10:00` : (() => {
      const d = new Date(); d.setHours(d.getHours() + 1); return toLocalDatetimeInput(d);
    })();
    return { title: '', event_type: 'personal', start_time: startBase, end_time: endBase, location: '', description: '', is_all_day: false };
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    const startDt = new Date(form.start_time);
    const endDt   = new Date(form.end_time);
    if (endDt <= startDt) { setError('End time must be after start time.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, start_time: startDt.toISOString(), end_time: endDt.toISOString() };
      const res = isEdit
        ? await api.patch(`/calendar/events/${event.id}/`, payload)
        : await api.post('/calendar/events/', payload);
      onSaved(res.data);
    } catch (err) {
      setError(err?.response?.data?.non_field_errors?.[0] || err?.response?.data?.detail || 'Failed to save event.');
    } finally { setSaving(false); }
  };

  const inp = `w-full px-3 py-2 rounded-xl text-sm transition-colors
    bg-white dark:bg-navy-800
    border border-slate-200 dark:border-navy-700/50
    text-slate-900 dark:text-white
    placeholder-slate-400 dark:placeholder-navy-600
    focus:outline-none focus:border-gold/60 dark:focus:border-gold/50`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden
        bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/60">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-navy-700/40">
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            {isEdit ? 'Edit Event' : 'New Event'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center
              text-slate-400 dark:text-navy-400
              hover:text-slate-700 dark:hover:text-white
              hover:bg-slate-100 dark:hover:bg-navy-700/50 transition-colors">
            <FiX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <input type="text" placeholder="Event title" autoFocus
            value={form.title} onChange={e => set('title', e.target.value)}
            className={`${inp} text-base font-bold`} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-navy-400 mb-1.5">Start</label>
              <input type="datetime-local" value={form.start_time}
                onChange={e => set('start_time', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-navy-400 mb-1.5">End</label>
              <input type="datetime-local" value={form.end_time}
                onChange={e => set('end_time', e.target.value)} className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-navy-400 mb-1.5">Type</label>
            <select value={form.event_type} onChange={e => set('event_type', e.target.value)} className={inp}>
              {EVENT_TYPES.map(t => (
                <option key={t} value={t} className="bg-white dark:bg-navy-800">{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-navy-400 mb-1.5">Location</label>
            <input type="text" placeholder="Optional" value={form.location}
              onChange={e => set('location', e.target.value)} className={inp} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-navy-400 mb-1.5">Description</label>
            <textarea rows={3} placeholder="Optional" value={form.description}
              onChange={e => set('description', e.target.value)} className={`${inp} resize-none`} />
          </div>

          {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors
                border border-slate-200 dark:border-navy-700/60
                text-slate-600 dark:text-navy-300
                hover:text-slate-900 dark:hover:text-white
                hover:border-slate-300 dark:hover:border-navy-600">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-navy-900
                disabled:opacity-50 transition-all hover:-translate-y-px active:translate-y-0"
              style={{ background: 'linear-gradient(135deg,#FFD700 0%,#FFEE55 50%,#FFD700 100%)' }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Calendar ────────────────────────────────────── */
export default function Calendar() {
  const location = useLocation();

  const [view, setView]               = useState('month');
  const [current, setCurrent]         = useState(new Date());
  const [miniCurrent, setMiniCurrent] = useState(new Date());
  const [events, setEvents]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selectedDate, setSelectedDate]   = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent]   = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [addDate, setAddDate]         = useState(null);
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter]   = useState('');

  // Read ?date=YYYY-MM-DD from URL (set by Dashboard event click)
  useEffect(() => {
    const params   = new URLSearchParams(location.search);
    const dateStr  = params.get('date');
    if (!dateStr) return;
    // Use noon local time to avoid any UTC-midnight date-flip
    const d = new Date(`${dateStr}T12:00:00`);
    if (!isNaN(d)) {
      setCurrent(d);
      setMiniCurrent(d);
      setSelectedDate(d);
      setView('day');
    }
  }, [location.search]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (typeFilter) params.event_type = typeFilter;

      const [calRes, eventsRes] = await Promise.allSettled([
        api.get('/calendar/events/', { params }),
        api.get('/events/', { params: { ...params, page_size: 100 } }),
      ]);

      const calItems   = calRes.status   === 'fulfilled' ? (calRes.value.data?.results   || calRes.value.data   || []) : [];
      const eventItems = eventsRes.status === 'fulfilled' ? (eventsRes.value.data?.results || eventsRes.value.data || []) : [];

      const normalized = eventItems
        .map(e => ({
          id:          `evt-${e.id}`,
          title:       e.title,
          start_time:  e.start_time || e.start_date || null,
          end_time:    e.end_time   || e.end_date   || null,
          event_type:  e.event_type || 'academic',
          location:    e.location   || '',
          description: e.description || '',
          organizer:   e.organizer  || '',
          _source:     'events',
        }))
        .filter(e => e.start_time && !isNaN(new Date(e.start_time)));

      const calTitles = new Set(calItems.map(c => `${c.title}__${c.start_time?.slice(0,10)}`));
      const unique = normalized.filter(e => !calTitles.has(`${e.title}__${e.start_time?.slice(0,10)}`));
      setEvents([...calItems, ...unique]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const navigate = (dir) => {
    const d = new Date(current);
    if (view === 'month')      d.setMonth(d.getMonth() + dir);
    else if (view === 'week')  d.setDate(d.getDate() + dir * 7);
    else                       d.setDate(d.getDate() + dir);
    setCurrent(d);
    setMiniCurrent(new Date(d));
  };

  const goToday = () => {
    const t = new Date();
    setCurrent(t); setMiniCurrent(t); setSelectedDate(t);
  };

  const handleMiniSelect = (date) => {
    setSelectedDate(date); setCurrent(new Date(date));
  };

  const headerTitle = () => {
    if (view === 'month') return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === 'week') {
      const s = new Date(current); s.setDate(current.getDate() - current.getDay());
      const e = new Date(s);      e.setDate(s.getDate() + 6);
      return s.getMonth() === e.getMonth()
        ? `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`
        : `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${DAYS_SHORT[current.getDay()]}, ${MONTHS[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`;
  };

  const today      = new Date();
  const todayEvts  = events.filter(e => e.start_time && isSameDay(new Date(e.start_time), today));

  /* shared button styles */
  const toolBtn = `px-3 py-1.5 rounded-xl text-xs font-black transition-colors
    border border-slate-200 dark:border-navy-700/60
    text-slate-600 dark:text-navy-300
    hover:text-slate-900 dark:hover:text-white
    hover:border-slate-300 dark:hover:border-navy-600`;

  const navBtn = `w-8 h-8 flex items-center justify-center transition-colors
    bg-slate-50 dark:bg-navy-800/50
    border border-slate-200 dark:border-navy-700/60
    text-slate-500 dark:text-navy-400
    hover:text-slate-900 dark:hover:text-white
    hover:bg-slate-100 dark:hover:bg-navy-700/50`;

  return (
    <div className="flex h-full bg-slate-100 dark:bg-navy-950 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col overflow-y-auto
        bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-navy-700/40">

        {/* New event */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => { setAddDate(null); setShowAddModal(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-sm font-black text-navy-900 transition-all
              hover:-translate-y-px active:translate-y-0
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{ background: 'linear-gradient(135deg,#FFD700 0%,#FFEE55 50%,#FFD700 100%)' }}>
            <FiPlus size={16} /> New Event
          </button>
        </div>

        {/* Mini calendar */}
        <MiniCal
          current={miniCurrent} selected={selectedDate}
          onSelect={handleMiniSelect}
          onChangeMonth={dir => {
            const d = new Date(miniCurrent); d.setMonth(d.getMonth() + dir); setMiniCurrent(d);
          }}
        />

        {/* Today's events */}
        <div className={`px-3 pt-3 pb-3 ${divider} mt-1`}>
          <p className="text-[10px] font-black text-slate-400 dark:text-navy-500 uppercase tracking-widest mb-2">
            Today
          </p>
          {todayEvts.length === 0
            ? <p className="text-xs text-slate-400 dark:text-navy-600 italic">No events today</p>
            : todayEvts.slice(0, 5).map(e => (
              <button key={e.id} onClick={() => setSelectedEvent(e)} className={sideRow}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_COLOR[e.event_type] || 'bg-yellow-400'}`} />
                  <span className="text-xs text-slate-600 dark:text-navy-300 group-hover:text-slate-900 dark:group-hover:text-white truncate transition-colors">
                    {e.title}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-navy-600 pl-4">
                  {fmtTime(e.start_time)}
                </div>
              </button>
            ))
          }
        </div>

        {/* Color legend */}
        <div className={`px-3 pb-4 ${divider} mt-1`}>
          <p className="text-[10px] font-black text-slate-400 dark:text-navy-500 uppercase tracking-widest mb-2 mt-3">
            Event Types
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_COLOR[type]}`} />
                <span className="text-[10px] text-slate-500 dark:text-navy-400 truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0
          bg-white dark:bg-navy-900/80 backdrop-blur-sm
          border-b border-slate-200 dark:border-navy-700/40">

          <div className="flex items-center gap-3">
            <button onClick={goToday} className={toolBtn}>Today</button>
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className={`${navBtn} rounded-l-xl border-r-0`}>
                <FiChevronLeft size={15} />
              </button>
              <button onClick={() => navigate(1)} className={`${navBtn} rounded-r-xl`}>
                <FiChevronRight size={15} />
              </button>
            </div>
            <h1 className="text-base font-black text-slate-800 dark:text-white">{headerTitle()}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2
                text-slate-400 dark:text-navy-500 pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search events…"
                className="pl-8 pr-3 py-1.5 w-40 rounded-xl text-xs transition-colors
                  bg-slate-50 dark:bg-navy-800/50
                  border border-slate-200 dark:border-navy-700/50
                  text-slate-800 dark:text-white
                  placeholder-slate-400 dark:placeholder-navy-600
                  focus:outline-none focus:border-gold/50" />
            </div>

            {/* Type filter */}
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              aria-label="Filter by event type"
              className="hidden sm:block px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors
                bg-slate-50 dark:bg-navy-800/50
                border border-slate-200 dark:border-navy-700/50
                text-slate-700 dark:text-white
                focus:outline-none focus:border-gold/50">
              <option value="">All Types</option>
              {EVENT_TYPES.map(t => (
                <option key={t} value={t} className="bg-white dark:bg-navy-800">{TYPE_LABELS[t]}</option>
              ))}
            </select>

            {/* View switcher */}
            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-navy-700/50 p-0.5
              bg-slate-100 dark:bg-navy-800/50">
              {[
                { key: 'month', icon: FiGrid,     label: 'Month' },
                { key: 'week',  icon: FiCalendar, label: 'Week'  },
                { key: 'day',   icon: FiList,     label: 'Day'   },
              ].map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setView(key)} title={label}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all',
                    view === key
                      ? 'bg-gold text-navy-900 shadow-sm'
                      : 'text-slate-500 dark:text-navy-400 hover:text-slate-800 dark:hover:text-white',
                  ].join(' ')}>
                  <Icon size={13} />
                  <span className="hidden md:block">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading bar */}
        {loading && (
          <div className="h-0.5 bg-slate-200 dark:bg-navy-700/40 flex-shrink-0">
            <div className="h-full w-1/2 bg-gold animate-pulse" />
          </div>
        )}

        {/* Calendar body */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
            {view === 'month' && (
              <MonthView current={current} events={events}
                selectedDate={selectedDate} onSelectDate={setSelectedDate}
                onEventClick={setSelectedEvent}
                onAddOnDate={d => { setAddDate(d); setShowAddModal(true); }} />
            )}
            {view === 'week' && (
              <WeekView current={current} events={events} onEventClick={setSelectedEvent} />
            )}
            {view === 'day' && (
              <DayView current={current} events={events} onEventClick={setSelectedEvent} />
            )}
          </div>

          {selectedEvent && (
            <EventPanel
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onEdit={ev => setEditingEvent(ev)}
              onDeleted={id => {
                setSelectedEvent(null);
                setEvents(prev => prev.filter(e => e.id !== id));
              }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <EventModal initialDate={addDate}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchEvents(); }} />
      )}
      {editingEvent && (
        <EventModal event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={updated => {
            setEditingEvent(null);
            if (updated) setSelectedEvent(updated);
            fetchEvents();
          }} />
      )}
    </div>
  );
}
