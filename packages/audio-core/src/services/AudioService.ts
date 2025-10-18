/**
 * BOC-20: Core Audio Infrastructure - Service Layer
 * AudioService manages instrument creation and audio transformations
 *
 * IMPORTANT: Uses composition pattern with InstrumentFactory and ResourceManager
 * All Tone.js objects are tracked for proper memory management
 */

import * as Tone from 'tone';
import { InstrumentFactory } from '../factories/InstrumentFactory.js';
import { ResourceManager } from '../resources/ResourceManager.js';
import { AudioEventBus } from '../events/AudioEventBus.js';
import { InstrumentType, InstrumentOptions, EmotionCategory } from '../types/index.js';

export interface AudioInstrumentHandle {
  id: string;
  instrument: Tone.Instrument;
}

export interface EmotionTransformation {
  filterFrequency?: number;
  filterQ?: number;
  reverbWet?: number;
  distortionAmount?: number;
  delayTime?: number;
}

export class AudioService {
  private factory: typeof InstrumentFactory;
  private resources: ResourceManager;
  private eventBus: AudioEventBus;
  private activeInstruments: Map<string, Tone.Instrument>;

  constructor(
    factory: typeof InstrumentFactory,
    resourceMgr: ResourceManager,
    eventBus: AudioEventBus
  ) {
    this.factory = factory;
    this.resources = resourceMgr;
    this.eventBus = eventBus;
    this.activeInstruments = new Map();

    // Subscribe to cleanup events
    this.eventBus.subscribe('audio:cleanup', () => {
      this.dispose();
    });
  }

  /**
   * Create a new instrument and track it
   */
  public createInstrument(
    type: InstrumentType,
    options?: InstrumentOptions
  ): AudioInstrumentHandle {
    const instrument = this.factory.create(type, options);
    const id = this.resources.track(`instrument_${type}`, instrument);
    this.activeInstruments.set(id, instrument);

    this.eventBus.publishSync('audio:instrument:created', { id, type });

    return { id, instrument };
  }

  /**
   * Create instrument from preset
   */
  public createPresetInstrument(preset: string): AudioInstrumentHandle {
    const instrument = this.factory.createPreset(preset);
    const id = this.resources.track(`preset_${preset}`, instrument);
    this.activeInstruments.set(id, instrument);

    this.eventBus.publishSync('audio:instrument:created', { id, preset });

    return { id, instrument };
  }

  /**
   * Apply emotional transformation to audio parameters
   * Maps EmotionCategory to musical parameters
   */
  public applyTransformation(
    emotion: EmotionCategory,
    intensity: number
  ): EmotionTransformation {
    // Clamp intensity to 0-1 range
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    switch (emotion) {
      case 'tension':
        // Tension: dissonance, sharp filters, reverb
        return {
          filterFrequency: 1000 - clampedIntensity * 700, // Lower frequency
          filterQ: 8 + clampedIntensity * 12, // Sharper resonance
          reverbWet: 0.3 + clampedIntensity * 0.4,
          distortionAmount: clampedIntensity * 0.5,
        };

      case 'resolution':
        // Resolution: consonance, open filters, gentle reverb
        return {
          filterFrequency: 2000 + clampedIntensity * 2000, // Higher frequency
          filterQ: 1 + clampedIntensity * 2, // Gentle resonance
          reverbWet: 0.1 + clampedIntensity * 0.2,
          distortionAmount: 0,
        };

      case 'activity':
        // Activity: fast rhythms, delays, moderate filtering
        return {
          filterFrequency: 1500 + clampedIntensity * 1500,
          filterQ: 4 + clampedIntensity * 4,
          delayTime: 0.125 / (1 + clampedIntensity * 2), // Faster delays
          reverbWet: 0.15,
        };

      case 'growth':
        // Growth: layered, rich harmonics, expansive reverb
        return {
          filterFrequency: 1000 + clampedIntensity * 3000,
          filterQ: 2 + clampedIntensity * 6,
          reverbWet: 0.2 + clampedIntensity * 0.5,
          distortionAmount: clampedIntensity * 0.2,
        };

      default:
        // Default neutral transformation
        return {
          filterFrequency: 1500,
          filterQ: 4,
          reverbWet: 0.2,
          distortionAmount: 0,
        };
    }
  }

  /**
   * Get instrument by ID
   */
  public getInstrument(id: string): Tone.Instrument | undefined {
    return this.activeInstruments.get(id);
  }

  /**
   * Remove and dispose a specific instrument
   */
  public disposeInstrument(id: string): boolean {
    const disposed = this.resources.dispose(id);
    if (disposed) {
      this.activeInstruments.delete(id);
      this.eventBus.publishSync('audio:instrument:disposed', { id });
    }
    return disposed;
  }

  /**
   * Get count of active instruments
   */
  public getActiveCount(): number {
    return this.activeInstruments.size;
  }

  /**
   * Get all active instrument IDs
   */
  public getActiveIds(): string[] {
    return Array.from(this.activeInstruments.keys());
  }

  /**
   * Dispose all instruments and cleanup
   */
  public dispose(): void {
    const ids = Array.from(this.activeInstruments.keys());
    ids.forEach((id) => {
      this.resources.dispose(id);
    });
    this.activeInstruments.clear();

    this.eventBus.publishSync('audio:service:disposed', {
      disposedCount: ids.length,
    });
  }
}
