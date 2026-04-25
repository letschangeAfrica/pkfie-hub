import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiFilter,
  FiSearch,
  FiClock,
  FiMapPin,
  FiUser,
  FiTag,
  FiEye,
  FiEyeOff,
  FiDownload,
  FiShare2,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiStar,
  FiGrid,
  FiList,
  FiClock as FiClockIcon,
  FiBell,
  FiRefreshCw,
  FiLink
} from 'react-icons/fi';

// Calendar Header Component
function CalendarHeader({ currentDate, onPrev, onNext, onToday, view, onViewChange, onAddEvent, onSyncStatus }) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
          <FiCalendar className="text-xl" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your schedule and events
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* View Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
          {[
            { key: 'month', label: 'Month', icon: FiGrid },
            { key: 'week', label: 'Week', icon: FiList },
            { key: 'day', label: 'Day', icon: FiClockIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                view === key
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="text-sm" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
          <button
            onClick={onPrev}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all"
          >
            <FiChevronLeft className="text-lg" />
          </button>
          
          <button
            onClick={onToday}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all"
          >
            Today
          </button>
          
          <button
            onClick={onNext}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all"
          >
            <FiChevronRight className="text-lg" />
          </button>
        </div>

        {/* Sync Status Button */}
        <button
          onClick={onSyncStatus}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all"
        >
          <FiRefreshCw className="text-lg" />
          Sync Status
        </button>

        {/* Add Event Button */}
        <button
          onClick={onAddEvent}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg button-hover"
        >
          <FiPlus className="text-lg" />
          Add Event
        </button>
      </div>
    </div>
  );
}

// Filters Sidebar Component
function FiltersSidebar({ 
  filters, 
  onFiltersChange, 
  eventTypes, 
  onExportCalendar,
  onManageSubscriptions 
}) {
  const eventTypeOptions = [
    { value: 'academic', label: 'Academic', color: 'bg-blue-500' },
    { value: 'social', label: 'Social', color: 'bg-green-500' },
    { value: 'career', label: 'Career', color: 'bg-purple-500' },
    { value: 'workshop', label: 'Workshop', color: 'bg-amber-500' },
    { value: 'personal', label: 'Personal', color: 'bg-rose-500' },
    { value: 'deadline', label: 'Deadline', color: 'bg-red-500' },
    { value: 'holiday', label: 'Holiday', color: 'bg-emerald-500' },
    { value: 'meeting', label: 'Meeting', color: 'bg-indigo-500' },
    { value: 'announcement', label: 'Announcement', color: 'bg-teal-500' },
    { value: 'institutional', label: 'Institutional', color: 'bg-gray-500' }
  ];

  const sourceOptions = [
    { value: 'all', label: 'All Sources', color: 'bg-gray-500' },
    { value: 'personal', label: 'Personal', color: 'bg-blue-500' },
    { value: 'events_app', label: 'Institutional Events', color: 'bg-green-500' },
    { value: 'announcements_app', label: 'Announcements', color: 'bg-purple-500' },
    { value: 'system', label: 'System', color: 'bg-amber-500' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities', color: 'bg-gray-500' },
    { value: 'low', label: 'Low', color: 'bg-green-500' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
    { value: 'high', label: 'High', color: 'bg-red-500' }
  ];

  return (
    <div className="w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-6 h-fit">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Filters</h3>
        <FiFilter className="text-slate-400" />
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Search Events
        </label>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange('search', e.target.value)}
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Event Types */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Event Types
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {eventTypeOptions.map(type => (
            <label key={type.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.eventTypes.includes(type.value)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...filters.eventTypes, type.value]
                    : filters.eventTypes.filter(t => t !== type.value);
                  onFiltersChange('eventTypes', newTypes);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
              <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Source Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Source
        </label>
        <div className="space-y-2">
          {sourceOptions.map(source => (
            <label key={source.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="source"
                checked={filters.source === source.value}
                onChange={() => onFiltersChange('source', source.value)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div className={`w-3 h-3 rounded-full ${source.color}`}></div>
              <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                {source.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Priority Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Priority
        </label>
        <div className="space-y-2">
          {priorityOptions.map(priority => (
            <label key={priority.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="priority"
                checked={filters.priority === priority.value}
                onChange={() => onFiltersChange('priority', priority.value)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div className={`w-3 h-3 rounded-full ${priority.color}`}></div>
              <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                {priority.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Visibility Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showPublicOnly}
            onChange={(e) => onFiltersChange('showPublicOnly', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Show Public Events Only
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onExportCalendar}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
        >
          <FiDownload className="text-lg" />
          Export Calendar
        </button>
        
        <button
          onClick={onManageSubscriptions}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
        >
          <FiLink className="text-lg" />
          Manage Subscriptions
        </button>
      </div>
    </div>
  );
}

// Month View Component
function MonthView({ currentDate, events, onEventClick, onDateClick }) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get first day of month and number of days
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startingDay = firstDay.getDay();
  const monthLength = lastDay.getDate();

  // Get events for specific date
  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const eventTypeColors = {
    academic: 'bg-blue-100 text-blue-800 border border-blue-200',
    social: 'bg-green-100 text-green-800 border border-green-200',
    career: 'bg-purple-100 text-purple-800 border border-purple-200',
    workshop: 'bg-amber-100 text-amber-800 border border-amber-200',
    personal: 'bg-rose-100 text-rose-800 border border-rose-200',
    deadline: 'bg-red-100 text-red-800 border border-red-200',
    holiday: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    meeting: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    announcement: 'bg-teal-100 text-teal-800 border border-teal-200',
    institutional: 'bg-gray-100 text-gray-800 border border-gray-200'
  };

  const sourceIcons = {
    personal: '👤',
    events_app: '🏛️',
    announcements_app: '📢',
    system: '⚙️'
  };

  // Generate calendar grid
  const calendarGrid = [];
  let day = 1;

  for (let i = 0; i < 6; i++) {
    const week = [];
    
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < startingDay) {
        // Previous month days
        const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
        const prevMonthDay = prevMonth.getDate() - startingDay + j + 1;
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDay);
        
        week.push(
          <div
            key={`empty-${j}`}
            className="min-h-32 p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
          >
            <div className="text-slate-400 dark:text-slate-600 text-sm">
              {prevMonthDay}
            </div>
          </div>
        );
      } else if (day > monthLength) {
        // Next month days
        const nextMonthDay = day - monthLength;
        week.push(
          <div
            key={`empty-${j}`}
            className="min-h-32 p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
          >
            <div className="text-slate-400 dark:text-slate-600 text-sm">
              {nextMonthDay}
            </div>
          </div>
        );
        day++;
      } else {
        // Current month days
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const isToday = new Date().toDateString() === date.toDateString();
        const dayEvents = getEventsForDate(date);
        
        week.push(
          <div
            key={day}
            onClick={() => onDateClick(date)}
            className={`min-h-32 p-2 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
              isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
            }`}
          >
            <div className={`flex justify-between items-center mb-2 ${
              isToday ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
            }`}>
              <span className="text-sm">{day}</span>
              {isToday && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {dayEvents.slice(0, 3).map((event, index) => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  className={`text-xs p-1.5 rounded-lg cursor-pointer truncate ${
                    eventTypeColors[event.event_type] || eventTypeColors.academic
                  } ${event.is_all_day ? 'font-semibold' : ''}`}
                  title={`${sourceIcons[event.source] || ''} ${event.title}`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{sourceIcons[event.source] || ''}</span>
                    <span className="truncate flex-1">
                      {event.is_all_day ? '📅 ' : '⏰ '}
                      {event.title}
                    </span>
                  </div>
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-slate-500 dark:text-slate-400 px-1">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day++;
      }
    }
    
    calendarGrid.push(
      <div key={i} className="grid grid-cols-7">
        {week}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        {days.map(day => (
          <div
            key={day}
            className="p-4 text-center font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {calendarGrid}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ currentDate, events, onEventClick }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const getWeekDates = (date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  const weekDates = getWeekDates(currentDate);
  
  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  };

  const eventTypeColors = {
    academic: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
    social: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
    career: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20',
    workshop: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20',
    personal: 'border-l-rose-500 bg-rose-50 dark:bg-rose-900/20',
    deadline: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
    holiday: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    meeting: 'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
    announcement: 'border-l-teal-500 bg-teal-50 dark:bg-teal-900/20',
    institutional: 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20'
  };

  const sourceIcons = {
    personal: '👤',
    events_app: '🏛️',
    announcements_app: '📢',
    system: '⚙️'
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      {/* Week header */}
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        {weekDates.map((date, index) => {
          const isToday = new Date().toDateString() === date.toDateString();
          return (
            <div
              key={index}
              className={`p-4 text-center ${
                isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className={`text-sm font-semibold ${
                isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
              }`}>
                {days[date.getDay()]}
              </div>
              <div className={`text-lg font-bold ${
                isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'
              }`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Week content */}
      <div className="grid grid-cols-7 min-h-96">
        {weekDates.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();
          
          return (
            <div
              key={index}
              className={`border-r border-slate-200 dark:border-slate-700 last:border-r-0 min-h-96 ${
                isToday ? 'bg-blue-50 dark:bg-blue-900/10' : ''
              }`}
            >
              <div className="p-4 space-y-3">
                {dayEvents.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-600 text-sm py-8">
                    No events
                  </div>
                ) : (
                  dayEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${
                        eventTypeColors[event.event_type] || eventTypeColors.academic
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-xs mt-0.5">{sourceIcons[event.source] || ''}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1 truncate">
                            {event.title}
                          </div>
                          {!event.is_all_day && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <FiClock className="text-xs" />
                              {formatTime(event.start_time)}
                              {event.end_time && ` - ${formatTime(event.end_time)}`}
                            </div>
                          )}
                          {event.location && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-1">
                              <FiMapPin className="text-xs" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Day View Component
function DayView({ currentDate, events, onEventClick }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const dayEvents = getEventsForDate(currentDate);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const eventTypeColors = {
    academic: 'bg-blue-100 border-blue-300 text-blue-800',
    social: 'bg-green-100 border-green-300 text-green-800',
    career: 'bg-purple-100 border-purple-300 text-purple-800',
    workshop: 'bg-amber-100 border-amber-300 text-amber-800',
    personal: 'bg-rose-100 border-rose-300 text-rose-800',
    deadline: 'bg-red-100 border-red-300 text-red-800',
    holiday: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    meeting: 'bg-indigo-100 border-indigo-300 text-indigo-800',
    announcement: 'bg-teal-100 border-teal-300 text-teal-800',
    institutional: 'bg-gray-100 border-gray-300 text-gray-800'
  };

  const sourceIcons = {
    personal: '👤',
    events_app: '🏛️',
    announcements_app: '📢',
    system: '⚙️'
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      {/* Day header */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <div className="text-slate-600 dark:text-slate-400 mt-1">
          {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="relative">
          {hours.map(hour => (
            <div key={hour} className="flex border-b border-slate-200 dark:border-slate-700 last:border-b-0">
              <div className="w-20 py-4 text-right pr-4 text-sm text-slate-500 dark:text-slate-400">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              <div className="flex-1 py-4 min-h-16 relative">
                {/* Events for this hour */}
                {dayEvents
                  .filter(event => {
                    if (event.is_all_day) return false;
                    const eventHour = new Date(event.start_time).getHours();
                    return eventHour === hour;
                  })
                  .map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`absolute left-0 right-2 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        eventTypeColors[event.event_type] || eventTypeColors.academic
                      }`}
                      style={{
                        top: '8px',
                        bottom: '8px'
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm">{sourceIcons[event.source] || ''}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-1 truncate">{event.title}</div>
                          <div className="text-xs opacity-75">
                            {formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </div>
                          {event.location && (
                            <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
                              <FiMapPin className="text-xs" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}

          {/* All-day events */}
          {dayEvents.filter(event => event.is_all_day).length > 0 && (
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                All Day
              </div>
              <div className="space-y-2">
                {dayEvents
                  .filter(event => event.is_all_day)
                  .map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        eventTypeColors[event.event_type] || eventTypeColors.academic
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm">{sourceIcons[event.source] || ''}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{event.title}</div>
                          {event.location && (
                            <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
                              <FiMapPin className="text-xs" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Event Modal Component
function EventModal({ event, onClose, onSave, mode = 'create', setToast }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'academic',
    start_time: '',
    end_time: '',
    location: '',
    organizer: '',
    is_all_day: false,
    priority: 'medium',
    color: '#3B82F6',
    is_public: false
  });
  const [loading, setLoading] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderData, setReminderData] = useState({
    reminder_time: 15,
    reminder_unit: 'minutes'
  });

  const eventTypes = [
    { value: 'academic', label: 'Academic', color: 'bg-blue-500' },
    { value: 'social', label: 'Social', color: 'bg-green-500' },
    { value: 'career', label: 'Career', color: 'bg-purple-500' },
    { value: 'workshop', label: 'Workshop', color: 'bg-amber-500' },
    { value: 'personal', label: 'Personal', color: 'bg-rose-500' },
    { value: 'deadline', label: 'Deadline', color: 'bg-red-500' },
    { value: 'holiday', label: 'Holiday', color: 'bg-emerald-500' },
    { value: 'meeting', label: 'Meeting', color: 'bg-indigo-500' },
    { value: 'announcement', label: 'Announcement', color: 'bg-teal-500' },
    { value: 'institutional', label: 'Institutional', color: 'bg-gray-500' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-green-500' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
    { value: 'high', label: 'High', color: 'bg-red-500' }
  ];

  const reminderUnits = [
    { value: 'minutes', label: 'Minutes' },
    { value: 'hours', label: 'Hours' },
    { value: 'days', label: 'Days' },
    { value: 'weeks', label: 'Weeks' }
  ];

  useEffect(() => {
    if (event && mode === 'edit') {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        event_type: event.event_type || 'academic',
        start_time: event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
        end_time: event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
        location: event.location || '',
        organizer: event.organizer || currentUser?.first_name || '',
        is_all_day: event.is_all_day || false,
        priority: event.priority || 'medium',
        color: event.color || '#3B82F6',
        is_public: event.is_public || false
      });
    } else {
      // Set default start time to next hour
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const defaultStart = now.toISOString().slice(0, 16);
      
      // Set default end time to 2 hours after start
      const end = new Date(now);
      end.setHours(end.getHours() + 2);
      const defaultEnd = end.toISOString().slice(0, 16);

      setFormData(prev => ({
        ...prev,
        start_time: defaultStart,
        end_time: defaultEnd,
        organizer: currentUser?.first_name || ''
      }));
    }
  }, [event, mode, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      setToast({
        type: 'success',
        message: `Event ${mode === 'create' ? 'created' : 'updated'} successfully!`
      });
      onClose();
    } catch (error) {
      setToast({
        type: 'error',
        message: `Failed to ${mode === 'create' ? 'create' : 'update'} event: ${error.response?.data?.detail || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async () => {
    if (!event?.id) {
      setToast({
        type: 'error',
        message: 'Please save the event first before adding reminders'
      });
      return;
    }

    try {
      await api.post(`/calendar/events/${event.id}/add_reminder/`, reminderData);
      setToast({
        type: 'success',
        message: 'Reminder added successfully!'
      });
      setShowReminderForm(false);
      setReminderData({
        reminder_time: 15,
        reminder_unit: 'minutes'
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Failed to add reminder'
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReminderChange = (field, value) => {
    setReminderData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <FiCalendar className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {mode === 'create' ? 'Create New Event' : 'Edit Event'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {mode === 'create' ? 'Add a new event to your calendar' : 'Update event details'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter event title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter event description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Event Type
              </label>
              <select
                value={formData.event_type}
                onChange={(e) => handleChange('event_type', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Start Time *
              </label>
              <input
                type={formData.is_all_day ? "date" : "datetime-local"}
                required
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                End Time *
              </label>
              <input
                type={formData.is_all_day ? "date" : "datetime-local"}
                required
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Event location..."
              />
            </div>

            {/* Organizer */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Organizer
              </label>
              <input
                type="text"
                value={formData.organizer}
                onChange={(e) => handleChange('organizer', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Event organizer..."
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_all_day"
                checked={formData.is_all_day}
                onChange={(e) => handleChange('is_all_day', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_all_day" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                All-day event
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => handleChange('is_public', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_public" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Public event
              </label>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Event Color
            </label>
            <div className="flex gap-2">
              {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChange('color', color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-slate-800 dark:border-slate-200' : 'border-slate-300 dark:border-slate-600'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Reminder Section */}
          {mode === 'edit' && event && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Reminders</h3>
                <button
                  type="button"
                  onClick={() => setShowReminderForm(!showReminderForm)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                >
                  <FiBell className="text-sm" />
                  Add Reminder
                </button>
              </div>

              {showReminderForm && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Time
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10080"
                        value={reminderData.reminder_time}
                        onChange={(e) => handleReminderChange('reminder_time', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Unit
                      </label>
                      <select
                        value={reminderData.reminder_unit}
                        onChange={(e) => handleReminderChange('reminder_unit', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      >
                        {reminderUnits.map(unit => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddReminder}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    <FiCheckCircle className="text-sm" />
                    Add Reminder
                  </button>
                </div>
              )}

              {/* Existing Reminders */}
              {event.reminders && event.reminders.length > 0 && (
                <div className="space-y-2">
                  {event.reminders.map(reminder => (
                    <div key={reminder.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {reminder.reminder_time} {reminder.reminder_unit} before
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {reminder.is_sent ? 'Sent' : 'Pending'}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        reminder.is_sent 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {reminder.is_sent ? 'Sent' : 'Pending'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <FiCheckCircle className="text-lg" />
                  {mode === 'create' ? 'Create Event' : 'Update Event'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Event Details Modal
function EventDetailsModal({ event, onClose, onEdit, onDelete, setToast }) {
  const { currentUser } = useAuth();

  const eventTypeColors = {
    academic: 'bg-blue-500',
    social: 'bg-green-500',
    career: 'bg-purple-500',
    workshop: 'bg-amber-500',
    personal: 'bg-rose-500',
    deadline: 'bg-red-500',
    holiday: 'bg-emerald-500',
    meeting: 'bg-indigo-500',
    announcement: 'bg-teal-500',
    institutional: 'bg-gray-500'
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };

  const sourceLabels = {
    personal: 'Personal Event',
    events_app: 'Institutional Event',
    announcements_app: 'Announcement',
    system: 'System Event'
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await onDelete(event.id);
        setToast({
          type: 'success',
          message: 'Event deleted successfully!'
        });
        onClose();
      } catch (error) {
        setToast({
          type: 'error',
          message: 'Failed to delete event'
        });
      }
    }
  };

  const handleAddToCalendar = () => {
    if (!event.start_time) {
      setToast({ type: "error", message: "Event date not available" });
      return;
    }

    const startDate = new Date(event.start_time);
    const endDate = event.end_time ? new Date(event.end_time) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    
    const calendarEvent = {
      title: event.title,
      description: event.description || 'Calendar Event',
      location: event.location || '',
      start: startDate.toISOString().replace(/-|:|\.\d+/g, ''),
      end: endDate.toISOString().replace(/-|:|\.\d+/g, '')
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarEvent.title)}&dates=${calendarEvent.start}/${calendarEvent.end}&details=${encodeURIComponent(calendarEvent.description)}&location=${encodeURIComponent(calendarEvent.location)}`;
    
    window.open(googleCalendarUrl, '_blank');
    setToast({ type: "success", message: "Opening calendar... 📅" });
  };

  const isEditable = event.source === 'personal' && event.user === currentUser?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="relative p-6 border-b border-slate-200 dark:border-slate-700 text-white"
          style={{ backgroundColor: event.color || '#3B82F6' }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <FiCalendar className="text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-2xl font-bold pr-12 break-words">{event.title}</h2>
                <span className={`px-3 py-1 rounded-full text-white font-semibold text-sm ${eventTypeColors[event.event_type]}`}>
                  {event.event_type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-white/90 flex-wrap">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <FiClock className="text-sm" />
                  <span className="text-sm">
                    {event.is_all_day ? 'All Day' : formatDateTime(event.start_time)}
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-full font-semibold text-sm ${priorityColors[event.priority]}`}>
                  {event.priority} Priority
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-white hover:bg-white/20 rounded-xl transition-all"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Source Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Source:</span>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium">
              {sourceLabels[event.source] || event.source}
            </span>
            {event.is_auto_generated && (
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm font-medium">
                Auto-generated
              </span>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Description</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date & Time */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <FiClock className="text-blue-500" />
                Date & Time
              </h4>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Starts</div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {formatDateTime(event.start_time)}
                  </div>
                </div>
                {event.end_time && (
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Ends</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {formatDateTime(event.end_time)}
                    </div>
                  </div>
                )}
                {event.is_all_day && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    📅 All-day event
                  </div>
                )}
              </div>
            </div>

            {/* Location & Organizer */}
            <div className="space-y-4">
              {event.location && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiMapPin className="text-rose-500" />
                    Location
                  </h4>
                  <div className="text-slate-800 dark:text-slate-200">
                    {event.location}
                  </div>
                </div>
              )}

              {event.organizer && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiUser className="text-green-500" />
                    Organizer
                  </h4>
                  <div className="text-slate-800 dark:text-slate-200">
                    {event.organizer}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reminders */}
          {event.reminders && event.reminders.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <FiBell className="text-amber-500" />
                Reminders
              </h4>
              <div className="space-y-2">
                {event.reminders.map(reminder => (
                  <div key={reminder.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {reminder.reminder_time} {reminder.reminder_unit} before
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      reminder.is_sent 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {reminder.is_sent ? `Sent at ${new Date(reminder.sent_at).toLocaleTimeString()}` : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Event Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Type</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 capitalize">{event.event_type}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Priority</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 capitalize">{event.priority}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Visibility</div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {event.is_public ? 'Public' : 'Private'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Created</div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {event.created_at ? new Date(event.created_at).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            </div>
          </div>

          {/* Original Object Link */}
          {event.original_object_url && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Original Event</h4>
              <a 
                href={event.original_object_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline flex items-center gap-2"
              >
                <FiLink className="text-sm" />
                View original event details
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddToCalendar}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <FiCalendar />
                Add to Calendar
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              {isEditable && (
                <>
                  <button
                    onClick={() => onEdit(event)}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    <FiCheckCircle />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition-colors"
                  >
                    <FiX />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sync Status Modal
function SyncStatusModal({ onClose, setToast }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const response = await api.get('/calendar/events/sync_status/');
        setSyncStatus(response.data);
      } catch (error) {
        setToast({
          type: 'error',
          message: 'Failed to fetch sync status'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSyncStatus();
  }, [setToast]);

  const stats = [
    { label: 'Total Events', value: syncStatus?.total_events, color: 'bg-blue-500' },
    { label: 'Personal Events', value: syncStatus?.personal_events, color: 'bg-green-500' },
    { label: 'Institutional Events', value: syncStatus?.institutional_events, color: 'bg-purple-500' },
    { label: 'Announcements', value: syncStatus?.announcement_events, color: 'bg-teal-500' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <FiRefreshCw className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Sync Status
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Calendar synchronization overview
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Loading sync status...
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className={`w-3 h-3 rounded-full ${stat.color} mx-auto mb-2`}></div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stat.value || 0}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Last Sync */}
              {syncStatus?.last_sync && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Last Synchronization
                  </div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {new Date(syncStatus.last_sync).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Info Message */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <FiInfo className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Calendar automatically syncs with institutional events and announcements. 
                    Personal events are created and managed by you.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subscriptions Modal
function SubscriptionsModal({ onClose, setToast }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    color: '#6B7280'
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await api.get('/calendar/subscriptions/');
      setSubscriptions(response.data);
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Failed to fetch subscriptions'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    try {
      await api.post('/calendar/subscriptions/', formData);
      setToast({
        type: 'success',
        message: 'Subscription added successfully!'
      });
      setShowAddForm(false);
      setFormData({ name: '', url: '', color: '#6B7280' });
      fetchSubscriptions();
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Failed to add subscription'
      });
    }
  };

  const handleDeleteSubscription = async (id) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        await api.delete(`/calendar/subscriptions/${id}/`);
        setToast({
          type: 'success',
          message: 'Subscription deleted successfully!'
        });
        fetchSubscriptions();
      } catch (error) {
        setToast({
          type: 'error',
          message: 'Failed to delete subscription'
        });
      }
    }
  };

  const handleToggleSubscription = async (subscription) => {
    try {
      await api.put(`/calendar/subscriptions/${subscription.id}/`, {
        ...subscription,
        is_active: !subscription.is_active
      });
      setToast({
        type: 'success',
        message: `Subscription ${!subscription.is_active ? 'activated' : 'deactivated'}!`
      });
      fetchSubscriptions();
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Failed to update subscription'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <FiLink className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Calendar Subscriptions
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Manage your external calendar subscriptions
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Add Subscription Button */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Your Subscriptions
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              <FiPlus className="text-lg" />
              Add Subscription
            </button>
          </div>

          {/* Add Subscription Form */}
          {showAddForm && (
            <form onSubmit={handleAddSubscription} className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="Subscription name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    URL
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="https://example.com/calendar.ics"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  <FiCheckCircle className="text-sm" />
                  Add Subscription
                </button>
              </div>
            </form>
          )}

          {/* Subscriptions List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Loading subscriptions...
              </div>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <FiLink className="text-2xl text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                No subscriptions
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                Add your first calendar subscription to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map(subscription => (
                <div key={subscription.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: subscription.color }}
                    ></div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {subscription.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {subscription.url}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleSubscription(subscription)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        subscription.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {subscription.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleDeleteSubscription(subscription.id)}
                      className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                    >
                      <FiX className="text-lg" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Calendar Component
export default function Calendar() {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showSyncStatus, setShowSyncStatus] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    eventTypes: [],
    source: 'all',
    priority: 'all',
    showPublicOnly: false
  });

  // Toast effect
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Fetch events - USING THE SAME ENDPOINT AS DASHBOARD
  useEffect(() => {
    let mounted = true;
    const c = new AbortController();

    async function loadEvents() {
      setLoading(true);
      try {
        // Calculate date range based on current view
        let startDate, endDate;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        if (view === 'month') {
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month + 1, 0);
        } else if (view === 'week') {
          const start = new Date(currentDate);
          start.setDate(currentDate.getDate() - currentDate.getDay());
          startDate = new Date(start);
          
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          endDate = new Date(end);
        } else { // day view
          startDate = new Date(currentDate);
          endDate = new Date(currentDate);
        }

        // Use the SAME endpoint as Dashboard - events from events app
        const res = await api.get("/events/", { 
          signal: c.signal 
        });
        
        if (!mounted) return;
        const list = res.data?.results ?? res.data ?? [];
        
        // Apply date filtering on frontend (same logic as before)
        const filteredEvents = list.filter(event => {
          if (!event.start_time) return false;
          const eventDate = new Date(event.start_time);
          return eventDate >= startDate && eventDate <= endDate;
        });
        
        setEvents(filteredEvents);
      } catch (error) {
        console.error('Failed to load events:', error);
        setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      mounted = false;
      c.abort();
    };
  }, [currentDate, view]);

  // Filter events based on filters
  const filteredEvents = events.filter(event => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        event.title.toLowerCase().includes(searchTerm) ||
        (event.description && event.description.toLowerCase().includes(searchTerm)) ||
        (event.location && event.location.toLowerCase().includes(searchTerm));
      if (!matchesSearch) return false;
    }

    // Event types filter
    if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.event_type)) {
      return false;
    }

    // Source filter
    if (filters.source !== 'all' && event.source !== filters.source) {
      return false;
    }

    // Priority filter
    if (filters.priority !== 'all' && event.priority !== filters.priority) {
      return false;
    }

    // Public events filter
    if (filters.showPublicOnly && !event.is_public) {
      return false;
    }

    return true;
  });

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Event handlers
  const handleAddEvent = () => {
    setModalMode('create');
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setModalMode('edit');
    setShowEventDetails(false);
    setShowEventModal(true);
  };

  const handleDateClick = (date) => {
    // Create a new event with this date pre-filled
    const startTime = new Date(date);
    startTime.setHours(9, 0, 0, 0); // Default to 9 AM
    
    const endTime = new Date(startTime);
    endTime.setHours(10, 0, 0, 0); // Default to 10 AM
    
    setSelectedEvent({
      start_time: startTime.toISOString().slice(0, 16),
      end_time: endTime.toISOString().slice(0, 16)
    });
    setModalMode('create');
    setShowEventModal(true);
  };

  const handleSaveEvent = async (eventData) => {
    try {
      if (modalMode === 'create') {
        // Save to events endpoint (same as dashboard)
        const response = await api.post('/events/', eventData);
        setEvents(prev => [...prev, response.data]);
      } else {
        // Update existing event
        const response = await api.put(`/events/${selectedEvent.id}/`, eventData);
        setEvents(prev => prev.map(e => e.id === selectedEvent.id ? response.data : e));
      }
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      // Delete from events endpoint
      await api.delete(`/events/${eventId}/`);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      throw error;
    }
  };

  const handleFiltersChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExportCalendar = () => {
    setToast({
      type: 'info',
      message: 'Export feature coming soon!'
    });
  };

  const handleManageSubscriptions = () => {
    setShowSubscriptions(true);
  };

  const handleSyncStatus = () => {
    setShowSyncStatus(true);
  };

  // Custom styles for animations
  const customStyles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in-up { animation: fadeInUp 0.6s ease-out; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    .button-hover {
      transition: all 0.3s ease;
    }
    .button-hover:hover {
      transform: translateY(-2px);
    }
    .card-hover {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-hover:hover {
      transform: translateY(-2px);
    }
  `;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <style>{customStyles}</style>

      {/* Toast notifications */}
      <div aria-live="polite" className="fixed top-6 right-6 z-50">
        {toast && (
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg animate-fade-in-up ${
            toast.type === "error" 
              ? "bg-rose-50 border border-rose-200 text-rose-700" 
              : toast.type === "info"
              ? "bg-blue-50 border border-blue-200 text-blue-700"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}>
            {toast.type === "error" ? <FiAlertCircle className="text-xl" /> : 
             toast.type === "info" ? <FiInfo className="text-xl" /> : 
             <FiCheckCircle className="text-xl" />}
            <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        )}
      </div>

      <div className="flex gap-8">
        {/* Filters Sidebar */}
        <div className="hidden lg:block">
          <FiltersSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            eventTypes={[]}
            onExportCalendar={handleExportCalendar}
            onManageSubscriptions={handleManageSubscriptions}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Calendar Header */}
          <CalendarHeader
            currentDate={currentDate}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            view={view}
            onViewChange={setView}
            onAddEvent={handleAddEvent}
            onSyncStatus={handleSyncStatus}
          />

          {/* Mobile Filters Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setToast({ type: 'info', message: 'Use desktop view for filters' })}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              <FiFilter className="text-lg" />
              Filters
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Loading calendar events...
              </div>
            </div>
          )}

          {/* Calendar Views */}
          {!loading && (
            <div className="animate-fade-in-up">
              {view === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                  onDateClick={handleDateClick}
                />
              )}
              {view === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                />
              )}
              {view === 'day' && (
                <DayView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                />
              )}
            </div>
          )}

          {/* No Events State */}
          {!loading && filteredEvents.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FiCalendar className="text-3xl text-slate-400 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                No events found
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {view === 'month' 
                  ? "You don't have any events scheduled for this month." 
                  : view === 'week'
                  ? "No events scheduled for this week."
                  : "No events scheduled for today."}
              </p>
              <button
                onClick={handleAddEvent}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg button-hover"
              >
                <FiPlus className="text-lg" />
                Add Your First Event
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          onClose={() => setShowEventModal(false)}
          onSave={handleSaveEvent}
          mode={modalMode}
          setToast={setToast}
        />
      )}

      {showEventDetails && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setShowEventDetails(false)}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          setToast={setToast}
        />
      )}

      {showSyncStatus && (
        <SyncStatusModal
          onClose={() => setShowSyncStatus(false)}
          setToast={setToast}
        />
      )}

      {showSubscriptions && (
        <SubscriptionsModal
          onClose={() => setShowSubscriptions(false)}
          setToast={setToast}
        />
      )}
    </main>
  );
}

// Helper component for info icon
function FiInfo(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}