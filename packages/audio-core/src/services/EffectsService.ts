/**
 * BOC-20: Core Audio Infrastructure - Service Layer
 * EffectsService manages audio effects chains and processing
 *
 * IMPORTANT: All effects are tracked via ResourceManager
 * Supports chaining multiple effects together
 */

import * as Tone from 'tone';
import { ResourceManager } from '../resources/ResourceManager.js';
import { AudioEventBus } from '../events/AudioEventBus.js';

export type EffectType =
  | 'reverb'
  | 'delay'
  | 'distortion'
  | 'chorus'
  | 'filter'
  | 'compressor'
  | 'phaser'
  | 'tremolo'
  | 'vibrato'
  | 'autoWah';

export interface EffectOptions {
  [key: string]: any;
}

export interface EffectHandle {
  id: string;
  effect: Tone.Effect;
  type: EffectType;
}

export interface EffectChain {
  id: string;
  effects: EffectHandle[];
  input: Tone.ToneAudioNode;
  output: Tone.ToneAudioNode;
}

export class EffectsService {
  private resources: ResourceManager;
  private eventBus: AudioEventBus;
  private activeEffects: Map<string, Tone.Effect>;
  private effectChains: Map<string, EffectChain>;
  private effectCounter: number;
  private chainCounter: number;

  constructor(resourceMgr: ResourceManager, eventBus: AudioEventBus) {
    this.resources = resourceMgr;
    this.eventBus = eventBus;
    this.activeEffects = new Map();
    this.effectChains = new Map();
    this.effectCounter = 0;
    this.chainCounter = 0;
  }

  /**
   * Create a single effect
   */
  public createEffect(type: EffectType, options?: EffectOptions): EffectHandle {
    let effect: Tone.Effect;

    switch (type) {
      case 'reverb':
        effect = new Tone.Reverb(options);
        break;

      case 'delay':
        effect = new Tone.FeedbackDelay(options);
        break;

      case 'distortion':
        effect = new Tone.Distortion(options);
        break;

      case 'chorus':
        effect = new Tone.Chorus(options);
        break;

      case 'filter':
        effect = new Tone.Filter(options);
        break;

      case 'compressor':
        effect = new Tone.Compressor(options);
        break;

      case 'phaser':
        effect = new Tone.Phaser(options);
        break;

      case 'tremolo':
        effect = new Tone.Tremolo(options);
        break;

      case 'vibrato':
        effect = new Tone.Vibrato(options);
        break;

      case 'autoWah':
        effect = new Tone.AutoWah(options);
        break;

      default:
        throw new Error(`Unknown effect type: ${type}`);
    }

    const id = this.resources.track(`effect_${type}`, effect);
    this.activeEffects.set(id, effect);

    this.eventBus.publishSync('effects:created', { id, type });

    return { id, effect, type };
  }

  /**
   * Create an effect chain from multiple effects
   * Effects are connected in the order provided
   */
  public createEffectChain(
    effects: Array<{ type: EffectType; options?: EffectOptions }>
  ): EffectChain {
    const effectHandles: EffectHandle[] = [];

    // Create all effects
    effects.forEach(({ type, options }) => {
      const handle = this.createEffect(type, options);
      effectHandles.push(handle);
    });

    // Chain effects together
    let previousEffect: Tone.Effect | null = null;
    effectHandles.forEach((handle) => {
      if (previousEffect) {
        previousEffect.connect(handle.effect);
      }
      previousEffect = handle.effect;
    });

    const chainId = this.generateChainId();
    const chain: EffectChain = {
      id: chainId,
      effects: effectHandles,
      input: effectHandles[0]?.effect || new Tone.Gain(),
      output: effectHandles[effectHandles.length - 1]?.effect || new Tone.Gain(),
    };

    this.effectChains.set(chainId, chain);

    this.eventBus.publishSync('effects:chain:created', {
      id: chainId,
      effectCount: effectHandles.length,
    });

    return chain;
  }

  /**
   * Apply an effect to an audio node
   */
  public applyEffect(
    nodeId: string,
    node: Tone.ToneAudioNode,
    effectType: EffectType,
    params?: EffectOptions
  ): EffectHandle {
    const effectHandle = this.createEffect(effectType, params);

    // Connect node → effect → destination
    node.disconnect();
    node.connect(effectHandle.effect);
    effectHandle.effect.toDestination();

    this.eventBus.publishSync('effects:applied', {
      nodeId,
      effectId: effectHandle.id,
      effectType,
    });

    return effectHandle;
  }

  /**
   * Apply an effect chain to an audio node
   */
  public applyEffectChain(
    nodeId: string,
    node: Tone.ToneAudioNode,
    chainId: string
  ): boolean {
    const chain = this.effectChains.get(chainId);
    if (!chain) {
      console.warn(`Effect chain not found: ${chainId}`);
      return false;
    }

    // Connect node → chain input → ... → chain output → destination
    node.disconnect();
    node.connect(chain.input);
    chain.output.toDestination();

    this.eventBus.publishSync('effects:chain:applied', {
      nodeId,
      chainId,
    });

    return true;
  }

  /**
   * Update effect parameters
   */
  public updateEffect(id: string, params: EffectOptions): boolean {
    const effect = this.activeEffects.get(id);
    if (!effect) {
      console.warn(`Effect not found: ${id}`);
      return false;
    }

    // Apply parameters to effect
    Object.entries(params).forEach(([key, value]) => {
      if (key in effect) {
        const effectProp = (effect as any)[key];
        // Handle Tone.Param vs direct properties
        if (effectProp && typeof effectProp === 'object' && 'value' in effectProp) {
          effectProp.value = value;
        } else {
          (effect as any)[key] = value;
        }
      }
    });

    this.eventBus.publishSync('effects:updated', { id, params });
    return true;
  }

  /**
   * Set effect wet/dry mix (0-1)
   */
  public setWet(id: string, wetAmount: number): boolean {
    const effect = this.activeEffects.get(id);
    if (!effect) {
      console.warn(`Effect not found: ${id}`);
      return false;
    }

    if (wetAmount < 0 || wetAmount > 1) {
      throw new Error('Wet amount must be between 0 and 1');
    }

    effect.wet.value = wetAmount;
    this.eventBus.publishSync('effects:wet:changed', { id, wetAmount });
    return true;
  }

  /**
   * Get effect by ID
   */
  public getEffect(id: string): Tone.Effect | undefined {
    return this.activeEffects.get(id);
  }

  /**
   * Get effect chain by ID
   */
  public getEffectChain(id: string): EffectChain | undefined {
    return this.effectChains.get(id);
  }

  /**
   * Dispose a single effect
   */
  public disposeEffect(id: string): boolean {
    const disposed = this.resources.dispose(id);
    if (disposed) {
      this.activeEffects.delete(id);
      this.eventBus.publishSync('effects:disposed', { id });
    }
    return disposed;
  }

  /**
   * Dispose an entire effect chain
   */
  public disposeEffectChain(chainId: string): boolean {
    const chain = this.effectChains.get(chainId);
    if (!chain) {
      console.warn(`Effect chain not found: ${chainId}`);
      return false;
    }

    // Dispose all effects in the chain
    chain.effects.forEach((handle) => {
      this.disposeEffect(handle.id);
    });

    this.effectChains.delete(chainId);
    this.eventBus.publishSync('effects:chain:disposed', { chainId });
    return true;
  }

  /**
   * Get count of active effects
   */
  public getActiveCount(): number {
    return this.activeEffects.size;
  }

  /**
   * Get count of active effect chains
   */
  public getChainCount(): number {
    return this.effectChains.size;
  }

  /**
   * Generate unique effect chain ID
   */
  private generateChainId(): string {
    const counter = this.chainCounter++;
    const timestamp = Date.now();
    return `chain_${timestamp}_${counter}`;
  }

  /**
   * Dispose all effects and chains
   */
  public dispose(): void {
    // Dispose all chains
    const chainIds = Array.from(this.effectChains.keys());
    chainIds.forEach((id) => this.disposeEffectChain(id));

    // Dispose remaining individual effects
    const effectIds = Array.from(this.activeEffects.keys());
    effectIds.forEach((id) => this.disposeEffect(id));

    this.eventBus.publishSync('effects:service:disposed', {
      effectCount: effectIds.length,
      chainCount: chainIds.length,
    });
  }
}
