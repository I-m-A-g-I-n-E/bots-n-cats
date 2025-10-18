/**
 * BOC-20: Core Audio Infrastructure - Service Layer
 * TransportService manages Tone.js Transport (BPM, playback control)
 *
 * IMPORTANT: Single Transport instance per application
 * Coordinates timing for all musical events
 */

import * as Tone from 'tone';
import { AudioEventBus } from '../events/AudioEventBus.js';

export type TransportState = 'started' | 'paused' | 'stopped';

export interface TransportStatus {
  state: TransportState;
  bpm: number;
  position: string;
  seconds: number;
  loop: boolean;
}

export class TransportService {
  private eventBus: AudioEventBus;
  private transport: typeof Tone.Transport;

  constructor(eventBus: AudioEventBus) {
    this.eventBus = eventBus;
    this.transport = Tone.Transport;

    // Subscribe to transport control events
    this.eventBus.subscribe('transport:start', () => this.start());
    this.eventBus.subscribe('transport:stop', () => this.stop());
    this.eventBus.subscribe('transport:pause', () => this.pause());
    this.eventBus.subscribe<number>('transport:setBPM', (bpm) => {
      if (bpm) this.setBPM(bpm);
    });
  }

  /**
   * Set the BPM (Beats Per Minute)
   */
  public setBPM(bpm: number): void {
    if (bpm <= 0 || bpm > 300) {
      throw new Error('BPM must be between 1 and 300');
    }

    this.transport.bpm.value = bpm;
    this.eventBus.publishSync('transport:bpm:changed', { bpm });
  }

  /**
   * Get current BPM
   */
  public getBPM(): number {
    return this.transport.bpm.value;
  }

  /**
   * Start the transport
   */
  public start(time?: number): void {
    this.transport.start(time);
    this.eventBus.publishSync('transport:started', {
      time: time || Tone.now(),
    });
  }

  /**
   * Stop the transport and reset position
   */
  public stop(time?: number): void {
    this.transport.stop(time);
    this.eventBus.publishSync('transport:stopped', {
      time: time || Tone.now(),
    });
  }

  /**
   * Pause the transport (maintains position)
   */
  public pause(time?: number): void {
    this.transport.pause(time);
    this.eventBus.publishSync('transport:paused', {
      time: time || Tone.now(),
    });
  }

  /**
   * Get current transport state
   */
  public getState(): TransportState {
    return this.transport.state as TransportState;
  }

  /**
   * Get comprehensive transport status
   */
  public getStatus(): TransportStatus {
    return {
      state: this.getState(),
      bpm: this.transport.bpm.value,
      position: this.transport.position as string,
      seconds: this.transport.seconds,
      loop: this.transport.loop,
    };
  }

  /**
   * Set loop points
   */
  public setLoop(start: Tone.Unit.Time, end: Tone.Unit.Time): void {
    this.transport.loop = true;
    this.transport.loopStart = start;
    this.transport.loopEnd = end;

    this.eventBus.publishSync('transport:loop:set', { start, end });
  }

  /**
   * Disable looping
   */
  public disableLoop(): void {
    this.transport.loop = false;
    this.eventBus.publishSync('transport:loop:disabled', {});
  }

  /**
   * Set transport position
   */
  public setPosition(position: Tone.Unit.Time): void {
    this.transport.position = position;
    this.eventBus.publishSync('transport:position:changed', { position });
  }

  /**
   * Get transport position in bars:beats:sixteenths
   */
  public getPosition(): string {
    return this.transport.position as string;
  }

  /**
   * Get transport position in seconds
   */
  public getSeconds(): number {
    return this.transport.seconds;
  }

  /**
   * Schedule a callback on the transport timeline
   */
  public schedule(callback: (time: number) => void, time: Tone.Unit.Time): number {
    return this.transport.schedule(callback, time);
  }

  /**
   * Schedule a repeating callback
   */
  public scheduleRepeat(
    callback: (time: number) => void,
    interval: Tone.Unit.Time,
    startTime?: Tone.Unit.Time
  ): number {
    return this.transport.scheduleRepeat(callback, interval, startTime);
  }

  /**
   * Clear a scheduled event
   */
  public clear(eventId: number): void {
    this.transport.clear(eventId);
  }

  /**
   * Cancel all scheduled events
   */
  public cancel(after: Tone.Unit.Time = 0): void {
    this.transport.cancel(after);
    this.eventBus.publishSync('transport:cancelled', { after });
  }

  /**
   * Set swing amount (0-1)
   */
  public setSwing(amount: number): void {
    if (amount < 0 || amount > 1) {
      throw new Error('Swing must be between 0 and 1');
    }
    this.transport.swing = amount;
    this.eventBus.publishSync('transport:swing:changed', { amount });
  }

  /**
   * Set swing subdivision
   */
  public setSwingSubdivision(subdivision: Tone.Unit.Time): void {
    this.transport.swingSubdivision = subdivision;
    this.eventBus.publishSync('transport:swing:subdivision:changed', {
      subdivision,
    });
  }
}
