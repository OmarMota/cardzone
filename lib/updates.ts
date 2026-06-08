import { UpdateBatch } from './types';

export const UPDATE_BATCHES: UpdateBatch[] = [
  {
    date: '2026-06-08',
    eventIds: ['op16', 'mtg-marvel', 'ygo-ultimate-pack', 'ygo-battles-legend'],
    summary:
      'OP-16 date confirmed · MTG Marvel Super Heroes finalized · Yu-Gi-Oh! summer events locked in',
  },
  {
    date: '2026-06-01',
    eventIds: ['lrc-attack-vine-pre', 'rft-vendetta'],
    summary:
      'Lorcana Attack of the Vine! prerelease confirmed · Riftbound Vendetta global date locked',
  },
  {
    date: '2026-05-15',
    eventIds: ['pkm-first-partner', 'op-store-champ-s1'],
    summary:
      'Pokémon First Partner Collection S2 confirmed · One Piece Store Championship dates added',
  },
  {
    date: '2026-05-01',
    eventIds: ['pkm-pitch-black-pre', 'rft-unleashed-pre', 'rft-unleashed'],
    summary:
      'Pokémon Pitch Black prerelease confirmed · Riftbound Unleashed and prerelease dates finalized',
  },
];

export function isTodayBatchAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const now = new Date();
  return now.getUTCHours() >= 8;
}

export function getAvailableBatches(lastSeenDate: string | null): UpdateBatch[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return UPDATE_BATCHES.filter((batch) => {
    if (batch.date > todayStr) return false;
    if (batch.date === todayStr && !isTodayBatchAvailable()) return false;
    if (lastSeenDate && batch.date <= lastSeenDate) return false;
    return true;
  });
}

export function getUnseenEventIds(lastSeenDate: string | null): string[] {
  return getAvailableBatches(lastSeenDate).flatMap((b) => b.eventIds);
}

export function getUnseenCount(lastSeenDate: string | null): number {
  return getUnseenEventIds(lastSeenDate).length;
}

export function getLatestBatchDate(): string {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const available = UPDATE_BATCHES.filter(
    (b) =>
      b.date < todayStr ||
      (b.date === todayStr && isTodayBatchAvailable())
  ).sort((a, b) => b.date.localeCompare(a.date));
  return available[0]?.date ?? '';
}

export function shouldNotifyToday(): boolean {
  if (typeof window === 'undefined') return false;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const notifiedDate = localStorage.getItem('cardzone_notified_date');
  const todayBatch = UPDATE_BATCHES.find((b) => b.date === todayStr);
  return !!todayBatch && isTodayBatchAvailable() && notifiedDate !== todayStr;
}

export function markNotifiedToday(): void {
  if (typeof window === 'undefined') return;
  const todayStr = new Date().toISOString().split('T')[0];
  localStorage.setItem('cardzone_notified_date', todayStr);
}
