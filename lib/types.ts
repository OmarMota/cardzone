export type GameSlug = 'pokemon' | 'one-piece' | 'lorcana' | 'magic' | 'yugioh' | 'riftbound';

export type EventType =
  | 'release'
  | 'prerelease'
  | 'championship'
  | 'regional'
  | 'popculture'
  | 'accessory'
  | 'competitive'
  | 'game_night';

export type Priority = 'must_do' | 'important' | 'opportunity' | 'optional';
export type Confidence = 'confirmed' | 'expected' | 'rumored';

export interface TCGEvent {
  id: string;
  game: GameSlug;
  date: string;
  endDate?: string;
  title: string;
  type: EventType;
  priority: Priority;
  confidence: Confidence;
  description?: string;
  isMajor?: boolean;
  addedInBatch?: string;
  sourceUrl?: string;
}

export interface UpdateBatch {
  date: string;
  eventIds: string[];
  summary: string;
}
