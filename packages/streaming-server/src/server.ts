/**
 * Express Server with SSE
 * Main server configuration for streaming system
 * BOC-13: Real-time streaming system
 */

import express, { Express } from 'express';
import cors from 'cors';
import { AudioEventBus, ClientSessionManager, MultiClientAudioManager } from '@bots-n-cats/audio-core';
import { StreamingService } from './services/StreamingService.js';
import { OfflineRenderer } from './services/OfflineRenderer.js';
import { SSEManager } from './services/SSEManager.js';
import { createStreamRouter } from './routes/stream.js';
import { createHealthRouter } from './routes/health.js';

export interface ServerConfig {
  port?: number;
  corsOrigin?: string | string[];
}

export function createStreamingServer(config: ServerConfig = {}) {
  const app: Express = express();
  const port = config.port || 3001;

  // Middleware
  app.use(cors({
    origin: config.corsOrigin || '*',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.static('client')); // Serve static client files

  // Initialize services
  const eventBus = new AudioEventBus();
  const sessionManager = new ClientSessionManager(eventBus);
  const multiClientManager = new MultiClientAudioManager(sessionManager, eventBus);
  const offlineRenderer = new OfflineRenderer();
  const sseManager = new SSEManager();

  const streamingService = new StreamingService(
    eventBus,
    multiClientManager,
    offlineRenderer,
    sseManager
  );

  // Routes
  app.use('/stream', createStreamRouter(streamingService, sseManager));
  app.use('/health', createHealthRouter(streamingService, sseManager));

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'bots-n-cats Streaming Server',
      version: '1.0.0',
      description: 'Real-time audio streaming via SSE',
      endpoints: {
        stream: '/stream/:repoId - Connect to SSE stream for a repository',
        testAudio: 'POST /stream/:repoId/test - Generate test audio',
        health: '/health - Get server health metrics',
        repoHealth: '/health/repo/:repoId - Get repo-specific metrics',
      },
    });
  });

  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server] Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  return {
    app,
    port,
    streamingService,
    eventBus,
    sseManager,
    multiClientManager,

    /**
     * Start the server
     */
    start: () => {
      return app.listen(port, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🐱 bots-n-cats Streaming Server                         ║
║                                                           ║
║   Port: ${port}                                          ║
║   SSE Stream: http://localhost:${port}/stream/:repoId     ║
║   Health: http://localhost:${port}/health                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        `);
      });
    },

    /**
     * Stop the server
     */
    stop: () => {
      console.log('[Server] Shutting down...');
      streamingService.dispose();
    },
  };
}
