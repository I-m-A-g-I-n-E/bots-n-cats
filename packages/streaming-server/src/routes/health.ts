/**
 * Health check routes
 * BOC-13: Real-time streaming system
 */

import { Router, Request, Response } from 'express';
import { StreamingService } from '../services/StreamingService';
import { SSEManager } from '../services/SSEManager';

export function createHealthRouter(
  streamingService: StreamingService,
  sseManager: SSEManager
): Router {
  const router = Router();

  /**
   * GET /health
   * Return health metrics for the streaming service
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      const health = streamingService.getHealthMetrics();
      const clients = sseManager.getAllClients();

      res.json({
        ...health,
        timestamp: Date.now(),
        clients: clients.map(client => ({
          clientId: client.clientId,
          repoId: client.repoId,
          connectedAt: client.connectedAt,
          lastActivity: client.lastActivity,
          connectionDuration: Date.now() - client.connectedAt,
        })),
      });
    } catch (error) {
      console.error('[HealthRouter] Error getting health metrics:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to retrieve health metrics',
      });
    }
  });

  /**
   * GET /health/repo/:repoId
   * Get health metrics for a specific repository
   */
  router.get('/repo/:repoId', (req: Request, res: Response) => {
    const { repoId } = req.params;

    try {
      const clients = sseManager.getClientsByRepo(repoId);

      res.json({
        repoId,
        activeClients: clients.length,
        clients: clients.map(client => ({
          clientId: client.clientId,
          connectedAt: client.connectedAt,
          lastActivity: client.lastActivity,
          connectionDuration: Date.now() - client.connectedAt,
        })),
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`[HealthRouter] Error getting health for repo ${repoId}:`, error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to retrieve repo health',
      });
    }
  });

  return router;
}
