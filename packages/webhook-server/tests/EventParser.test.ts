/**
 * Tests for EventParser
 * Verifies GitHub event normalization and emotion mapping
 */

import { describe, it, expect } from '@jest/globals';
import { EventParser } from '../src/services/EventParser.js';
import type { EmotionCategory } from '@bots-n-cats/audio-core';

describe('EventParser', () => {
  let parser: EventParser;

  beforeEach(() => {
    parser = new EventParser();
  });

  describe('push events', () => {
    it('should parse push event as activity', () => {
      const payload = {
        ref: 'refs/heads/main',
        commits: [
          {
            id: 'abc123',
            message: 'feat: add feature',
            author: { name: 'Test User' },
          },
        ],
        repository: {
          name: 'test-repo',
          full_name: 'user/test-repo',
        },
      };

      const normalized = parser.parse('push', payload);

      expect(normalized.eventType).toBe('push');
      expect(normalized.emotion).toBe('activity');
      expect(normalized.intensity).toBeGreaterThan(0);
      expect(normalized.metadata).toHaveProperty('commitCount', 1);
    });

    it('should calculate intensity based on commit count', () => {
      const fewCommits = {
        commits: Array(2).fill({ id: '1', message: 'test', author: {} }),
        repository: { name: 'repo' },
      };

      const manyCommits = {
        commits: Array(20).fill({ id: '1', message: 'test', author: {} }),
        repository: { name: 'repo' },
      };

      const few = parser.parse('push', fewCommits);
      const many = parser.parse('push', manyCommits);

      expect(many.intensity).toBeGreaterThan(few.intensity);
    });
  });

  describe('pull_request events', () => {
    it('should parse PR opened as tension', () => {
      const payload = {
        action: 'opened',
        pull_request: {
          title: 'Test PR',
          additions: 50,
          deletions: 10,
          changed_files: 3,
        },
        repository: { name: 'repo' },
      };

      const normalized = parser.parse('pull_request', payload);

      expect(normalized.eventType).toBe('pull_request');
      expect(normalized.action).toBe('opened');
      expect(normalized.emotion).toBe('tension');
      expect(normalized.metadata).toHaveProperty('additions', 50);
      expect(normalized.metadata).toHaveProperty('deletions', 10);
    });

    it('should parse PR merged as resolution', () => {
      const payload = {
        action: 'closed',
        pull_request: {
          title: 'Test PR',
          merged: true,
          additions: 50,
          deletions: 10,
        },
        repository: { name: 'repo' },
      };

      const normalized = parser.parse('pull_request', payload);

      expect(normalized.emotion).toBe('resolution');
      expect(normalized.intensity).toBeGreaterThan(0.5); // Merges should have high intensity
    });

    it('should calculate intensity from code changes', () => {
      const smallPR = {
        action: 'opened',
        pull_request: {
          title: 'Small change',
          additions: 5,
          deletions: 2,
          changed_files: 1,
        },
        repository: { name: 'repo' },
      };

      const largePR = {
        action: 'opened',
        pull_request: {
          title: 'Large refactor',
          additions: 500,
          deletions: 300,
          changed_files: 20,
        },
        repository: { name: 'repo' },
      };

      const small = parser.parse('pull_request', smallPR);
      const large = parser.parse('pull_request', largePR);

      expect(large.intensity).toBeGreaterThan(small.intensity);
    });
  });

  describe('check_run events', () => {
    it('should parse successful check_run as resolution', () => {
      const payload = {
        action: 'completed',
        check_run: {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
        },
        repository: { name: 'repo' },
      };

      const normalized = parser.parse('check_run', payload);

      expect(normalized.emotion).toBe('resolution');
      expect(normalized.metadata).toHaveProperty('conclusion', 'success');
    });

    it('should parse failed check_run as tension', () => {
      const payload = {
        action: 'completed',
        check_run: {
          name: 'CI',
          status: 'completed',
          conclusion: 'failure',
        },
        repository: { name: 'repo' },
      };

      const normalized = parser.parse('check_run', payload);

      expect(normalized.emotion).toBe('tension');
    });
  });

  describe('deployment_status events', () => {
    it('should parse successful deployment as resolution', () => {
      const payload = {
        deployment_status: {
          state: 'success',
          environment: 'production',
        },
        repository: { name: 'repo' },
      };

      const normalized = parser.parse('deployment_status', payload);

      expect(normalized.emotion).toBe('resolution');
      expect(normalized.intensity).toBeGreaterThanOrEqual(0.8); // Deployments are high intensity
    });

    it('should parse failed deployment as tension', () => {
      const payload = {
        deployment_status: {
          state: 'failure',
          environment: 'production',
        },
        repository: { name: 'repo' },
      };

      const normalized = parser.parse('deployment_status', payload);

      expect(normalized.emotion).toBe('tension');
    });
  });

  describe('issues events', () => {
    it('should parse issue opened as tension', () => {
      const payload = {
        action: 'opened',
        issue: {
          title: 'Bug report',
          body: 'Something is broken',
        },
        repository: { name: 'repo' },
      };

      const normalized = parser.parse('issues', payload);

      expect(normalized.emotion).toBe('tension');
    });

    it('should parse issue closed as resolution', () => {
      const payload = {
        action: 'closed',
        issue: {
          title: 'Bug report',
        },
        repository: { name: 'repo' },
      };

      const normalized = parser.parse('issues', payload);

      expect(normalized.emotion).toBe('resolution');
    });
  });

  describe('metadata extraction', () => {
    it('should include timestamp', () => {
      const payload = { repository: { name: 'repo' }, commits: [] };
      const normalized = parser.parse('push', payload);

      expect(normalized.timestamp).toBeDefined();
      expect(typeof normalized.timestamp).toBe('number');
      expect(normalized.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should extract repository name', () => {
      const payload = {
        repository: {
          name: 'my-repo',
          full_name: 'user/my-repo',
        },
        commits: [],
      };

      const normalized = parser.parse('push', payload);

      expect(normalized.metadata).toHaveProperty('repository', 'my-repo');
    });
  });

  describe('intensity clamping', () => {
    it('should clamp intensity between 0 and 1', () => {
      // Test with extreme values
      const extremePayload = {
        commits: Array(1000).fill({ id: '1', message: 'test', author: {} }),
        repository: { name: 'repo' },
      };

      const normalized = parser.parse('push', extremePayload);

      expect(normalized.intensity).toBeGreaterThanOrEqual(0);
      expect(normalized.intensity).toBeLessThanOrEqual(1);
    });
  });
});
