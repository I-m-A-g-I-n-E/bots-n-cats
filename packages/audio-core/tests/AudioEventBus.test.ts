/**
 * Tests for AudioEventBus
 * Verifies event-driven pub/sub system
 */

import { AudioEventBus } from '../src/events/AudioEventBus.js';

describe('AudioEventBus', () => {
  let eventBus: AudioEventBus;

  beforeEach(() => {
    eventBus = new AudioEventBus();
  });

  describe('subscribe and publish', () => {
    it('should call subscriber when event is published', async () => {
      const callback = jest.fn();
      eventBus.subscribe('test:event', callback);

      await eventBus.publish('test:event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers for same event', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.subscribe('test:event', callback1);
      eventBus.subscribe('test:event', callback2);

      await eventBus.publish('test:event', { data: 'test' });

      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should not call unsubscribed callbacks', async () => {
      const callback = jest.fn();
      const unsubscribe = eventBus.subscribe('test:event', callback);

      unsubscribe();
      await eventBus.publish('test:event', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle async subscribers', async () => {
      const callback = jest.fn(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      eventBus.subscribe('test:event', callback);
      await eventBus.publish('test:event', { data: 'async' });

      expect(callback).toHaveBeenCalledWith({ data: 'async' });
    });

    it('should isolate events by name', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.subscribe('event:one', callback1);
      eventBus.subscribe('event:two', callback2);

      await eventBus.publish('event:one', { data: 'one' });

      expect(callback1).toHaveBeenCalledWith({ data: 'one' });
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('publishSync', () => {
    it('should publish events synchronously', () => {
      const callback = jest.fn();
      eventBus.subscribe('test:sync', callback);

      eventBus.publishSync('test:sync', { data: 'sync' });

      expect(callback).toHaveBeenCalledWith({ data: 'sync' });
    });
  });

  describe('error handling', () => {
    it('should continue publishing even if a subscriber throws', async () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Subscriber error');
      });
      const goodCallback = jest.fn();

      eventBus.subscribe('test:error', errorCallback);
      eventBus.subscribe('test:error', goodCallback);

      await eventBus.publish('test:error', { data: 'test' });

      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });
});
