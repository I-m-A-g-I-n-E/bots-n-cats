/**
 * Cat Instrument Manager
 * BOC-12: Main orchestrator for cat sound musical integration
 *
 * CRITICAL: Cat sounds are INSTRUMENTS, not notifications!
 * - Rhythmically synchronized (on beat)
 * - Harmonically appropriate (in key)
 * - Dynamically balanced (proper volume)
 * - Musically expressive (serve the emotion)
 */

import * as Tone from 'tone';
import { AudioEventBus, ResourceManager, type NormalizedEvent } from '@bots-n-cats/audio-core';
import { SampleRepository } from './repository/SampleRepository.js';
import { PurrSampler } from './samplers/PurrSampler.js';
import { MeowSampler } from './samplers/MeowSampler.js';
import { ChirpSampler } from './samplers/ChirpSampler.js';
import { EventToCatSound } from './mapping/EventToCatSound.js';
import type { CatSoundInstruction, TimingStrategy } from './types/cat-sounds.js';

export class CatInstrumentManager {
  private sampleRepository: SampleRepository;
  private purrSampler: PurrSampler | null = null;
  private meowSampler: MeowSampler | null = null;
  private chirpSampler: ChirpSampler | null = null;
  private initialized = false;

  constructor(
    private resourceManager: ResourceManager,
    private eventBus: AudioEventBus
  ) {
    this.sampleRepository = new SampleRepository();
  }

  /**
   * Initialize all cat samplers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('CatInstrumentManager already initialized');
      return;
    }

    console.log('Initializing CatInstrumentManager...');

    // Create samplers
    this.purrSampler = new PurrSampler(this.sampleRepository, this.resourceManager);
    this.meowSampler = new MeowSampler(this.sampleRepository, this.resourceManager);
    this.chirpSampler = new ChirpSampler(this.sampleRepository, this.resourceManager);

    // Initialize all samplers in parallel
    await Promise.all([
      this.purrSampler.initialize(),
      this.meowSampler.initialize(),
      this.chirpSampler.initialize(),
    ]);

    // Subscribe to events
    this.subscribeToEvents();

    this.initialized = true;
    console.log('CatInstrumentManager initialized with 3 samplers');
  }

  /**
   * Subscribe to GitHub webhook events
   */
  private subscribeToEvents(): void {
    // Subscribe to normalized GitHub events
    this.eventBus.subscribe('webhook:github:normalized', (event: NormalizedEvent) => {
      this.handleGitHubEvent(event);
    });

    // Subscribe to specific event types
    this.eventBus.subscribe('webhook:github:pull_request', (event: any) => {
      this.handlePullRequestEvent(event);
    });

    this.eventBus.subscribe('webhook:github:check_run', (event: any) => {
      this.handleCheckRunEvent(event);
    });

    this.eventBus.subscribe('webhook:github:deployment_status', (event: any) => {
      this.handleDeploymentEvent(event);
    });

    this.eventBus.subscribe('webhook:github:push', (event: any) => {
      this.handlePushEvent(event);
    });
  }

  /**
   * Handle normalized GitHub event
   */
  private handleGitHubEvent(event: NormalizedEvent): void {
    // Check if we should play a sound for this event
    if (!EventToCatSound.shouldPlaySound(event)) {
      return;
    }

    // Get cat sound instruction
    const instruction = EventToCatSound.getCatSoundForEvent(event);
    if (!instruction) {
      return;
    }

    // Play the cat sound
    this.playCatSound(instruction);
  }

  /**
   * Handle pull request events
   */
  private handlePullRequestEvent(event: any): void {
    if (event.action === 'merged') {
      // Happy meow for successful merge!
      this.playMeow('C4', '4n', '+0.5', 0.8);
    } else if (event.action === 'opened') {
      // Curious trill for new PR
      this.playMeow('E4', '8n', '+0.25', 0.6);
    }
  }

  /**
   * Handle check run events
   */
  private handleCheckRunEvent(event: any): void {
    if (event.metadata?.conclusion === 'success') {
      // Happy chirp sequence for passing tests
      this.playChirpSequence(3, '16n', '+0.5', 0.7);
    } else if (event.metadata?.conclusion === 'failure') {
      // Tiny disappointed mrrp for test failure
      this.playExpressive('disappointed_mrrp', '+0.1', 0.3);
    }
  }

  /**
   * Handle deployment events
   */
  private handleDeploymentEvent(event: any): void {
    if (event.metadata?.state === 'success') {
      // Satisfied purr burst for successful deployment
      this.playExpressive('satisfied_purr_burst', '+1n', 0.9);
    } else if (event.metadata?.state === 'failure') {
      // Tiny hiss for failed deployment
      this.playExpressive('tiny_hiss', '+0.5', 0.3);
    }
  }

  /**
   * Handle push events
   */
  private handlePushEvent(event: any): void {
    // Playful meow for commits
    this.playMeow('D4', '16n', '+0', 0.5);
  }

  /**
   * Play a cat sound based on instruction
   */
  private playCatSound(instruction: CatSoundInstruction): void {
    const time = this.calculateTime(instruction.timing, instruction.delay);
    const duration = instruction.duration || '8n';

    // Determine which sampler to use based on sound ID
    const metadata = this.sampleRepository.getMetadata(instruction.soundId);
    if (!metadata) {
      console.warn(`Unknown cat sound: ${instruction.soundId}`);
      return;
    }

    switch (metadata.category) {
      case 'rhythmic':
        this.playPurr(instruction.pitch || metadata.pitch || 'C2', duration, time, instruction.volume);
        break;

      case 'melodic':
        this.playMeow(instruction.pitch || metadata.pitch || 'C4', duration, time, instruction.volume);
        break;

      case 'expressive':
        // Use appropriate sampler based on sound type
        if (instruction.soundId.includes('chirp')) {
          this.playChirp(time, instruction.volume);
        } else {
          this.playMeow(instruction.pitch || 'C4', duration, time, instruction.volume);
        }
        break;

      case 'textural':
        // Textural sounds use purr sampler with longer durations
        this.playPurr(instruction.pitch || 'C3', '2n', time, instruction.volume * 0.7);
        break;
    }
  }

  /**
   * Calculate playback time based on timing strategy
   */
  private calculateTime(timing: TimingStrategy, delay?: string): Tone.Unit.Time {
    const now = Tone.now();

    switch (timing) {
      case 'downbeat':
        // Quantize to next measure
        return `@${Math.ceil(Tone.Transport.seconds / (Tone.Transport.toSeconds('1m')))}m`;

      case 'upbeat':
        // Quantize to next half measure
        return `@${Math.ceil(Tone.Transport.seconds / (Tone.Transport.toSeconds('2n')))}n`;

      case 'quantized':
        // Quantize to next beat
        return `@${Math.ceil(Tone.Transport.seconds / (Tone.Transport.toSeconds('4n')))}n`;

      case 'offbeat':
        // Play on the 'and' of the beat
        const nextBeat = Math.ceil(Tone.Transport.seconds / Tone.Transport.toSeconds('4n'));
        return `@${nextBeat}n + 8n`;

      case 'free':
        // Play immediately with optional delay
        return delay ? `+${delay}` : now;

      default:
        return delay || now;
    }
  }

  /**
   * Play a purr sound (rhythmic/bass)
   */
  playPurr(note: string, duration: string, time?: Tone.Unit.Time, velocity = 0.7): void {
    if (!this.purrSampler) {
      console.warn('PurrSampler not initialized');
      return;
    }

    this.purrSampler.play(note, duration, time, velocity);
  }

  /**
   * Play a purr chord
   */
  playPurrChord(notes: string[], duration: string, time?: Tone.Unit.Time, velocity = 0.7): void {
    if (!this.purrSampler) {
      console.warn('PurrSampler not initialized');
      return;
    }

    this.purrSampler.playChord(notes, duration, time, velocity);
  }

  /**
   * Play a meow sound (melodic)
   */
  playMeow(note: string, duration: string, time?: Tone.Unit.Time, velocity = 0.7): void {
    if (!this.meowSampler) {
      console.warn('MeowSampler not initialized');
      return;
    }

    this.meowSampler.play(note, duration, time, velocity);
  }

  /**
   * Play a melodic phrase
   */
  playMeowPhrase(notes: string[], durations: string[], startTime?: Tone.Unit.Time, velocity = 0.7): void {
    if (!this.meowSampler) {
      console.warn('MeowSampler not initialized');
      return;
    }

    this.meowSampler.playPhrase(notes, durations, startTime, velocity);
  }

  /**
   * Play a meow arpeggio
   */
  playMeowArpeggio(notes: string[], interval: string, duration: string, startTime?: Tone.Unit.Time, velocity = 0.7): void {
    if (!this.meowSampler) {
      console.warn('MeowSampler not initialized');
      return;
    }

    this.meowSampler.playArpeggio(notes, interval, duration, startTime, velocity);
  }

  /**
   * Play a chirp sound (percussion)
   */
  playChirp(time?: Tone.Unit.Time, velocity = 0.6): void {
    if (!this.chirpSampler) {
      console.warn('ChirpSampler not initialized');
      return;
    }

    this.chirpSampler.play(time, velocity);
  }

  /**
   * Play a chirp sequence
   */
  playChirpSequence(count: number, interval: string, startTime?: Tone.Unit.Time, velocity = 0.6): void {
    if (!this.chirpSampler) {
      console.warn('ChirpSampler not initialized');
      return;
    }

    this.chirpSampler.playSequence(count, interval, startTime, velocity);
  }

  /**
   * Play an expressive sound (by sound ID)
   */
  playExpressive(soundId: string, delay?: string, volume = 0.7): void {
    const metadata = this.sampleRepository.getMetadata(soundId);
    if (!metadata) {
      console.warn(`Unknown expressive sound: ${soundId}`);
      return;
    }

    const time = delay ? `+${delay}` : Tone.now();
    const duration = `${metadata.duration}s`;

    // Play using appropriate sampler
    if (soundId.includes('chirp')) {
      this.playChirp(time, volume);
    } else if (soundId.includes('purr')) {
      this.playPurr(metadata.pitch || 'C3', duration, time, volume);
    } else {
      this.playMeow(metadata.pitch || 'C4', duration, time, volume);
    }
  }

  /**
   * Set master volume for all cat sounds
   */
  setMasterVolume(db: number): void {
    this.purrSampler?.setVolume(db);
    this.meowSampler?.setVolume(db - 2); // Meows slightly quieter
    this.chirpSampler?.setVolume(db - 3); // Chirps quieter
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    this.purrSampler?.dispose();
    this.meowSampler?.dispose();
    this.chirpSampler?.dispose();
    this.sampleRepository.dispose();
    this.initialized = false;
  }
}
