/**
 * Musical type definitions for bots-n-cats music-engine
 * BOC-3: Music Mapping Engine
 */

import type { InstrumentType, EmotionCategory } from '@bots-n-cats/audio-core';
import * as Tone from 'tone';

/**
 * Musical scale represented as note names
 */
export type Scale = string[];

/**
 * Musical key (root note)
 */
export type MusicalKey = string;

/**
 * Time notation for Tone.js (e.g., '4n', '8n', '16n')
 */
export type TimeNotation = string;

/**
 * Note in scientific pitch notation (e.g., 'C4', 'A#3')
 */
export type Note = string;

/**
 * Effect types available in the system
 */
export type EffectType = 'reverb' | 'delay' | 'distortion' | 'filter' | 'chorus' | 'phaser';

/**
 * Configuration for an audio effect
 */
export interface EffectConfig {
  type: EffectType;
  params: Record<string, any>;
}

/**
 * Musical parameters derived from GitHub events
 */
export interface MusicalParameters {
  /** Instrument type to use */
  instrumentType: InstrumentType;

  /** Beats per minute */
  bpm: number;

  /** Musical key (root note) */
  key: MusicalKey;

  /** Scale to use for note generation */
  scale: Scale;

  /** Duration of the pattern in seconds */
  duration: number;

  /** Effects to apply */
  effects: EffectConfig[];

  /** Instrument-specific options */
  instrumentOptions: InstrumentOptions;

  /** Emotion category for transformation */
  emotion: EmotionCategory;

  /** Intensity value (0-1) */
  intensity: number;
}

/**
 * Instrument configuration options
 */
export interface InstrumentOptions {
  oscillator?: {
    type?: Tone.ToneOscillatorType;
    partials?: number[];
    phase?: number;
    harmonicity?: number;
  };
  envelope?: {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
  };
  filter?: {
    type?: BiquadFilterType;
    frequency?: number;
    Q?: number;
    rolloff?: number;
  };
  volume?: number;
}

/**
 * Chord definition with name and notes
 */
export interface Chord {
  name: string;
  notes: Note[];
}

/**
 * Chord progression
 */
export interface ChordProgression {
  chords: Chord[];
  duration: TimeNotation;
}

/**
 * Melodic phrase
 */
export interface Melody {
  notes: Note[];
  durations: TimeNotation[];
  velocities?: number[];
}

/**
 * Rhythmic pattern
 */
export interface Rhythm {
  pattern: TimeNotation[];
  subdivision: TimeNotation;
}

/**
 * Complete musical pattern for Tone.js
 */
export interface Pattern {
  /** Notes to play */
  notes: Note[];

  /** Timing for each note in Tone.js notation */
  times: string[];

  /** Note durations */
  durations: TimeNotation[];

  /** Velocities (0-1) */
  velocities?: number[];

  /** Optional chord progression */
  chords?: ChordProgression;

  /** Pattern metadata */
  metadata?: {
    bpm: number;
    key: MusicalKey;
    scale: Scale;
    emotion: EmotionCategory;
  };
}

/**
 * Emotion to musical characteristics mapping
 */
export interface EmotionMapping {
  /** Scale type (major, minor, pentatonic, etc.) */
  scaleType: string;

  /** Chord quality preferences */
  chordQualities: string[];

  /** Filter frequency range */
  filterRange: [number, number];

  /** Waveform type */
  waveform: Tone.ToneOscillatorType;

  /** Default BPM modifier */
  bpmModifier: number;

  /** Suggested effects */
  suggestedEffects: EffectType[];
}

/**
 * Tempo mapping configuration
 */
export interface TempoMapping {
  minCommits: number;
  maxCommits: number;
  minBPM: number;
  maxBPM: number;
}

/**
 * Language to instrument mapping
 */
export interface LanguageMapping {
  [language: string]: InstrumentType;
}
