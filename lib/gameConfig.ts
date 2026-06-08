import { GameSlug } from './types';

export interface GameConfig {
  slug: GameSlug;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

export const GAME_CONFIG: Record<GameSlug, GameConfig> = {
  pokemon: {
    slug: 'pokemon',
    name: 'Pokémon TCG',
    shortName: 'PKM',
    color: '#fde047',
    bgColor: 'rgba(253, 224, 71, 0.1)',
    borderColor: 'rgba(253, 224, 71, 0.3)',
    dotColor: '#facc15',
  },
  'one-piece': {
    slug: 'one-piece',
    name: 'One Piece',
    shortName: 'OP',
    color: '#fb7185',
    bgColor: 'rgba(251, 113, 133, 0.1)',
    borderColor: 'rgba(251, 113, 133, 0.3)',
    dotColor: '#f43f5e',
  },
  lorcana: {
    slug: 'lorcana',
    name: 'Disney Lorcana',
    shortName: 'LRC',
    color: '#c084fc',
    bgColor: 'rgba(192, 132, 252, 0.1)',
    borderColor: 'rgba(192, 132, 252, 0.3)',
    dotColor: '#a855f7',
  },
  magic: {
    slug: 'magic',
    name: 'Magic: The Gathering',
    shortName: 'MTG',
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.1)',
    borderColor: 'rgba(96, 165, 250, 0.3)',
    dotColor: '#3b82f6',
  },
  yugioh: {
    slug: 'yugioh',
    name: 'Yu-Gi-Oh!',
    shortName: 'YGO',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
    dotColor: '#f59e0b',
  },
  riftbound: {
    slug: 'riftbound',
    name: 'Riftbound',
    shortName: 'RFT',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
    dotColor: '#10b981',
  },
};

export const GAME_ORDER: GameSlug[] = [
  'pokemon',
  'one-piece',
  'lorcana',
  'magic',
  'yugioh',
  'riftbound',
];
