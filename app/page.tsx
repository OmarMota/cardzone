'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isToday, isSameMonth,
  addDays, subDays, parseISO,
} from 'date-fns';
import { ALL_EVENTS, GAME_NIGHTS } from '@/lib/data';
import { getUnseenEventIds, shouldNotifyToday, markNotifiedToday, UPDATE_BATCHES } from '@/lib/updates';
import { GAME_CONFIG, GAME_ORDER } from '@/lib/gameConfig';
import type { GameSlug, Priority, TCGEvent, UserEvent } from '@/lib/types';
import { useUserEvents, expandEvent, baseId } from '@/lib/userEvents';
import EventModal from '@/components/EventModal';
import EventForm from '@/components/EventForm';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const WEEKDAYS_MINI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'must_do',     label: 'Must-Do',     color: '#ef4444' },
  { value: 'important',   label: 'Important',   color: '#f97316' },
  { value: 'opportunity', label: 'Opportunity', color: '#eab308' },
  { value: 'optional',    label: 'Optional',    color: '#6b7280' },
];

// ─────────────────────────────────────────────────────────────────────────────

function SpinIcon() {
  return (
    <svg className="spin" width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 20" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M12 7A5 5 0 112.08 5M2 2v3h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 17 17" fill="none">
      <path d="M8.5 1.5a5.5 5.5 0 00-5.5 5.5v3L1.5 12.5h14l-1.5-2.5V7A5.5 5.5 0 008.5 1.5z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M6.5 12.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Mini calendar ─────────────────────────────────────────────────────────────

function MiniCal({ current, onNavigate, eventDates }: {
  current: Date;
  onNavigate: (d: Date) => void;
  eventDates: Set<string>;
}) {
  const [mini, setMini] = useState(current);

  useEffect(() => { setMini(current); }, [current]);

  const monthStart = startOfMonth(mini);
  const monthEnd = endOfMonth(mini);
  const startDow = (getDay(monthStart) + 6) % 7;
  const endDow = (getDay(monthEnd) + 6) % 7;
  const days = eachDayOfInterval({
    start: subDays(monthStart, startDow),
    end: endDow < 6 ? addDays(monthEnd, 6 - endDow) : monthEnd,
  });

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: '#9ca3af', fontFamily: 'var(--font-display)' }}>
          {format(mini, 'MMM yyyy')}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setMini(d => subMonths(d, 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-accent" style={{ color: '#6b7280' }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M6.5 1.5L3 5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={() => setMini(d => addMonths(d, 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-accent" style={{ color: '#6b7280' }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M3.5 1.5L7 5l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS_MINI.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold" style={{ color: '#374151' }}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map(day => {
          const ds = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, mini);
          const today = isToday(day);
          const hasEvent = eventDates.has(ds);
          const isSelected = format(day, 'yyyy-MM') === format(current, 'yyyy-MM');

          return (
            <button
              key={ds}
              onClick={() => { setMini(day); onNavigate(day); }}
              className="relative flex flex-col items-center justify-center rounded"
              style={{
                width: 22, height: 22,
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: !inMonth ? '#2d3040' : today ? '#fff' : '#9ca3af',
                background: today ? '#3b82f6' : isSelected && inMonth ? 'rgba(255,255,255,0.05)' : 'transparent',
                fontWeight: today ? 700 : 400,
              }}
            >
              {format(day, 'd')}
              {hasEvent && inMonth && !today && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: '#f97316' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Day Cell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  day: Date;
  dayStr: string;
  events: TCGEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  unseenSet: Set<string>;
  onEventClick: (ev: TCGEvent) => void;
  onAddClick: (date: string) => void;
  rowIndex: number;
  userEventIds: Set<string>;
}

function DayCell({ day, dayStr, events, isCurrentMonth, isToday, isWeekend, unseenSet, onEventClick, onAddClick, rowIndex, userEventIds }: DayCellProps) {
  const MAX = 3;
  const visible = events.slice(0, MAX);
  const overflow = events.length - MAX;

  return (
    <div
      className="cal-cell row-fade relative flex flex-col min-h-0 group"
      style={{
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: isToday ? 'rgba(59,130,246,0.04)' : isWeekend ? 'rgba(255,255,255,0.01)' : 'transparent',
        opacity: isCurrentMonth ? 1 : 0.28,
        animationDelay: `${rowIndex * 35}ms`,
        overflow: 'hidden',
        padding: '8px 6px 6px',
      }}
    >
      {/* Date number */}
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <span
          className="flex items-center justify-center rounded-full font-semibold leading-none"
          style={{
            width: 24, height: 24,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            background: isToday ? '#3b82f6' : 'transparent',
            color: isToday ? '#fff' : '#4b5563',
            fontWeight: isToday ? 700 : 500,
          }}
        >
          {format(day, 'd')}
        </span>

        {/* Count badge */}
        {events.length >= 2 && (
          <span
            className="flex items-center justify-center rounded-full font-bold"
            style={{
              width: 17, height: 17, fontSize: 9,
              fontFamily: 'var(--font-mono)',
              background: events.some(e => unseenSet.has(e.id)) ? '#f97316' : '#1f2130',
              color: events.some(e => unseenSet.has(e.id)) ? '#fff' : '#6b7280',
            }}
          >
            {events.length}
          </span>
        )}

        {/* Add button — visible on hover */}
        {events.length < 2 && (
          <button
            onClick={() => onAddClick(dayStr)}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-opacity"
            style={{ color: '#6b7280', background: '#1a1d28' }}
            title="Aggiungi evento"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Pills */}
      <div className="flex flex-col gap-0.5 overflow-hidden flex-1 min-h-0">
        {visible.map(event => {
          const game = GAME_CONFIG[event.game];
          const isUpdated = unseenSet.has(event.id);
          const isGN = event.type === 'game_night';
          const isUser = userEventIds.has(baseId(event.id));

          const bg = isUpdated ? 'rgba(249,115,22,0.12)'
            : isGN ? 'rgba(99,102,241,0.1)'
            : isUser ? 'rgba(34,197,94,0.1)'
            : game.bgColor;
          const border = isUpdated ? '#f97316' : isGN ? '#818cf8' : isUser ? '#22c55e' : game.dotColor;
          const color = isUpdated ? '#fed7aa' : isGN ? '#a5b4fc' : isUser ? '#86efac' : game.color;
          const dot = isUpdated ? '#f97316' : isGN ? '#818cf8' : isUser ? '#22c55e' : game.dotColor;

          return (
            <button
              key={event.id}
              className="event-pill"
              onClick={e => { e.stopPropagation(); onEventClick(event); }}
              style={{ background: bg, borderLeftColor: border, color }}
              title={event.title}
            >
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
              <span className="flex-1 truncate">{event.title.replace(/[⚠★]/g, '').trim()}</span>
            </button>
          );
        })}

        {overflow > 0 && (
          <span className="text-[10px] pl-1" style={{ color: '#4b5563' }}>+{overflow} altri</span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 5, 9));
  const [selectedEvent, setSelectedEvent] = useState<TCGEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UserEvent | null>(null);
  const [formDefaultDate, setFormDefaultDate] = useState<string>('');

  // localStorage hydration
  const [lastSeenDate, setLastSeenDate] = useState<string | null>(null);
  const [unseenIds, setUnseenIds] = useState<string[]>([]);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');

  // User events CRUD
  const { userEvents, addEvent, updateEvent, removeEvent } = useUserEvents();

  // Sidebar filter state — use checkbox sets
  const [visibleGames, setVisibleGames] = useState<Set<GameSlug>>(new Set(GAME_ORDER));
  const [visiblePriorities, setVisiblePriorities] = useState<Set<Priority>>(
    new Set<Priority>(['must_do', 'important', 'opportunity', 'optional'])
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cardzone_last_seen');
    setLastSeenDate(saved);
    setUnseenIds(getUnseenEventIds(saved));
    if ('Notification' in window) setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    const check = () => {
      if (!shouldNotifyToday()) return;
      const today = new Date().toISOString().split('T')[0];
      const batch = UPDATE_BATCHES.find(b => b.date === today);
      if (batch && Notification.permission === 'granted') {
        new Notification('CARDZONE — Aggiornamento disponibile', { body: batch.summary, tag: 'cardzone-update' });
        markNotifiedToday();
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    await new Promise(r => setTimeout(r, 900));
    const count = unseenIds.length;
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('cardzone_last_seen', today);
    setLastSeenDate(today);
    setUnseenIds([]);
    setIsUpdating(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 2200);
    showToast(count > 0 ? `${count} eventi aggiornati` : 'Già aggiornato');
  }, [isUpdating, unseenIds.length, showToast]);

  const handleRequestNotif = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') showToast('Notifiche attivate — aggiornamenti alle 8:00 GMT');
  }, [showToast]);

  // Expand user recurring events
  const expandedUserEvents = useMemo(() =>
    userEvents.flatMap(ev => expandEvent(ev)),
  [userEvents]);

  // Build full event list
  const allEvents = useMemo(() =>
    [...ALL_EVENTS, ...GAME_NIGHTS, ...expandedUserEvents],
  [expandedUserEvents]);

  // User event ID set (base IDs) for UI indicators
  const userEventIds = useMemo(() => new Set(userEvents.map(e => e.id)), [userEvents]);

  // Filtered events
  const filteredEvents = useMemo(() =>
    allEvents.filter(e => {
      if (!visibleGames.has(e.game)) return false;
      if (e.type === 'game_night') return true; // game nights skip priority filter
      return visiblePriorities.has(e.priority);
    }),
  [allEvents, visibleGames, visiblePriorities]);

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDow = (getDay(monthStart) + 6) % 7;
  const endDow = (getDay(monthEnd) + 6) % 7;
  const calStart = subDays(monthStart, startDow);
  const calEnd = endDow < 6 ? addDays(monthEnd, 6 - endDow) : monthEnd;
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const weeks = Math.ceil(calDays.length / 7);

  const unseenSet = new Set(unseenIds);
  const unseenCount = unseenIds.length;

  const getEventsForDay = useCallback((ds: string) =>
    filteredEvents.filter(e => e.date === ds),
  [filteredEvents]);

  // Event dates for mini calendar dots
  const eventDates = useMemo(() => new Set(filteredEvents.map(e => e.date)), [filteredEvents]);

  // Toggle helpers
  const toggleGame = (g: GameSlug) => setVisibleGames(prev => {
    const n = new Set(prev);
    n.has(g) ? n.delete(g) : n.add(g);
    return n;
  });
  const togglePriority = (p: Priority) => setVisiblePriorities(prev => {
    const n = new Set(prev);
    n.has(p) ? n.delete(p) : n.add(p);
    return n;
  });

  // Find the UserEvent behind a potentially-expanded TCGEvent
  const findUserEvent = (ev: TCGEvent): UserEvent | undefined =>
    userEvents.find(u => u.id === baseId(ev.id));

  const handleOpenForm = (date?: string) => {
    setEditingEvent(null);
    setFormDefaultDate(date ?? format(currentDate, 'yyyy-MM-dd'));
    setFormOpen(true);
  };

  const handleEdit = (ev: TCGEvent) => {
    const ue = findUserEvent(ev);
    if (ue) { setEditingEvent(ue); setFormOpen(true); setSelectedEvent(null); }
  };

  const handleDelete = (ev: TCGEvent) => {
    const ue = findUserEvent(ev);
    if (ue) { removeEvent(ue.id); showToast('Evento eliminato'); }
  };

  const handleSaveForm = (ev: UserEvent) => {
    if (editingEvent) { updateEvent(ev); showToast('Evento aggiornato'); }
    else { addEvent(ev); showToast('Evento aggiunto'); }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background text-foreground">

      {/* ── TOP BAR ── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-5 h-14 gap-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange-border)' }}>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <rect x="2.25" y="3.75" width="13.5" height="12" rx="2" stroke="#f97316" strokeWidth="1.5" />
              <path d="M6 2.25v2.25M12 2.25v2.25M2.25 7.5h13.5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black tracking-widest uppercase leading-none" style={{ color: '#e5e7eb', fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}>Cardzone</p>
            <p className="text-[10px] leading-none mt-0.5" style={{ color: '#4b5563', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>TCG Calendar</p>
          </div>
        </div>

        {/* Month nav — center */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-accent"
            style={{ color: '#6b7280' }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            onClick={() => setCurrentDate(new Date(2026, 5, 9))}
            className="text-sm font-bold min-w-[148px] text-center hover:text-foreground transition-colors"
            style={{ fontFamily: 'var(--font-display)', color: '#e5e7eb', letterSpacing: '0.02em' }}
            title="Torna ad oggi"
          >
            {format(currentDate, 'MMMM yyyy')}
          </button>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-accent"
            style={{ color: '#6b7280' }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRequestNotif}
            title={notifPerm === 'granted' ? 'Notifiche attive' : 'Attiva notifiche'}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-accent"
            style={{ color: notifPerm === 'granted' ? '#f97316' : '#6b7280', background: notifPerm === 'granted' ? 'var(--orange-dim)' : 'transparent' }}
          >
            <BellIcon active={notifPerm === 'granted'} />
          </button>

          <button
            className={`update-btn ${unseenCount > 0 ? 'has-updates' : ''}`}
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? <><SpinIcon /><span>Aggiornamento</span></> :
             justUpdated ? <><CheckIcon /><span>Aggiornato</span></> :
             <><RefreshIcon /><span>Update</span>
               {unseenCount > 0 && (
                 <span className="badge-pulse inline-flex items-center justify-center rounded-full text-white font-bold"
                   style={{ fontSize: 9, minWidth: 17, height: 17, padding: '0 3px', background: '#f97316', fontFamily: 'var(--font-mono)' }}>
                   {unseenCount}
                 </span>
               )}
             </>}
          </button>

          <Button
            onClick={() => handleOpenForm()}
            className="h-8 px-4 text-xs font-bold gap-1.5"
            style={{ background: '#f97316', color: '#fff', letterSpacing: '0.04em' }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            Aggiungi
          </Button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside
          className="flex-shrink-0 flex flex-col overflow-y-auto"
          style={{ width: 210, background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
        >
          {/* Game filters */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: '#374151' }}>Giochi</p>
            <div className="flex flex-col gap-2">
              {GAME_ORDER.map(g => {
                const cfg = GAME_CONFIG[g];
                const checked = visibleGames.has(g);
                return (
                  <label key={g} className="flex items-center gap-2.5 cursor-pointer group">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleGame(g)}
                      className="rounded"
                      style={{
                        borderColor: checked ? cfg.dotColor : '#374151',
                        background: checked ? cfg.bgColor : 'transparent',
                      }}
                    />
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: cfg.dotColor }} />
                    <span className="text-xs font-medium" style={{ color: checked ? cfg.color : '#6b7280' }}>
                      {cfg.shortName}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <Separator className="my-3" style={{ background: '#1a1d28' }} />

          {/* Priority filters */}
          <div className="px-4 pb-2">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: '#374151' }}>Priorità</p>
            <div className="flex flex-col gap-2">
              {PRIORITY_OPTIONS.map(p => {
                const checked = visiblePriorities.has(p.value);
                return (
                  <label key={p.value} className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePriority(p.value)}
                      className="rounded"
                      style={{ borderColor: checked ? p.color : '#374151', background: checked ? `${p.color}20` : 'transparent' }}
                    />
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-xs font-medium" style={{ color: checked ? p.color : '#6b7280' }}>{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Legend — user events */}
          {userEvents.length > 0 && (
            <>
              <Separator className="my-3" style={{ background: '#1a1d28' }} />
              <div className="px-4 pb-2">
                <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#374151' }}>Miei eventi</p>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#22c55e' }} />
                  <span className="text-xs" style={{ color: '#86efac' }}>{userEvents.length} evento{userEvents.length !== 1 ? 'i' : ''}</span>
                </div>
              </div>
            </>
          )}

          {/* Unseen badge */}
          {unseenCount > 0 && (
            <>
              <Separator className="my-3" style={{ background: '#1a1d28' }} />
              <div className="px-4">
                <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md" style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange-border)', color: '#f97316' }}>
                  <span className="w-1.5 h-1.5 rounded-full badge-pulse" style={{ background: '#f97316' }} />
                  <span className="font-bold">{unseenCount} nuovi</span>
                </div>
              </div>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mini calendar */}
          <Separator style={{ background: '#1a1d28' }} />
          <MiniCal
            current={currentDate}
            onNavigate={setCurrentDate}
            eventDates={eventDates}
          />
        </aside>

        {/* ── MAIN CALENDAR ── */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

          {/* Weekday headers */}
          <div
            className="grid flex-shrink-0"
            style={{ gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
          >
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center py-2 text-[11px] font-bold tracking-widest uppercase"
                style={{ color: '#374151', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div
            style={{
              flex: '1 1 0', minHeight: 0, overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))`,
            }}
          >
            {calDays.map((day, i) => {
              const ds = format(day, 'yyyy-MM-dd');
              const col = i % 7;
              return (
                <DayCell
                  key={ds}
                  day={day}
                  dayStr={ds}
                  events={getEventsForDay(ds)}
                  isCurrentMonth={isSameMonth(day, currentDate)}
                  isToday={isToday(day)}
                  isWeekend={col === 5 || col === 6}
                  unseenSet={unseenSet}
                  onEventClick={setSelectedEvent}
                  onAddClick={handleOpenForm}
                  rowIndex={Math.floor(i / 7)}
                  userEventIds={userEventIds}
                />
              );
            })}
          </div>
        </main>
      </div>

      {/* ── EVENT MODAL ── */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          isUpdated={unseenSet.has(selectedEvent.id)}
          onClose={() => setSelectedEvent(null)}
          isUserEvent={userEventIds.has(baseId(selectedEvent.id))}
          onEdit={() => handleEdit(selectedEvent)}
          onDelete={() => { handleDelete(selectedEvent); setSelectedEvent(null); }}
        />
      )}

      {/* ── EVENT FORM ── */}
      <EventForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveForm}
        initial={editingEvent}
        defaultDate={formDefaultDate}
      />

      {/* ── TOAST ── */}
      {toast && (
        <div
          className="toast fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium z-[60]"
          style={{ background: '#1e2130', border: '1px solid #252836', color: '#c9d1d9', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
        >
          <CheckIcon />
          {toast}
        </div>
      )}
    </div>
  );
}
