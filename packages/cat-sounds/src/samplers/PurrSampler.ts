/**
 * Purr Sampler
 * BOC-12: Rhythmic/bass purr sampler using composition
 *
 * Handles low-frequency purr sounds for bass lines and rhythm
 */

import * as Tone from 'tone';
import { ResourceManager } from '@bots-n-cats/audio-core';
import { SampleRepository } from '../repository/SampleRepository.js';
import { PURR_SAMPLES_BY_PITCH } from '../constants/sounds.js';

export class PurrSampler {
  private sampler: Tone.Sampler | null = null;
  private readonly trackingId: string;

  constructor(
    private repository: SampleRepository,
    private resourceManager: ResourceManager,
    trackingId = 'cat_purr_sampler'
  ) {
    this.trackingId = trackingId;
  }

  /**
   * Initialize the purr sampler
   */
  async initialize(): Promise<void> {
    // Preload purr samples
    const sampleIds = Object.values(PURR_SAMPLES_BY_PITCH);
    await this.repository.preloadBatch(sampleIds);

    // Build URL map for Tone.Sampler
    const urls: Record<string, string | Tone.ToneAudioBuffer> = {};
    for (const [pitch, sampleId] of Object.entries(PURR_SAMPLES_BY_PITCH)) {
      const buffer = await this.repository.load(sampleId);
      urls[pitch] = buffer;
    }

    // Create sampler with composition
    this.sampler = new Tone.Sampler({
      urls,
      release: 0.5,
      attack: 0.1,
    }).toDestination();

    // Track resource
    this.resourceManager.track(this.trackingId, this.sampler);
  }

  /**
   * Play a purr note
   */
  play(note: string, duration: string, time?: Tone.Unit.Time, velocity = 0.8): void {
    if (!this.sampler) {
      console.warn('PurrSampler not initialized');
      return;
    }

    this.sampler.triggerAttackRelease(note, duration, time, velocity);
  }

  /**
   * Play multiple purr notes (chord)
   */
  playChord(notes: string[], duration: string, time?: Tone.Unit.Time, velocity = 0.8): void {
    notes.forEach(note => this.play(note, duration, time, velocity));
  }

  /**
   * Set volume
   */
  setVolume(db: number): void {
    if (this.sampler) {
      this.sampler.volume.value = db;
    }
  }

  /**
   * Connect to destination or effect
   */
  connect(destination: Tone.ToneAudioNode): void {
    if (this.sampler) {
      this.sampler.connect(destination);
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.sampler) {
      this.sampler.disconnect();
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.sampler) {
      this.sampler.dispose();
      this.sampler = null;
    }
  }
}
