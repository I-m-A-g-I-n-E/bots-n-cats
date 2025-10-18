/**
 * PatternGenerator: Generates complete Tone.js patterns
 * BOC-4: Pattern Generator
 */

import type { MusicalParameters, Pattern, TimeNotation } from '../types/musical';
import { MelodyGenerator } from './MelodyGenerator';
import { ChordGenerator } from './ChordGenerator';
import { ParameterMapper } from '../mappers/ParameterMapper';
import { TIME_DIVISIONS } from '../constants/mappings';

export class PatternGenerator {
  /**
   * Generate complete pattern from musical parameters
   * @param params - Musical parameters
   * @returns Complete pattern for Tone.js
   */
  static generate(params: MusicalParameters): Pattern {
    const octave = ParameterMapper.calculateOctave(params as any);
    const velocity = ParameterMapper.intensityToVelocity(params.intensity);

    // Generate melody
    const melody = MelodyGenerator.generate(
      params.scale,
      params.duration,
      octave,
      this.getDensityForEmotion(params.emotion)
    );

    // Generate timing
    const times = this.calculateTiming(melody.durations, params.bpm);

    // Generate chord progression if appropriate
    const chords = ParameterMapper.shouldIncludeChords(params.emotion as string)
      ? ChordGenerator.generate(params.key, params.emotion)
      : undefined;

    // Apply velocity
    const velocities = melody.velocities || melody.notes.map(() => velocity);

    return {
      notes: melody.notes,
      times,
      durations: melody.durations,
      velocities,
      chords,
      metadata: {
        bpm: params.bpm,
        key: params.key,
        scale: params.scale,
        emotion: params.emotion,
      },
    };
  }

  /**
   * Calculate absolute timing for notes
   * @param durations - Array of note durations
   * @param bpm - Beats per minute
   * @returns Array of times in Tone.js notation (e.g., '0:0:0')
   */
  private static calculateTiming(durations: TimeNotation[], bpm: number): string[] {
    const times: string[] = [];
    let currentTime = 0;

    for (let i = 0; i < durations.length; i++) {
      // Convert current time to bars:beats:sixteenths
      const bars = Math.floor(currentTime / 16);
      const beats = Math.floor((currentTime % 16) / 4);
      const sixteenths = currentTime % 4;

      times.push(`${bars}:${beats}:${sixteenths}`);

      // Add duration to current time
      currentTime += this.durationToSixteenths(durations[i]);
    }

    return times;
  }

  /**
   * Convert Tone.js duration notation to sixteenth notes
   * @param duration - Duration in Tone.js notation
   * @returns Number of sixteenth notes
   */
  private static durationToSixteenths(duration: TimeNotation): number {
    const map: Record<string, number> = {
      '1n': 16, // Whole note
      '2n': 8, // Half note
      '4n': 4, // Quarter note
      '8n': 2, // Eighth note
      '16n': 1, // Sixteenth note
      '32n': 0.5, // Thirty-second note
      '2n.': 12, // Dotted half
      '4n.': 6, // Dotted quarter
      '8n.': 3, // Dotted eighth
      '16n.': 1.5, // Dotted sixteenth
    };

    return map[duration] || 4; // Default to quarter note
  }

  /**
   * Get note density based on emotion
   * @param emotion - Emotion category
   * @returns Density value (0-1)
   */
  private static getDensityForEmotion(emotion: string): number {
    const densities: Record<string, number> = {
      tension: 0.6,
      resolution: 0.4,
      activity: 0.8,
      growth: 0.5,
    };

    return densities[emotion] || 0.5;
  }

  /**
   * Generate rhythmic pattern
   * @param bpm - Beats per minute
   * @param bars - Number of bars
   * @returns Rhythm pattern
   */
  static generateRhythm(bpm: number, bars: number = 4): TimeNotation[] {
    const beatsPerBar = 4;
    const totalBeats = bars * beatsPerBar;

    // Generate varied rhythm based on BPM
    if (bpm < 90) {
      // Slow: longer notes
      return this.generateSlowRhythm(totalBeats);
    } else if (bpm < 130) {
      // Medium: mixed durations
      return this.generateMediumRhythm(totalBeats);
    } else {
      // Fast: shorter notes
      return this.generateFastRhythm(totalBeats);
    }
  }

  /**
   * Generate slow rhythm pattern
   * @param beats - Number of beats
   * @returns Array of durations
   */
  private static generateSlowRhythm(beats: number): TimeNotation[] {
    const rhythm: TimeNotation[] = [];
    for (let i = 0; i < beats; i += 2) {
      rhythm.push('2n', '4n');
    }
    return rhythm.slice(0, beats);
  }

  /**
   * Generate medium tempo rhythm pattern
   * @param beats - Number of beats
   * @returns Array of durations
   */
  private static generateMediumRhythm(beats: number): TimeNotation[] {
    const patterns = [
      ['4n', '4n', '8n', '8n'],
      ['4n', '8n', '8n', '4n'],
      ['8n', '8n', '4n', '4n'],
    ];

    const rhythm: TimeNotation[] = [];
    let beatCount = 0;

    while (beatCount < beats) {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      rhythm.push(...pattern);
      beatCount += pattern.length;
    }

    return rhythm.slice(0, beats);
  }

  /**
   * Generate fast rhythm pattern
   * @param beats - Number of beats
   * @returns Array of durations
   */
  private static generateFastRhythm(beats: number): TimeNotation[] {
    const rhythm: TimeNotation[] = [];
    for (let i = 0; i < beats * 2; i++) {
      rhythm.push(Math.random() > 0.5 ? '8n' : '16n');
    }
    return rhythm.slice(0, beats * 2);
  }

  /**
   * Create pattern from chord progression
   * @param chords - Chord progression
   * @param arpeggiate - Whether to arpeggiate chords
   * @returns Pattern
   */
  static fromChords(
    chords: any,
    arpeggiate: boolean = false
  ): { notes: string[]; times: string[]; durations: TimeNotation[] } {
    const notes: string[] = [];
    const times: string[] = [];
    const durations: TimeNotation[] = [];

    chords.chords.forEach((chord: any, index: number) => {
      if (arpeggiate) {
        // Arpeggiate the chord
        const arpNotes = ChordGenerator.arpeggiate(chord);
        arpNotes.forEach((note, i) => {
          notes.push(note);
          times.push(`${index}:${i}:0`);
          durations.push('8n');
        });
      } else {
        // Play chord as block
        notes.push(...chord.notes);
        chord.notes.forEach(() => {
          times.push(`${index}:0:0`);
          durations.push('1m');
        });
      }
    });

    return { notes, times, durations };
  }

  /**
   * Merge melody and chord patterns
   * @param melody - Melody pattern
   * @param chords - Chord pattern
   * @returns Combined pattern
   */
  static mergePatterns(
    melody: Pattern,
    chords: { notes: string[]; times: string[]; durations: TimeNotation[] }
  ): Pattern {
    return {
      notes: [...melody.notes, ...chords.notes],
      times: [...melody.times, ...chords.times],
      durations: [...melody.durations, ...chords.durations],
      velocities: [
        ...(melody.velocities || []),
        ...chords.notes.map(() => 0.5), // Lower velocity for chords
      ],
      metadata: melody.metadata,
    };
  }

  /**
   * Quantize pattern to grid
   * @param pattern - Pattern to quantize
   * @param grid - Grid size in sixteenths
   * @returns Quantized pattern
   */
  static quantize(pattern: Pattern, grid: number = 1): Pattern {
    // Quantize times to nearest grid division
    const quantizedTimes = pattern.times.map((time) => {
      const parts = time.split(':').map((p) => parseInt(p));
      const [bars, beats, sixteenths] = parts;

      // Quantize sixteenths to grid
      const quantizedSixteenths = Math.round(sixteenths / grid) * grid;

      return `${bars}:${beats}:${quantizedSixteenths}`;
    });

    return {
      ...pattern,
      times: quantizedTimes,
    };
  }

  /**
   * Scale pattern velocity by factor
   * @param pattern - Pattern to scale
   * @param factor - Scale factor (0-2)
   * @returns Scaled pattern
   */
  static scaleVelocity(pattern: Pattern, factor: number): Pattern {
    const velocities = (pattern.velocities || pattern.notes.map(() => 0.7)).map((v) =>
      Math.max(0, Math.min(1, v * factor))
    );

    return {
      ...pattern,
      velocities,
    };
  }
}
