/**
 * @bots-n-cats/streaming-server
 * Real-time audio streaming via Server-Sent Events
 * BOC-13: Real-time streaming system
 */

// Main server
export { createStreamingServer } from './server';

// Services
export { StreamingService } from './services/StreamingService';
export { OfflineRenderer } from './services/OfflineRenderer';
export { SSEManager } from './services/SSEManager';

// Utilities
export { BufferSerializer } from './utils/buffer-serializer';

// Types
export * from './types';

// CLI Entry Point
if (require.main === module) {
  const { createStreamingServer } = require('./server');

  const server = createStreamingServer({
    port: parseInt(process.env.PORT || '3001'),
    corsOrigin: process.env.CORS_ORIGIN || '*',
  });

  server.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Server] Received SIGINT, shutting down gracefully...');
    server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n[Server] Received SIGTERM, shutting down gracefully...');
    server.stop();
    process.exit(0);
  });
}
