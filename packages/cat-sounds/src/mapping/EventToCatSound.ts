/**
 * Event to Cat Sound Mapping
 * BOC-12: Maps GitHub events to appropriate cat sounds
 *
 * Determines which cat sound to play for each GitHub event
 */

import type { NormalizedEvent } from '@bots-n-cats/audio-core';
import type { CatSoundInstruction } from '../types/cat-sounds.js';

/**
 * Event mapping configuration
 */
interface EventMapping {
  soundId: string;
  pitch?: string;
  timing: CatSoundInstruction['timing'];
  volume: number;
  delay?: string;
  duration?: string;
}

/**
 * Maps GitHub events to cat sound instructions
 */
export class EventToCatSound {
  /**
   * Static mapping of event types to cat sounds
   */
  private static readonly EVENT_MAPPINGS: Record<string, EventMapping> = {
    // Pull Request Events
    'pull_request:opened': {
      soundId: 'curious_trill',
      pitch: 'E4',
      timing: 'upbeat',
      volume: 0.6,
      delay: '+0.25',
      duration: '8n',
    },
    'pull_request:merged': {
      soundId: 'content_meow',
      pitch: 'C4',
      timing: 'downbeat',
      volume: 0.8,
      duration: '4n',
    },
    'pull_request:closed': {
      soundId: 'sleepy_sigh',
      timing: 'free',
      volume: 0.5,
      delay: '+0.5',
    },

    // Check Run Events
    'check_run:completed:success': {
      soundId: 'happy_chirp_sequence',
      pitch: 'E4',
      timing: 'upbeat',
      volume: 0.7,
      delay: '+0.5',
    },
    'check_run:completed:failure': {
      soundId: 'disappointed_mrrp',
      pitch: 'G3',
      timing: 'offbeat',
      volume: 0.3,
      delay: '+0.1',
    },
    'check_run:in_progress': {
      soundId: 'gentle_chirp',
      timing: 'quantized',
      volume: 0.4,
    },

    // Push Events
    'push': {
      soundId: 'playful_meow',
      pitch: 'D4',
      timing: 'quantized',
      volume: 0.5,
      duration: '16n',
    },

    // Deployment Events
    'deployment_status:success': {
      soundId: 'satisfied_purr_burst',
      timing: 'downbeat',
      volume: 0.9,
      delay: '+1n',
    },
    'deployment_status:failure': {
      soundId: 'tiny_hiss',
      timing: 'offbeat',
      volume: 0.3,
      delay: '+0.5',
    },

    // Issue Events
    'issues:opened': {
      soundId: 'question_meow',
      pitch: 'E4',
      timing: 'upbeat',
      volume: 0.6,
    },
    'issues:closed': {
      soundId: 'content_meow',
      pitch: 'C4',
      timing: 'downbeat',
      volume: 0.7,
    },

    // Issue Comment Events
    'issue_comment:created': {
      soundId: 'gentle_chirp',
      timing: 'quantized',
      volume: 0.4,
      duration: '32n',
    },

    // Pull Request Review Events
    'pull_request_review:submitted:approved': {
      soundId: 'excited_chirp',
      timing: 'upbeat',
      volume: 0.7,
      delay: '+0.25',
    },
    'pull_request_review:submitted:changes_requested': {
      soundId: 'disappointed_mrrp',
      pitch: 'G3',
      timing: 'offbeat',
      volume: 0.4,
    },

    // Workflow Run Events
    'workflow_run:completed:success': {
      soundId: 'happy_chirp_sequence',
      pitch: 'G4',
      timing: 'downbeat',
      volume: 0.8,
    },
    'workflow_run:completed:failure': {
      soundId: 'tiny_hiss',
      timing: 'offbeat',
      volume: 0.3,
    },
  };

  /**
   * Get cat sound instruction for a normalized event
   */
  static getCatSoundForEvent(event: NormalizedEvent): CatSoundInstruction | null {
    // Build lookup key
    const baseKey = `${event.eventType}:${event.action}`;

    // Check for specific mapping with metadata
    let mapping = this.getSpecificMapping(event);

    // Fallback to base mapping
    if (!mapping) {
      mapping = this.EVENT_MAPPINGS[baseKey];
    }

    // Fallback to emotion-based mapping
    if (!mapping) {
      mapping = this.getEmotionBasedMapping(event);
    }

    if (!mapping) {
      return null;
    }

    // Build instruction
    return {
      soundId: mapping.soundId,
      pitch: mapping.pitch,
      timing: mapping.timing,
      volume: this.adjustVolumeByIntensity(mapping.volume, event.intensity),
      delay: mapping.delay,
      duration: mapping.duration,
    };
  }

  /**
   * Get specific mapping based on event metadata
   */
  private static getSpecificMapping(event: NormalizedEvent): EventMapping | undefined {
    const key = `${event.eventType}:${event.action}`;

    // Check run with conclusion
    if (event.eventType === 'check_run' && event.metadata.conclusion) {
      const specificKey = `${key}:${event.metadata.conclusion}`;
      return this.EVENT_MAPPINGS[specificKey];
    }

    // Deployment with status
    if (event.eventType === 'deployment_status' && event.metadata.state) {
      const specificKey = `${key}:${event.metadata.state}`;
      return this.EVENT_MAPPINGS[specificKey];
    }

    // Pull request review with state
    if (event.eventType === 'pull_request_review' && event.metadata.state) {
      const specificKey = `${key}:${event.metadata.state}`;
      return this.EVENT_MAPPINGS[specificKey];
    }

    // Workflow run with conclusion
    if (event.eventType === 'workflow_run' && event.metadata.conclusion) {
      const specificKey = `${key}:${event.metadata.conclusion}`;
      return this.EVENT_MAPPINGS[specificKey];
    }

    return undefined;
  }

  /**
   * Get emotion-based fallback mapping
   */
  private static getEmotionBasedMapping(event: NormalizedEvent): EventMapping {
    switch (event.emotion) {
      case 'resolution':
        return {
          soundId: 'content_meow',
          pitch: 'C4',
          timing: 'downbeat',
          volume: 0.7,
          duration: '4n',
        };

      case 'tension':
        return {
          soundId: 'disappointed_mrrp',
          pitch: 'G3',
          timing: 'offbeat',
          volume: 0.4,
        };

      case 'activity':
        return {
          soundId: 'playful_meow',
          pitch: 'D4',
          timing: 'quantized',
          volume: 0.5,
          duration: '8n',
        };

      case 'growth':
        return {
          soundId: 'curious_trill',
          pitch: 'E4',
          timing: 'upbeat',
          volume: 0.6,
        };

      default:
        return {
          soundId: 'gentle_chirp',
          timing: 'quantized',
          volume: 0.4,
        };
    }
  }

  /**
   * Adjust volume based on event intensity
   */
  private static adjustVolumeByIntensity(baseVolume: number, intensity: number): number {
    // Intensity is 0-1, scale volume accordingly
    return Math.min(1, baseVolume * (0.5 + intensity * 0.5));
  }

  /**
   * Get background ambient sound based on overall emotion
   */
  static getAmbientSound(emotion: 'tension' | 'resolution' | 'activity' | 'growth'): CatSoundInstruction | null {
    switch (emotion) {
      case 'resolution':
        return {
          soundId: 'gentle_purr_pad',
          timing: 'free',
          volume: 0.2,
        };

      case 'activity':
        return {
          soundId: 'kneading_rhythm',
          timing: 'downbeat',
          volume: 0.3,
        };

      default:
        return null;
    }
  }

  /**
   * Check if event should trigger a cat sound
   * (Some events might be too frequent or low-priority)
   */
  static shouldPlaySound(event: NormalizedEvent): boolean {
    // Always play sounds for these important events
    const alwaysPlay = ['pull_request', 'deployment_status', 'check_run'];
    if (alwaysPlay.includes(event.eventType)) {
      return true;
    }

    // For other events, check intensity threshold
    return event.intensity >= 0.3;
  }
}
