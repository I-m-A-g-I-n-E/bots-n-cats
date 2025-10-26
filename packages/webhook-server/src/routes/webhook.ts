/**
 * Webhook route handlers
 * BOC-1, BOC-2: POST /webhook endpoint
 */

import { Router, type Request, type Response } from 'express';
import type { WebhookService } from '../services/WebhookService.js';
import type { WebhookPayload, GitHubWebhookHeaders } from '../types/github.js';
import { Logger } from '../utils/logger.js';

/**
 * Extended Request type with rawBody for signature validation
 */
interface WebhookRequest extends Request {
  rawBody?: string;
}

/**
 * Create webhook router
 */
export function createWebhookRouter(webhookService: WebhookService): Router {
  const router = Router();

  /**
   * POST /webhook
   * Main webhook endpoint for GitHub events
   */
  router.post('/', async (req: WebhookRequest, res: Response) => {
    try {
      // Extract GitHub headers
      const eventType = req.headers['x-github-event'] as string;
      const signature = req.headers['x-hub-signature-256'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;

      // Validate required headers
      if (!eventType) {
        Logger.warn('Missing x-github-event header');
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Missing x-github-event header',
        });
      }

      // TEMPORARY: Allow webhooks without signature for testing
      // TODO: Remove this after fixing GitHub App webhook secret
      const skipValidation = process.env.SKIP_SIGNATURE_VALIDATION === 'true';

      if (!signature && !skipValidation) {
        Logger.warn('Missing x-hub-signature-256 header');
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing signature header',
        });
      }

      // Get raw body for signature validation
      const rawPayload = req.rawBody || JSON.stringify(req.body);
      const payload = req.body as WebhookPayload;

      // DEBUG: Log repository structure to diagnose 'unknown' issue
      console.log('[DEBUG] Webhook repository object:', JSON.stringify({
        repository: payload.repository,
        repositoryFullName: payload.repository?.full_name,
        repositoryName: payload.repository?.name,
        repositoryOwner: payload.repository?.owner,
      }, null, 2));

      // Log incoming webhook
      Logger.webhook(eventType, payload.action || 'unknown', {
        deliveryId,
        repository: payload.repository?.full_name,
        sender: payload.sender?.login,
      });

      // Process webhook (validation, parsing, publishing)
      await webhookService.handleWebhook(
        eventType,
        signature,
        rawPayload,
        payload
      );

      // Return 200 OK immediately after publishing to EventBus
      // Music generation will happen asynchronously via event subscribers
      res.status(200).json({
        status: 'success',
        message: 'Webhook received and processed',
        deliveryId,
      });

    } catch (error) {
      // Handle different error types
      if (error instanceof Error) {
        // Signature validation errors return 401
        if (error.message.includes('signature') || error.message.includes('Invalid')) {
          Logger.warn('Webhook signature validation failed', { error: error.message });
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid webhook signature',
          });
        }

        // Unsupported event types return 400
        if (error.message.includes('Unsupported event type')) {
          Logger.info('Unsupported event type', { error: error.message });
          return res.status(400).json({
            error: 'Bad Request',
            message: error.message,
          });
        }

        // Other errors return 500
        Logger.error('Webhook processing error', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'production'
            ? 'Failed to process webhook'
            : error.message,
        });
      }

      // Unknown error type
      Logger.error('Unknown webhook error', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  });

  /**
   * GET /webhook
   * Simple endpoint to verify webhook URL is accessible
   */
  router.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Webhook endpoint is ready',
      supportedEvents: [
        'push',
        'pull_request',
        'pull_request_review',
        'check_run',
        'deployment_status',
        'issues',
        'issue_comment',
        'workflow_run',
      ],
    });
  });

  return router;
}
