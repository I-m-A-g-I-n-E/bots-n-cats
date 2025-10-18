/**
 * Sample Repository
 * BOC-11: Manages loading, caching, and synthesis of cat sounds
 *
 * Repository pattern for cat sound samples with synthesis fallback
 */

import * as Tone from 'tone';
import { CAT_SOUND_CATALOG } from '../constants/sounds.js';
import type { CatSound, SynthesisParams } from '../types/cat-sounds.js';

export class SampleRepository {
  private loadedSamples = new Map<string, Tone.ToneAudioBuffer>();
  private loading = new Map<string, Promise<Tone.ToneAudioBuffer>>();
  private sampleMetadata = new Map<string, CatSound>();

  constructor() {
    // Load metadata from catalog
    Object.values(CAT_SOUND_CATALOG).forEach(sound => {
      this.sampleMetadata.set(sound.id, sound);
    });
  }

  /**
   * Load a sample by ID (synthesize if no URL available)
   */
  async load(sampleId: string): Promise<Tone.ToneAudioBuffer> {
    // Return cached if available
    if (this.loadedSamples.has(sampleId)) {
      return this.loadedSamples.get(sampleId)!;
    }

    // Return existing promise if loading
    if (this.loading.has(sampleId)) {
      return this.loading.get(sampleId)!;
    }

    const metadata = this.sampleMetadata.get(sampleId);
    if (!metadata) {
      throw new Error(`Unknown sample: ${sampleId}`);
    }

    // Create loading promise
    const loadPromise = this.loadOrSynthesize(metadata);
    this.loading.set(sampleId, loadPromise);

    try {
      const buffer = await loadPromise;
      this.loadedSamples.set(sampleId, buffer);
      this.loading.delete(sampleId);
      return buffer;
    } catch (error) {
      this.loading.delete(sampleId);
      throw error;
    }
  }

  /**
   * Preload a batch of samples
   */
  async preloadBatch(sampleIds: string[]): Promise<void> {
    await Promise.all(sampleIds.map(id => this.load(id)));
  }

  /**
   * Get sample metadata
   */
  getMetadata(sampleId: string): CatSound | undefined {
    return this.sampleMetadata.get(sampleId);
  }

  /**
   * Load from URL or synthesize
   */
  private async loadOrSynthesize(metadata: CatSound): Promise<Tone.ToneAudioBuffer> {
    // Future: Load from URL if available
    if (metadata.url) {
      return new Promise((resolve, reject) => {
        const buffer = new Tone.ToneAudioBuffer(metadata.url!, resolve, reject);
      });
    }

    // For now, synthesize all sounds
    return this.synthesizeCatSound(metadata);
  }

  /**
   * Synthesize cat-like sounds using Tone.js
   * This is a placeholder for actual recorded sounds
   */
  private async synthesizeCatSound(metadata: CatSound): Promise<Tone.ToneAudioBuffer> {
    const sampleRate = Tone.getContext().sampleRate;
    const length = Math.floor(metadata.duration * sampleRate);
    const channels = 1;

    // Create offline context for rendering
    const offlineContext = new Tone.OfflineContext(channels, metadata.duration, sampleRate);

    return new Promise((resolve) => {
      // Determine synthesis type based on category and name
      const params = this.getSynthesisParams(metadata);

      // Synthesize based on type
      this.synthesizeByType(params, offlineContext);

      // Render and convert to ToneAudioBuffer
      offlineContext.render().then((audioBuffer) => {
        const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
        resolve(toneBuffer);
      });
    });
  }

  /**
   * Determine synthesis parameters from metadata
   */
  private getSynthesisParams(metadata: CatSound): SynthesisParams {
    // Extract frequency from pitch if available
    let pitch = 220; // Default A3
    if (metadata.pitch) {
      pitch = Tone.Frequency(metadata.pitch).toFrequency();
    }

    // Determine synthesis type
    let type: SynthesisParams['type'] = 'meow';
    if (metadata.id.includes('purr')) {
      type = 'purr';
    } else if (metadata.id.includes('chirp')) {
      type = 'chirp';
    } else if (metadata.id.includes('trill')) {
      type = 'trill';
    } else if (metadata.id.includes('mrrp')) {
      type = 'mrrp';
    } else if (metadata.id.includes('hiss')) {
      type = 'hiss';
    } else if (metadata.id.includes('sigh')) {
      type = 'sigh';
    }

    return {
      type,
      pitch,
      duration: metadata.duration,
      intensity: 0.7,
      variation: 0.1,
    };
  }

  /**
   * Synthesize sound by type
   */
  private synthesizeByType(params: SynthesisParams, context: Tone.OfflineContext): void {
    switch (params.type) {
      case 'purr':
        this.synthPurr(params, context);
        break;
      case 'meow':
        this.synthMeow(params, context);
        break;
      case 'chirp':
        this.synthChirp(params, context);
        break;
      case 'trill':
        this.synthTrill(params, context);
        break;
      case 'mrrp':
        this.synthMrrp(params, context);
        break;
      case 'hiss':
        this.synthHiss(params, context);
        break;
      case 'sigh':
        this.synthSigh(params, context);
        break;
    }
  }

  /**
   * Synthesize purr sound (low rumbling)
   */
  private synthPurr(params: SynthesisParams, context: Tone.OfflineContext): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.8,
        release: 0.3,
      },
    }).connect(context.destination);

    // Add vibrato for purr-like quality
    const vibrato = new Tone.Vibrato(4, 0.3).connect(synth);

    synth.triggerAttackRelease(params.pitch, params.duration, context.now());
    synth.dispose();
  }

  /**
   * Synthesize meow sound (pitched vocal)
   */
  private synthMeow(params: SynthesisParams, context: Tone.OfflineContext): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.3,
        release: 0.2,
      },
    }).connect(context.destination);

    // Add slight pitch bend for cat-like quality
    const pitchShift = new Tone.PitchShift(2).connect(synth);

    synth.triggerAttackRelease(params.pitch, params.duration, context.now());
    synth.dispose();
  }

  /**
   * Synthesize chirp sound (short percussive)
   */
  private synthChirp(params: SynthesisParams, context: Tone.OfflineContext): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.05,
      },
    }).connect(context.destination);

    const freq = params.pitch * 2; // Higher pitch for chirps
    synth.triggerAttackRelease(freq, params.duration, context.now());
    synth.dispose();
  }

  /**
   * Synthesize trill sound (rolling melodic)
   */
  private synthTrill(params: SynthesisParams, context: Tone.OfflineContext): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.5,
        release: 0.2,
      },
    }).connect(context.destination);

    // Add fast vibrato for trill effect
    const vibrato = new Tone.Vibrato(8, 0.5).connect(synth);

    synth.triggerAttackRelease(params.pitch, params.duration, context.now());
    synth.dispose();
  }

  /**
   * Synthesize mrrp sound (short questioning)
   */
  private synthMrrp(params: SynthesisParams, context: Tone.OfflineContext): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.2,
        release: 0.1,
      },
    }).connect(context.destination);

    synth.triggerAttackRelease(params.pitch * 0.8, params.duration, context.now());
    synth.dispose();
  }

  /**
   * Synthesize hiss sound (noise-based)
   */
  private synthHiss(params: SynthesisParams, context: Tone.OfflineContext): void {
    const noise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.01,
        decay: 0.05,
        sustain: 0.1,
        release: 0.1,
      },
    }).connect(context.destination);

    noise.triggerAttackRelease(params.duration, context.now());
    noise.dispose();
  }

  /**
   * Synthesize sigh sound (breath-like)
   */
  private synthSigh(params: SynthesisParams, context: Tone.OfflineContext): void {
    const noise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: {
        attack: 0.3,
        decay: 0.5,
        sustain: 0.3,
        release: 0.5,
      },
    }).connect(context.destination);

    noise.triggerAttackRelease(params.duration, context.now());
    noise.dispose();
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.loadedSamples.clear();
    this.loading.clear();
  }
}
