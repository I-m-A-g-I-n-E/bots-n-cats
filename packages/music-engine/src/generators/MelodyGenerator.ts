/**
 * MelodyGenerator: Generates melodic sequences
 * BOC-4: Pattern Generator
 */

import type { Melody, Scale, Note, TimeNotation } from '../types/musical.js';
import { NOTE_TO_MIDI } from '../constants/mappings.js';

export class MelodyGenerator {
  /**
   * Generate melody from scale
   * @param scale - Musical scale to use
   * @param duration - Total duration in seconds
   * @param octave - Starting octave (default: 4)
   * @param density - Note density 0-1 (default: 0.5)
   * @returns Melody object
   */
  static generate(
    scale: Scale,
    duration: number,
    octave: number = 4,
    density: number = 0.5
  ): Melody {
    const numNotes = Math.max(4, Math.floor((duration * density * 4))); // 4 notes per second at max density
    const notes: Note[] = [];
    const durations: TimeNotation[] = [];
    const velocities: number[] = [];

    let currentIndex = 0;

    for (let i = 0; i < numNotes; i++) {
      // Generate melodic movement (prefer stepwise motion)
      const movement = this.getWeightedMovement();
      currentIndex = this.clampToScale(currentIndex + movement, scale.length);

      // Get note from scale
      const noteName = scale[currentIndex];
      const noteOctave = octave + Math.floor(currentIndex / scale.length);
      notes.push(`${noteName}${noteOctave}`);

      // Vary note durations
      durations.push(this.getNoteDuration(i, numNotes));

      // Vary velocities
      velocities.push(this.getVelocity(i, numNotes));
    }

    return {
      notes,
      durations,
      velocities,
    };
  }

  /**
   * Get weighted melodic movement (prefer steps over leaps)
   * @returns Scale degree movement (-2 to +2)
   */
  private static getWeightedMovement(): number {
    const rand = Math.random();

    // 60% chance of stepwise motion
    if (rand < 0.3) return 1; // Step up
    if (rand < 0.6) return -1; // Step down

    // 30% chance of staying same
    if (rand < 0.8) return 0; // Repeat note

    // 10% chance of leap
    if (rand < 0.9) return 2; // Leap up
    return -2; // Leap down
  }

  /**
   * Clamp index to scale range
   * @param index - Current index
   * @param scaleLength - Length of scale
   * @returns Clamped index
   */
  private static clampToScale(index: number, scaleLength: number): number {
    if (index < 0) return 0;
    if (index >= scaleLength) return scaleLength - 1;
    return index;
  }

  /**
   * Get note duration based on position
   * @param position - Note position in sequence
   * @param total - Total number of notes
   * @returns Time notation
   */
  private static getNoteDuration(position: number, total: number): TimeNotation {
    const durations: TimeNotation[] = ['8n', '8n', '16n', '4n'];

    // Longer notes at phrase endings
    if (position === total - 1) return '4n';

    // Vary durations
    return durations[position % durations.length];
  }

  /**
   * Get velocity based on position (dynamic contour)
   * @param position - Note position in sequence
   * @param total - Total number of notes
   * @returns Velocity (0-1)
   */
  private static getVelocity(position: number, total: number): number {
    // Create dynamic contour (crescendo/decrescendo)
    const midpoint = total / 2;
    const distance = Math.abs(position - midpoint);
    const normalized = distance / midpoint;

    // Crescendo to middle, decrescendo after
    return 0.5 + (0.5 * (1 - normalized));
  }

  /**
   * Generate pentatonic melody (simpler, more consonant)
   * @param scale - Musical scale
   * @param numNotes - Number of notes to generate
   * @param octave - Octave number
   * @returns Array of notes
   */
  static generatePentatonic(scale: Scale, numNotes: number, octave: number = 4): Note[] {
    // Use only scale degrees 1, 2, 3, 5, 6 (pentatonic subset)
    const pentatonicIndices = [0, 1, 2, 4, 5];
    const notes: Note[] = [];

    for (let i = 0; i < numNotes; i++) {
      const index = pentatonicIndices[Math.floor(Math.random() * pentatonicIndices.length)];
      const noteName = scale[index];
      notes.push(`${noteName}${octave}`);
    }

    return notes;
  }

  /**
   * Generate rhythmic pattern
   * @param length - Number of beats
   * @param subdivision - Time subdivision (default: '16n')
   * @returns Array of time notations
   */
  static generateRhythm(length: number, subdivision: TimeNotation = '16n'): TimeNotation[] {
    const rhythm: TimeNotation[] = [];
    const patterns = [
      ['8n', '8n', '16n', '16n'],
      ['4n', '8n', '8n'],
      ['16n', '16n', '8n', '16n', '16n'],
      ['8n', '16n', '16n', '8n'],
    ];

    let remaining = length;
    while (remaining > 0) {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      rhythm.push(...pattern);
      remaining -= pattern.length;
    }

    return rhythm.slice(0, length);
  }

  /**
   * Create motif (short musical phrase) and repeat with variation
   * @param scale - Musical scale
   * @param motifLength - Length of motif (default: 4)
   * @param repetitions - Number of repetitions (default: 3)
   * @param octave - Octave number
   * @returns Array of notes
   */
  static createMotif(
    scale: Scale,
    motifLength: number = 4,
    repetitions: number = 3,
    octave: number = 4
  ): Note[] {
    // Create initial motif
    const motif: Note[] = [];
    let currentIndex = 0;

    for (let i = 0; i < motifLength; i++) {
      const movement = this.getWeightedMovement();
      currentIndex = this.clampToScale(currentIndex + movement, scale.length);
      const noteName = scale[currentIndex];
      motif.push(`${noteName}${octave}`);
    }

    // Repeat with variations
    const result: Note[] = [...motif];
    for (let i = 1; i < repetitions; i++) {
      // Transpose or vary the motif
      const variation = this.varyMotif(motif, scale, i);
      result.push(...variation);
    }

    return result;
  }

  /**
   * Create variation of a motif
   * @param motif - Original motif
   * @param scale - Musical scale
   * @param variationIndex - Which variation to create
   * @returns Varied motif
   */
  private static varyMotif(motif: Note[], scale: Scale, variationIndex: number): Note[] {
    const variation: Note[] = [];

    for (const note of motif) {
      const noteName = note.slice(0, -1);
      const octave = parseInt(note.slice(-1));

      // Different variation techniques
      if (variationIndex % 3 === 0) {
        // Transpose up
        variation.push(`${noteName}${octave + 1}`);
      } else if (variationIndex % 3 === 1) {
        // Invert (flip intervals)
        const noteIndex = scale.indexOf(noteName);
        if (noteIndex !== -1) {
          const invertedIndex = scale.length - 1 - noteIndex;
          variation.push(`${scale[invertedIndex]}${octave}`);
        } else {
          variation.push(note);
        }
      } else {
        // Rhythmic variation (keep same notes)
        variation.push(note);
      }
    }

    return variation;
  }

  /**
   * Generate walking bass line
   * @param scale - Musical scale
   * @param numNotes - Number of notes
   * @param octave - Octave (default: 2 for bass)
   * @returns Array of notes
   */
  static generateBassLine(scale: Scale, numNotes: number, octave: number = 2): Note[] {
    const notes: Note[] = [];

    // Bass lines emphasize root, fifth, and octave
    const bassIndices = [0, 4, 0, 2]; // Root, fifth, root, third pattern

    for (let i = 0; i < numNotes; i++) {
      const index = bassIndices[i % bassIndices.length];
      if (index < scale.length) {
        notes.push(`${scale[index]}${octave}`);
      }
    }

    return notes;
  }
}
