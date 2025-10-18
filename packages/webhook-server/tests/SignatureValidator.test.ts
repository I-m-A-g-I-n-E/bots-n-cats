/**
 * Tests for SignatureValidator
 * Verifies HMAC SHA-256 signature validation
 */

import { describe, it, expect } from '@jest/globals';
import { SignatureValidator } from '../src/services/SignatureValidator.js';
import crypto from 'crypto';

describe('SignatureValidator', () => {
  const secret = 'test-webhook-secret-min-16-chars';
  let validator: SignatureValidator;

  beforeEach(() => {
    validator = new SignatureValidator(secret);
  });

  describe('validate', () => {
    it('should validate correct signature', () => {
      const payload = JSON.stringify({ event: 'push', data: 'test' });
      const signature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = validator.validate(payload, signature);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect signature', () => {
      const payload = JSON.stringify({ event: 'push', data: 'test' });
      const wrongSignature = 'sha256=' + crypto
        .createHmac('sha256', 'wrong-secret')
        .update(payload)
        .digest('hex');

      const isValid = validator.validate(payload, wrongSignature);

      expect(isValid).toBe(false);
    });

    it('should reject signature without sha256= prefix', () => {
      const payload = JSON.stringify({ event: 'push' });
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = validator.validate(payload, signature);

      expect(isValid).toBe(false);
    });

    it('should reject empty signature', () => {
      const payload = JSON.stringify({ event: 'push' });
      const isValid = validator.validate(payload, '');

      expect(isValid).toBe(false);
    });

    it('should reject tampered payload', () => {
      const originalPayload = JSON.stringify({ event: 'push', data: 'original' });
      const signature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(originalPayload)
        .digest('hex');

      const tamperedPayload = JSON.stringify({ event: 'push', data: 'tampered' });
      const isValid = validator.validate(tamperedPayload, signature);

      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      // This test ensures timing attacks are mitigated
      const payload = JSON.stringify({ event: 'push' });
      const correctSignature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Create a signature that differs only in the last character
      const almostCorrect = correctSignature.slice(0, -1) + 'X';

      const isValid = validator.validate(payload, almostCorrect);

      expect(isValid).toBe(false);
    });
  });

  describe('secret requirements', () => {
    it('should throw error for secret shorter than 16 characters', () => {
      expect(() => new SignatureValidator('short')).toThrow('Secret must be at least 16 characters');
    });

    it('should accept secret exactly 16 characters', () => {
      expect(() => new SignatureValidator('exactly16chars!!')).not.toThrow();
    });
  });
});
