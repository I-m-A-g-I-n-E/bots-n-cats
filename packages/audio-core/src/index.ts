/**
 * @bots-n-cats/audio-core
 * Core audio infrastructure for the bots-n-cats SaaS platform
 *
 * BOC-20: Core Audio Infrastructure
 * Provides singleton AudioContext, event bus, resource management, and factories
 * Plus complete service layer, object pooling, and client session management
 */

// Core
export { ToneAudioCore } from './core/ToneAudioCore.js';

// Events
export { AudioEventBus } from './events/AudioEventBus.js';

// Resources
export { ResourceManager } from './resources/ResourceManager.js';

// Factories
export { InstrumentFactory } from './factories/InstrumentFactory.js';

// Services
export { AudioService } from './services/AudioService.js';
export { TransportService } from './services/TransportService.js';
export { SequencingService } from './services/SequencingService.js';
export { EffectsService } from './services/EffectsService.js';

// Pooling
export { SynthPool } from './pooling/SynthPool.js';

// Session Management
export { ClientSessionManager } from './session/ClientSessionManager.js';
export { MultiClientAudioManager } from './session/MultiClientAudioManager.js';

// Types
export * from './types/index.js';
