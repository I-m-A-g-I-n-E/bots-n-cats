/**
 * Webhook service orchestrator
 * BOC-1, BOC-2: Main webhook processing service
 */

import type { AudioEventBus } from '@bots-n-cats/audio-core';
import type { WebhookPayload } from '../types/github.js';
import { SignatureValidator } from './SignatureValidator.js';
import { EventParser } from './EventParser.js';

/**
 * Main webhook service that orchestrates validation, parsing, and event publishing
 */
export class WebhookService {
  private readonly webhookSecret: string;

  constructor(
    private readonly eventBus: AudioEventBus,
    webhookSecret: string
  ) {
    // Validate secret on initialization
    SignatureValidator.validateSecret(webhookSecret);
    this.webhookSecret = webhookSecret;
  }

  /**
   * Handle incoming webhook request
   *
   * @param eventType - The x-github-event header value
   * @param signature - The x-hub-signature-256 header value
   * @param rawPayload - The raw request body (for signature validation)
   * @param payload - The parsed JSON payload
   * @throws Error if validation fails
   */
  async handleWebhook(
    eventType: string,
    signature: string | undefined,
    rawPayload: string | Buffer,
    payload: WebhookPayload
  ): Promise<void> {
    // Step 1: Validate signature
    SignatureValidator.validate(rawPayload, signature, this.webhookSecret);

    // Step 2: Parse GitHub event to NormalizedEvent
    const normalizedEvent = EventParser.parse(eventType, payload);

    // Step 3: Publish to AudioEventBus (DECOUPLE!)
    // This allows music-generation service to subscribe and process independently
    const eventName = `webhook:github:${normalizedEvent.eventType}`;
    await this.eventBus.publish(eventName, normalizedEvent);

    // Also publish a general webhook event for monitoring/logging
    await this.eventBus.publish('webhook:github:*', normalizedEvent);
  }

  /**
   * Health check method
   */
  getStatus(): { healthy: boolean; secretConfigured: boolean } {
    return {
      healthy: true,
      secretConfigured: !!this.webhookSecret && this.webhookSecret.length >= 16,
    };
  }
}
