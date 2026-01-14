
export enum GameState {
  LANDING = 'LANDING',
  INITIALIZING = 'INITIALIZING',
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  PLAYING = 'PLAYING'
}

export interface Item {
  id: string;
  name: string;
  description: string;
}

export interface Character {
  name: string;
  race: string;
  class: string;
  genre: string;
  level: number;
  hp: number;
  maxHp: number;
  inventory: Item[];
  stats: {
    forca: number;
    destreza: number;
    constituicao: number;
    inteligencia: number;
    sabedoria: number;
    carisma: number;
  };
}

export interface GameLog {
  id: string;
  sender: 'dm' | 'player';
  text: string;
  timestamp: number;
  sceneImageUrl?: string;
  options?: string[];
  requiresRoll?: {
    type: string;
    target?: number;
  };
}
