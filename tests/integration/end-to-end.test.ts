/**
 * End-to-End Integration Tests
 * Verifies the complete flow: Webhook → EventBus → Music Generation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AudioEventBus } from '../../packages/audio-core/src/events/AudioEventBus.js';
import { EventParser } from '../../packages/webhook-server/src/services/EventParser.js';
import { ParameterMapper } from '../../packages/music-engine/src/mappers/ParameterMapper.js';

describe('End-to-End Integration', () => {
  let eventBus: AudioEventBus;
  let eventParser: EventParser;
  let parameterMapper: ParameterMapper;

  beforeEach(() => {
    eventBus = new AudioEventBus();
    eventParser = new EventParser();
    parameterMapper = new ParameterMapper();
  });

  describe('Webhook to Music Pipeline', () => {
    it('should flow from GitHub webhook to musical parameters', async () => {
      // Track events through the pipeline
      const receivedEvents: any[] = [];
      const generatedMusic: any[] = [];

      // Subscribe to webhook events
      eventBus.subscribe('webhook:received', (event) => {
        receivedEvents.push(event);
        // Simulate MusicMapper behavior
        const params = parameterMapper.map(event);
        eventBus.publishSync('music:generated', params);
      });

      // Subscribe to music generation events
      eventBus.subscribe('music:generated', (params) => {
        generatedMusic.push(params);
      });

      // Simulate GitHub webhook payload
      const githubPayload = {
        ref: 'refs/heads/main',
        commits: [
          {
            id: 'abc123',
            message: 'feat: add new feature',
            author: { name: 'Developer' },
          },
        ],
        repository: {
          name: 'test-repo',
          full_name: 'user/test-repo',
        },
      };

      // Parse GitHub event
      const normalizedEvent = eventParser.parse('push', githubPayload);

      // Publish to event bus (simulating WebhookService)
      await eventBus.publish('webhook:received', normalizedEvent);

      // Verify the flow
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].eventType).toBe('push');
      expect(receivedEvents[0].emotion).toBe('activity');

      expect(generatedMusic).toHaveLength(1);
      expect(generatedMusic[0]).toHaveProperty('scale');
      expect(generatedMusic[0]).toHaveProperty('key');
      expect(generatedMusic[0]).toHaveProperty('duration');
    });

    it('should handle PR merge with resolution emotion', async () => {
      const musicGenerated = jest.fn();
      eventBus.subscribe('music:generated', musicGenerated);

      eventBus.subscribe('webhook:received', (event) => {
        const params = parameterMapper.map(event);
        eventBus.publishSync('music:generated', params);
      });

      const prMergedPayload = {
        action: 'closed',
        pull_request: {
          title: 'Feature PR',
          merged: true,
          additions: 100,
          deletions: 50,
          changed_files: 5,
        },
        repository: { name: 'repo' },
      };

      const normalizedEvent = eventParser.parse('pull_request', prMergedPayload);
      await eventBus.publish('webhook:received', normalizedEvent);

      expect(musicGenerated).toHaveBeenCalled();
      const musicParams = musicGenerated.mock.calls[0][0];

      // PR merged should use major scale (resolution)
      expect(musicParams.scale).toContain('major');
      expect(normalizedEvent.emotion).toBe('resolution');
    });

    it('should handle deployment success with high intensity', async () => {
      const musicGenerated = jest.fn();
      eventBus.subscribe('music:generated', musicGenerated);

      eventBus.subscribe('webhook:received', (event) => {
        const params = parameterMapper.map(event);
        eventBus.publishSync('music:generated', params);
      });

      const deploymentPayload = {
        deployment_status: {
          state: 'success',
          environment: 'production',
        },
        repository: { name: 'repo' },
      };

      const normalizedEvent = eventParser.parse('deployment_status', deploymentPayload);
      await eventBus.publish('webhook:received', normalizedEvent);

      expect(musicGenerated).toHaveBeenCalled();
      const musicParams = musicGenerated.mock.calls[0][0];

      expect(normalizedEvent.emotion).toBe('resolution');
      expect(normalizedEvent.intensity).toBeGreaterThanOrEqual(0.8); // High intensity for deployments
    });
  });

  describe('Error Resilience', () => {
    it('should continue processing even if a subscriber fails', async () => {
      const successfulSubscriber = jest.fn();

      // Add a failing subscriber
      eventBus.subscribe('webhook:received', () => {
        throw new Error('Subscriber error');
      });

      // Add a successful subscriber
      eventBus.subscribe('webhook:received', successfulSubscriber);

      const payload = {
        commits: [{ id: '1', message: 'test', author: {} }],
        repository: { name: 'repo' },
      };

      const normalizedEvent = eventParser.parse('push', payload);
      await eventBus.publish('webhook:received', normalizedEvent);

      // Successful subscriber should still be called
      expect(successfulSubscriber).toHaveBeenCalled();
    });
  });

  describe('Multiple Event Handling', () => {
    it('should handle rapid succession of events', async () => {
      const processedEvents: any[] = [];

      eventBus.subscribe('webhook:received', (event) => {
        processedEvents.push(event);
      });

      // Simulate multiple rapid commits
      const events = [
        { commits: [{ id: '1', message: 'commit 1', author: {} }], repository: { name: 'repo' } },
        { commits: [{ id: '2', message: 'commit 2', author: {} }], repository: { name: 'repo' } },
        { commits: [{ id: '3', message: 'commit 3', author: {} }], repository: { name: 'repo' } },
      ];

      await Promise.all(
        events.map(async (payload) => {
          const normalized = eventParser.parse('push', payload);
          await eventBus.publish('webhook:received', normalized);
        })
      );

      expect(processedEvents).toHaveLength(3);
      expect(processedEvents.every(e => e.eventType === 'push')).toBe(true);
    });
  });
});
