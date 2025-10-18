/**
 * ChordGenerator: Generates chord progressions
 * BOC-4: Pattern Generator
 */

import type { EmotionCategory } from '@bots-n-cats/audio-core';
import type { Chord, ChordProgression, Note, MusicalKey, TimeNotation } from '../types/musical';
import { EMOTION_MAPPINGS, CHORD_INTERVALS, NOTE_TO_MIDI } from '../constants/mappings';

export class ChordGenerator {
  /**
   * Generate chord progression based on key and emotion
   * @param key - Musical key
   * @param emotion - Emotion category
   * @param numChords - Number of chords in progression (default: 4)
   * @returns Chord progression
   */
  static generate(
    key: MusicalKey,
    emotion: EmotionCategory,
    numChords: number = 4
  ): ChordProgression {
    const emotionMapping = EMOTION_MAPPINGS[emotion];
    const chordQualities = emotionMapping.chordQualities;

    // Common chord progressions by emotion
    const progressions = this.getProgressionForEmotion(emotion, numChords);
    const chords: Chord[] = [];

    for (let i = 0; i < numChords; i++) {
      const degree = progressions[i % progressions.length];
      const quality = chordQualities[i % chordQualities.length];
      const chord = this.buildChord(key, degree, quality);
      chords.push(chord);
    }

    return {
      chords,
      duration: '1m', // 1 measure per chord
    };
  }

  /**
   * Get chord progression degrees for emotion
   * @param emotion - Emotion category
   * @param numChords - Number of chords needed
   * @returns Array of scale degrees
   */
  private static getProgressionForEmotion(
    emotion: EmotionCategory,
    numChords: number
  ): number[] {
    const progressions: Record<EmotionCategory, number[]> = {
      tension: [1, 4, 5, 1], // i-iv-v-i (minor)
      resolution: [1, 5, 6, 4], // I-V-vi-IV (major)
      activity: [1, 4, 1, 5], // I-IV-I-V (active)
      growth: [1, 3, 6, 4], // I-iii-vi-IV (ascending)
    };

    const progression = progressions[emotion];

    // Extend or truncate to match numChords
    if (numChords <= progression.length) {
      return progression.slice(0, numChords);
    }

    // Repeat pattern if more chords needed
    const extended = [...progression];
    while (extended.length < numChords) {
      extended.push(...progression);
    }
    return extended.slice(0, numChords);
  }

  /**
   * Build a chord from root, degree, and quality
   * @param root - Root note (key)
   * @param degree - Scale degree (1-7)
   * @param quality - Chord quality (e.g., '', 'm', '7')
   * @returns Chord object
   */
  private static buildChord(root: string, degree: number, quality: string): Chord {
    const scale = this.getMajorScale(root);
    const chordRoot = scale[degree - 1];

    // Get intervals for the chord quality
    const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS[''];

    // Build notes from intervals
    const rootMidi = NOTE_TO_MIDI[chordRoot];
    const notes: Note[] = intervals.map((interval) => {
      return this.midiToNote(rootMidi + interval, 4); // Octave 4
    });

    return {
      name: `${chordRoot}${quality}`,
      notes,
    };
  }

  /**
   * Get major scale for a given root
   * @param root - Root note
   * @returns Array of note names in major scale
   */
  private static getMajorScale(root: string): string[] {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = notes.indexOf(root);
    if (rootIndex === -1) return ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    // Major scale intervals: W-W-H-W-W-W-H (2-2-1-2-2-2-1 semitones)
    const intervals = [0, 2, 4, 5, 7, 9, 11];
    return intervals.map((interval) => notes[(rootIndex + interval) % 12]);
  }

  /**
   * Convert MIDI number to note name with octave
   * @param midi - MIDI note number
   * @param octave - Octave number
   * @returns Note name (e.g., 'C4')
   */
  private static midiToNote(midi: number, octave: number): Note {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteIndex = midi % 12;
    return `${notes[noteIndex]}${octave}`;
  }

  /**
   * Generate arpeggio from chord
   * @param chord - Chord to arpeggiate
   * @param pattern - Arpeggio pattern (e.g., [0, 1, 2, 1])
   * @returns Array of notes
   */
  static arpeggiate(chord: Chord, pattern: number[] = [0, 1, 2, 1]): Note[] {
    return pattern.map((index) => chord.notes[index % chord.notes.length]);
  }

  /**
   * Transpose chord by semitones
   * @param chord - Chord to transpose
   * @param semitones - Number of semitones (positive or negative)
   * @returns Transposed chord
   */
  static transpose(chord: Chord, semitones: number): Chord {
    const transposedNotes = chord.notes.map((note) => {
      const noteName = note.slice(0, -1);
      const octave = parseInt(note.slice(-1));
      const midi = NOTE_TO_MIDI[noteName] + semitones;

      return this.midiToNote(midi, octave);
    });

    return {
      name: chord.name,
      notes: transposedNotes,
    };
  }

  /**
   * Get chord voicing (inversion)
   * @param chord - Original chord
   * @param inversion - Inversion number (0 = root, 1 = first, etc.)
   * @returns Inverted chord
   */
  static getVoicing(chord: Chord, inversion: number): Chord {
    const notes = [...chord.notes];
    for (let i = 0; i < inversion; i++) {
      const firstNote = notes.shift();
      if (firstNote) {
        // Move to next octave
        const noteName = firstNote.slice(0, -1);
        const octave = parseInt(firstNote.slice(-1)) + 1;
        notes.push(`${noteName}${octave}`);
      }
    }

    return {
      name: chord.name,
      notes,
    };
  }
}
