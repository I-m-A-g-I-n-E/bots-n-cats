# Implementation Examples

This document shows concrete code examples for the new configuration-driven architecture.

## File Structure

```
fx/
├── config/
│   ├── sounds.yaml              # Main config
│   ├── presets/
│   │   ├── default.yaml
│   │   ├── minimal.yaml
│   │   └── cyberpunk.yaml
│   └── schema.json
├── src/
│   ├── config/
│   │   ├── ConfigLoader.ts      # ⭐ Main loader
│   │   ├── SoundRegistry.ts     # ⭐ Runtime registry
│   │   ├── validator.ts
│   │   └── types.ts
│   ├── types/
│   │   ├── fx-config.ts
│   │   └── fx-types.ts
│   └── ...
└── package.json
```

## Core Implementation

### 1. Config Types (`src/config/types.ts`)

```typescript
/**
 * Configuration file structure
 */
export interface FxConfig {
  version: string;
  metadata: ConfigMetadata;
  sounds: Record<string, FxSoundDefinition>;
  categories?: Record<string, string[]>;
  melodic_samples?: Record<string, string>;
  purr_samples?: Record<string, string>;
  config?: ConfigOptions;
}

export interface ConfigMetadata {
  name: string;
  description: string;
  author?: string;
  version?: string;
  created?: string;
  tags?: string[];
  extends?: string;  // Inherit from another config
}

export interface FxSoundDefinition {
  name: string;
  category: FxSoundCategory;
  pitch?: string;
  bpm?: number;
  duration: number;
  loopable: boolean;
  emotion: EmotionCategory;
  description: string;
  file?: string | null;
  tags?: string[];
  volume?: number;
}

export interface ConfigOptions {
  allow_custom_sounds?: boolean;
  require_validation?: boolean;
  cache_duration?: number;
  hot_reload_in_dev?: boolean;
}

export type FxSoundCategory = 'rhythmic' | 'melodic' | 'textural' | 'expressive';
```

### 2. Config Loader (`src/config/ConfigLoader.ts`)

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { FxConfig, FxSoundDefinition } from './types.js';
import { validateConfig } from './validator.js';
import { SoundRegistry } from './SoundRegistry.js';

/**
 * Loads and parses FX sound configurations
 */
export class ConfigLoader {
  private static configCache = new Map<string, FxConfig>();
  private static cacheTimeout = 3600 * 1000; // 1 hour
  
  /**
   * Initialize with default configuration
   */
  static async initialize(configPath?: string): Promise<void> {
    const defaultPath = configPath || path.join(__dirname, '../../config/sounds.yaml');
    const config = await this.loadConfig(defaultPath);
    SoundRegistry.loadFromConfig(config);
  }
  
  /**
   * Load configuration from YAML or JSON file
   */
  static async loadConfig(filePath: string): Promise<FxConfig> {
    // Check cache
    const cached = this.configCache.get(filePath);
    if (cached) {
      return cached;
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    let config: FxConfig;
    
    // Parse based on extension
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      config = yaml.load(content) as FxConfig;
    } else if (filePath.endsWith('.json')) {
      config = JSON.parse(content);
    } else {
      throw new Error(`Unsupported config format: ${filePath}`);
    }
    
    // Validate
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }
    
    // Handle inheritance
    if (config.metadata.extends) {
      config = await this.mergeWithParent(config, filePath);
    }
    
    // Cache
    this.configCache.set(filePath, config);
    setTimeout(() => this.configCache.delete(filePath), this.cacheTimeout);
    
    return config;
  }
  
  /**
   * Load from JavaScript object (for testing)
   */
  static loadFromObject(config: FxConfig): FxConfig {
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }
    return config;
  }
  
  /**
   * Load a preset configuration
   */
  static async loadPreset(presetName: string): Promise<FxConfig> {
    const presetPath = path.join(__dirname, '../../config/presets', `${presetName}.yaml`);
    return this.loadConfig(presetPath);
  }
  
  /**
   * Merge config with parent (inheritance)
   */
  private static async mergeWithParent(
    config: FxConfig,
    currentPath: string
  ): Promise<FxConfig> {
    const parentPath = path.join(
      path.dirname(currentPath),
      `${config.metadata.extends}.yaml`
    );
    
    const parentConfig = await this.loadConfig(parentPath);
    
    return {
      ...parentConfig,
      ...config,
      metadata: {
        ...parentConfig.metadata,
        ...config.metadata,
      },
      sounds: {
        ...parentConfig.sounds,
        ...config.sounds, // Child overrides parent
      },
      categories: config.categories || parentConfig.categories,
      melodic_samples: config.melodic_samples || parentConfig.melodic_samples,
      purr_samples: config.purr_samples || parentConfig.purr_samples,
    };
  }
  
  /**
   * Hot reload config (dev mode)
   */
  static async watch(filePath: string, callback: (config: FxConfig) => void): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    
    const watcher = fs.watch(filePath);
    for await (const event of watcher) {
      if (event.eventType === 'change') {
        this.configCache.delete(filePath);
        const config = await this.loadConfig(filePath);
        callback(config);
      }
    }
  }
  
  /**
   * Clear cache
   */
  static clearCache(): void {
    this.configCache.clear();
  }
}
```

### 3. Sound Registry (`src/config/SoundRegistry.ts`)

```typescript
import { FxConfig, FxSoundDefinition } from './types.js';
import { FxSound, FxSoundCategory } from '../types/fx-types.js';

/**
 * Runtime registry for FX sounds
 * Provides efficient access to sound definitions
 */
export class SoundRegistry {
  private static sounds = new Map<string, FxSound>();
  private static categories = new Map<FxSoundCategory, string[]>();
  private static melodicSamples = new Map<string, string>();
  private static purrSamples = new Map<string, string>();
  private static initialized = false;
  
  /**
   * Load sounds from configuration
   */
  static loadFromConfig(config: FxConfig): void {
    this.sounds.clear();
    this.categories.clear();
    this.melodicSamples.clear();
    this.purrSamples.clear();
    
    // Load sounds
    for (const [id, def] of Object.entries(config.sounds)) {
      const sound: FxSound = {
        id,
        name: def.name,
        category: def.category,
        pitch: def.pitch,
        bpm: def.bpm,
        duration: def.duration,
        loopable: def.loopable,
        emotion: def.emotion,
        url: def.file || undefined,
        description: def.description,
      };
      this.sounds.set(id, sound);
    }
    
    // Load categories
    if (config.categories) {
      for (const [category, soundIds] of Object.entries(config.categories)) {
        this.categories.set(category as FxSoundCategory, soundIds);
      }
    } else {
      // Compute categories from sounds
      this.computeCategories();
    }
    
    // Load sampler mappings
    if (config.melodic_samples) {
      for (const [pitch, soundId] of Object.entries(config.melodic_samples)) {
        this.melodicSamples.set(pitch, soundId);
      }
    }
    
    if (config.purr_samples) {
      for (const [pitch, soundId] of Object.entries(config.purr_samples)) {
        this.purrSamples.set(pitch, soundId);
      }
    }
    
    this.initialized = true;
  }
  
  /**
   * Get a sound by ID
   */
  static getSound(id: string): FxSound | undefined {
    if (!this.initialized) {
      throw new Error('SoundRegistry not initialized. Call ConfigLoader.initialize() first.');
    }
    return this.sounds.get(id);
  }
  
  /**
   * Get a sound by ID (throws if not found)
   */
  static requireSound(id: string): FxSound {
    const sound = this.getSound(id);
    if (!sound) {
      throw new Error(`Sound not found: ${id}`);
    }
    return sound;
  }
  
  /**
   * Check if sound exists
   */
  static hasSound(id: string): boolean {
    return this.sounds.has(id);
  }
  
  /**
   * Get all sounds
   */
  static getAllSounds(): FxSound[] {
    return Array.from(this.sounds.values());
  }
  
  /**
   * Get all sound IDs
   */
  static getAllSoundIds(): string[] {
    return Array.from(this.sounds.keys());
  }
  
  /**
   * Get sounds by category
   */
  static getSoundsByCategory(category: FxSoundCategory): FxSound[] {
    const soundIds = this.categories.get(category) || [];
    return soundIds.map(id => this.requireSound(id));
  }
  
  /**
   * Get melodic samples mapping (pitch -> sound ID)
   */
  static getMelodicSamples(): Record<string, string> {
    return Object.fromEntries(this.melodicSamples);
  }
  
  /**
   * Get purr samples mapping (pitch -> sound ID)
   */
  static getPurrSamples(): Record<string, string> {
    return Object.fromEntries(this.purrSamples);
  }
  
  /**
   * Get total sound count
   */
  static getTotalCount(): number {
    return this.sounds.size;
  }
  
  /**
   * Update a sound at runtime
   */
  static updateSound(id: string, updates: Partial<FxSound>): void {
    const sound = this.sounds.get(id);
    if (!sound) {
      throw new Error(`Cannot update non-existent sound: ${id}`);
    }
    this.sounds.set(id, { ...sound, ...updates });
  }
  
  /**
   * Add a new sound at runtime
   */
  static addSound(sound: FxSound): void {
    if (this.sounds.has(sound.id)) {
      throw new Error(`Sound already exists: ${sound.id}`);
    }
    this.sounds.set(sound.id, sound);
    
    // Update category cache
    const categoryIds = this.categories.get(sound.category) || [];
    categoryIds.push(sound.id);
    this.categories.set(sound.category, categoryIds);
  }
  
  /**
   * Remove a sound
   */
  static removeSound(id: string): boolean {
    const sound = this.sounds.get(id);
    if (!sound) {
      return false;
    }
    
    this.sounds.delete(id);
    
    // Update category cache
    const categoryIds = this.categories.get(sound.category);
    if (categoryIds) {
      const filtered = categoryIds.filter(sid => sid !== id);
      this.categories.set(sound.category, filtered);
    }
    
    return true;
  }
  
  /**
   * Reset to empty state
   */
  static reset(): void {
    this.sounds.clear();
    this.categories.clear();
    this.melodicSamples.clear();
    this.purrSamples.clear();
    this.initialized = false;
  }
  
  /**
   * Compute categories from sounds (fallback)
   */
  private static computeCategories(): void {
    const computed = new Map<FxSoundCategory, string[]>();
    
    for (const [id, sound] of this.sounds) {
      const ids = computed.get(sound.category) || [];
      ids.push(id);
      computed.set(sound.category, ids);
    }
    
    this.categories = computed;
  }
}
```

### 4. Validator (`src/config/validator.ts`)

```typescript
import { FxConfig } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate FX configuration
 */
export function validateConfig(config: FxConfig): ValidationResult {
  const errors: string[] = [];
  
  // Check version
  if (!config.version) {
    errors.push('Missing version field');
  }
  
  // Check metadata
  if (!config.metadata) {
    errors.push('Missing metadata field');
  } else {
    if (!config.metadata.name) {
      errors.push('Missing metadata.name');
    }
    if (!config.metadata.description) {
      errors.push('Missing metadata.description');
    }
  }
  
  // Check sounds
  if (!config.sounds || typeof config.sounds !== 'object') {
    errors.push('Missing or invalid sounds field');
  } else {
    for (const [id, sound] of Object.entries(config.sounds)) {
      const soundErrors = validateSound(id, sound);
      errors.push(...soundErrors);
    }
  }
  
  // Check categories (optional but must be valid if present)
  if (config.categories) {
    const validCategories = ['rhythmic', 'melodic', 'textural', 'expressive'];
    for (const category of Object.keys(config.categories)) {
      if (!validCategories.includes(category)) {
        errors.push(`Invalid category: ${category}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateSound(id: string, sound: any): string[] {
  const errors: string[] = [];
  const prefix = `Sound '${id}'`;
  
  if (!sound.name) {
    errors.push(`${prefix}: missing name`);
  }
  
  if (!sound.category) {
    errors.push(`${prefix}: missing category`);
  } else {
    const validCategories = ['rhythmic', 'melodic', 'textural', 'expressive'];
    if (!validCategories.includes(sound.category)) {
      errors.push(`${prefix}: invalid category '${sound.category}'`);
    }
  }
  
  if (typeof sound.duration !== 'number' || sound.duration <= 0) {
    errors.push(`${prefix}: invalid duration`);
  }
  
  if (typeof sound.loopable !== 'boolean') {
    errors.push(`${prefix}: loopable must be boolean`);
  }
  
  if (!sound.emotion) {
    errors.push(`${prefix}: missing emotion`);
  }
  
  if (!sound.description) {
    errors.push(`${prefix}: missing description`);
  }
  
  return errors;
}
```

### 5. Updated Index (`src/index.ts`)

```typescript
/**
 * @bots-n-cats/fx
 * Flexible FX Sound Library and Musical Integration Engine
 */

// Configuration
export { ConfigLoader } from './config/ConfigLoader.js';
export { SoundRegistry } from './config/SoundRegistry.js';

// Main Manager (renamed)
export { FxInstrumentManager } from './FxInstrumentManager.js';

// Repository
export { SampleRepository } from './repository/SampleRepository.js';

// Instruments (renamed from samplers)
export { PurrSampler } from './instruments/PurrSampler.js';
export { MeowSampler } from './instruments/MeowSampler.js';
export { ChirpSampler } from './instruments/ChirpSampler.js';

// Mapping (renamed)
export { EventToFX } from './mapping/EventToFX.js';

// Types
export type {
  FxSound,
  FxSoundCategory,
  FxSoundInstruction,
  FxSamplerConfig,
  SynthesisParams,
  TimingStrategy,
} from './types/fx-types.js';

export type {
  FxConfig,
  FxSoundDefinition,
  ConfigMetadata,
  ConfigOptions,
} from './config/types.js';

// Initialize with default config on import
import { ConfigLoader } from './config/ConfigLoader.js';
await ConfigLoader.initialize();
```

## Usage Examples

### Basic Usage

```typescript
import { SoundRegistry, FxInstrumentManager } from '@bots-n-cats/fx';

// Get a sound
const meow = SoundRegistry.getSound('meow_c4');
console.log(meow?.name); // "Meow - C4"

// Get by category
const rhythmic = SoundRegistry.getSoundsByCategory('rhythmic');
console.log(`Found ${rhythmic.length} rhythmic sounds`);

// Use with instrument manager
const manager = new FxInstrumentManager(audioContext);
await manager.playSoundInstruction({
  soundId: 'excited_chirp',
  timing: 'downbeat',
  volume: 0.8,
});
```

### Custom Configuration

```typescript
import { ConfigLoader, SoundRegistry } from '@bots-n-cats/fx';

// Load custom config
await ConfigLoader.loadConfig('./my-sounds.yaml');

// Or load preset
await ConfigLoader.loadPreset('minimal');

// Or from object
ConfigLoader.loadFromObject({
  version: '1.0',
  metadata: {
    name: 'Test Pack',
    description: 'For testing'
  },
  sounds: {
    test_sound: {
      name: 'Test',
      category: 'expressive',
      duration: 1.0,
      loopable: false,
      emotion: 'activity',
      description: 'Test sound'
    }
  }
});

const sound = SoundRegistry.getSound('test_sound');
```

### Hot Reload (Development)

```typescript
import { ConfigLoader, SoundRegistry } from '@bots-n-cats/fx';

// Watch for changes
await ConfigLoader.watch('./config/sounds.yaml', (newConfig) => {
  console.log('Config reloaded!');
  SoundRegistry.loadFromConfig(newConfig);
});
```

### Runtime Modifications

```typescript
import { SoundRegistry } from '@bots-n-cats/fx';

// Update sound properties
SoundRegistry.updateSound('meow_c4', {
  duration: 0.3,
  volume: 0.5
});

// Add new sound
SoundRegistry.addSound({
  id: 'custom_fx',
  name: 'Custom FX',
  category: 'expressive',
  duration: 1.5,
  loopable: false,
  emotion: 'activity',
  description: 'Custom sound effect'
});

// Remove sound
SoundRegistry.removeSound('custom_fx');
```

## Package Dependencies

Update `package.json`:

```json
{
  "name": "@bots-n-cats/fx",
  "dependencies": {
    "@bots-n-cats/audio-core": "*",
    "tone": "^14.7.77",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  }
}
```

## Benefits Demonstrated

1. ✅ **Decoupled**: Sound data separate from code
2. ✅ **Flexible**: Load different configs at runtime
3. ✅ **Extensible**: Easy to add new sounds
4. ✅ **Cacheable**: Built-in caching for performance
5. ✅ **Validatable**: Schema validation
6. ✅ **Inheritable**: Config extension support
7. ✅ **Hot-reloadable**: Dev mode file watching
8. ✅ **Type-safe**: Full TypeScript support
