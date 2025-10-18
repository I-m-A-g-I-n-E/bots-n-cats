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
export { MusicMapper, type MusicMapperConfig } from './MusicMapper';

// Mappers
export { ParameterMapper } from './mappers/ParameterMapper';
export { InstrumentMapper } from './mappers/InstrumentMapper';
export { TempoMapper } from './mappers/TempoMapper';
export { EffectsMapper } from './mappers/EffectsMapper';

// Generators
export { PatternGenerator } from './generators/PatternGenerator';
export { ChordGenerator } from './generators/ChordGenerator';
export { MelodyGenerator } from './generators/MelodyGenerator';

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
} from './types/musical';

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
} from './constants/mappings';
