import { useState, useEffect, useCallback } from 'react';
import { addWeeks, addMonths, parseISO, format, isAfter } from 'date-fns';
import { UserEvent, TCGEvent } from './types';

const KEY = 'cardzone_user_events';

export function useUserEvents() {
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUserEvents(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((events: UserEvent[]) => {
    setUserEvents(events);
    localStorage.setItem(KEY, JSON.stringify(events));
  }, []);

  const addEvent = useCallback((ev: UserEvent) => {
    persist([...userEvents, ev]);
  }, [userEvents, persist]);

  const updateEvent = useCallback((ev: UserEvent) => {
    persist(userEvents.map(e => e.id === ev.id ? ev : e));
  }, [userEvents, persist]);

  const removeEvent = useCallback((id: string) => {
    persist(userEvents.filter(e => e.id !== id));
  }, [userEvents, persist]);

  return { userEvents, addEvent, updateEvent, removeEvent };
}

// Expand a UserEvent (potentially recurring) into individual TCGEvent instances
export function expandEvent(ev: UserEvent): TCGEvent[] {
  if (!ev.recurring) {
    const { isUserCreated, recurring, ...rest } = ev;
    return [rest];
  }

  const { frequency, until } = ev.recurring;
  const endDate = parseISO(until);
  const instances: TCGEvent[] = [];
  let cur = parseISO(ev.date);

  while (!isAfter(cur, endDate)) {
    const dateStr = format(cur, 'yyyy-MM-dd');
    const { isUserCreated, recurring, ...rest } = ev;
    instances.push({
      ...rest,
      id: `${ev.id}__${dateStr}`,
      date: dateStr,
    });
    if (frequency === 'weekly') cur = addWeeks(cur, 1);
    else if (frequency === 'biweekly') cur = addWeeks(cur, 2);
    else cur = addMonths(cur, 1);
  }

  return instances;
}

// Generate a unique ID for a new user event
export function newId(): string {
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Extract the base recurring ID from an expanded instance ID
export function baseId(id: string): string {
  return id.split('__')[0];
}
