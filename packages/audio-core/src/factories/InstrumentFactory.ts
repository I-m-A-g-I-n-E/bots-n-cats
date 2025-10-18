/**
 * BOC-20: Core Audio Infrastructure
 * Factory pattern for creating Tone.js instruments
 *
 * IMPORTANT: Use composition over inheritance
 * InstrumentFactory centralizes instrument creation logic
 */

import * as Tone from 'tone';
import { InstrumentType, InstrumentOptions } from '../types/index.js';

export class InstrumentFactory {
  /**
   * Create a Tone.js instrument
   * @param type Type of instrument to create
   * @param options Configuration options for the instrument
   * @returns Configured Tone.js instrument
   */
  public static create(
    type: InstrumentType,
    options: InstrumentOptions = {}
  ): Tone.Synth | Tone.FMSynth | Tone.PolySynth | Tone.Sampler {
    switch (type) {
      case 'synth':
        return new Tone.Synth(options);

      case 'fmSynth':
        return new Tone.FMSynth(options);

      case 'polySynth':
        // PolySynth requires a voice constructor
        const voiceType = options.voice || Tone.Synth;
        const voiceOptions = options.voiceOptions || {};
        return new Tone.PolySynth(voiceType, voiceOptions);

      case 'sampler':
        return new Tone.Sampler(options);

      default:
        throw new Error(`Unknown instrument type: ${type}`);
    }
  }

  /**
   * Create a synth with preset configuration
   * @param preset Preset name
   * @returns Configured synth
   */
  public static createPreset(preset: string): Tone.Synth | Tone.PolySynth {
    switch (preset) {
      case 'bass':
        return new Tone.Synth({
          oscillator: { type: 'sawtooth' },
          envelope: {
            attack: 0.1,
            decay: 0.2,
            sustain: 0.3,
            release: 0.8,
          },
        });

      case 'lead':
        return new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 0.4,
          },
        });

      case 'pad':
        return new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.5,
            decay: 0.2,
            sustain: 0.7,
            release: 1.5,
          },
        });

      case 'pluck':
        return new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: {
            attack: 0.001,
            decay: 0.2,
            sustain: 0.0,
            release: 0.2,
          },
        });

      default:
        throw new Error(`Unknown preset: ${preset}`);
    }
  }

  /**
   * Create multiple instruments for object pooling
   */
  public static createPool(
    type: InstrumentType,
    count: number,
    options: InstrumentOptions = {}
  ): Array<Tone.Synth | Tone.FMSynth | Tone.PolySynth | Tone.Sampler> {
    const pool: Array<Tone.Synth | Tone.FMSynth | Tone.PolySynth | Tone.Sampler> = [];
    for (let i = 0; i < count; i++) {
      pool.push(InstrumentFactory.create(type, options));
    }
    return pool;
  }

  /**
   * Map programming language to instrument type
   * (Placeholder for BOC-3 music mapping logic)
   */
  public static languageToInstrument(language: string): InstrumentType {
    const languageMap: Record<string, InstrumentType> = {
      javascript: 'fmSynth',
      typescript: 'fmSynth',
      python: 'synth',
      rust: 'polySynth',
      go: 'synth',
      java: 'polySynth',
    };

    return languageMap[language.toLowerCase()] || 'synth';
  }
}
