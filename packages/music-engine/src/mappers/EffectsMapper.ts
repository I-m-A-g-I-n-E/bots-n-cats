/**
 * EffectsMapper: Maps event context to audio effects
 * BOC-3: Music Mapping Engine
 */

import type { NormalizedEvent, EmotionCategory } from '@bots-n-cats/audio-core';
import type { EffectConfig } from '../types/musical';
import { EMOTION_MAPPINGS, DEFAULT_EFFECT_PARAMS, INTENSITY_SCALING } from '../constants/mappings';

export class EffectsMapper {
  /**
   * Map event context to effect configurations
   * @param event - Normalized GitHub event
   * @returns Array of effect configurations
   */
  static contextToEffects(event: NormalizedEvent): EffectConfig[] {
    const effects: EffectConfig[] = [];
    const emotionMapping = EMOTION_MAPPINGS[event.emotion];

    // Add suggested effects based on emotion
    for (const effectType of emotionMapping.suggestedEffects) {
      const config = this.createEffectConfig(effectType, event.emotion, event.intensity);
      if (config) {
        effects.push(config);
      }
    }

    // Add context-specific effects
    effects.push(...this.getContextSpecificEffects(event));

    return effects;
  }

  /**
   * Create effect configuration with intensity scaling
   * @param effectType - Type of effect
   * @param emotion - Emotion category
   * @param intensity - Intensity value (0-1)
   * @returns Effect configuration
   */
  private static createEffectConfig(
    effectType: string,
    emotion: EmotionCategory,
    intensity: number
  ): EffectConfig | null {
    const baseParams = DEFAULT_EFFECT_PARAMS[effectType];
    if (!baseParams) return null;

    // Scale parameters based on intensity
    const scaledParams = this.scaleEffectParams(baseParams, intensity);

    return {
      type: effectType as any,
      params: scaledParams,
    };
  }

  /**
   * Scale effect parameters based on intensity
   * @param baseParams - Base effect parameters
   * @param intensity - Intensity value (0-1)
   * @returns Scaled parameters
   */
  private static scaleEffectParams(
    baseParams: Record<string, any>,
    intensity: number
  ): Record<string, any> {
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    const scaledParams: Record<string, any> = {};

    for (const [key, value] of Object.entries(baseParams)) {
      if (key === 'wet') {
        // Scale wet parameter based on intensity
        const minWet = INTENSITY_SCALING.min;
        const maxWet = INTENSITY_SCALING.max;
        scaledParams[key] = minWet + clampedIntensity * (maxWet - minWet) * value;
      } else {
        // Keep other parameters as-is
        scaledParams[key] = value;
      }
    }

    return scaledParams;
  }

  /**
   * Get context-specific effects based on event metadata
   * @param event - Normalized event
   * @returns Additional effect configurations
   */
  private static getContextSpecificEffects(event: NormalizedEvent): EffectConfig[] {
    const effects: EffectConfig[] = [];
    const metadata = event.metadata;

    // Add distortion for failed tests or errors
    if (metadata.testsFailed || metadata.hasErrors) {
      effects.push({
        type: 'distortion',
        params: {
          distortion: 0.6,
          oversample: '4x',
          wet: 0.4,
        },
      });
    }

    // Add filter sweep for large changes
    if (metadata.linesChanged && metadata.linesChanged > 500) {
      effects.push({
        type: 'filter',
        params: {
          type: 'lowpass',
          frequency: 1200,
          Q: 2,
          wet: 0.5,
        },
      });
    }

    // Add phaser for rapid activity
    if (metadata.commitFrequency && metadata.commitFrequency > 10) {
      effects.push({
        type: 'phaser',
        params: {
          frequency: 1.0,
          octaves: 4,
          baseFrequency: 400,
          wet: 0.3,
        },
      });
    }

    // Add chorus for collaboration (multiple authors)
    if (metadata.authorCount && metadata.authorCount > 1) {
      effects.push({
        type: 'chorus',
        params: {
          frequency: 2.0,
          delayTime: 4.0,
          depth: 0.8,
          wet: 0.35,
        },
      });
    }

    return effects;
  }

  /**
   * Get filter frequency range based on emotion
   * @param emotion - Emotion category
   * @param intensity - Intensity value (0-1)
   * @returns Filter frequency in Hz
   */
  static getFilterFrequency(emotion: EmotionCategory, intensity: number): number {
    const mapping = EMOTION_MAPPINGS[emotion];
    const [min, max] = mapping.filterRange;
    return min + intensity * (max - min);
  }

  /**
   * Determine if reverb should be applied
   * @param emotion - Emotion category
   * @returns True if reverb is appropriate
   */
  static shouldApplyReverb(emotion: EmotionCategory): boolean {
    const mapping = EMOTION_MAPPINGS[emotion];
    return mapping.suggestedEffects.includes('reverb');
  }

  /**
   * Calculate delay time based on BPM
   * @param bpm - Beats per minute
   * @param subdivision - Note subdivision (default: '8n')
   * @returns Delay time in Tone.js notation
   */
  static calculateDelayTime(bpm: number, subdivision: string = '8n'): string {
    // Return Tone.js time notation
    return subdivision;
  }

  /**
   * Get effect intensity modifier for event action
   * @param action - GitHub event action
   * @returns Intensity modifier (0-1)
   */
  static getActionIntensityModifier(action: string): number {
    const modifiers: Record<string, number> = {
      opened: 0.5,
      closed: 0.7,
      merged: 0.9,
      reopened: 0.6,
      created: 0.5,
      deleted: 0.4,
      updated: 0.3,
      completed: 0.8,
      failed: 1.0,
      success: 0.9,
    };

    return modifiers[action] || 0.5;
  }
}
