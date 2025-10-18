/**
 * OfflineRenderer
 * Uses Tone.Offline for deterministic audio rendering
 * BOC-13: Real-time streaming system
 */

import * as Tone from 'tone';
import { MusicalParameters, Pattern } from '../types/index.js';

export class OfflineRenderer {
  /**
   * Render a composition using Tone.Offline
   */
  async render(params: MusicalParameters): Promise<AudioBuffer> {
    console.log(`[OfflineRenderer] Rendering composition: ${params.duration}s at ${params.tempo} BPM`);

    const toneBuffer = await Tone.Offline(({ transport }) => {
      // Set transport tempo
      transport.bpm.value = params.tempo;

      // Create instrument
      const instrument = this.createInstrument(params);
      instrument.toDestination();

      // Generate or use provided pattern
      const pattern = params.pattern || this.generateDefaultPattern(params);

      // Schedule pattern
      this.schedulePattern(instrument, pattern, transport);

      // Start transport
      transport.start(0);
    }, params.duration);

    console.log(`[OfflineRenderer] Rendered buffer: ${toneBuffer.duration}s, ${toneBuffer.numberOfChannels} channels`);

    // Convert ToneAudioBuffer to AudioBuffer
    return toneBuffer.get() as AudioBuffer;
  }

  /**
   * Create instrument based on parameters
   */
  private createInstrument(params: MusicalParameters): Tone.Synth | Tone.FMSynth | Tone.PolySynth {
    const options = params.instrumentOptions || {};

    switch (params.instrumentType) {
      case 'fmSynth':
        return new Tone.FMSynth(options);

      case 'polySynth':
        return new Tone.PolySynth(options);

      case 'sampler':
        // For sampler, we'd need sample URLs
        // Fallback to synth for now
        console.warn('[OfflineRenderer] Sampler not yet implemented, using synth');
        return new Tone.Synth(options);

      case 'synth':
      default:
        return new Tone.Synth(options);
    }
  }

  /**
   * Generate a default pattern if none provided
   */
  private generateDefaultPattern(params: MusicalParameters): Pattern {
    const notes: string[] = [];
    const durations: string[] = [];
    const times: string[] = [];
    const velocities: number[] = [];

    // Simple arpeggio pattern using the scale
    const scale = params.scale || ['C4', 'E4', 'G4', 'B4'];
    const noteCount = Math.min(16, Math.floor(params.duration * 4)); // 4 notes per second max

    for (let i = 0; i < noteCount; i++) {
      notes.push(scale[i % scale.length]);
      durations.push('8n'); // Eighth notes
      times.push(`${i * 0.25}s`); // Quarter note spacing
      velocities.push(0.5 + Math.random() * 0.3); // Varied velocity
    }

    return { notes, durations, times, velocities };
  }

  /**
   * Schedule pattern on the transport
   */
  private schedulePattern(
    instrument: Tone.Synth | Tone.FMSynth | Tone.PolySynth,
    pattern: Pattern,
    transport: typeof Tone.Transport
  ): void {
    pattern.notes.forEach((note, i) => {
      const time = pattern.times[i];
      const duration = pattern.durations[i];
      const velocity = pattern.velocities[i];

      transport.schedule((scheduleTime: number) => {
        instrument.triggerAttackRelease(note, duration, scheduleTime, velocity);
      }, time);
    });
  }

  /**
   * Render a simple test tone (useful for debugging)
   */
  async renderTestTone(duration = 2, frequency = 440): Promise<AudioBuffer> {
    console.log(`[OfflineRenderer] Rendering test tone: ${frequency}Hz for ${duration}s`);

    const toneBuffer = await Tone.Offline(({ transport }) => {
      const synth = new Tone.Synth().toDestination();

      transport.schedule((time: number) => {
        synth.triggerAttackRelease(Tone.Frequency(frequency, 'hz').toNote(), duration, time);
      }, 0);

      transport.start(0);
    }, duration);

    return toneBuffer.get() as AudioBuffer;
  }
}
