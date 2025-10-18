#!/usr/bin/env node
/**
 * Simple server starter for streaming-server
 */

import { createStreamingServer } from './dist/server.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
