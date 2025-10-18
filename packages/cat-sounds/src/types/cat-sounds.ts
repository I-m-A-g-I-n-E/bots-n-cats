/**
 * Type definitions for cat sounds
 * BOC-11, BOC-12: Cat Sound Library and Musical Integration
 */

import type { EmotionCategory } from '@bots-n-cats/audio-core';

/**
 * Cat sound categories
 */
export type CatSoundCategory = 'rhythmic' | 'melodic' | 'textural' | 'expressive';

/**
 * Musical timing strategies for cat sounds
 */
export type TimingStrategy = 'downbeat' | 'upbeat' | 'offbeat' | 'quantized' | 'free';

/**
 * Cat sound metadata
 */
export interface CatSound {
  id: string;
  name: string;
  category: CatSoundCategory;
  pitch?: string;        // Musical pitch e.g., 'C4', 'D4'
  bpm?: number;          // For rhythmic sounds
  duration: number;      // In seconds
  loopable: boolean;
  emotion: EmotionCategory;
  url?: string;          // Future: actual sound file
  description: string;
}

/**
 * Cat sound instruction for playback
 */
export interface CatSoundInstruction {
  soundId: string;
  pitch?: string;        // Override pitch
  timing: TimingStrategy;
  volume: number;        // 0-1
  delay?: string;        // Tone.js time string (e.g., '+0.5', '+1n')
  duration?: string;     // Tone.js time string (e.g., '4n', '8n')
}

/**
 * Sampler configuration
 */
export interface CatSamplerConfig {
  name: string;
  samples: Record<string, string>;  // pitch -> sample ID
  release?: number;
  attack?: number;
  volume?: number;
}

/**
 * Sample synthesis parameters
 */
export interface SynthesisParams {
  type: 'purr' | 'meow' | 'chirp' | 'trill' | 'mrrp' | 'hiss' | 'sigh';
  pitch: number;          // Frequency in Hz
  duration: number;       // In seconds
  intensity: number;      // 0-1
  variation?: number;     // Random variation 0-1
}
