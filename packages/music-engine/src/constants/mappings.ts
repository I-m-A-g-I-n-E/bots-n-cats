/**
 * Emotion to music mappings for bots-n-cats
 * BOC-3: Music Mapping Engine
 */

import type { EmotionCategory } from '@bots-n-cats/audio-core';
import type { EmotionMapping, TempoMapping, LanguageMapping, Scale } from '../types/musical';

/**
 * Emotion categories mapped to musical characteristics
 * Based on BOC-3 Linear issue specifications
 */
export const EMOTION_MAPPINGS: Record<EmotionCategory, EmotionMapping> = {
  tension: {
    scaleType: 'minor',
    chordQualities: ['m', 'dim', 'm7', 'dim7'],
    filterRange: [300, 600],
    waveform: 'sawtooth',
    bpmModifier: -10,
    suggestedEffects: ['distortion', 'delay'],
  },

  resolution: {
    scaleType: 'major',
    chordQualities: ['', 'maj7', '6', 'add9'],
    filterRange: [800, 1200],
    waveform: 'triangle',
    bpmModifier: 0,
    suggestedEffects: ['reverb', 'chorus'],
  },

  activity: {
    scaleType: 'pentatonic',
    chordQualities: ['', '7', 'sus4'],
    filterRange: [600, 1000],
    waveform: 'square',
    bpmModifier: 15,
    suggestedEffects: ['phaser', 'delay'],
  },

  growth: {
    scaleType: 'dorian',
    chordQualities: ['m7', 'maj7', '9', '11'],
    filterRange: [500, 900],
    waveform: 'sine',
    bpmModifier: 5,
    suggestedEffects: ['reverb', 'chorus', 'filter'],
  },
};

/**
 * Musical scales by type
 */
export const SCALES: Record<string, Scale> = {
  // Major scales
  major: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  majorC: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  majorG: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  majorD: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  majorA: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],

  // Minor scales (natural)
  minor: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  minorA: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  minorE: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
  minorD: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],

  // Pentatonic scales
  pentatonic: ['C', 'D', 'E', 'G', 'A'],
  pentatonicMinor: ['A', 'C', 'D', 'E', 'G'],

  // Modal scales
  dorian: ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'],
  phrygian: ['E', 'F', 'G', 'A', 'B', 'C', 'D'],
  lydian: ['F', 'G', 'A', 'B', 'C', 'D', 'E'],
  mixolydian: ['G', 'A', 'B', 'C', 'D', 'E', 'F'],

  // Blues scale
  blues: ['C', 'Eb', 'F', 'F#', 'G', 'Bb'],
};

/**
 * Tempo mapping: commit frequency to BPM
 */
export const TEMPO_MAPPINGS: TempoMapping[] = [
  { minCommits: 0, maxCommits: 1, minBPM: 60, maxBPM: 80 },
  { minCommits: 1, maxCommits: 5, minBPM: 80, maxBPM: 120 },
  { minCommits: 5, maxCommits: 10, minBPM: 120, maxBPM: 140 },
  { minCommits: 10, maxCommits: 20, minBPM: 140, maxBPM: 160 },
  { minCommits: 20, maxCommits: Infinity, minBPM: 160, maxBPM: 180 },
];

/**
 * Programming language to instrument type mapping
 */
export const LANGUAGE_MAPPINGS: LanguageMapping = {
  // Modern web
  javascript: 'fmSynth',
  typescript: 'fmSynth',
  jsx: 'fmSynth',
  tsx: 'fmSynth',

  // Systems languages
  rust: 'polySynth',
  cpp: 'polySynth',
  c: 'polySynth',
  'c++': 'polySynth',

  // Application languages
  python: 'synth',
  ruby: 'synth',
  php: 'synth',

  // JVM languages
  java: 'polySynth',
  kotlin: 'polySynth',
  scala: 'polySynth',

  // Functional languages
  haskell: 'fmSynth',
  elixir: 'fmSynth',
  erlang: 'fmSynth',
  clojure: 'fmSynth',

  // Go
  go: 'synth',
  golang: 'synth',

  // Data/ML
  r: 'synth',
  julia: 'synth',

  // Default fallback
  default: 'synth',
};

/**
 * Chord quality intervals (semitones from root)
 */
export const CHORD_INTERVALS: Record<string, number[]> = {
  // Major chords
  '': [0, 4, 7], // Major triad
  maj7: [0, 4, 7, 11],
  maj9: [0, 4, 7, 11, 14],
  '6': [0, 4, 7, 9],
  add9: [0, 4, 7, 14],

  // Minor chords
  m: [0, 3, 7], // Minor triad
  m7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  m6: [0, 3, 7, 9],

  // Dominant chords
  '7': [0, 4, 7, 10],
  '9': [0, 4, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 17, 21],

  // Diminished/Augmented
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],

  // Suspended
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

/**
 * Note names to MIDI number mapping (for octave 4)
 */
export const NOTE_TO_MIDI: Record<string, number> = {
  C: 60,
  'C#': 61,
  Db: 61,
  D: 62,
  'D#': 63,
  Eb: 63,
  E: 64,
  F: 65,
  'F#': 66,
  Gb: 66,
  G: 67,
  'G#': 68,
  Ab: 68,
  A: 69,
  'A#': 70,
  Bb: 70,
  B: 71,
};

/**
 * Time divisions for rhythm generation
 */
export const TIME_DIVISIONS = {
  whole: '1n',
  half: '2n',
  quarter: '4n',
  eighth: '8n',
  sixteenth: '16n',
  thirtysecond: '32n',
  // Triplets
  halfTriplet: '2n.',
  quarterTriplet: '4n.',
  eighthTriplet: '8n.',
  sixteenthTriplet: '16n.',
};

/**
 * Default effect parameters
 */
export const DEFAULT_EFFECT_PARAMS: Record<string, Record<string, any>> = {
  reverb: {
    decay: 2.5,
    preDelay: 0.01,
    wet: 0.3,
  },
  delay: {
    delayTime: '8n',
    feedback: 0.4,
    wet: 0.25,
  },
  distortion: {
    distortion: 0.4,
    oversample: '4x',
    wet: 0.5,
  },
  filter: {
    type: 'lowpass',
    frequency: 800,
    Q: 1,
    wet: 0.7,
  },
  chorus: {
    frequency: 1.5,
    delayTime: 3.5,
    depth: 0.7,
    wet: 0.3,
  },
  phaser: {
    frequency: 0.5,
    octaves: 3,
    baseFrequency: 350,
    wet: 0.4,
  },
};

/**
 * Lines changed to duration mapping (in seconds)
 */
export const LINES_TO_DURATION = {
  min: 2,
  max: 8,
  scale: 100, // Lines to divide by for scaling
};

/**
 * Intensity to effect parameter scaling
 */
export const INTENSITY_SCALING = {
  min: 0.3,
  max: 1.0,
};
