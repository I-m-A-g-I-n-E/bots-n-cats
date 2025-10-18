/**
 * Streaming server types
 * BOC-13: Real-time streaming system
 */

import { Response } from 'express';

/**
 * Musical parameters for composition rendering
 */
export interface MusicalParameters {
  tempo: number;
  scale: string[];
  rootNote: string;
  instrumentType: 'synth' | 'fmSynth' | 'polySynth' | 'sampler';
  instrumentOptions?: Record<string, any>;
  duration: number;
  pattern?: Pattern;
}

/**
 * Musical pattern structure
 */
export interface Pattern {
  notes: string[];
  durations: string[];
  times: string[];
  velocities: number[];
}

/**
 * Serialized audio buffer for network transmission
 */
export interface SerializedBuffer {
  sampleRate: number;
  length: number;
  duration: number;
  numberOfChannels: number;
  channels: Float32Array[] | number[][];
}

/**
 * SSE client connection data
 */
export interface SSEClient {
  clientId: string;
  repoId: string;
  res: Response;
  lastActivity: number;
  connectedAt: number;
}

/**
 * SSE message types
 */
export type SSEMessageType =
  | 'connected'
  | 'audio_buffer'
  | 'musical_parameters'
  | 'heartbeat'
  | 'error'
  | 'disconnected';

/**
 * SSE message payload
 */
export interface SSEMessage {
  type: SSEMessageType;
  timestamp: number;
  data?: any;
}

/**
 * Audio buffer message
 */
export interface AudioBufferMessage extends SSEMessage {
  type: 'audio_buffer';
  data: {
    buffer: SerializedBuffer;
    params: MusicalParameters;
    repoId: string;
  };
}

/**
 * Connection message
 */
export interface ConnectionMessage extends SSEMessage {
  type: 'connected';
  data: {
    message: string;
    clientId: string;
    repoId: string;
  };
}

/**
 * Musical parameters message (client-side rendering)
 */
export interface MusicalParametersMessage extends SSEMessage {
  type: 'musical_parameters';
  data: {
    params: MusicalParameters;
    repoId: string;
  };
}

/**
 * Error message
 */
export interface ErrorMessage extends SSEMessage {
  type: 'error';
  data: {
    message: string;
    code?: string;
  };
}

/**
 * Music generation event data
 */
export interface MusicGeneratedEvent {
  repoId: string;
  musicalParams: MusicalParameters;
  eventType: string;
  timestamp: number;
}

/**
 * Server health status
 */
export interface ServerHealth {
  status: 'ok' | 'degraded' | 'error';
  activeClients: number;
  activeSessions: number;
  totalBuffersCreated: number;
  memoryUsage: number;
  uptime: number;
}
