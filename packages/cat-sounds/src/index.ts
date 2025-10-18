/**
 * @bots-n-cats/cat-sounds
 * Cat Sound Library and Musical Integration Engine
 *
 * BOC-11: Source and prepare cat sound library (30+ sounds)
 * BOC-12: Implement musical cat sound integration engine
 *
 * CORE PRINCIPLE: Cat sounds are INSTRUMENTS, not notifications!
 */

// Main Manager
export { CatInstrumentManager } from './CatInstrumentManager.js';

// Repository
export { SampleRepository } from './repository/SampleRepository.js';

// Samplers
export { PurrSampler } from './samplers/PurrSampler.js';
export { MeowSampler } from './samplers/MeowSampler.js';
export { ChirpSampler } from './samplers/ChirpSampler.js';

// Mapping
export { EventToCatSound } from './mapping/EventToCatSound.js';

// Constants
export {
  CAT_SOUND_CATALOG,
  SOUNDS_BY_CATEGORY,
  MELODIC_SAMPLES_BY_PITCH,
  PURR_SAMPLES_BY_PITCH,
  TOTAL_SOUND_COUNT,
} from './constants/sounds.js';

// Types
export type {
  CatSound,
  CatSoundCategory,
  CatSoundInstruction,
  CatSamplerConfig,
  SynthesisParams,
  TimingStrategy,
} from './types/cat-sounds.js';
