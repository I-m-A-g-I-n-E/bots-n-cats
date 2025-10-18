/**
 * BOC-20: Core Audio Infrastructure
 * Resource Manager for tracking and disposing Tone.js objects
 *
 * IMPORTANT: Every Tone.js object must be explicitly disposed
 * ResourceManager ensures no memory leaks in long-running applications
 */

import { ToneResource, ResourceEntry } from '../types/index.js';

export class ResourceManager {
  private resources: Map<string, ResourceEntry>;
  private idCounter: number;

  constructor() {
    this.resources = new Map();
    this.idCounter = 0;
  }

  /**
   * Track a Tone.js resource
   * @param name Human-readable name for the resource
   * @param resource The Tone.js object to track
   * @returns Unique ID for the tracked resource
   */
  public track(name: string, resource: ToneResource): string {
    const id = this.generateId(name);
    const entry: ResourceEntry = {
      id,
      resource,
      createdAt: Date.now(),
      type: resource.constructor.name,
    };

    this.resources.set(id, entry);
    return id;
  }

  /**
   * Get a tracked resource by ID
   */
  public get(id: string): ToneResource | undefined {
    return this.resources.get(id)?.resource;
  }

  /**
   * Dispose a single resource by ID
   */
  public dispose(id: string): boolean {
    const entry = this.resources.get(id);
    if (!entry) {
      console.warn(`Resource not found: ${id}`);
      return false;
    }

    try {
      // Check if resource has dispose method
      if ('dispose' in entry.resource && typeof entry.resource.dispose === 'function') {
        entry.resource.dispose();
      }
      this.resources.delete(id);
      return true;
    } catch (error) {
      console.error(`Error disposing resource ${id}:`, error);
      return false;
    }
  }

  /**
   * Dispose all tracked resources
   */
  public disposeAll(): void {
    const ids = Array.from(this.resources.keys());
    let successCount = 0;
    let failCount = 0;

    ids.forEach((id) => {
      if (this.dispose(id)) {
        successCount++;
      } else {
        failCount++;
      }
    });

    console.log(
      `ResourceManager: Disposed ${successCount} resources, ${failCount} failed`
    );
  }

  /**
   * Dispose resources by name pattern (regex)
   */
  public disposeByPattern(pattern: RegExp): number {
    const idsToDispose = Array.from(this.resources.keys()).filter((id) =>
      pattern.test(id)
    );

    let count = 0;
    idsToDispose.forEach((id) => {
      if (this.dispose(id)) {
        count++;
      }
    });

    return count;
  }

  /**
   * Get count of tracked resources
   */
  public getResourceCount(): number {
    return this.resources.size;
  }

  /**
   * Get all resource IDs
   */
  public getResourceIds(): string[] {
    return Array.from(this.resources.keys());
  }

  /**
   * Get resource statistics
   */
  public getStats(): {
    total: number;
    byType: Record<string, number>;
    oldestResource: ResourceEntry | null;
  } {
    const byType: Record<string, number> = {};
    let oldestResource: ResourceEntry | null = null;

    this.resources.forEach((entry) => {
      // Count by type
      byType[entry.type] = (byType[entry.type] || 0) + 1;

      // Track oldest resource
      if (!oldestResource || entry.createdAt < oldestResource.createdAt) {
        oldestResource = entry;
      }
    });

    return {
      total: this.resources.size,
      byType,
      oldestResource,
    };
  }

  /**
   * Generate unique ID for a resource
   */
  private generateId(name: string): string {
    const counter = this.idCounter++;
    const timestamp = Date.now();
    return `${name}_${timestamp}_${counter}`;
  }

  /**
   * Check if a resource is tracked
   */
  public has(id: string): boolean {
    return this.resources.has(id);
  }

  /**
   * Clear all resources without disposing (use with caution)
   */
  public clear(): void {
    this.resources.clear();
  }
}
