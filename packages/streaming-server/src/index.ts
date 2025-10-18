/**
 * @bots-n-cats/streaming-server
 * Real-time audio streaming via Server-Sent Events
 * BOC-13: Real-time streaming system
 */

// Main server
export { createStreamingServer } from './server.js';

// Services
export { StreamingService } from './services/StreamingService.js';
export { OfflineRenderer } from './services/OfflineRenderer.js';
export { SSEManager } from './services/SSEManager.js';

// Utilities
export { BufferSerializer } from './utils/buffer-serializer.js';

// Types
export * from './types/index.js';
