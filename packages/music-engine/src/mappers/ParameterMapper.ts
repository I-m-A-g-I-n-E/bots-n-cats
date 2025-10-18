/**
 * ParameterMapper: Maps GitHub event metadata to musical parameters
 * BOC-3: Music Mapping Engine
 */

import type { NormalizedEvent } from '@bots-n-cats/audio-core';
import type { MusicalParameters, InstrumentOptions, Scale } from '../types/musical';
import { InstrumentMapper } from './InstrumentMapper';
import { TempoMapper } from './TempoMapper';
import { EffectsMapper } from './EffectsMapper';
import {
  EMOTION_MAPPINGS,
  SCALES,
  NOTE_TO_MIDI,
  LINES_TO_DURATION,
} from '../constants/mappings';

export class ParameterMapper {
  /**
   * Map a normalized GitHub event to musical parameters
   * @param event - Normalized GitHub event
   * @returns Complete musical parameters
   */
  static map(event: NormalizedEvent): MusicalParameters {
    const emotionMapping = EMOTION_MAPPINGS[event.emotion];

    // Determine base BPM from commit frequency
    const commitFrequency = event.metadata.commitFrequency || 0;
    const baseBPM = TempoMapper.commitFrequencyToBPM(commitFrequency);

    // Apply emotion modifier to BPM
    const bpm = TempoMapper.applyEmotionModifier(baseBPM, emotionMapping.bpmModifier);

    return {
      instrumentType: InstrumentMapper.languageToInstrument(event.metadata.language),
      bpm,
      key: this.contributorToKey(event.metadata.author),
      scale: this.emotionToScale(event.emotion),
      duration: this.linesToDuration(event.metadata.linesChanged || 0),
      effects: EffectsMapper.contextToEffects(event),
      instrumentOptions: this.emotionToInstrumentOptions(event.emotion, event.intensity),
      emotion: event.emotion,
      intensity: event.intensity,
    };
  }

  /**
   * Map emotion to musical scale
   * @param emotion - Emotion category
   * @returns Musical scale
   */
  private static emotionToScale(emotion: string): Scale {
    const mapping = EMOTION_MAPPINGS[emotion as keyof typeof EMOTION_MAPPINGS];
    if (!mapping) {
      return SCALES.major;
    }

    const scaleType = mapping.scaleType;
    return SCALES[scaleType] || SCALES.major;
  }

  /**
   * Map contributor name to musical key
   * Uses a hash of the name to consistently select a key
   * @param author - Contributor name
   * @returns Musical key
   */
  private static contributorToKey(author?: string): string {
    if (!author) {
      return 'C'; // Default key
    }

    // Hash the author name to get a consistent index
    const hash = this.hashString(author);
    const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    return keys[hash % keys.length];
  }

  /**
   * Simple string hash function
   * @param str - String to hash
   * @returns Hash value
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Map lines changed to duration
   * @param linesChanged - Number of lines changed
   * @returns Duration in seconds
   */
  private static linesToDuration(linesChanged: number): number {
    const { min, max, scale } = LINES_TO_DURATION;
    const normalized = Math.min(linesChanged / scale, 1);
    return min + normalized * (max - min);
  }

  /**
   * Map emotion to instrument options
   * @param emotion - Emotion category
   * @param intensity - Intensity value (0-1)
   * @returns Instrument options
   */
  private static emotionToInstrumentOptions(
    emotion: string,
    intensity: number
  ): InstrumentOptions {
    const mapping = EMOTION_MAPPINGS[emotion as keyof typeof EMOTION_MAPPINGS];
    if (!mapping) {
      return this.getDefaultInstrumentOptions();
    }

    const filterFreq = EffectsMapper.getFilterFrequency(
      emotion as any,
      intensity
    );

    return {
      oscillator: {
        type: mapping.waveform,
      },
      envelope: this.getEnvelopeForEmotion(emotion),
      filter: {
        type: 'lowpass',
        frequency: filterFreq,
        Q: 1,
      },
      volume: -12, // Default volume in dB
    };
  }

  /**
   * Get ADSR envelope settings for emotion
   * @param emotion - Emotion category
   * @returns Envelope settings
   */
  private static getEnvelopeForEmotion(emotion: string): {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  } {
    const envelopes: Record<string, any> = {
      tension: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 0.8,
      },
      resolution: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.7,
        release: 1.2,
      },
      activity: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.2,
      },
      growth: {
        attack: 0.2,
        decay: 0.5,
        sustain: 0.6,
        release: 1.5,
      },
    };

    return envelopes[emotion] || envelopes.resolution;
  }

  /**
   * Get default instrument options
   * @returns Default instrument options
   */
  private static getDefaultInstrumentOptions(): InstrumentOptions {
    return {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.5,
        release: 0.8,
      },
      filter: {
        type: 'lowpass',
        frequency: 800,
        Q: 1,
      },
      volume: -12,
    };
  }

  /**
   * Calculate octave based on event metadata
   * @param metadata - Event metadata
   * @returns Octave number (3-5)
   */
  static calculateOctave(metadata: Record<string, any>): number {
    const linesChanged = metadata.linesChanged || 0;

    if (linesChanged < 50) return 3;
    if (linesChanged < 200) return 4;
    return 5;
  }

  /**
   * Get velocity based on intensity
   * @param intensity - Intensity value (0-1)
   * @returns Velocity value (0-1)
   */
  static intensityToVelocity(intensity: number): number {
    const minVelocity = 0.3;
    const maxVelocity = 1.0;
    return minVelocity + intensity * (maxVelocity - minVelocity);
  }

  /**
   * Determine if pattern should include chords
   * @param emotion - Emotion category
   * @returns True if chords should be included
   */
  static shouldIncludeChords(emotion: string): boolean {
    return emotion === 'resolution' || emotion === 'growth';
  }
}
