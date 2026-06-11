'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isToday, isSameMonth,
  addDays, subDays,
} from 'date-fns';
import {
  BellIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon,
  ReloadIcon, CheckIcon,
} from '@radix-ui/react-icons';
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
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#4b5563' }}>
          {format(mini, 'MMM yyyy')}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setMini(d => subMonths(d, 1))}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-accent transition-colors"
            style={{ color: '#6b7280' }}
          >
            <ChevronLeftIcon width={10} height={10} />
          </button>
          <button
            onClick={() => setMini(d => addMonths(d, 1))}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-accent transition-colors"
            style={{ color: '#6b7280' }}
          >
            <ChevronRightIcon width={10} height={10} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS_MINI.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold" style={{ color: '#374151' }}>{d}</div>
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
                color: !inMonth ? '#1e2235' : today ? '#fff' : '#6b7280',
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
        background: isToday ? 'rgba(59,130,246,0.04)' : isWeekend ? 'rgba(255,255,255,0.012)' : 'transparent',
        opacity: isCurrentMonth ? 1 : 0.22,
        animationDelay: `${rowIndex * 35}ms`,
        overflow: 'hidden',
        padding: '10px 10px 8px',
      }}
    >
      {/* Date number row */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <span
          className="flex items-center justify-center rounded-full font-semibold leading-none"
          style={{
            width: 26, height: 26,
            fontSize: 12,
            background: isToday ? '#3b82f6' : 'transparent',
            color: isToday ? '#fff' : isCurrentMonth ? '#4b5563' : '#2a2f42',
            fontWeight: isToday ? 700 : 500,
          }}
        >
          {format(day, 'd')}
        </span>

        {/* Event count badge */}
        {events.length >= 2 && (
          <span
            className="flex items-center justify-center rounded-full font-bold"
            style={{
              width: 18, height: 18, fontSize: 9,
              background: events.some(e => unseenSet.has(e.id)) ? '#f97316' : '#1a1d28',
              color: events.some(e => unseenSet.has(e.id)) ? '#fff' : '#4b5563',
            }}
          >
            {events.length}
          </span>
        )}

        {/* Add button — on hover, when not crowded */}
        {events.length < 2 && (
          <button
            onClick={() => onAddClick(dayStr)}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-opacity hover:bg-accent"
            style={{ color: '#6b7280' }}
            title="Aggiungi evento"
          >
            <PlusIcon width={11} height={11} />
          </button>
        )}
      </div>

      {/* Event pills */}
      <div className="flex flex-col gap-1 overflow-hidden flex-1 min-h-0">
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
          <span className="text-[10px] pl-1.5 mt-0.5" style={{ color: '#374151' }}>+{overflow} altri</span>
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

  // Sidebar filter state
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

  const expandedUserEvents = useMemo(() =>
    userEvents.flatMap(ev => expandEvent(ev)),
  [userEvents]);

  const allEvents = useMemo(() =>
    [...ALL_EVENTS, ...GAME_NIGHTS, ...expandedUserEvents],
  [expandedUserEvents]);

  const userEventIds = useMemo(() => new Set(userEvents.map(e => e.id)), [userEvents]);

  const filteredEvents = useMemo(() =>
    allEvents.filter(e => {
      if (!visibleGames.has(e.game)) return false;
      if (e.type === 'game_night') return true;
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

  const eventDates = useMemo(() => new Set(filteredEvents.map(e => e.date)), [filteredEvents]);

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
        className="flex-shrink-0 flex items-center justify-between px-6 h-[56px] gap-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange-border)' }}
          >
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="2.25" y="3.75" width="13.5" height="12" rx="2" stroke="#f97316" strokeWidth="1.5" />
              <path d="M6 2.25v2.25M12 2.25v2.25M2.25 7.5h13.5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-black tracking-[0.16em] uppercase leading-none font-heading" style={{ color: '#e5e7eb' }}>
              Cardzone
            </p>
            <p className="text-[10px] leading-none mt-0.5 tracking-widest" style={{ color: '#374151' }}>
              TCG Calendar
            </p>
          </div>
        </div>

        {/* Month nav — center */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-accent"
            style={{ color: '#6b7280' }}
          >
            <ChevronLeftIcon width={14} height={14} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(2026, 5, 9))}
            className="text-[14px] font-semibold min-w-[160px] text-center hover:text-foreground transition-colors capitalize"
            style={{ color: '#d4dae4', letterSpacing: '0.01em' }}
            title="Torna ad oggi"
          >
            {format(currentDate, 'MMMM yyyy')}
          </button>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-accent"
            style={{ color: '#6b7280' }}
          >
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bell */}
          <button
            onClick={handleRequestNotif}
            title={notifPerm === 'granted' ? 'Notifiche attive' : 'Attiva notifiche'}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-accent"
            style={{
              color: notifPerm === 'granted' ? '#f97316' : '#6b7280',
              background: notifPerm === 'granted' ? 'var(--orange-dim)' : 'transparent',
              border: notifPerm === 'granted' ? '1px solid var(--orange-border)' : '1px solid transparent',
            }}
          >
            <BellIcon width={16} height={16} />
          </button>

          {/* Update */}
          <button
            className={`update-btn ${unseenCount > 0 ? 'has-updates' : ''}`}
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating
              ? <><ReloadIcon width={13} height={13} className="spin" /><span>Aggiornamento</span></>
              : justUpdated
              ? <><CheckIcon width={13} height={13} /><span>Aggiornato</span></>
              : <>
                  <ReloadIcon width={13} height={13} />
                  <span>Update</span>
                  {unseenCount > 0 && (
                    <span
                      className="badge-pulse inline-flex items-center justify-center rounded-full text-white font-bold"
                      style={{ fontSize: 9, minWidth: 17, height: 17, padding: '0 4px', background: '#f97316' }}
                    >
                      {unseenCount}
                    </span>
                  )}
                </>
            }
          </button>

          {/* Add */}
          <Button
            onClick={() => handleOpenForm()}
            className="h-9 px-4 text-[12px] font-bold gap-1.5"
            style={{ background: '#f97316', color: '#fff', letterSpacing: '0.04em' }}
          >
            <PlusIcon width={13} height={13} />
            Aggiungi
          </Button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside
          className="flex-shrink-0 flex flex-col overflow-y-auto"
          style={{ width: 220, background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
        >
          {/* Game filters */}
          <div className="px-5 pt-6 pb-4">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-4 font-heading" style={{ color: '#374151' }}>
              Giochi
            </p>
            <div className="flex flex-col gap-3">
              {GAME_ORDER.map(g => {
                const cfg = GAME_CONFIG[g];
                const checked = visibleGames.has(g);
                return (
                  <label key={g} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleGame(g)}
                      className="rounded flex-shrink-0"
                      style={{
                        borderColor: checked ? cfg.dotColor : '#2a2f42',
                        background: checked ? cfg.bgColor : 'transparent',
                        width: 16, height: 16,
                      }}
                    />
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: cfg.dotColor }} />
                    <span className="text-[13px] font-medium leading-none" style={{ color: checked ? cfg.color : '#4b5563' }}>
                      {cfg.shortName}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <Separator style={{ background: 'var(--sidebar-border)' }} />

          {/* Priority filters */}
          <div className="px-5 pt-5 pb-4">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-4 font-heading" style={{ color: '#374151' }}>
              Priorità
            </p>
            <div className="flex flex-col gap-3">
              {PRIORITY_OPTIONS.map(p => {
                const checked = visiblePriorities.has(p.value);
                return (
                  <label key={p.value} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePriority(p.value)}
                      className="rounded flex-shrink-0"
                      style={{
                        borderColor: checked ? p.color : '#2a2f42',
                        background: checked ? `${p.color}20` : 'transparent',
                        width: 16, height: 16,
                      }}
                    />
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-[13px] font-medium leading-none" style={{ color: checked ? p.color : '#4b5563' }}>
                      {p.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Legend — user events */}
          {userEvents.length > 0 && (
            <>
              <Separator style={{ background: 'var(--sidebar-border)' }} />
              <div className="px-5 pt-5 pb-4">
                <p className="text-[10px] font-bold tracking-widest uppercase mb-3 font-heading" style={{ color: '#374151' }}>
                  Miei eventi
                </p>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#22c55e' }} />
                  <span className="text-[13px] font-medium" style={{ color: '#86efac' }}>
                    {userEvents.length} event{userEvents.length !== 1 ? 'i' : 'o'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Unseen badge */}
          {unseenCount > 0 && (
            <>
              <Separator style={{ background: 'var(--sidebar-border)' }} />
              <div className="px-5 pt-5 pb-4">
                <div
                  className="flex items-center gap-2.5 text-[12px] px-3 py-2.5 rounded-lg"
                  style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange-border)', color: '#f97316' }}
                >
                  <span className="w-2 h-2 rounded-full badge-pulse flex-shrink-0" style={{ background: '#f97316' }} />
                  <span className="font-bold">{unseenCount} nuovi</span>
                </div>
              </div>
            </>
          )}

          <div className="flex-1" />

          {/* Mini calendar */}
          <Separator style={{ background: 'var(--sidebar-border)' }} />
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
            style={{
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid var(--border)',
              background: 'var(--card)',
            }}
          >
            {WEEKDAYS.map(d => (
              <div
                key={d}
                className="text-center py-2.5 text-[11px] font-bold tracking-widest uppercase font-heading"
                style={{ color: '#374151' }}
              >
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
          className="toast fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-5 py-3 rounded-xl text-[13px] font-medium z-[60]"
          style={{ background: '#191d28', border: '1px solid #252836', color: '#c9d1d9', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}
        >
          <CheckIcon width={14} height={14} style={{ color: '#22c55e' }} />
          {toast}
        </div>
      )}
    </div>
  );
}
