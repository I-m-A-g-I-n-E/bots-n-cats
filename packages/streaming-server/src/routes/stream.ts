/**
 * Stream routes
 * SSE endpoint for client connections
 * BOC-13: Real-time streaming system
 */

import { Router, Request, Response } from 'express';
import { StreamingService } from '../services/StreamingService';
import { SSEManager } from '../services/SSEManager';
import { v4 as uuidv4 } from 'uuid';

export function createStreamRouter(
  streamingService: StreamingService,
  sseManager: SSEManager
): Router {
  const router = Router();

  /**
   * GET /stream/:repoId
   * Establish SSE connection for a specific repository
   */
  router.get('/:repoId', (req: Request, res: Response) => {
    const { repoId } = req.params;
    const clientId = req.query.clientId as string || uuidv4();

    console.log(`[StreamRouter] New connection request for repo ${repoId}, client ${clientId}`);

    try {
      // Create session in StreamingService
      streamingService.createClientSession(clientId, repoId);

      // Connect SSE
      sseManager.connect(clientId, repoId, res);

      console.log(`[StreamRouter] Client ${clientId} connected to repo ${repoId}`);
    } catch (error) {
      console.error(`[StreamRouter] Error connecting client ${clientId}:`, error);
      res.status(500).json({ error: 'Failed to establish connection' });
    }
  });

  /**
   * POST /stream/:repoId/test
   * Trigger test audio generation (for development/testing)
   */
  router.post('/:repoId/test', async (req: Request, res: Response) => {
    const { repoId } = req.params;
    const params = req.body;

    console.log(`[StreamRouter] Test audio generation requested for repo ${repoId}`);

    try {
      await streamingService.generateTestAudio(repoId, params);
      res.json({
        success: true,
        message: `Test audio generated for repo ${repoId}`,
      });
    } catch (error) {
      console.error(`[StreamRouter] Error generating test audio:`, error);
      res.status(500).json({ error: 'Failed to generate test audio' });
    }
  });

  return router;
}
