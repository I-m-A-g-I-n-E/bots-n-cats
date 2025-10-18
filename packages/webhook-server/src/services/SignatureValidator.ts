/**
 * Signature validation for GitHub webhooks
 * BOC-1: Webhook server signature validation (HMAC SHA-256)
 */

import crypto from 'crypto';

/**
 * Validates GitHub webhook signatures using HMAC SHA-256
 */
export class SignatureValidator {
  /**
   * Validate GitHub webhook signature
   *
   * @param payload - The raw request body
   * @param signature - The x-hub-signature-256 header value
   * @param secret - The webhook secret
   * @throws Error if signature is invalid or missing
   */
  static validate(payload: string | Buffer, signature: string | undefined, secret: string): void {
    if (!signature) {
      throw new Error('Missing signature header (x-hub-signature-256)');
    }

    if (!secret) {
      throw new Error('Missing webhook secret configuration');
    }

    // GitHub sends signature as "sha256=<hash>"
    if (!signature.startsWith('sha256=')) {
      throw new Error('Invalid signature format (expected sha256=<hash>)');
    }

    // Create HMAC using the secret
    const hmac = crypto.createHmac('sha256', secret);

    // Compute digest from payload
    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
    const digest = 'sha256=' + hmac.update(payloadString).digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      const signatureBuffer = Buffer.from(signature);
      const digestBuffer = Buffer.from(digest);

      if (signatureBuffer.length !== digestBuffer.length) {
        throw new Error('Invalid signature');
      }

      if (!crypto.timingSafeEqual(signatureBuffer, digestBuffer)) {
        throw new Error('Invalid signature');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid signature') {
        throw error;
      }
      throw new Error('Invalid signature');
    }
  }

  /**
   * Validate that the webhook secret is properly configured
   *
   * @param secret - The webhook secret to validate
   * @throws Error if secret is invalid
   */
  static validateSecret(secret: string | undefined): asserts secret is string {
    if (!secret) {
      throw new Error('GITHUB_WEBHOOK_SECRET environment variable is not set');
    }

    if (secret.length < 16) {
      throw new Error('Webhook secret must be at least 16 characters');
    }
  }
}
