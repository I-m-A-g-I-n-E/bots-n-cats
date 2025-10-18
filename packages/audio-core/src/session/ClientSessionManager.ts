/**
 * BOC-20: Core Audio Infrastructure - Client Session Management
 * ClientSessionManager tracks and manages individual client sessions
 *
 * IMPORTANT: Each client (web browser) gets isolated session with cleanup
 * Monitors activity and auto-disposes inactive sessions
 */

import { AudioEventBus } from '../events/AudioEventBus.js';
import { ResourceManager } from '../resources/ResourceManager.js';

export interface ClientSession {
  clientId: string;
  repoId: string;
  createdAt: number;
  lastActivity: number;
  resources: ResourceManager;
  metadata: Record<string, any>;
  isActive: boolean;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  inactiveSessions: number;
  oldestSession: ClientSession | null;
  newestSession: ClientSession | null;
}

export class ClientSessionManager {
  private sessions: Map<string, ClientSession>;
  private eventBus: AudioEventBus;
  private inactivityTimeout: number; // milliseconds
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(
    eventBus: AudioEventBus,
    inactivityTimeout: number = 30 * 60 * 1000 // 30 minutes default
  ) {
    this.sessions = new Map();
    this.eventBus = eventBus;
    this.inactivityTimeout = inactivityTimeout;
    this.cleanupInterval = null;

    // Start automatic cleanup
    this.startAutoCleanup();

    // Subscribe to activity events
    this.eventBus.subscribe<{ clientId: string }>(
      'client:activity',
      ({ clientId }) => {
        if (clientId) this.monitorActivity(clientId);
      }
    );
  }

  /**
   * Create a new client session
   */
  public createSession(
    clientId: string,
    repoId: string,
    metadata: Record<string, any> = {}
  ): ClientSession {
    if (this.sessions.has(clientId)) {
      throw new Error(`Session already exists for client: ${clientId}`);
    }

    const session: ClientSession = {
      clientId,
      repoId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      resources: new ResourceManager(),
      metadata,
      isActive: true,
    };

    this.sessions.set(clientId, session);

    this.eventBus.publishSync('session:created', {
      clientId,
      repoId,
      sessionCount: this.sessions.size,
    });

    return session;
  }

  /**
   * Get a session by client ID
   */
  public getSession(clientId: string): ClientSession | undefined {
    return this.sessions.get(clientId);
  }

  /**
   * Get all sessions for a repository
   */
  public getSessionsByRepo(repoId: string): ClientSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.repoId === repoId
    );
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): ClientSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.isActive
    );
  }

  /**
   * Update session activity timestamp
   */
  public monitorActivity(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (!session) {
      console.warn(`Session not found for client: ${clientId}`);
      return;
    }

    session.lastActivity = Date.now();
    session.isActive = true;

    this.eventBus.publishSync('session:activity', {
      clientId,
      lastActivity: session.lastActivity,
    });
  }

  /**
   * Mark session as inactive (but don't dispose yet)
   */
  public markInactive(clientId: string): boolean {
    const session = this.sessions.get(clientId);
    if (!session) {
      return false;
    }

    session.isActive = false;

    this.eventBus.publishSync('session:inactive', {
      clientId,
      inactiveDuration: Date.now() - session.lastActivity,
    });

    return true;
  }

  /**
   * Dispose a specific session and cleanup resources
   */
  public disposeSession(clientId: string): boolean {
    const session = this.sessions.get(clientId);
    if (!session) {
      console.warn(`Session not found for client: ${clientId}`);
      return false;
    }

    // Dispose all session resources
    session.resources.disposeAll();

    // Remove session
    this.sessions.delete(clientId);

    this.eventBus.publishSync('session:disposed', {
      clientId,
      sessionDuration: Date.now() - session.createdAt,
      sessionCount: this.sessions.size,
    });

    return true;
  }

  /**
   * Check for inactive sessions and dispose them
   */
  public cleanupInactiveSessions(): number {
    const now = Date.now();
    let cleanedCount = 0;

    this.sessions.forEach((session, clientId) => {
      const inactiveDuration = now - session.lastActivity;

      if (inactiveDuration > this.inactivityTimeout) {
        this.disposeSession(clientId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.eventBus.publishSync('session:cleanup', {
        cleanedCount,
        remainingSessions: this.sessions.size,
      });
    }

    return cleanedCount;
  }

  /**
   * Start automatic cleanup of inactive sessions
   */
  private startAutoCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop automatic cleanup
   */
  public stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get session statistics
   */
  public getStats(): SessionStats {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter((s) => s.isActive);

    let oldestSession: ClientSession | null = null;
    let newestSession: ClientSession | null = null;

    sessions.forEach((session) => {
      if (!oldestSession || session.createdAt < oldestSession.createdAt) {
        oldestSession = session;
      }
      if (!newestSession || session.createdAt > newestSession.createdAt) {
        newestSession = session;
      }
    });

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      inactiveSessions: sessions.length - activeSessions.length,
      oldestSession,
      newestSession,
    };
  }

  /**
   * Get session count
   */
  public getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session count for a specific repository
   */
  public getRepoSessionCount(repoId: string): number {
    return this.getSessionsByRepo(repoId).length;
  }

  /**
   * Check if session exists
   */
  public hasSession(clientId: string): boolean {
    return this.sessions.has(clientId);
  }

  /**
   * Update session metadata
   */
  public updateMetadata(
    clientId: string,
    metadata: Record<string, any>
  ): boolean {
    const session = this.sessions.get(clientId);
    if (!session) {
      return false;
    }

    session.metadata = { ...session.metadata, ...metadata };

    this.eventBus.publishSync('session:metadata:updated', {
      clientId,
      metadata,
    });

    return true;
  }

  /**
   * Dispose all sessions and cleanup
   */
  public dispose(): void {
    const sessionCount = this.sessions.size;

    // Stop auto cleanup
    this.stopAutoCleanup();

    // Dispose all sessions
    const clientIds = Array.from(this.sessions.keys());
    clientIds.forEach((clientId) => {
      this.disposeSession(clientId);
    });

    this.eventBus.publishSync('session:manager:disposed', {
      disposedCount: sessionCount,
    });
  }
}
