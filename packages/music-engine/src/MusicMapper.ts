/**
 * MusicMapper: Core orchestrator for music mapping
 * BOC-3: Music Mapping Engine
 *
 * Subscribes to GitHub webhook events from AudioEventBus and transforms them
 * into musical parameters and patterns using the audio-core services.
 */

import {
  AudioEventBus,
  InstrumentFactory,
  type NormalizedEvent,
  type GitHubEventType,
} from '@bots-n-cats/audio-core';
import { ParameterMapper } from './mappers/ParameterMapper.js';
import { PatternGenerator } from './generators/PatternGenerator.js';
import type { Pattern } from './types/musical.js';

/**
 * Service interfaces (these will be implemented in audio-services branch)
 * For now, we define the interfaces so the code compiles
 */
interface AudioService {
  createInstrument(type: string, options: any): { id: string; instrument: any };
  applyTransformation(emotion: string, intensity: number): void;
}

interface TransportService {
  setBPM(bpm: number): void;
  start(): void;
  stop(): void;
}

interface SequencingService {
  schedulePattern(pattern: Pattern, instrumentId: string): void;
}

interface EffectsService {
  applyEffect(instrumentId: string, effectType: string, params: any): void;
}

/**
 * MusicMapper configuration
 */
export interface MusicMapperConfig {
  /** Enable debug logging */
  debug?: boolean;

  /** Auto-start transport */
  autoStart?: boolean;
}

/**
 * Main MusicMapper class
 */
export class MusicMapper {
  private eventBus: AudioEventBus;
  private audioService?: AudioService;
  private transportService?: TransportService;
  private sequencingService?: SequencingService;
  private effectsService?: EffectsService;
  private config: MusicMapperConfig;
  private activeInstruments: Map<string, string> = new Map();

  /**
   * Create a new MusicMapper
   * @param eventBus - AudioEventBus instance
   * @param services - Optional service instances (will be available from audio-services)
   * @param config - Configuration options
   */
  constructor(
    eventBus: AudioEventBus,
    services?: {
      audioService?: AudioService;
      transportService?: TransportService;
      sequencingService?: SequencingService;
      effectsService?: EffectsService;
    },
    config: MusicMapperConfig = {}
  ) {
    this.eventBus = eventBus;
    this.audioService = services?.audioService;
    this.transportService = services?.transportService;
    this.sequencingService = services?.sequencingService;
    this.effectsService = services?.effectsService;
    this.config = config;

    // Subscribe to all GitHub event types
    this.subscribeToEvents();

    if (this.config.debug) {
      console.log('[MusicMapper] Initialized and subscribed to events');
    }
  }

  /**
   * Subscribe to all GitHub webhook events
   */
  private subscribeToEvents(): void {
    const eventTypes: GitHubEventType[] = [
      'push',
      'pull_request',
      'pull_request_review',
      'check_run',
      'deployment_status',
      'issues',
      'issue_comment',
      'workflow_run',
    ];

    for (const eventType of eventTypes) {
      this.eventBus.subscribe(`webhook:github:${eventType}`, (event: NormalizedEvent) => {
        this.handleEvent(event);
      });
    }

    if (this.config.debug) {
      console.log(`[MusicMapper] Subscribed to ${eventTypes.length} event types`);
    }
  }

  /**
   * Handle incoming GitHub event
   * @param event - Normalized GitHub event
   */
  private async handleEvent(event: NormalizedEvent): Promise<void> {
    try {
      if (this.config.debug) {
        console.log(`[MusicMapper] Handling ${event.eventType} event`, {
          emotion: event.emotion,
          intensity: event.intensity,
        });
      }

      // Route to specific handler based on event type
      switch (event.eventType) {
        case 'push':
          await this.handlePush(event);
          break;
        case 'pull_request':
          await this.handlePullRequest(event);
          break;
        case 'pull_request_review':
          await this.handlePullRequestReview(event);
          break;
        case 'check_run':
          await this.handleCheckRun(event);
          break;
        case 'deployment_status':
          await this.handleDeploymentStatus(event);
          break;
        case 'issues':
          await this.handleIssues(event);
          break;
        case 'issue_comment':
          await this.handleIssueComment(event);
          break;
        case 'workflow_run':
          await this.handleWorkflowRun(event);
          break;
        default:
          if (this.config.debug) {
            console.log(`[MusicMapper] Unknown event type: ${event.eventType}`);
          }
      }
    } catch (error) {
      console.error('[MusicMapper] Error handling event:', error);
    }
  }

  /**
   * Handle push events
   */
  private async handlePush(event: NormalizedEvent): Promise<void> {
    // 1. Map to musical parameters
    const params = ParameterMapper.map(event);

    if (this.config.debug) {
      console.log('[MusicMapper] Push event params:', {
        instrument: params.instrumentType,
        bpm: params.bpm,
        key: params.key,
        emotion: params.emotion,
      });
    }

    // 2. Create/get instrument (when services are available)
    if (this.audioService) {
      const { id, instrument } = this.audioService.createInstrument(
        params.instrumentType,
        params.instrumentOptions
      );
      this.activeInstruments.set(event.eventType, id);

      // 3. Apply transformation based on emotion
      this.audioService.applyTransformation(event.emotion, event.intensity);

      // 4. Set BPM
      if (this.transportService) {
        this.transportService.setBPM(params.bpm);

        if (this.config.autoStart) {
          this.transportService.start();
        }
      }

      // 5. Generate and schedule pattern
      const pattern = PatternGenerator.generate(params);

      if (this.sequencingService) {
        this.sequencingService.schedulePattern(pattern, id);
      }

      // 6. Apply effects
      if (this.effectsService && params.effects) {
        for (const effect of params.effects) {
          this.effectsService.applyEffect(id, effect.type, effect.params);
        }
      }
    } else {
      // Services not available yet - just generate the pattern
      const pattern = PatternGenerator.generate(params);

      if (this.config.debug) {
        console.log('[MusicMapper] Generated pattern:', {
          noteCount: pattern.notes.length,
          bpm: pattern.metadata?.bpm,
          key: pattern.metadata?.key,
        });
      }

      // CRITICAL: Publish music:generated event for StreamingService
      // Transform music-engine's MusicalParameters to streaming-server's format
      await this.eventBus.publish('music:generated', {
        repoId: event.metadata.repository,
        musicalParams: {
          tempo: params.bpm,
          scale: params.scale,
          rootNote: params.key,
          instrumentType: params.instrumentType,
          instrumentOptions: params.instrumentOptions,
          duration: params.duration,
          pattern: pattern,
        },
        eventType: event.eventType,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle pull request events
   */
  private async handlePullRequest(event: NormalizedEvent): Promise<void> {
    const params = ParameterMapper.map(event);
    const pattern = PatternGenerator.generate(params);

    if (this.config.debug) {
      console.log('[MusicMapper] Pull request event:', {
        action: event.action,
        emotion: event.emotion,
        pattern: pattern.notes.length + ' notes',
      });
    }

    // Implementation similar to handlePush
    await this.applyMusicalTransformation(event, params, pattern);
  }

  /**
   * Handle pull request review events
   */
  private async handlePullRequestReview(event: NormalizedEvent): Promise<void> {
    const params = ParameterMapper.map(event);
    const pattern = PatternGenerator.generate(params);

    if (this.config.debug) {
      console.log('[MusicMapper] PR review event:', event.action);
    }

    await this.applyMusicalTransformation(event, params, pattern);
  }

  /**
   * Handle check run events (CI/CD)
   */
  private async handleCheckRun(event: NormalizedEvent): Promise<void> {
    const params = ParameterMapper.map(event);
    const pattern = PatternGenerator.generate(params);

    if (this.config.debug) {
      console.log('[MusicMapper] Check run event:', {
        action: event.action,
        emotion: event.emotion,
      });
    }

    await this.applyMusicalTransformation(event, params, pattern);
  }

  /**
   * Handle deployment status events
   */
  private async handleDeploymentStatus(event: NormalizedEvent): Promise<void> {
    const params = ParameterMapper.map(event);
    const pattern = PatternGenerator.generate(params);

    if (this.config.debug) {
      console.log('[MusicMapper] Deployment status:', event.action);
    }

    await this.applyMusicalTransformation(event, params, pattern);
  }

  /**
   * Handle issues events
   */
  private async handleIssues(event: NormalizedEvent): Promise<void> {
    const params = ParameterMapper.map(event);
    const pattern = PatternGenerator.generate(params);

    if (this.config.debug) {
      console.log('[MusicMapper] Issues event:', event.action);
    }

    await this.applyMusicalTransformation(event, params, pattern);
  }

  /**
   * Handle issue comment events
   */
  private async handleIssueComment(event: NormalizedEvent): Promise<void> {
    const params = ParameterMapper.map(event);
    const pattern = PatternGenerator.generate(params);

    if (this.config.debug) {
      console.log('[MusicMapper] Issue comment:', event.action);
    }

    await this.applyMusicalTransformation(event, params, pattern);
  }

  /**
   * Handle workflow run events
   */
  private async handleWorkflowRun(event: NormalizedEvent): Promise<void> {
    const params = ParameterMapper.map(event);
    const pattern = PatternGenerator.generate(params);

    if (this.config.debug) {
      console.log('[MusicMapper] Workflow run:', event.action);
    }

    await this.applyMusicalTransformation(event, params, pattern);
  }

  /**
   * Common transformation logic (extracted to avoid repetition)
   */
  private async applyMusicalTransformation(
    event: NormalizedEvent,
    params: any,
    pattern: Pattern
  ): Promise<void> {
    if (!this.audioService) {
      // Services not yet available - publish event for StreamingService
      // Transform music-engine's MusicalParameters to streaming-server's format
      await this.eventBus.publish('music:generated', {
        repoId: event.metadata.repository,
        musicalParams: {
          tempo: params.bpm,
          scale: params.scale,
          rootNote: params.key,
          instrumentType: params.instrumentType,
          instrumentOptions: params.instrumentOptions,
          duration: params.duration,
          pattern: pattern,
        },
        eventType: event.eventType,
        timestamp: Date.now(),
      });
      return;
    }

    // Create instrument
    const { id } = this.audioService.createInstrument(
      params.instrumentType,
      params.instrumentOptions
    );

    // Apply transformation
    this.audioService.applyTransformation(event.emotion, event.intensity);

    // Set tempo
    if (this.transportService) {
      this.transportService.setBPM(params.bpm);
    }

    // Schedule pattern
    if (this.sequencingService) {
      this.sequencingService.schedulePattern(pattern, id);
    }

    // Apply effects
    if (this.effectsService && params.effects) {
      for (const effect of params.effects) {
        this.effectsService.applyEffect(id, effect.type, effect.params);
      }
    }
  }

  /**
   * Get statistics about mapped events
   */
  getStats(): {
    activeInstruments: number;
    subscribedEvents: number;
  } {
    return {
      activeInstruments: this.activeInstruments.size,
      subscribedEvents: 8, // Number of event types we subscribe to
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.activeInstruments.clear();

    // Clear event subscriptions
    this.eventBus.clear('webhook:github:push');
    this.eventBus.clear('webhook:github:pull_request');
    this.eventBus.clear('webhook:github:pull_request_review');
    this.eventBus.clear('webhook:github:check_run');
    this.eventBus.clear('webhook:github:deployment_status');
    this.eventBus.clear('webhook:github:issues');
    this.eventBus.clear('webhook:github:issue_comment');
    this.eventBus.clear('webhook:github:workflow_run');

    if (this.config.debug) {
      console.log('[MusicMapper] Disposed');
    }
  }
}
