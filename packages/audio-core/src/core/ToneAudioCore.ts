/**
 * BOC-20: Core Audio Infrastructure
 * Singleton AudioContext manager for the entire application
 *
 * IMPORTANT: Single shared AudioContext across all clients
 * Use singleton pattern to prevent resource conflicts
 */

import * as Tone from 'tone';
import { AudioCoreConfig } from '../types/index.js';

export class ToneAudioCore {
  private static instance: ToneAudioCore | null = null;
  private context: Tone.Context | null = null;
  private initialized: boolean = false;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): ToneAudioCore {
    if (!ToneAudioCore.instance) {
      ToneAudioCore.instance = new ToneAudioCore();
    }
    return ToneAudioCore.instance;
  }

  /**
   * Initialize the audio context with optional configuration
   */
  public async initialize(config?: AudioCoreConfig): Promise<void> {
    if (this.initialized) {
      console.warn('ToneAudioCore already initialized');
      return;
    }

    try {
      // Create and configure Tone.js context
      this.context = new Tone.Context({
        latencyHint: config?.latencyHint || 'interactive',
        lookAhead: config?.lookAhead || 0.1,
      });

      // Set as the global Tone context
      Tone.setContext(this.context);

      // Resume context if suspended (required for user gesture)
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      this.initialized = true;
      console.log('ToneAudioCore initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ToneAudioCore:', error);
      throw error;
    }
  }

  /**
   * Get the current audio context
   */
  public getContext(): Tone.Context {
    if (!this.context) {
      throw new Error('ToneAudioCore not initialized. Call initialize() first.');
    }
    return this.context;
  }

  /**
   * Check if the audio core is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Resume the audio context (required after user gesture)
   */
  public async resume(): Promise<void> {
    if (!this.context) {
      throw new Error('ToneAudioCore not initialized');
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * Get the current context state
   */
  public getState(): AudioContextState {
    if (!this.context) {
      throw new Error('ToneAudioCore not initialized');
    }
    return this.context.state;
  }

  /**
   * Dispose the audio core (use with caution - singleton pattern)
   */
  public async dispose(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.initialized = false;
      ToneAudioCore.instance = null;
      console.log('ToneAudioCore disposed');
    }
  }
}
