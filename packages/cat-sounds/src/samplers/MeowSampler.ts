/**
 * Meow Sampler
 * BOC-12: Melodic meow sampler using composition
 *
 * Handles pitched meow sounds for melodic phrases
 */

import * as Tone from 'tone';
import { ResourceManager } from '@bots-n-cats/audio-core';
import { SampleRepository } from '../repository/SampleRepository.js';
import { MELODIC_SAMPLES_BY_PITCH } from '../constants/sounds.js';

export class MeowSampler {
  private sampler: Tone.Sampler | null = null;
  private readonly trackingId: string;

  constructor(
    private repository: SampleRepository,
    private resourceManager: ResourceManager,
    trackingId = 'cat_meow_sampler'
  ) {
    this.trackingId = trackingId;
  }

  /**
   * Initialize the meow sampler
   */
  async initialize(): Promise<void> {
    // Preload melodic samples
    const sampleIds = Object.values(MELODIC_SAMPLES_BY_PITCH);
    await this.repository.preloadBatch(sampleIds);

    // Build URL map for Tone.Sampler
    const urls: Record<string, string | Tone.ToneAudioBuffer> = {};
    for (const [pitch, sampleId] of Object.entries(MELODIC_SAMPLES_BY_PITCH)) {
      const buffer = await this.repository.load(sampleId);
      urls[pitch] = buffer;
    }

    // Create sampler with composition
    this.sampler = new Tone.Sampler({
      urls,
      release: 0.3,
      attack: 0.05,
    }).toDestination();

    // Track resource
    this.resourceManager.track(this.trackingId, this.sampler);
  }

  /**
   * Play a meow note
   */
  play(note: string, duration: string, time?: Tone.Unit.Time, velocity = 0.7): void {
    if (!this.sampler) {
      console.warn('MeowSampler not initialized');
      return;
    }

    this.sampler.triggerAttackRelease(note, duration, time, velocity);
  }

  /**
   * Play a melodic phrase
   */
  playPhrase(notes: string[], durations: string[], startTime?: Tone.Unit.Time, velocity = 0.7): void {
    if (!this.sampler) {
      console.warn('MeowSampler not initialized');
      return;
    }

    let currentTime = startTime || Tone.now();
    notes.forEach((note, i) => {
      const duration = durations[i] || '8n';
      this.sampler!.triggerAttackRelease(note, duration, currentTime, velocity);
      const currentTimeSeconds = Tone.Time(currentTime).toSeconds();
      const durationSeconds = Tone.Time(duration).toSeconds();
      currentTime = currentTimeSeconds + durationSeconds;
    });
  }

  /**
   * Play an arpeggio
   */
  playArpeggio(notes: string[], interval: string, duration: string, startTime?: Tone.Unit.Time, velocity = 0.7): void {
    if (!this.sampler) {
      console.warn('MeowSampler not initialized');
      return;
    }

    const intervalSeconds = Tone.Time(interval).toSeconds();
    let currentTime = startTime || Tone.now();

    notes.forEach(note => {
      this.sampler!.triggerAttackRelease(note, duration, currentTime, velocity);
      const currentTimeSeconds = Tone.Time(currentTime).toSeconds();
      currentTime = currentTimeSeconds + intervalSeconds;
    });
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
