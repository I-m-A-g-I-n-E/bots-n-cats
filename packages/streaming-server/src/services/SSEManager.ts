/**
 * SSEManager
 * Manages Server-Sent Events connections to browser clients
 * BOC-13: Real-time streaming system
 */

import { Response } from 'express';
import { SSEClient, SSEMessage, SSEMessageType } from '../types';

export class SSEManager {
  private clients = new Map<string, SSEClient>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  private readonly heartbeatInterval = 30000; // 30 seconds
  private readonly staleTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Connect a new SSE client
   */
  connect(clientId: string, repoId: string, res: Response): void {
    console.log(`[SSEManager] Client ${clientId} connecting for repo ${repoId}`);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Enable compression
    res.setHeader('Content-Encoding', 'identity');

    // Store client
    const client: SSEClient = {
      clientId,
      repoId,
      res,
      lastActivity: Date.now(),
      connectedAt: Date.now(),
    };

    this.clients.set(clientId, client);

    // Send initial connection message
    this.sendToClient(clientId, {
      type: 'connected',
      timestamp: Date.now(),
      data: {
        message: `Streaming audio for repo: ${repoId}`,
        clientId,
        repoId,
      },
    });

    // Handle client disconnect
    res.on('close', () => {
      console.log(`[SSEManager] Client ${clientId} connection closed`);
      this.disconnect(clientId);
    });

    res.on('error', (error) => {
      console.error(`[SSEManager] Client ${clientId} error:`, error);
      this.disconnect(clientId);
    });

    // Start heartbeat
    this.startHeartbeat(clientId);

    console.log(`[SSEManager] Client ${clientId} connected. Total clients: ${this.clients.size}`);
  }

  /**
   * Broadcast message to all clients watching a specific repo
   */
  broadcast(repoId: string, message: Omit<SSEMessage, 'timestamp'>): void {
    const repoClients = Array.from(this.clients.values())
      .filter(client => client.repoId === repoId);

    console.log(`[SSEManager] Broadcasting to ${repoClients.length} clients for repo ${repoId}`);

    repoClients.forEach(client => {
      this.sendToClient(client.clientId, {
        ...message,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: SSEMessage): void {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`[SSEManager] Client ${clientId} not found`);
      return;
    }

    try {
      // Format SSE message
      const data = JSON.stringify(message);
      const sseMessage = `data: ${data}\n\n`;

      // Write to response stream
      client.res.write(sseMessage);

      // Update activity timestamp
      client.lastActivity = Date.now();
    } catch (error) {
      console.error(`[SSEManager] Error sending to client ${clientId}:`, error);
      this.disconnect(clientId);
    }
  }

  /**
   * Send a simple event without full message structure
   */
  sendEvent(clientId: string, eventType: SSEMessageType, data?: any): void {
    this.sendToClient(clientId, {
      type: eventType,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Start heartbeat for a client
   */
  private startHeartbeat(clientId: string): void {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId);

      if (!client) {
        clearInterval(interval);
        this.heartbeatIntervals.delete(clientId);
        return;
      }

      // Send heartbeat
      this.sendToClient(clientId, {
        type: 'heartbeat',
        timestamp: Date.now(),
      });

      // Check for stale connection
      const timeSinceActivity = Date.now() - client.lastActivity;
      if (timeSinceActivity > this.staleTimeout) {
        console.log(`[SSEManager] Client ${clientId} stale (${timeSinceActivity}ms), disconnecting`);
        this.disconnect(clientId);
        clearInterval(interval);
      }
    }, this.heartbeatInterval);

    this.heartbeatIntervals.set(clientId, interval);
  }

  /**
   * Disconnect a client
   */
  disconnect(clientId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      try {
        // Send disconnect message
        this.sendToClient(clientId, {
          type: 'disconnected',
          timestamp: Date.now(),
          data: { message: 'Connection closed' },
        });

        // End response
        client.res.end();
      } catch (error) {
        // Connection already closed
      }

      // Clear heartbeat
      const interval = this.heartbeatIntervals.get(clientId);
      if (interval) {
        clearInterval(interval);
        this.heartbeatIntervals.delete(clientId);
      }

      // Remove client
      this.clients.delete(clientId);

      console.log(`[SSEManager] Client ${clientId} disconnected. Remaining clients: ${this.clients.size}`);
    }
  }

  /**
   * Disconnect all clients for a specific repo
   */
  disconnectRepo(repoId: string): void {
    const repoClients = Array.from(this.clients.values())
      .filter(client => client.repoId === repoId);

    console.log(`[SSEManager] Disconnecting ${repoClients.length} clients for repo ${repoId}`);

    repoClients.forEach(client => {
      this.disconnect(client.clientId);
    });
  }

  /**
   * Get active client count
   */
  getActiveClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients by repo
   */
  getClientsByRepo(repoId: string): SSEClient[] {
    return Array.from(this.clients.values())
      .filter(client => client.repoId === repoId);
  }

  /**
   * Get all connected clients
   */
  getAllClients(): SSEClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Cleanup stale connections
   */
  cleanupStaleConnections(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastActivity > this.staleTimeout) {
        console.log(`[SSEManager] Cleaning up stale client ${clientId}`);
        this.disconnect(clientId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Dispose all connections
   */
  dispose(): void {
    console.log(`[SSEManager] Disposing all ${this.clients.size} connections`);

    // Clear all heartbeats
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();

    // Disconnect all clients
    for (const clientId of this.clients.keys()) {
      this.disconnect(clientId);
    }
  }
}
