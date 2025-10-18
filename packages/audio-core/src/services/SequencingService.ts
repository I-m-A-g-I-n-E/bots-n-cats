/**
 * BOC-20: Core Audio Infrastructure - Service Layer
 * SequencingService manages musical patterns and sequences
 *
 * IMPORTANT: Works with TransportService for timing
 * Schedules notes and patterns on the transport timeline
 */

import * as Tone from 'tone';
import { TransportService } from './TransportService.js';
import { AudioEventBus } from '../events/AudioEventBus.js';
import { ResourceManager } from '../resources/ResourceManager.js';

export interface MusicalPattern {
  notes: (string | null)[];
  durations: Tone.Unit.Time[];
  velocities?: number[];
  subdivision?: Tone.Unit.Time;
}

export interface SequenceHandle {
  id: string;
  sequence: Tone.Sequence;
  instrumentId: string;
}

export class SequencingService {
  private transportService: TransportService;
  private eventBus: AudioEventBus;
  private resources: ResourceManager;
  private activeSequences: Map<string, Tone.Sequence>;
  private sequenceCounter: number;

  constructor(
    transportService: TransportService,
    eventBus: AudioEventBus,
    resources: ResourceManager
  ) {
    this.transportService = transportService;
    this.eventBus = eventBus;
    this.resources = resources;
    this.activeSequences = new Map();
    this.sequenceCounter = 0;

    // Subscribe to cleanup events
    this.eventBus.subscribe('sequencing:clear', () => {
      this.clearScheduled();
    });
  }

  /**
   * Schedule a musical pattern for an instrument
   */
  public schedulePattern(
    pattern: MusicalPattern,
    instrumentId: string,
    instrument: Tone.Instrument
  ): SequenceHandle {
    const subdivision = pattern.subdivision || '8n';

    // Create Tone.js Sequence
    const sequence = new Tone.Sequence(
      (time, note) => {
        if (note !== null) {
          // Get velocity if provided, default to 0.8
          const noteIndex = pattern.notes.indexOf(note);
          const velocity = pattern.velocities?.[noteIndex] || 0.8;

          // Get duration if provided
          const duration = pattern.durations?.[noteIndex] || subdivision;

          // Trigger the note
          instrument.triggerAttackRelease(note, duration, time, velocity);
        }
      },
      pattern.notes,
      subdivision
    );

    // Track the sequence
    const id = this.generateSequenceId(instrumentId);
    const resourceId = this.resources.track(`sequence_${id}`, sequence);
    this.activeSequences.set(id, sequence);

    // Start the sequence
    sequence.start(0);

    this.eventBus.publishSync('sequencing:pattern:scheduled', {
      id,
      instrumentId,
      noteCount: pattern.notes.filter((n) => n !== null).length,
    });

    return { id, sequence, instrumentId };
  }

  /**
   * Schedule a simple note pattern (notes only)
   */
  public scheduleNotes(
    notes: (string | null)[],
    instrumentId: string,
    instrument: Tone.Instrument,
    subdivision: Tone.Unit.Time = '8n'
  ): SequenceHandle {
    const pattern: MusicalPattern = {
      notes,
      durations: notes.map(() => subdivision),
      subdivision,
    };

    return this.schedulePattern(pattern, instrumentId, instrument);
  }

  /**
   * Schedule a one-time note event
   */
  public scheduleNote(
    note: string,
    time: Tone.Unit.Time,
    duration: Tone.Unit.Time,
    instrument: Tone.Instrument,
    velocity: number = 0.8
  ): number {
    const eventId = this.transportService.schedule((scheduleTime) => {
      instrument.triggerAttackRelease(note, duration, scheduleTime, velocity);
    }, time);

    this.eventBus.publishSync('sequencing:note:scheduled', {
      note,
      time,
      duration,
    });

    return eventId;
  }

  /**
   * Stop a specific sequence
   */
  public stopSequence(id: string, time?: Tone.Unit.Time): boolean {
    const sequence = this.activeSequences.get(id);
    if (!sequence) {
      console.warn(`Sequence not found: ${id}`);
      return false;
    }

    sequence.stop(time);
    this.eventBus.publishSync('sequencing:sequence:stopped', { id });
    return true;
  }

  /**
   * Start a stopped sequence
   */
  public startSequence(id: string, time?: Tone.Unit.Time): boolean {
    const sequence = this.activeSequences.get(id);
    if (!sequence) {
      console.warn(`Sequence not found: ${id}`);
      return false;
    }

    sequence.start(time);
    this.eventBus.publishSync('sequencing:sequence:started', { id });
    return true;
  }

  /**
   * Remove and dispose a specific sequence
   */
  public disposeSequence(id: string): boolean {
    const sequence = this.activeSequences.get(id);
    if (!sequence) {
      console.warn(`Sequence not found: ${id}`);
      return false;
    }

    sequence.dispose();
    this.activeSequences.delete(id);
    this.eventBus.publishSync('sequencing:sequence:disposed', { id });
    return true;
  }

  /**
   * Clear all scheduled sequences
   */
  public clearScheduled(): void {
    const ids = Array.from(this.activeSequences.keys());
    let count = 0;

    ids.forEach((id) => {
      if (this.disposeSequence(id)) {
        count++;
      }
    });

    this.eventBus.publishSync('sequencing:cleared', {
      clearedCount: count,
    });
  }

  /**
   * Set sequence loop count
   */
  public setSequenceLoop(id: string, loops: number | boolean): boolean {
    const sequence = this.activeSequences.get(id);
    if (!sequence) {
      console.warn(`Sequence not found: ${id}`);
      return false;
    }

    sequence.loop = loops;
    this.eventBus.publishSync('sequencing:loop:set', { id, loops });
    return true;
  }

  /**
   * Set sequence playback rate (speed multiplier)
   */
  public setSequencePlaybackRate(id: string, rate: number): boolean {
    const sequence = this.activeSequences.get(id);
    if (!sequence) {
      console.warn(`Sequence not found: ${id}`);
      return false;
    }

    sequence.playbackRate = rate;
    this.eventBus.publishSync('sequencing:playbackRate:set', { id, rate });
    return true;
  }

  /**
   * Get count of active sequences
   */
  public getActiveCount(): number {
    return this.activeSequences.size;
  }

  /**
   * Get all active sequence IDs
   */
  public getActiveIds(): string[] {
    return Array.from(this.activeSequences.keys());
  }

  /**
   * Generate unique sequence ID
   */
  private generateSequenceId(instrumentId: string): string {
    const counter = this.sequenceCounter++;
    const timestamp = Date.now();
    return `seq_${instrumentId}_${timestamp}_${counter}`;
  }

  /**
   * Dispose all sequences and cleanup
   */
  public dispose(): void {
    this.clearScheduled();
  }
}
