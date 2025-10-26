/**
 * Integrated Server - BOC-5: End-to-end Integration
 *
 * Runs all services in a single process:
 * - Webhook Server (port 3000)
 * - Streaming Server (port 3001)
 * - Dashboard (port 3000/dashboard)
 *
 * All services share the same AudioEventBus for event coordination.
 */

import dotenv from 'dotenv';
import express, { Express, RequestHandler } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import {
  AudioEventBus,
  ClientSessionManager,
  MultiClientAudioManager,
  type NormalizedEvent,
} from './packages/audio-core/src/index.js';
import { MusicMapper } from './packages/music-engine/src/index.js';
import { WebhookService } from './packages/webhook-server/src/services/WebhookService.js';
import { createWebhookRouter } from './packages/webhook-server/src/routes/webhook.js';
import { StreamingService } from './packages/streaming-server/src/services/StreamingService.js';
import { OfflineRenderer } from './packages/streaming-server/src/services/OfflineRenderer.js';
import { SSEManager } from './packages/streaming-server/src/services/SSEManager.js';
import { createStreamRouter } from './packages/streaming-server/src/routes/stream.js';
import { createHealthRouter } from './packages/streaming-server/src/routes/health.js';
import { Logger } from './packages/webhook-server/src/utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Event log for dashboard
 */
interface EventLogEntry {
  timestamp: string;
  eventType: string;
  action?: string;
  emotion: string;
  intensity: number;
  repository?: string;
  description: string;
}

const eventLog: EventLogEntry[] = [];
const MAX_LOG_ENTRIES = 50;

/**
 * Musical state for dashboard
 */
interface MusicalState {
  bpm: number;
  key: string;
  scale: string;
  emotion: string;
  intensity: number;
  lastUpdate: string;
  eventCount: number;
}

const musicalState: MusicalState = {
  bpm: 120,
  key: 'C',
  scale: 'major',
  emotion: 'resolution',
  intensity: 0.5,
  lastUpdate: new Date().toISOString(),
  eventCount: 0,
};

/**
 * Main integration function
 */
async function main() {
  try {
    Logger.info('🐱 Starting bots-n-cats integrated server...');

    // Validate environment
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';
    if (!webhookSecret || webhookSecret.length < 16) {
      Logger.error('GITHUB_WEBHOOK_SECRET environment variable must be at least 16 characters');
      process.exit(1);
    }

    // Railway provides PORT variable - use it for webhook server if available
    // All services (webhook, streaming, dashboard) now run on one port for Railway compatibility
    const webhookPort = parseInt(process.env.PORT || process.env.WEBHOOK_PORT || '3000', 10);

    // ============================================================
    // SHARED EVENT BUS (Critical for integration!)
    // ============================================================
    const eventBus = new AudioEventBus();
    Logger.info('✅ Shared AudioEventBus created');

    // ============================================================
    // WEBHOOK SERVER (Port 3000)
    // ============================================================
    const webhookApp = express();

    // Middleware for webhook server
    webhookApp.use(
      bodyParser.json({
        verify: (req: express.Request, res, buf) => {
          (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
        },
      })
    );

    // Initialize webhook service
    const webhookService = new WebhookService(eventBus, webhookSecret);
    Logger.info('✅ WebhookService initialized');

    // Initialize music mapper with debug mode
    const musicMapper = new MusicMapper(eventBus, undefined, { debug: true });
    Logger.info('✅ MusicMapper initialized');

    // Subscribe to webhook events for logging
    subscribeToWebhookEvents(eventBus);

    // Health check
    webhookApp.get('/health', (req, res) => {
      const status = webhookService.getStatus();
      res.status(status.healthy ? 200 : 503).json({
        status: status.healthy ? 'healthy' : 'unhealthy',
        secretConfigured: status.secretConfigured,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        musicMapper: musicMapper.getStats(),
      });
    });

    // Webhook routes
    webhookApp.use('/webhook', createWebhookRouter(webhookService));

    // Dashboard route (BOC-7)
    webhookApp.get('/dashboard', (req, res) => {
      res.send(generateDashboardHTML());
    });

    // Dashboard API endpoints
    webhookApp.get('/api/events', (req, res) => {
      res.json(eventLog);
    });

    webhookApp.get('/api/state', (req, res) => {
      res.json(musicalState);
    });

    // ============================================================
    // STREAMING SERVICES & ROUTES (Merged into webhook server)
    // ============================================================

    // Initialize streaming services (using same eventBus!)
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
    Logger.info('✅ StreamingService initialized');

    // Add streaming routes to webhook server
    webhookApp.use('/stream', createStreamRouter(streamingService, sseManager));
    webhookApp.use('/health', createHealthRouter(streamingService, sseManager));

    // Serve streaming client static files
    webhookApp.use(express.static('packages/streaming-server/client'));

    // Start unified server on single port (Railway-compatible)
    const webhookServer = webhookApp.listen(webhookPort, () => {
      Logger.info(`🎸 Webhook server listening on port ${webhookPort}`);
      Logger.info(`📊 Dashboard available at http://localhost:${webhookPort}/dashboard`);
      Logger.info(`🎵 Streaming available at http://localhost:${webhookPort}/stream/:repoId`);
    });

    // ============================================================
    // GRACEFUL SHUTDOWN
    // ============================================================
    const shutdown = async () => {
      Logger.info('Shutting down gracefully...');

      webhookServer.close();
      eventBus.clear();
      musicMapper.dispose();
      streamingService.dispose();

      Logger.info('✅ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    Logger.info('');
    Logger.info('╔═══════════════════════════════════════════════════════════╗');
    Logger.info('║                                                           ║');
    Logger.info('║   🐱 bots-n-cats INTEGRATED SERVER READY                  ║');
    Logger.info('║                                                           ║');
    Logger.info(`║   Webhook: http://localhost:${webhookPort}/webhook                ║`);
    Logger.info(`║   Dashboard: http://localhost:${webhookPort}/dashboard            ║`);
    Logger.info(`║   Streaming: http://localhost:${webhookPort}/stream/:repoId       ║`);
    Logger.info('║                                                           ║');
    Logger.info('╚═══════════════════════════════════════════════════════════╝');
    Logger.info('');

  } catch (error) {
    Logger.error('Failed to start integrated server', error);
    process.exit(1);
  }
}

/**
 * Subscribe to webhook events for dashboard logging
 */
function subscribeToWebhookEvents(eventBus: AudioEventBus) {
  const eventTypes = [
    'push',
    'pull_request',
    'pull_request_review',
    'check_run',
    'deployment_status',
    'issues',
    'issue_comment',
    'workflow_run',
  ];

  for (const eventType of eventTypes) {
    eventBus.subscribe(`webhook:github:${eventType}`, (event: NormalizedEvent) => {
      logEvent(event);
      updateMusicalState(event);
    });
  }

  Logger.info('✅ Dashboard subscribed to webhook events');
}

/**
 * Log event for dashboard
 */
function logEvent(event: NormalizedEvent) {
  const entry: EventLogEntry = {
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    action: event.action,
    emotion: event.emotion,
    intensity: event.intensity,
    repository: event.metadata?.repository || 'unknown',
    description: getEventDescription(event),
  };

  eventLog.unshift(entry);

  // Keep only last MAX_LOG_ENTRIES
  if (eventLog.length > MAX_LOG_ENTRIES) {
    eventLog.pop();
  }

  Logger.info(`📝 [${event.eventType}] ${entry.description}`);
}

/**
 * Update musical state from event
 */
function updateMusicalState(event: NormalizedEvent) {
  musicalState.emotion = event.emotion;
  musicalState.intensity = event.intensity;
  musicalState.lastUpdate = new Date().toISOString();
  musicalState.eventCount++;

  // Update BPM based on emotion (simplified)
  const emotionToBPM: Record<string, number> = {
    tension: 110,
    resolution: 120,
    activity: 135,
    growth: 125,
  };
  musicalState.bpm = emotionToBPM[event.emotion] || 120;

  // Update key based on emotion
  const emotionToKey: Record<string, { key: string; scale: string }> = {
    tension: { key: 'A', scale: 'minor' },
    resolution: { key: 'C', scale: 'major' },
    activity: { key: 'G', scale: 'pentatonic' },
    growth: { key: 'D', scale: 'dorian' },
  };
  const musical = emotionToKey[event.emotion] || { key: 'C', scale: 'major' };
  musicalState.key = musical.key;
  musicalState.scale = musical.scale;
}

/**
 * Get human-readable event description
 */
function getEventDescription(event: NormalizedEvent): string {
  const action = event.action || 'occurred';
  const meta = event.metadata || {};

  switch (event.eventType) {
    case 'push':
      return `Pushed ${meta.commits || 1} commit(s) to ${meta.branch || 'main'}`;
    case 'pull_request':
      return `PR ${action}: ${meta.title || 'untitled'}`;
    case 'pull_request_review':
      return `PR review ${action}`;
    case 'check_run':
      return `Check run ${action}: ${meta.conclusion || 'unknown'}`;
    case 'deployment_status':
      return `Deployment ${meta.state || action}`;
    case 'issues':
      return `Issue ${action}`;
    case 'issue_comment':
      return `Issue comment ${action}`;
    case 'workflow_run':
      return `Workflow ${action}: ${meta.conclusion || 'running'}`;
    default:
      return `${event.eventType} ${action}`;
  }
}

/**
 * Generate dashboard HTML (BOC-7)
 */
function generateDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>bots-n-cats Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      background: #0d1117;
      color: #c9d1d9;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #58a6ff;
      border-bottom: 2px solid #30363d;
      padding-bottom: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .panel {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 20px;
    }
    .panel h2 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #58a6ff;
    }
    .state-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #21262d;
    }
    .state-item:last-child { border-bottom: none; }
    .state-label { color: #8b949e; }
    .state-value { color: #58a6ff; font-weight: bold; }
    .events-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .event-item {
      padding: 12px;
      margin-bottom: 8px;
      background: #0d1117;
      border-left: 3px solid #58a6ff;
      border-radius: 3px;
    }
    .event-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .event-type {
      color: #58a6ff;
      font-weight: bold;
    }
    .event-time {
      color: #8b949e;
      font-size: 12px;
    }
    .event-description {
      color: #c9d1d9;
      font-size: 14px;
    }
    .emotion-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
      margin-left: 8px;
    }
    .emotion-tension { background: #da3633; color: white; }
    .emotion-resolution { background: #238636; color: white; }
    .emotion-activity { background: #1f6feb; color: white; }
    .emotion-growth { background: #8957e5; color: white; }
    .loading {
      text-align: center;
      padding: 40px;
      color: #8b949e;
    }
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🐱 bots-n-cats Live Dashboard</h1>

    <div class="grid">
      <!-- Current Musical State -->
      <div class="panel">
        <h2>🎵 Current Musical State</h2>
        <div id="musical-state" class="loading">Loading...</div>
      </div>

      <!-- System Stats -->
      <div class="panel">
        <h2>📊 System Stats</h2>
        <div id="system-stats" class="loading">Loading...</div>
      </div>
    </div>

    <!-- Recent Events -->
    <div class="panel">
      <h2>📝 Recent GitHub Events</h2>
      <div id="events-list" class="events-list loading">Loading...</div>
    </div>
  </div>

  <script>
    let updateInterval;

    // Fetch musical state
    async function updateMusicalState() {
      try {
        const response = await fetch('/api/state');
        const state = await response.json();

        const stateHTML = \`
          <div class="state-item">
            <span class="state-label">BPM</span>
            <span class="state-value">\${state.bpm}</span>
          </div>
          <div class="state-item">
            <span class="state-label">Key</span>
            <span class="state-value">\${state.key} \${state.scale}</span>
          </div>
          <div class="state-item">
            <span class="state-label">Emotion</span>
            <span class="state-value">\${state.emotion}</span>
          </div>
          <div class="state-item">
            <span class="state-label">Intensity</span>
            <span class="state-value">\${(state.intensity * 100).toFixed(0)}%</span>
          </div>
          <div class="state-item">
            <span class="state-label">Last Update</span>
            <span class="state-value">\${new Date(state.lastUpdate).toLocaleTimeString()}</span>
          </div>
        \`;

        document.getElementById('musical-state').innerHTML = stateHTML;

        // Update stats
        const statsHTML = \`
          <div class="state-item">
            <span class="state-label">Total Events</span>
            <span class="state-value">\${state.eventCount}</span>
          </div>
          <div class="state-item">
            <span class="state-label">Uptime</span>
            <span class="state-value">Active</span>
          </div>
        \`;

        document.getElementById('system-stats').innerHTML = statsHTML;
      } catch (error) {
        console.error('Error fetching state:', error);
      }
    }

    // Fetch events
    async function updateEvents() {
      try {
        const response = await fetch('/api/events');
        const events = await response.json();

        if (events.length === 0) {
          document.getElementById('events-list').innerHTML =
            '<div class="loading">No events yet. Trigger a GitHub webhook!</div>';
          return;
        }

        const eventsHTML = events.map(event => \`
          <div class="event-item">
            <div class="event-header">
              <span class="event-type">\${event.eventType}</span>
              <span class="event-time">\${new Date(event.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="event-description">
              \${event.description}
              <span class="emotion-badge emotion-\${event.emotion}">\${event.emotion}</span>
            </div>
          </div>
        \`).join('');

        document.getElementById('events-list').innerHTML = eventsHTML;
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    }

    // Initial load
    updateMusicalState();
    updateEvents();

    // Poll every 2 seconds
    updateInterval = setInterval(() => {
      updateMusicalState();
      updateEvents();
    }, 2000);
  </script>
</body>
</html>`;
}

// Start the server
main();
