/**
 * Main entry point for webhook server
 * BOC-1, BOC-9: Webhook server initialization
 */

import dotenv from 'dotenv';
import { createServer, startServer, setupGracefulShutdown, type ServerConfig } from './server.js';
import { Logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Get server configuration from environment
 */
function getConfig(): ServerConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';
  const environment = process.env.NODE_ENV || 'development';

  // Validate required environment variables
  if (!webhookSecret) {
    Logger.error('GITHUB_WEBHOOK_SECRET environment variable is required');
    process.exit(1);
  }

  if (webhookSecret.length < 16) {
    Logger.error('GITHUB_WEBHOOK_SECRET must be at least 16 characters');
    process.exit(1);
  }

  return {
    port,
    webhookSecret,
    environment,
  };
}

/**
 * Main function
 */
async function main() {
  try {
    Logger.info('Starting webhook server...');

    // Get configuration
    const config = getConfig();

    // Create server instance
    const serverInstance = createServer(config);

    // Start server
    const server = await startServer(serverInstance);

    // Setup graceful shutdown
    setupGracefulShutdown(server, serverInstance.eventBus);

    Logger.info('Webhook server is ready to receive GitHub events', {
      port: config.port,
      environment: config.environment,
    });

  } catch (error) {
    Logger.error('Failed to start webhook server', error);
    process.exit(1);
  }
}

// Run the server
main();
