/**
 * StreamingService
 * Main orchestrator for the streaming system
 * Coordinates offline rendering, session management, and SSE broadcasting
 * BOC-13: Real-time streaming system
 */

import * as Tone from 'tone';
import { AudioEventBus, MultiClientAudioManager } from '@bots-n-cats/audio-core';
import { OfflineRenderer } from './OfflineRenderer.js';
import { SSEManager } from './SSEManager.js';
import { BufferSerializer } from '../utils/buffer-serializer.js';
import { MusicGeneratedEvent, MusicalParameters, AudioBufferMessage } from '../types/index.js';

export class StreamingService {
  private readonly eventBus: AudioEventBus;
  private readonly multiClientManager: MultiClientAudioManager;
  private readonly offlineRenderer: OfflineRenderer;
  private readonly sseManager: SSEManager;

  constructor(
    eventBus: AudioEventBus,
    multiClientManager: MultiClientAudioManager,
    offlineRenderer: OfflineRenderer,
    sseManager: SSEManager
  ) {
    this.eventBus = eventBus;
    this.multiClientManager = multiClientManager;
    this.offlineRenderer = offlineRenderer;
    this.sseManager = sseManager;

    this.subscribeToEvents();
    console.log('[StreamingService] Initialized');
  }

  /**
   * Subscribe to music generation events
   */
  private subscribeToEvents(): void {
    // Subscribe to music generation events
    this.eventBus.subscribe('music:generated', async (data: MusicGeneratedEvent) => {
      await this.handleMusicGenerated(data);
    });

    // Subscribe to pattern generation events (if available)
    this.eventBus.subscribe('music:pattern:generated', async (data: any) => {
      console.log('[StreamingService] Pattern generated, rendering...');
      // Could handle pattern-specific logic here
    });

    // Subscribe to webhook events
    this.eventBus.subscribe('webhook:github:*', async (data: any) => {
      console.log('[StreamingService] GitHub webhook received:', data.eventType);
      // Could trigger music generation based on webhook events
    });
  }

  /**
   * Handle music generated event
   */
  private async handleMusicGenerated(event: MusicGeneratedEvent): Promise<void> {
    const { repoId, musicalParams } = event;

    try {
      console.log(`[StreamingService] Processing music for repo ${repoId}`);

      // MVP: Skip offline rendering - send musical parameters directly to client
      // Client will render audio using browser's Tone.js (which has Web Audio API)
      const message = {
        type: 'musical_parameters' as const,
        data: {
          params: musicalParams,
          repoId,
        },
      };

      this.sseManager.broadcast(repoId, message);

      console.log(`[StreamingService] Successfully sent musical parameters for repo ${repoId}`);
    } catch (error) {
      console.error(`[StreamingService] Error processing music for repo ${repoId}:`, error);

      // Send error message to clients
      this.sseManager.broadcast(repoId, {
        type: 'error',
        data: {
          message: 'Failed to generate audio',
          code: 'RENDER_ERROR',
        },
      });
    }
  }

  /**
   * Create a new client session
   */
  createClientSession(clientId: string, repoId: string): void {
    const session = this.multiClientManager.createSession(clientId, repoId);
    console.log(`[StreamingService] Session created for client ${clientId} watching repo ${repoId}`);
  }

  /**
   * Update client activity (heartbeat)
   * Note: Activity tracking is handled internally by ClientSessionManager
   */
  updateClientActivity(clientId: string): void {
    // Activity is tracked automatically by ClientSessionManager
    console.log(`[StreamingService] Heartbeat received from client ${clientId}`);
  }

  /**
   * Dispose client session
   */
  disposeClientSession(clientId: string): void {
    this.multiClientManager.cleanup(clientId);
    console.log(`[StreamingService] Session disposed for client ${clientId}`);
  }

  /**
   * Manually trigger music generation for testing
   */
  async generateTestAudio(repoId: string, params?: Partial<MusicalParameters>): Promise<void> {
    const defaultParams: MusicalParameters = {
      tempo: 120,
      scale: ['C4', 'E4', 'G4', 'B4'],
      rootNote: 'C4',
      instrumentType: 'synth',
      duration: 5,
      ...params,
    };

    const event: MusicGeneratedEvent = {
      repoId,
      musicalParams: defaultParams,
      eventType: 'test',
      timestamp: Date.now(),
    };

    await this.handleMusicGenerated(event);
  }

  /**
   * Get service health metrics
   */
  getHealthMetrics() {
    const audioMetrics = this.multiClientManager.getHealthMetrics();
    const activeClients = this.sseManager.getActiveClientCount();

    return {
      status: 'ok' as const,
      activeClients,
      ...audioMetrics,
    };
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    console.log('[StreamingService] Disposing resources');
    this.multiClientManager.dispose();
    this.sseManager.dispose();
  }
}
