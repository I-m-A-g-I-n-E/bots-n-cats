/**
 * @bots-n-cats/music-engine
 * Music mapping and generation engine
 *
 * BOC-3: Music Mapping Engine
 * BOC-4: Pattern Generator
 *
 * Transforms GitHub webhook events into musical parameters and patterns
 * using the audio-core services.
 */

// Core orchestrator
export { MusicMapper, type MusicMapperConfig } from './MusicMapper.js';

// Mappers
export { ParameterMapper } from './mappers/ParameterMapper.js';
export { InstrumentMapper } from './mappers/InstrumentMapper.js';
export { TempoMapper } from './mappers/TempoMapper.js';
export { EffectsMapper } from './mappers/EffectsMapper.js';

// Generators
export { PatternGenerator } from './generators/PatternGenerator.js';
export { ChordGenerator } from './generators/ChordGenerator.js';
export { MelodyGenerator } from './generators/MelodyGenerator.js';

// Types
export type {
  // Musical types
  Scale,
  MusicalKey,
  TimeNotation,
  Note,
  EffectType,
  EffectConfig,
  MusicalParameters,
  InstrumentOptions,
  Chord,
  ChordProgression,
  Melody,
  Rhythm,
  Pattern,
  EmotionMapping,
  TempoMapping,
  LanguageMapping,
} from './types/musical.js';

// Constants
export {
  EMOTION_MAPPINGS,
  SCALES,
  TEMPO_MAPPINGS,
  LANGUAGE_MAPPINGS,
  CHORD_INTERVALS,
  NOTE_TO_MIDI,
  TIME_DIVISIONS,
  DEFAULT_EFFECT_PARAMS,
  LINES_TO_DURATION,
  INTENSITY_SCALING,
} from './constants/mappings.js';
