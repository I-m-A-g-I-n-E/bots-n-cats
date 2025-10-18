/**
 * BOC-20: Core Audio Infrastructure - Multi-Client Streaming
 * MultiClientAudioManager handles streaming audio buffers to multiple clients
 *
 * IMPORTANT: Uses offline rendering + broadcast pattern
 * Each repository can stream to multiple connected clients
 */

import * as Tone from 'tone';
import { ClientSessionManager, ClientSession } from './ClientSessionManager.js';
import { AudioEventBus } from '../events/AudioEventBus.js';

export interface AudioBuffer {
  buffer: Tone.ToneAudioBuffer;
  duration: number;
  sampleRate: number;
  timestamp: number;
}

export interface StreamingSession {
  clientId: string;
  repoId: string;
  connected: boolean;
  lastBufferSent: number;
  buffersReceived: number;
  bytesTransferred: number;
}

export interface HealthMetrics {
  totalClients: number;
  activeStreams: number;
  repositoryCount: number;
  averageBufferSize: number;
  totalBytesTransferred: number;
  uptimeMs: number;
}

export class MultiClientAudioManager {
  private sessionManager: ClientSessionManager;
  private eventBus: AudioEventBus;
  private streamingSessions: Map<string, StreamingSession>;
  private repositoryClients: Map<string, Set<string>>; // repoId -> Set<clientId>
  private startTime: number;
  private totalBytesTransferred: number;
  private bufferSizeSum: number;
  private bufferCount: number;

  constructor(sessionManager: ClientSessionManager, eventBus: AudioEventBus) {
    this.sessionManager = sessionManager;
    this.eventBus = eventBus;
    this.streamingSessions = new Map();
    this.repositoryClients = new Map();
    this.startTime = Date.now();
    this.totalBytesTransferred = 0;
    this.bufferSizeSum = 0;
    this.bufferCount = 0;

    // Subscribe to session events
    this.eventBus.subscribe<{ clientId: string }>('session:disposed', ({ clientId }) => {
      if (clientId) this.cleanup(clientId);
    });
  }

  /**
   * Create a streaming session for a client
   */
  public createSession(clientId: string, repoId: string): StreamingSession {
    // Create client session if it doesn't exist
    if (!this.sessionManager.hasSession(clientId)) {
      this.sessionManager.createSession(clientId, repoId);
    }

    // Create streaming session
    const streamingSession: StreamingSession = {
      clientId,
      repoId,
      connected: true,
      lastBufferSent: Date.now(),
      buffersReceived: 0,
      bytesTransferred: 0,
    };

    this.streamingSessions.set(clientId, streamingSession);

    // Track repository -> client mapping
    if (!this.repositoryClients.has(repoId)) {
      this.repositoryClients.set(repoId, new Set());
    }
    this.repositoryClients.get(repoId)!.add(clientId);

    this.eventBus.publishSync('stream:session:created', {
      clientId,
      repoId,
      totalStreams: this.streamingSessions.size,
    });

    return streamingSession;
  }

  /**
   * Get a streaming session
   */
  public getSession(clientId: string): StreamingSession | undefined {
    return this.streamingSessions.get(clientId);
  }

  /**
   * Get all clients for a repository
   */
  public getRepositoryClients(repoId: string): string[] {
    const clients = this.repositoryClients.get(repoId);
    return clients ? Array.from(clients) : [];
  }

  /**
   * Broadcast audio buffer to all clients of a repository
   */
  public async broadcastBuffer(
    repoId: string,
    audioBuffer: AudioBuffer
  ): Promise<number> {
    const clients = this.getRepositoryClients(repoId);
    if (clients.length === 0) {
      return 0;
    }

    const bufferSize = this.estimateBufferSize(audioBuffer);
    let successCount = 0;

    // Send buffer to each connected client
    const sendPromises = clients.map(async (clientId) => {
      const session = this.streamingSessions.get(clientId);
      if (session && session.connected) {
        try {
          await this.sendBufferToClient(clientId, audioBuffer);
          successCount++;

          // Update session stats
          session.lastBufferSent = Date.now();
          session.buffersReceived++;
          session.bytesTransferred += bufferSize;

          // Monitor activity
          this.sessionManager.monitorActivity(clientId);
        } catch (error) {
          console.error(`Failed to send buffer to client ${clientId}:`, error);
          session.connected = false;
        }
      }
    });

    await Promise.allSettled(sendPromises);

    // Update global stats
    this.totalBytesTransferred += bufferSize * successCount;
    this.bufferSizeSum += bufferSize;
    this.bufferCount++;

    this.eventBus.publishSync('stream:broadcast:complete', {
      repoId,
      clientCount: clients.length,
      successCount,
      bufferSize,
    });

    return successCount;
  }

  /**
   * Send buffer to a specific client
   * NOTE: This is a placeholder - actual implementation would use SSE/WebSocket
   */
  private async sendBufferToClient(
    clientId: string,
    audioBuffer: AudioBuffer
  ): Promise<void> {
    // In a real implementation, this would:
    // 1. Encode buffer to transferable format (ArrayBuffer, Base64, etc.)
    // 2. Send via SSE or WebSocket
    // 3. Handle backpressure and buffering

    // For now, just emit an event
    this.eventBus.publishSync('stream:buffer:sent', {
      clientId,
      bufferDuration: audioBuffer.duration,
      timestamp: audioBuffer.timestamp,
    });

    // Simulate async send
    return Promise.resolve();
  }

  /**
   * Estimate buffer size in bytes
   */
  private estimateBufferSize(audioBuffer: AudioBuffer): number {
    // Rough estimate: samples * channels * bytes per sample
    // Assuming 16-bit audio (2 bytes per sample) and stereo (2 channels)
    const samples = audioBuffer.duration * audioBuffer.sampleRate;
    const channels = 2;
    const bytesPerSample = 2;
    return samples * channels * bytesPerSample;
  }

  /**
   * Mark client as disconnected
   */
  public disconnect(clientId: string): boolean {
    const session = this.streamingSessions.get(clientId);
    if (!session) {
      return false;
    }

    session.connected = false;

    this.eventBus.publishSync('stream:client:disconnected', {
      clientId,
      repoId: session.repoId,
    });

    return true;
  }

  /**
   * Mark client as reconnected
   */
  public reconnect(clientId: string): boolean {
    const session = this.streamingSessions.get(clientId);
    if (!session) {
      return false;
    }

    session.connected = true;

    this.eventBus.publishSync('stream:client:reconnected', {
      clientId,
      repoId: session.repoId,
    });

    return true;
  }

  /**
   * Cleanup a client session
   */
  public cleanup(clientId: string): boolean {
    const session = this.streamingSessions.get(clientId);
    if (!session) {
      return false;
    }

    // Remove from repository clients mapping
    const repoClients = this.repositoryClients.get(session.repoId);
    if (repoClients) {
      repoClients.delete(clientId);

      // Clean up empty repository mappings
      if (repoClients.size === 0) {
        this.repositoryClients.delete(session.repoId);
      }
    }

    // Remove streaming session
    this.streamingSessions.delete(clientId);

    this.eventBus.publishSync('stream:session:cleaned', {
      clientId,
      repoId: session.repoId,
      totalStreams: this.streamingSessions.size,
    });

    return true;
  }

  /**
   * Get health metrics for monitoring
   */
  public getHealthMetrics(): HealthMetrics {
    const activeSessions = this.sessionManager.getActiveSessions();
    const connectedStreams = Array.from(this.streamingSessions.values()).filter(
      (s) => s.connected
    );

    return {
      totalClients: this.streamingSessions.size,
      activeStreams: connectedStreams.length,
      repositoryCount: this.repositoryClients.size,
      averageBufferSize:
        this.bufferCount > 0 ? this.bufferSizeSum / this.bufferCount : 0,
      totalBytesTransferred: this.totalBytesTransferred,
      uptimeMs: Date.now() - this.startTime,
    };
  }

  /**
   * Get detailed metrics for a repository
   */
  public getRepositoryMetrics(repoId: string): {
    clientCount: number;
    connectedCount: number;
    totalBuffers: number;
    totalBytes: number;
  } {
    const clients = this.getRepositoryClients(repoId);
    let totalBuffers = 0;
    let totalBytes = 0;
    let connectedCount = 0;

    clients.forEach((clientId) => {
      const session = this.streamingSessions.get(clientId);
      if (session) {
        if (session.connected) connectedCount++;
        totalBuffers += session.buffersReceived;
        totalBytes += session.bytesTransferred;
      }
    });

    return {
      clientCount: clients.length,
      connectedCount,
      totalBuffers,
      totalBytes,
    };
  }

  /**
   * Get count of connected clients for a repository
   */
  public getConnectedClientCount(repoId: string): number {
    const clients = this.getRepositoryClients(repoId);
    return clients.filter((clientId) => {
      const session = this.streamingSessions.get(clientId);
      return session && session.connected;
    }).length;
  }

  /**
   * Check if manager is healthy
   */
  public isHealthy(): boolean {
    const metrics = this.getHealthMetrics();
    // Consider healthy if we have at least one active stream or no streams at all
    return metrics.totalClients === 0 || metrics.activeStreams > 0;
  }

  /**
   * Dispose all streaming sessions
   */
  public dispose(): void {
    const clientIds = Array.from(this.streamingSessions.keys());
    clientIds.forEach((clientId) => {
      this.cleanup(clientId);
    });

    this.repositoryClients.clear();

    this.eventBus.publishSync('stream:manager:disposed', {
      disposedCount: clientIds.length,
    });
  }
}
