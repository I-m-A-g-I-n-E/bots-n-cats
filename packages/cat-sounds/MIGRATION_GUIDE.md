# Migration Guide: cat-sounds → fx

## Overview
This guide helps migrate from the hardcoded `@bots-n-cats/cat-sounds` package to the configuration-driven `@bots-n-cats/fx` package.

## Breaking Changes Summary

### Package Name
```diff
- @bots-n-cats/cat-sounds
+ @bots-n-cats/fx
```

### Import Paths
```diff
- import { CatInstrumentManager } from '@bots-n-cats/cat-sounds';
+ import { FxInstrumentManager } from '@bots-n-cats/fx';
```

### Type Names
```diff
- CatSound
- CatSoundCategory
- CatSoundInstruction
- CatSamplerConfig
- CatInstrumentManager
- EventToCatSound

+ FxSound
+ FxSoundCategory
+ FxSoundInstruction
+ FxSamplerConfig
+ FxInstrumentManager
+ EventToFX
```

### Constant Access
```diff
- import { CAT_SOUND_CATALOG } from '@bots-n-cats/cat-sounds';
- const sound = CAT_SOUND_CATALOG['purr_c2'];

+ import { SoundRegistry } from '@bots-n-cats/fx';
+ const sound = SoundRegistry.getSound('purr_c2');
+ // or
+ const allSounds = SoundRegistry.getAllSounds();
```

## Migration Steps

### Step 1: Update package.json
```diff
{
  "dependencies": {
-   "@bots-n-cats/cat-sounds": "*",
+   "@bots-n-cats/fx": "*",
  }
}
```

### Step 2: Update Imports

#### Before (Old API)
```typescript
import {
  CatInstrumentManager,
  CAT_SOUND_CATALOG,
  SOUNDS_BY_CATEGORY,
  type CatSound,
  type CatSoundInstruction
} from '@bots-n-cats/cat-sounds';

// Direct constant access
const meowSound = CAT_SOUND_CATALOG['meow_c4'];
const rhythmicSounds = SOUNDS_BY_CATEGORY.rhythmic;

// Manager usage
const manager = new CatInstrumentManager(audioContext);
```

#### After (New API)
```typescript
import {
  FxInstrumentManager,
  SoundRegistry,
  type FxSound,
  type FxSoundInstruction
} from '@bots-n-cats/fx';

// Registry access (with caching)
const meowSound = SoundRegistry.getSound('meow_c4');
const rhythmicSounds = SoundRegistry.getSoundsByCategory('rhythmic');

// Manager usage (same API, different name)
const manager = new FxInstrumentManager(audioContext);
```

### Step 3: Update Type Annotations

```typescript
// Before
function processSound(sound: CatSound): void {
  // ...
}

const instruction: CatSoundInstruction = {
  soundId: 'meow_c4',
  timing: 'downbeat',
  volume: 0.8
};

// After
function processSound(sound: FxSound): void {
  // ...
}

const instruction: FxSoundInstruction = {
  soundId: 'meow_c4',
  timing: 'downbeat',
  volume: 0.8
};
```

### Step 4: Update Class Instances

```typescript
// Before
import { EventToCatSound } from '@bots-n-cats/cat-sounds';
const mapper = new EventToCatSound();

// After
import { EventToFX } from '@bots-n-cats/fx';
const mapper = new EventToFX();
```

## New Features

### 1. Custom Sound Configurations

```typescript
import { SoundRegistry, ConfigLoader } from '@bots-n-cats/fx';

// Load custom sound pack
await ConfigLoader.loadConfig('./config/my-sounds.yaml');

// Or load from object
ConfigLoader.loadFromObject({
  sounds: {
    custom_sound: {
      name: 'Custom Sound',
      category: 'expressive',
      duration: 1.0,
      loopable: false,
      emotion: 'activity',
      description: 'My custom sound'
    }
  }
});

// Access as normal
const sound = SoundRegistry.getSound('custom_sound');
```

### 2. Sound Pack Presets

```typescript
import { ConfigLoader } from '@bots-n-cats/fx';

// Load different presets
await ConfigLoader.loadPreset('default');    // Full sound set
await ConfigLoader.loadPreset('minimal');    // Reduced set
await ConfigLoader.loadPreset('cyberpunk');  // Themed pack
```

### 3. Runtime Configuration

```typescript
import { SoundRegistry } from '@bots-n-cats/fx';

// Override specific sound properties at runtime
SoundRegistry.updateSound('meow_c4', {
  duration: 0.3,  // Shorter duration
  volume: 0.6     // Quieter
});

// Reset to defaults
SoundRegistry.reset();
```

### 4. Environment-Specific Sounds

```yaml
# config/environments/production.yaml
sounds:
  excited_chirp:
    duration: 0.5  # Longer in production

# config/environments/development.yaml  
sounds:
  excited_chirp:
    duration: 0.1  # Shorter in dev for faster testing
```

```typescript
// Load environment config
const env = process.env.NODE_ENV || 'development';
await ConfigLoader.loadConfig(`./config/environments/${env}.yaml`);
```

## API Comparison

### Accessing Sounds

| Old API | New API |
|---------|---------|
| `CAT_SOUND_CATALOG['sound_id']` | `SoundRegistry.getSound('sound_id')` |
| `SOUNDS_BY_CATEGORY.rhythmic` | `SoundRegistry.getSoundsByCategory('rhythmic')` |
| `MELODIC_SAMPLES_BY_PITCH['C4']` | `SoundRegistry.getSamplesByPitch('melodic')['C4']` |
| `TOTAL_SOUND_COUNT` | `SoundRegistry.getTotalCount()` |

### Checking Sounds

| Old API | New API |
|---------|---------|
| `'sound_id' in CAT_SOUND_CATALOG` | `SoundRegistry.hasSound('sound_id')` |
| N/A | `SoundRegistry.validateSound(sound)` |

### Iteration

| Old API | New API |
|---------|---------|
| `Object.values(CAT_SOUND_CATALOG)` | `SoundRegistry.getAllSounds()` |
| `Object.keys(CAT_SOUND_CATALOG)` | `SoundRegistry.getAllSoundIds()` |

## Automated Migration Script

We provide a migration script to help automate the process:

```bash
# Install migration tool
npm install -g @bots-n-cats/fx-migration

# Run migration on your codebase
fx-migrate --source ./src --dry-run

# Apply changes
fx-migrate --source ./src --apply
```

The script will:
- ✅ Update import statements
- ✅ Rename types
- ✅ Convert constant access to registry calls
- ✅ Update package.json
- ⚠️ Flag complex patterns for manual review

## Testing Your Migration

### 1. Verify Package Installation
```bash
npm install
npm run build
```

### 2. Run Tests
```bash
npm test
```

### 3. Check Sound Count
```typescript
import { SoundRegistry } from '@bots-n-cats/fx';

// Should still be 30+ sounds
console.log('Total sounds:', SoundRegistry.getTotalCount());
```

### 4. Verify Sound Access
```typescript
import { SoundRegistry } from '@bots-n-cats/fx';

// Test a few key sounds
const sounds = [
  'purr_c2',
  'meow_c4',
  'excited_chirp',
  'gentle_purr_pad'
];

sounds.forEach(id => {
  const sound = SoundRegistry.getSound(id);
  console.log(`✓ ${id}:`, sound.name);
});
```

## Rollback Plan

If you encounter issues:

### 1. Quick Rollback (package.json)
```diff
{
  "dependencies": {
-   "@bots-n-cats/fx": "*",
+   "@bots-n-cats/cat-sounds": "1.x",
  }
}
```

### 2. Git Revert
```bash
git revert HEAD
npm install
```

### 3. Use Compatibility Layer (Temporary)
We provide a compatibility shim for gradual migration:

```typescript
// Install shim
import '@bots-n-cats/fx/compat';

// Old imports still work with deprecation warnings
import { CAT_SOUND_CATALOG } from '@bots-n-cats/fx/compat';
```

## Common Issues

### Issue 1: Cannot find module '@bots-n-cats/fx'

**Solution**: Clear node_modules and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue 2: Type errors with FxSound vs CatSound

**Solution**: Run find-and-replace
```bash
# macOS/Linux
find ./src -type f -name "*.ts" -exec sed -i '' 's/CatSound/FxSound/g' {} +
find ./src -type f -name "*.ts" -exec sed -i '' 's/CatSampler/FxSampler/g' {} +
```

### Issue 3: Runtime errors accessing sounds

**Solution**: Ensure config is loaded before accessing sounds
```typescript
import { ConfigLoader, SoundRegistry } from '@bots-n-cats/fx';

// Load config first
await ConfigLoader.initialize();

// Then access sounds
const sound = SoundRegistry.getSound('meow_c4');
```

## Getting Help

- 📖 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/bots-n-cats/issues)
- 💬 [Discord Community](https://discord.gg/bots-n-cats)

## Timeline

- **Now**: Old `@bots-n-cats/cat-sounds` package deprecated
- **+3 months**: Compatibility shim removed
- **+6 months**: Old package unpublished

Please migrate at your earliest convenience!
