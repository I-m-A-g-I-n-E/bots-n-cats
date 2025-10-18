/**
 * Chirp Sampler
 * BOC-12: Percussion chirp sampler using composition
 *
 * Handles percussive chirp sounds for rhythm patterns
 */

import * as Tone from 'tone';
import { ResourceManager } from '@bots-n-cats/audio-core';
import { SampleRepository } from '../repository/SampleRepository.js';

export class ChirpSampler {
  private player: Tone.Player | null = null;
  private readonly trackingId: string;
  private readonly sampleId = 'chirp_percussion';

  constructor(
    private repository: SampleRepository,
    private resourceManager: ResourceManager,
    trackingId = 'cat_chirp_sampler'
  ) {
    this.trackingId = trackingId;
  }

  /**
   * Initialize the chirp sampler
   */
  async initialize(): Promise<void> {
    // Preload chirp sample
    const buffer = await this.repository.load(this.sampleId);

    // Create player with composition
    this.player = new Tone.Player({
      url: buffer,
      loop: false,
    }).toDestination();

    // Track resource
    this.resourceManager.track(this.trackingId, this.player);
  }

  /**
   * Play a chirp
   */
  play(time?: Tone.Unit.Time, velocity = 0.6): void {
    if (!this.player) {
      console.warn('ChirpSampler not initialized');
      return;
    }

    // Set volume based on velocity
    const db = Tone.gainToDb(velocity);
    this.player.volume.value = db;

    // Play the chirp
    if (time !== undefined) {
      this.player.start(time);
    } else {
      this.player.start();
    }
  }

  /**
   * Play a chirp pattern (for hi-hat-like patterns)
   */
  playPattern(times: Tone.Unit.Time[], velocity = 0.6): void {
    times.forEach(time => this.play(time, velocity));
  }

  /**
   * Play rhythmic chirp sequence
   */
  playSequence(count: number, interval: string, startTime?: Tone.Unit.Time, velocity = 0.6): void {
    if (!this.player) {
      console.warn('ChirpSampler not initialized');
      return;
    }

    const intervalSeconds = Tone.Time(interval).toSeconds();
    let currentTime = startTime || Tone.now();

    for (let i = 0; i < count; i++) {
      this.play(currentTime, velocity);
      const currentTimeSeconds = Tone.Time(currentTime).toSeconds();
      currentTime = currentTimeSeconds + intervalSeconds;
    }
  }

  /**
   * Set volume
   */
  setVolume(db: number): void {
    if (this.player) {
      this.player.volume.value = db;
    }
  }

  /**
   * Connect to destination or effect
   */
  connect(destination: Tone.ToneAudioNode): void {
    if (this.player) {
      this.player.connect(destination);
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
  }
}
