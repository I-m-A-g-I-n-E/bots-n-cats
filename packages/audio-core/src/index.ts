/**
 * @bots-n-cats/audio-core
 * Core audio infrastructure for the bots-n-cats SaaS platform
 *
 * BOC-20: Core Audio Infrastructure
 * Provides singleton AudioContext, event bus, resource management, and factories
 */

// Core
export { ToneAudioCore } from './core/ToneAudioCore';

// Events
export { AudioEventBus } from './events/AudioEventBus';

// Resources
export { ResourceManager } from './resources/ResourceManager';

// Factories
export { InstrumentFactory } from './factories/InstrumentFactory';

// Types
export * from './types';
