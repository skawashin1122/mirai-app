/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AppScreen {
  TOP_BOOT = "TOP_BOOT",
  TOP_SELECT = "TOP_SELECT",
  PLAYING = "PLAYING",
  RESULT = "RESULT",
}

export interface LyricChar {
  char: string;
  startTime: number; // in ms
  endTime: number;   // in ms
}

export interface LyricWord {
  word: string;
  startTime: number; // in ms
  endTime: number;   // in ms
  chars: LyricChar[];
}

export interface LyricPhrase {
  text: string;
  startTime: number; // in ms
  endTime: number;   // in ms
  words: LyricWord[];
}

export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // in seconds
  coverUrl: string;
  accentColor: string; // Tailwind class or hex
  textAliveUrl?: string; // TextAlive official metadata link if applicable
  description: string;
  lyrics: LyricPhrase[];
}

export interface ResonanceLog {
  timestamp: number; // in ms
  lyricChar: string; // The character that was tapped
  phraseText: string; // The phrase containing the character
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  vx: number;
  vy: number;
  alpha: number;
  character: string;
}
