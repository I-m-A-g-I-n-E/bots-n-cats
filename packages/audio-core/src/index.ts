/**
 * @bots-n-cats/audio-core
 * Core audio infrastructure for the bots-n-cats SaaS platform
 *
 * BOC-20: Core Audio Infrastructure
 * Provides singleton AudioContext, event bus, resource management, and factories
 */

// Core
export { ToneAudioCore } from './core/ToneAudioCore.js';

// Events
export { AudioEventBus } from './events/AudioEventBus.js';

// Resources
export { ResourceManager } from './resources/ResourceManager.js';

// Factories
export { InstrumentFactory } from './factories/InstrumentFactory.js';

// Types
export * from './types/index.js';
