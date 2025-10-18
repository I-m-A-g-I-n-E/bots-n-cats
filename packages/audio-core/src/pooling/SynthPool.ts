/**
 * BOC-20: Core Audio Infrastructure - Object Pooling
 * SynthPool manages a pool of reusable synth instances
 *
 * IMPORTANT: Reduces GC pressure and initialization overhead
 * For high-frequency operations like webhook bursts
 */

import * as Tone from 'tone';
import { InstrumentFactory } from '../factories/InstrumentFactory.js';
import { AudioEventBus } from '../events/AudioEventBus.js';
import { InstrumentType, InstrumentOptions } from '../types/index.js';

export interface PoolStats {
  total: number;
  available: number;
  inUse: number;
  acquisitions: number;
  releases: number;
  expansions: number;
}

export class SynthPool {
  private synthClass: InstrumentType | string;
  private options: InstrumentOptions;
  private poolSize: number;
  private available: Tone.Instrument[];
  private inUse: Set<Tone.Instrument>;
  private eventBus?: AudioEventBus;

  // Statistics tracking
  private stats: {
    acquisitions: number;
    releases: number;
    expansions: number;
  };

  constructor(
    synthClass: InstrumentType | string,
    poolSize: number = 10,
    options: InstrumentOptions = {},
    eventBus?: AudioEventBus
  ) {
    if (poolSize < 1) {
      throw new Error('Pool size must be at least 1');
    }

    this.synthClass = synthClass;
    this.options = options;
    this.poolSize = poolSize;
    this.available = [];
    this.inUse = new Set();
    this.eventBus = eventBus;

    this.stats = {
      acquisitions: 0,
      releases: 0,
      expansions: 0,
    };

    // Pre-populate the pool
    this.initialize();
  }

  /**
   * Initialize the pool with synth instances
   */
  private initialize(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const synth = this.createSynth();
      this.available.push(synth);
    }

    this.eventBus?.publishSync('pool:initialized', {
      synthClass: this.synthClass,
      poolSize: this.poolSize,
    });
  }

  /**
   * Create a new synth instance
   */
  private createSynth(): Tone.Instrument {
    // Check if synthClass is a preset or instrument type
    if (
      this.synthClass === 'synth' ||
      this.synthClass === 'fmSynth' ||
      this.synthClass === 'polySynth' ||
      this.synthClass === 'sampler'
    ) {
      return InstrumentFactory.create(
        this.synthClass as InstrumentType,
        this.options
      );
    } else {
      // Assume it's a preset name
      return InstrumentFactory.createPreset(this.synthClass);
    }
  }

  /**
   * Acquire a synth from the pool
   * If pool is empty, creates a new synth (pool expansion)
   */
  public acquire(): Tone.Instrument {
    let synth: Tone.Instrument;

    if (this.available.length > 0) {
      // Get from available pool
      synth = this.available.pop()!;
    } else {
      // Pool exhausted - create new instance (expansion)
      synth = this.createSynth();
      this.stats.expansions++;

      this.eventBus?.publishSync('pool:expanded', {
        synthClass: this.synthClass,
        newTotal: this.getTotalSize(),
      });
    }

    this.inUse.add(synth);
    this.stats.acquisitions++;

    this.eventBus?.publishSync('pool:acquired', {
      synthClass: this.synthClass,
      available: this.available.length,
      inUse: this.inUse.size,
    });

    return synth;
  }

  /**
   * Release a synth back to the pool
   */
  public release(synth: Tone.Instrument): void {
    if (!this.inUse.has(synth)) {
      console.warn('Attempting to release synth not from this pool');
      return;
    }

    // Reset synth state
    this.resetSynth(synth);

    // Move from inUse to available
    this.inUse.delete(synth);
    this.available.push(synth);
    this.stats.releases++;

    this.eventBus?.publishSync('pool:released', {
      synthClass: this.synthClass,
      available: this.available.length,
      inUse: this.inUse.size,
    });
  }

  /**
   * Reset synth to default state
   */
  private resetSynth(synth: Tone.Instrument): void {
    // Ensure all notes are released
    if ('releaseAll' in synth && typeof synth.releaseAll === 'function') {
      synth.releaseAll();
    }

    // Disconnect from any custom connections
    // Note: We don't disconnect from destination as pool items should stay connected
    // synth.disconnect();
    // synth.toDestination();
  }

  /**
   * Get pool statistics
   */
  public getStats(): PoolStats {
    return {
      total: this.getTotalSize(),
      available: this.available.length,
      inUse: this.inUse.size,
      acquisitions: this.stats.acquisitions,
      releases: this.stats.releases,
      expansions: this.stats.expansions,
    };
  }

  /**
   * Get total pool size (available + in use)
   */
  public getTotalSize(): number {
    return this.available.length + this.inUse.size;
  }

  /**
   * Get number of available synths
   */
  public getAvailableCount(): number {
    return this.available.length;
  }

  /**
   * Get number of synths currently in use
   */
  public getInUseCount(): number {
    return this.inUse.size;
  }

  /**
   * Shrink pool to target size (removes excess available synths)
   */
  public shrink(targetSize: number): number {
    if (targetSize < 0) {
      throw new Error('Target size must be non-negative');
    }

    let disposed = 0;
    while (this.available.length > targetSize) {
      const synth = this.available.pop();
      if (synth && 'dispose' in synth) {
        synth.dispose();
        disposed++;
      }
    }

    if (disposed > 0) {
      this.eventBus?.publishSync('pool:shrunk', {
        synthClass: this.synthClass,
        disposedCount: disposed,
        newSize: this.getTotalSize(),
      });
    }

    return disposed;
  }

  /**
   * Expand pool by adding more synths
   */
  public expand(additionalSize: number): void {
    if (additionalSize < 1) {
      throw new Error('Additional size must be at least 1');
    }

    for (let i = 0; i < additionalSize; i++) {
      const synth = this.createSynth();
      this.available.push(synth);
    }

    this.poolSize += additionalSize;

    this.eventBus?.publishSync('pool:expanded', {
      synthClass: this.synthClass,
      addedCount: additionalSize,
      newSize: this.getTotalSize(),
    });
  }

  /**
   * Dispose all synths and clear the pool
   */
  public dispose(): void {
    // Dispose all available synths
    this.available.forEach((synth) => {
      if ('dispose' in synth) {
        synth.dispose();
      }
    });

    // Dispose all in-use synths
    this.inUse.forEach((synth) => {
      if ('dispose' in synth) {
        synth.dispose();
      }
    });

    const totalDisposed = this.available.length + this.inUse.size;

    this.available = [];
    this.inUse.clear();

    this.eventBus?.publishSync('pool:disposed', {
      synthClass: this.synthClass,
      disposedCount: totalDisposed,
    });
  }

  /**
   * Release all in-use synths back to pool
   * Useful for cleanup operations
   */
  public releaseAll(): void {
    const synthsToRelease = Array.from(this.inUse);
    synthsToRelease.forEach((synth) => this.release(synth));

    this.eventBus?.publishSync('pool:releaseAll', {
      synthClass: this.synthClass,
      releasedCount: synthsToRelease.length,
    });
  }

  /**
   * Check if pool is healthy (has available synths)
   */
  public isHealthy(): boolean {
    return this.available.length > 0;
  }

  /**
   * Get pool utilization percentage (0-100)
   */
  public getUtilization(): number {
    const total = this.getTotalSize();
    if (total === 0) return 0;
    return (this.inUse.size / total) * 100;
  }
}
