/**
 * Tests for ResourceManager
 * Verifies resource tracking and disposal
 */

import { ResourceManager } from '../src/resources/ResourceManager.js';

// Mock Tone.js objects for testing
class MockToneResource {
  name: string;
  disposed: boolean = false;

  constructor(name: string = 'MockResource') {
    this.name = name;
  }

  dispose() {
    this.disposed = true;
  }
}

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;

  beforeEach(() => {
    resourceManager = new ResourceManager();
  });

  describe('track', () => {
    it('should track a resource', () => {
      const synth = new MockToneResource('Synth');
      const id = resourceManager.track('synth', synth as any);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should return different IDs for different resources', () => {
      const synth1 = new MockToneResource('Synth1');
      const synth2 = new MockToneResource('Synth2');

      const id1 = resourceManager.track('synth1', synth1 as any);
      const id2 = resourceManager.track('synth2', synth2 as any);

      expect(id1).not.toBe(id2);
    });

    it('should generate IDs based on name', () => {
      const synth = new MockToneResource('Synth');

      const id = resourceManager.track('test-synth', synth as any);

      expect(id).toContain('test-synth');
      expect(typeof id).toBe('string');
    });
  });

  describe('get', () => {
    it('should retrieve a tracked resource', () => {
      const synth = new MockToneResource('Synth');
      const id = resourceManager.track('synth', synth as any);

      const retrieved = resourceManager.get(id);

      expect(retrieved).toBe(synth);
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = resourceManager.get('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('dispose', () => {
    it('should dispose a tracked resource', () => {
      const synth = new MockToneResource('Synth');
      const disposeSpy = jest.spyOn(synth, 'dispose');
      const id = resourceManager.track('synth', synth as any);

      const disposed = resourceManager.dispose(id);

      expect(disposed).toBe(true);
      expect(disposeSpy).toHaveBeenCalled();
      expect(resourceManager.get(id)).toBeUndefined();
    });

    it('should return false for non-existent resource', () => {
      const disposed = resourceManager.dispose('non-existent');

      expect(disposed).toBe(false);
    });

    it('should handle resources without dispose method gracefully', () => {
      const resource = {} as any;
      const id = resourceManager.track('no-dispose', resource);

      expect(() => resourceManager.dispose(id)).not.toThrow();
    });
  });

  describe('disposeAll', () => {
    it('should dispose all tracked resources', () => {
      const synth1 = new MockToneResource('Synth');
      const synth2 = new MockToneResource('FMSynth');
      const disposeSpy1 = jest.spyOn(synth1, 'dispose');
      const disposeSpy2 = jest.spyOn(synth2, 'dispose');

      const id1 = resourceManager.track('synth1', synth1 as any);
      const id2 = resourceManager.track('synth2', synth2 as any);

      resourceManager.disposeAll();

      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
      expect(resourceManager.get(id1)).toBeUndefined();
      expect(resourceManager.get(id2)).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const synth1 = new MockToneResource('Synth');
      const synth2 = new MockToneResource('FMSynth');

      resourceManager.track('synth', synth1 as any);
      resourceManager.track('fmSynth', synth2 as any);

      const stats = resourceManager.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byType).toHaveProperty('MockToneResource', 2);
    });

    it('should update stats after disposal', () => {
      const synth = new MockToneResource('Synth');
      const id = resourceManager.track('synth', synth as any);

      resourceManager.dispose(id);

      const stats = resourceManager.getStats();
      expect(stats.total).toBe(0);
    });
  });
});
