/**
 * Express server initialization
 * BOC-1: Webhook server setup
 */

import express, { type Express } from 'express';
import bodyParser from 'body-parser';
import { AudioEventBus } from '@bots-n-cats/audio-core';
import { WebhookService } from './services/WebhookService.js';
import { createWebhookRouter } from './routes/webhook.js';
import { Logger } from './utils/logger.js';

export interface ServerConfig {
  port: number;
  webhookSecret: string;
  environment: string;
}

export interface ServerInstance {
  app: Express;
  eventBus: AudioEventBus;
  webhookService: WebhookService;
  port: number;
}

/**
 * Create and configure Express server
 */
export function createServer(config: ServerConfig): ServerInstance {
  const app = express();

  // Initialize AudioEventBus for event-driven architecture
  const eventBus = new AudioEventBus();

  // Initialize WebhookService
  const webhookService = new WebhookService(eventBus, config.webhookSecret);

  // Middleware: Parse JSON with raw body for signature validation
  // We need the raw body for HMAC verification
  app.use(
    bodyParser.json({
      verify: (req: any, res, buf) => {
        // Store raw body for signature validation
        req.rawBody = buf.toString('utf8');
      },
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    const status = webhookService.getStatus();
    res.status(status.healthy ? 200 : 503).json({
      status: status.healthy ? 'healthy' : 'unhealthy',
      secretConfigured: status.secretConfigured,
      environment: config.environment,
      timestamp: new Date().toISOString(),
    });
  });

  // Webhook routes
  app.use('/webhook', createWebhookRouter(webhookService));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
    });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    Logger.error('Unhandled error', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
    });
  });

  return {
    app,
    eventBus,
    webhookService,
    port: config.port,
  };
}

/**
 * Start the server
 */
export function startServer(serverInstance: ServerInstance): Promise<void> {
  return new Promise((resolve) => {
    serverInstance.app.listen(serverInstance.port, () => {
      Logger.serverStarted(serverInstance.port);
      resolve();
    });
  });
}

/**
 * Setup graceful shutdown
 */
export function setupGracefulShutdown(server: any, eventBus: AudioEventBus): void {
  const shutdown = async () => {
    Logger.info('Shutting down gracefully...');

    // Close server
    server.close(() => {
      Logger.serverStopped();
    });

    // Clear event bus subscriptions
    eventBus.clear();

    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
