/**
 * Tests for ParameterMapper
 * Verifies GitHub event → Musical parameter conversion
 */

import { describe, it, expect } from '@jest/globals';
import { ParameterMapper } from '../src/mappers/ParameterMapper.js';
import type { NormalizedEvent } from '@bots-n-cats/audio-core';

describe('ParameterMapper', () => {
  let mapper: ParameterMapper;

  beforeEach(() => {
    mapper = new ParameterMapper();
  });

  describe('emotion to scale mapping', () => {
    it('should map tension to minor scale', () => {
      const event: NormalizedEvent = {
        eventType: 'pull_request',
        action: 'opened',
        emotion: 'tension',
        intensity: 0.7,
        metadata: {},
        timestamp: Date.now(),
      };

      const params = mapper.map(event);

      expect(params.scale).toContain('minor');
    });

    it('should map resolution to major scale', () => {
      const event: NormalizedEvent = {
        eventType: 'pull_request',
        action: 'closed',
        emotion: 'resolution',
        intensity: 0.8,
        metadata: { merged: true },
        timestamp: Date.now(),
      };

      const params = mapper.map(event);

      expect(params.scale).toContain('major');
    });

    it('should map activity to pentatonic scale', () => {
      const event: NormalizedEvent = {
        eventType: 'push',
        action: 'push',
        emotion: 'activity',
        intensity: 0.6,
        metadata: { commitCount: 3 },
        timestamp: Date.now(),
      };

      const params = mapper.map(event);

      expect(params.scale).toContain('pentatonic');
    });

    it('should map growth to dorian scale', () => {
      const event: NormalizedEvent = {
        eventType: 'issues',
        action: 'opened',
        emotion: 'growth',
        intensity: 0.5,
        metadata: {},
        timestamp: Date.now(),
      };

      const params = mapper.map(event);

      expect(params.scale).toContain('dorian');
    });
  });

  describe('intensity to duration mapping', () => {
    it('should map low intensity to shorter duration', () => {
      const lowIntensity: NormalizedEvent = {
        eventType: 'push',
        action: 'push',
        emotion: 'activity',
        intensity: 0.2,
        metadata: {},
        timestamp: Date.now(),
      };

      const highIntensity: NormalizedEvent = {
        ...lowIntensity,
        intensity: 0.9,
      };

      const lowParams = mapper.map(lowIntensity);
      const highParams = mapper.map(highIntensity);

      expect(highParams.duration).toBeGreaterThan(lowParams.duration);
    });

    it('should keep duration within reasonable bounds', () => {
      const event: NormalizedEvent = {
        eventType: 'push',
        action: 'push',
        emotion: 'activity',
        intensity: 1.0,
        metadata: {},
        timestamp: Date.now(),
      };

      const params = mapper.map(event);

      expect(params.duration).toBeGreaterThan(1); // At least 1 second
      expect(params.duration).toBeLessThan(30); // Less than 30 seconds
    });
  });

  describe('metadata extraction', () => {
    it('should extract language from metadata', () => {
      const event: NormalizedEvent = {
        eventType: 'push',
        action: 'push',
        emotion: 'activity',
        intensity: 0.5,
        metadata: {
          language: 'TypeScript',
          filesChanged: 5,
        },
        timestamp: Date.now(),
      };

      const params = mapper.map(event);

      expect(params.metadata).toHaveProperty('language', 'TypeScript');
    });

    it('should extract commit frequency', () => {
      const event: NormalizedEvent = {
        eventType: 'push',
        action: 'push',
        emotion: 'activity',
        intensity: 0.5,
        metadata: {
          commitCount: 5,
          timeWindow: 3600, // 1 hour in seconds
        },
        timestamp: Date.now(),
      };

      const params = mapper.map(event);

      expect(params.metadata).toHaveProperty('commitFrequency');
    });
  });

  describe('key generation', () => {
    it('should generate valid musical key', () => {
      const event: NormalizedEvent = {
        eventType: 'push',
        action: 'push',
        emotion: 'activity',
        intensity: 0.5,
        metadata: {},
        timestamp: Date.now(),
      };

      const params = mapper.map(event);

      expect(params.key).toMatch(/^[A-G][#b]?$/);
    });
  });
});
