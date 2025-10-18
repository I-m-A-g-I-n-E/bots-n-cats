/**
 * Shared types for bots-n-cats audio-core
 * BOC-20: Core Audio Infrastructure
 */

import * as Tone from 'tone';

/**
 * Event callback type for AudioEventBus
 */
export type EventCallback<T = any> = (data: T) => void | Promise<void>;

/**
 * Unsubscribe function returned when subscribing to events
 */
export type UnsubscribeFn = () => void;

/**
 * Resource types that can be tracked by ResourceManager
 */
export type ToneResource =
  | Tone.ToneAudioNode
  | Tone.Synth
  | Tone.FMSynth
  | Tone.PolySynth
  | Tone.Sampler
  | Tone.Player
  | Tone.ToneAudioBuffer
  | Tone.Effect;

/**
 * Instrument types supported by InstrumentFactory
 */
export type InstrumentType = 'synth' | 'fmSynth' | 'polySynth' | 'sampler';

/**
 * Options for instrument creation
 */
export interface InstrumentOptions {
  [key: string]: any;
}

/**
 * Audio service initialization configuration
 */
export interface AudioCoreConfig {
  sampleRate?: number;
  latencyHint?: Tone.ContextLatencyHint;
  lookAhead?: number;
}

/**
 * Resource tracking entry
 */
export interface ResourceEntry {
  id: string;
  resource: ToneResource;
  createdAt: number;
  type: string;
}

/**
 * Event bus subscription entry
 */
export interface Subscription {
  id: symbol;
  callback: EventCallback;
}

/**
 * Webhook event types from GitHub
 */
export type GitHubEventType =
  | 'push'
  | 'pull_request'
  | 'pull_request_review'
  | 'check_run'
  | 'deployment_status'
  | 'issues'
  | 'issue_comment'
  | 'workflow_run';

/**
 * Musical emotion categories for event mapping
 */
export type EmotionCategory = 'tension' | 'resolution' | 'activity' | 'growth';

/**
 * Normalized event data structure
 */
export interface NormalizedEvent {
  eventType: GitHubEventType;
  action: string;
  emotion: EmotionCategory;
  intensity: number;
  metadata: Record<string, any>;
  timestamp: number;
}
