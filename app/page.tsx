'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
  addDays,
  subDays,
  parseISO,
} from 'date-fns';
import { ALL_EVENTS, GAME_NIGHTS } from '@/lib/data';
import {
  getUnseenEventIds,
  getUnseenCount,
  shouldNotifyToday,
  markNotifiedToday,
  UPDATE_BATCHES,
} from '@/lib/updates';
import { GAME_CONFIG, GAME_ORDER } from '@/lib/gameConfig';
import type { GameSlug, Priority, TCGEvent } from '@/lib/types';
import EventModal from '@/components/EventModal';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRIORITY_LABEL: Record<Priority, string> = {
  must_do: 'MUST-DO',
  important: 'IMPORTANT',
  opportunity: 'OPPORTUNITY',
  optional: 'OPTIONAL',
};

const PRIORITY_DOT: Record<Priority, string> = {
  must_do: '#ef4444',
  important: '#f97316',
  opportunity: '#eab308',
  optional: '#6b7280',
};

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2.25" y="3.75" width="13.5" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 2.25v2.25M12 2.25v2.25M2.25 7.5h13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ hasAlert }: { hasAlert: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path
        d="M8.5 1.5a5.5 5.5 0 00-5.5 5.5v3L1.5 12.5h14l-1.5-2.5V7A5.5 5.5 0 008.5 1.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={hasAlert ? 'currentColor' : 'none'}
        fillOpacity={hasAlert ? 0.15 : 0}
      />
      <path
        d="M6.5 12.5a2 2 0 004 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 20" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 5, 8));
  const [selectedEvent, setSelectedEvent] = useState<TCGEvent | null>(null);
  // Initialize safely for SSR — read localStorage only after mount
  const [lastSeenDate, setLastSeenDate] = useState<string | null>(null);
  const [unseenIds, setUnseenIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [filterGame, setFilterGame] = useState<GameSlug | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('cardzone_last_seen');
    setLastSeenDate(saved);
    setUnseenIds(getUnseenEventIds(saved));
    if ('Notification' in window) setNotifPerm(Notification.permission);
  }, []);

  // Daily notification check
  useEffect(() => {
    const check = () => {
      if (shouldNotifyToday()) {
        const todayStr = new Date().toISOString().split('T')[0];
        const batch = UPDATE_BATCHES.find((b) => b.date === todayStr);
        if (batch && Notification.permission === 'granted') {
          new Notification('CARDZONE — Daily update ready', {
            body: batch.summary,
            tag: 'cardzone-update',
          });
          markNotifiedToday();
        }
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    await new Promise((r) => setTimeout(r, 1100));

    const count = unseenIds.length;
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('cardzone_last_seen', todayStr);
    setLastSeenDate(todayStr);
    setUnseenIds([]);
    setIsUpdating(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 2500);

    if (count > 0) {
      showToast(`${count} event${count === 1 ? '' : 's'} updated`);
    } else {
      showToast('Already up to date');
    }
  }, [isUpdating, unseenIds.length, showToast]);

  const handleRequestNotif = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      showToast('Notifications enabled — updates arrive at 8:00 AM GMT');
    }
  }, [showToast]);

  // Build calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDow = (getDay(monthStart) + 6) % 7; // Mon=0, Sun=6
  const endDow = (getDay(monthEnd) + 6) % 7;
  const calStart = subDays(monthStart, startDow);
  const calEnd = endDow < 6 ? addDays(monthEnd, 6 - endDow) : monthEnd;
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const weeks = Math.ceil(calDays.length / 7);

  // Merge all events (releases + serate stories)
  const allEvents = [...ALL_EVENTS, ...GAME_NIGHTS];

  // Filter events — game_night events skip priority filter
  const filteredEvents = allEvents.filter((e) => {
    if (filterGame !== 'all' && e.game !== filterGame) return false;
    if (e.type === 'game_night') return true; // always show game nights when game matches
    if (filterPriority !== 'all' && e.priority !== filterPriority) return false;
    return true;
  });

  const getEventsForDay = (day: Date) => {
    const ds = format(day, 'yyyy-MM-dd');
    return filteredEvents.filter((e) => e.date === ds);
  };

  const unseenSet = new Set(unseenIds);
  const unseenCount = unseenIds.length;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── TOP BAR ────────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-5 h-14 gap-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange-border)' }}
          >
            <span style={{ color: 'var(--orange)', fontSize: 13 }}>
              <CalendarIcon />
            </span>
          </div>
          <div>
            <p
              className="text-sm font-black tracking-widest uppercase leading-none"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}
            >
              Cardzone
            </p>
            <p
              className="text-xs leading-none mt-0.5"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
            >
              TCG Calendar
            </p>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <button
            onClick={() => setCurrentDate((d) => subMonths(d, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={() => setCurrentDate(new Date(2026, 5, 8))}
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text)',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.02em',
              minWidth: 160,
              textAlign: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Return to today"
          >
            {format(currentDate, 'MMMM yyyy')}
          </button>

          <button
            onClick={() => setCurrentDate((d) => addMonths(d, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notification bell */}
          <button
            onClick={handleRequestNotif}
            title={
              notifPerm === 'granted'
                ? 'Notifications enabled — 8:00 AM GMT daily'
                : 'Enable daily notifications at 8:00 AM GMT'
            }
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              color: notifPerm === 'granted' ? 'var(--orange)' : 'var(--text-muted)',
              background: notifPerm === 'granted' ? 'var(--orange-dim)' : 'transparent',
              border: notifPerm === 'granted' ? '1px solid var(--orange-border)' : '1px solid transparent',
            }}
          >
            <BellIcon hasAlert={notifPerm === 'granted'} />
          </button>

          {/* Update button */}
          <button
            className={`update-btn ${unseenCount > 0 ? 'has-updates' : ''}`}
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <SpinnerIcon />
                <span>Updating</span>
              </>
            ) : justUpdated ? (
              <>
                <CheckIcon />
                <span>Updated</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M12 7A5 5 0 112.08 5M2 2v3h3"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Update</span>
                {unseenCount > 0 && (
                  <span
                    className="badge-pulse inline-flex items-center justify-center rounded-full text-white font-bold"
                    style={{
                      fontSize: 10,
                      minWidth: 18,
                      height: 18,
                      padding: '0 4px',
                      background: 'var(--orange)',
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1,
                    }}
                  >
                    {unseenCount}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── FILTER BAR ─────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-1 px-4 h-10 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Game filters */}
        <button
          className={`filter-tab ${filterGame === 'all' ? 'active' : ''}`}
          onClick={() => setFilterGame('all')}
          style={filterGame === 'all' ? { color: 'var(--text)' } : {}}
        >
          All
        </button>

        {GAME_ORDER.map((slug) => {
          const g = GAME_CONFIG[slug];
          const active = filterGame === slug;
          return (
            <button
              key={slug}
              className="filter-tab"
              onClick={() => setFilterGame(active ? 'all' : slug)}
              style={{
                color: active ? g.color : undefined,
                background: active ? g.bgColor : undefined,
                borderColor: active ? g.borderColor : undefined,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{ width: 6, height: 6, borderRadius: '50%', background: g.dotColor, display: 'inline-block', flexShrink: 0 }}
                />
                {g.shortName}
              </span>
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'var(--border-2)', flexShrink: 0, margin: '0 4px' }} />

        {/* Priority filters */}
        {(['all', 'must_do', 'important', 'opportunity'] as const).map((p) => {
          const active = filterPriority === p;
          const label = p === 'all' ? 'All priorities' : PRIORITY_LABEL[p];
          const color = p !== 'all' ? PRIORITY_DOT[p] : undefined;
          return (
            <button
              key={p}
              className="filter-tab"
              onClick={() => setFilterPriority(active && p !== 'all' ? 'all' : p)}
              style={{
                color: active && color ? color : active ? 'var(--text)' : undefined,
                background: active && color ? `${color}18` : active ? 'var(--surface-2)' : undefined,
                borderColor: active && color ? `${color}40` : active ? 'var(--border-2)' : undefined,
              }}
            >
              {p !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: color, display: 'inline-block', flexShrink: 0,
                    }}
                  />
                  {label}
                </span>
              )}
              {p === 'all' && label}
            </button>
          );
        })}

        {/* Unseen count indicator */}
        {unseenCount > 0 && (
          <div
            className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md"
            style={{
              color: 'var(--orange)',
              background: 'var(--orange-dim)',
              border: '1px solid var(--orange-border)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', display: 'inline-block' }}
              className="badge-pulse"
            />
            {unseenCount} new
          </div>
        )}
      </div>

      {/* ── CALENDAR GRID ──────────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden" style={{ flex: '1 1 0', minHeight: 0 }}>
        {/* Weekday headers */}
        <div
          className="grid flex-shrink-0"
          style={{
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center py-2 text-xs font-bold tracking-widest uppercase"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.08em',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day grid — fills remaining height exactly */}
        <div
          style={{
            flex: '1 1 0',
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))`,
            overflow: 'hidden',
          }}
        >
          {calDays.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const ds = format(day, 'yyyy-MM-dd');
            const col = i % 7;
            const isWeekend = col === 5 || col === 6;

            return (
              <DayCell
                key={ds}
                day={day}
                dayStr={ds}
                events={dayEvents}
                isCurrentMonth={isCurrentMonth}
                isToday={isTodayDate}
                isWeekend={isWeekend}
                unseenSet={unseenSet}
                onEventClick={setSelectedEvent}
                rowIndex={Math.floor(i / 7)}
              />
            );
          })}
        </div>
      </div>

      {/* ── EVENT MODAL ────────────────────────────────────────────── */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          isUpdated={unseenSet.has(selectedEvent.id)}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* ── TOAST ──────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="toast fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl z-[60]"
          style={{
            background: '#1e2130',
            border: '1px solid var(--border-2)',
            color: 'var(--text)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <CheckIcon />
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Day Cell Component ────────────────────────────────────────────────────────

interface DayCellProps {
  day: Date;
  dayStr: string;
  events: TCGEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  unseenSet: Set<string>;
  onEventClick: (event: TCGEvent) => void;
  rowIndex: number;
}

function DayCell({
  day,
  dayStr,
  events,
  isCurrentMonth,
  isToday,
  isWeekend,
  unseenSet,
  onEventClick,
  rowIndex,
}: DayCellProps) {
  const MAX_VISIBLE = 2;
  const visible = events.slice(0, MAX_VISIBLE);
  const overflow = events.length - MAX_VISIBLE;
  const hasMultiple = events.length >= 2;

  return (
    <div
      className="cal-cell row-fade relative flex flex-col min-h-0"
      style={{
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: isToday
          ? 'rgba(59, 130, 246, 0.05)'
          : isWeekend
          ? 'rgba(255,255,255,0.012)'
          : 'transparent',
        opacity: isCurrentMonth ? 1 : 0.3,
        animationDelay: `${rowIndex * 40}ms`,
        cursor: 'default',
        overflow: 'hidden',
        padding: '10px 8px 8px',
      }}
    >
      {/* Day number + count badge */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        {/* Spacer left */}
        <div style={{ width: 20 }} />

        {/* Day number circle */}
        <span
          className="flex items-center justify-center rounded-full font-semibold leading-none"
          style={{
            width: 26,
            height: 26,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            background: isToday ? 'var(--today)' : 'transparent',
            color: isToday
              ? '#fff'
              : isCurrentMonth
              ? 'var(--text-muted)'
              : 'var(--text-dim)',
            fontWeight: isToday ? 700 : 500,
            flexShrink: 0,
          }}
        >
          {format(day, 'd')}
        </span>

        {/* Event count badge — shown when 2+ events */}
        {hasMultiple ? (
          <span
            className="flex items-center justify-center rounded-full font-bold leading-none"
            style={{
              width: 18,
              height: 18,
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              background: events.some((e) => unseenSet.has(e.id))
                ? '#f97316'
                : '#252836',
              color: events.some((e) => unseenSet.has(e.id)) ? '#fff' : '#9ca3af',
              flexShrink: 0,
            }}
          >
            {events.length}
          </span>
        ) : (
          <div style={{ width: 18 }} />
        )}
      </div>

      {/* Events */}
      <div className="flex flex-col gap-1 overflow-hidden flex-1">
        {visible.map((event) => {
          const game = GAME_CONFIG[event.game];
          const isUpdated = unseenSet.has(event.id);

          const isGameNight = event.type === 'game_night';
          const pillStyle = isUpdated
            ? {}
            : isGameNight
            ? { background: 'rgba(99,102,241,0.1)', borderLeftColor: '#818cf8', color: '#a5b4fc' }
            : { background: game.bgColor, borderLeftColor: game.dotColor, color: game.color };
          const dotColor = isUpdated ? '#f97316' : isGameNight ? '#818cf8' : game.dotColor;

          return (
            <button
              key={event.id}
              className={`event-pill ${isUpdated ? 'is-updated' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event);
              }}
              style={pillStyle}
              title={event.title}
            >
              <span
                className="flex-shrink-0 rounded-full"
                style={{
                  width: 5,
                  height: 5,
                  background: dotColor,
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {event.title}
              </span>
            </button>
          );
        })}

        {overflow > 0 && (
          <button
            className="event-pill"
            style={{
              background: 'transparent',
              borderLeftColor: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 10,
              paddingLeft: 2,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(events[MAX_VISIBLE]);
            }}
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  );
}
