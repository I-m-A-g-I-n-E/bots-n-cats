# Sound FX Package Refactoring Strategy

## Overview
Refactor the `cat-sounds` package to `fx` with a configuration-driven architecture that decouples sound definitions from implementation code.

## Problems with Current Architecture

### 1. **Tight Coupling**
- Sound definitions are hardcoded in TypeScript (`sounds.ts` - 400+ lines)
- Cannot swap sound sets without code changes
- Difficult to maintain and extend
- No runtime flexibility

### 2. **Poor Separation of Concerns**
- Data mixed with code
- Sound metadata embedded in constants
- Category groupings computed at runtime

### 3. **Limited Extensibility**
- Adding new sounds requires TypeScript changes
- No support for custom sound packs
- Cannot A/B test different sound sets
- No environment-specific overrides

## Proposed Solution: Configuration-Driven Architecture

### Architecture Changes

```
fx/
├── config/                      # Sound configuration files
│   ├── sounds.yaml              # Main sound definitions
│   ├── presets/                 # Preset sound packs
│   │   ├── default.yaml
│   │   ├── minimal.yaml
│   │   └── custom.yaml
│   └── schema.json              # JSON schema for validation
├── src/
│   ├── config/                  # Configuration loading
│   │   ├── ConfigLoader.ts      # Load & validate configs
│   │   ├── SoundRegistry.ts     # Runtime sound registry
│   │   └── validator.ts         # Schema validation
│   ├── types/
│   │   ├── fx-config.ts         # Config types
│   │   └── fx-types.ts          # Renamed from cat-sounds.ts
│   ├── instruments/             # Renamed from samplers/
│   │   ├── PurrSampler.ts
│   │   ├── MeowSampler.ts
│   │   └── ChirpSampler.ts
│   ├── repository/
│   │   └── SampleRepository.ts  # Updated to use ConfigLoader
│   ├── mapping/
│   │   └── EventToFX.ts         # Renamed from EventToCatSound
│   ├── FxInstrumentManager.ts   # Renamed from CatInstrumentManager
│   └── index.ts
└── package.json                 # @bots-n-cats/fx
```

## Configuration Format

### YAML Configuration Schema

```yaml
# config/sounds.yaml
version: "1.0"
metadata:
  name: "Default Cat FX Pack"
  description: "Original cat sound library"
  author: "bots-n-cats"

sounds:
  # Rhythmic/Percussive
  purr_c2:
    name: "Deep Bass Purr"
    category: rhythmic
    pitch: C2
    bpm: 120
    duration: 2.0
    loopable: true
    emotion: resolution
    description: "Deep, resonant purr for bass line foundation"
    # Future: actual file reference
    file: null  # or "assets/purr_c2.wav"
  
  purr_c3:
    name: "Mid-Range Purr"
    category: rhythmic
    pitch: C3
    bpm: 130
    duration: 2.0
    loopable: true
    emotion: resolution
    description: "Medium purr for rhythmic texture"
    file: null

# ... rest of sounds

# Precomputed lookups for performance
categories:
  rhythmic:
    - purr_c2
    - purr_c3
    - chirp_percussion
    # ...
  melodic:
    - meow_c4
    - meow_d4
    # ...
  textural:
    - gentle_purr_pad
    # ...
  expressive:
    - excited_chirp
    # ...

# Pitch mappings for samplers
melodic_samples:
  C4: meow_c4
  D4: meow_d4
  E4: meow_e4
  F4: meow_f4
  G4: meow_g4
  A4: meow_a4
  B4: meow_b4
  C5: trill_c5

purr_samples:
  C2: purr_c2
  C3: purr_c3
```

### Alternative: JSON Format

```json
{
  "version": "1.0",
  "metadata": {
    "name": "Default Cat FX Pack",
    "description": "Original cat sound library"
  },
  "sounds": {
    "purr_c2": {
      "name": "Deep Bass Purr",
      "category": "rhythmic",
      "pitch": "C2",
      "bpm": 120,
      "duration": 2.0,
      "loopable": true,
      "emotion": "resolution",
      "description": "Deep, resonant purr for bass line foundation",
      "file": null
    }
  }
}
```

## Implementation Steps

### Phase 1: Configuration Infrastructure (Low Risk)
1. **Create config loader system**
   - `ConfigLoader.ts` - Load YAML/JSON files
   - `SoundRegistry.ts` - Runtime registry with fallbacks
   - `validator.ts` - Validate against schema
   
2. **Define configuration types**
   - `FxConfig` interface
   - `SoundDefinition` interface
   - `ConfigMetadata` interface

3. **Add dependencies**
   - `js-yaml` for YAML parsing
   - `ajv` for JSON schema validation

### Phase 2: Migrate Sound Data (Medium Risk)
1. **Convert sounds.ts to sounds.yaml**
   - Extract all 30+ sound definitions
   - Preserve all metadata
   - Keep computed lookups for performance

2. **Update SampleRepository**
   - Load from ConfigLoader instead of constants
   - Add caching for performance
   - Support config hot-reloading (dev mode)

3. **Create preset configs**
   - `default.yaml` - Current sound set
   - `minimal.yaml` - Reduced sound set for testing
   - Template for custom packs

### Phase 3: Rename Package (High Risk - Breaking Change)
1. **Rename directory**
   - `cat-sounds` → `fx`
   - Update workspace config in root `package.json`

2. **Rename package scope**
   - `@bots-n-cats/cat-sounds` → `@bots-n-cats/fx`
   - Update all imports in dependent packages

3. **Rename internal identifiers**
   - `CatSound` → `FxSound`
   - `CatInstrumentManager` → `FxInstrumentManager`
   - `EventToCatSound` → `EventToFX`
   - Keep `category` values (rhythmic, melodic, etc.) unchanged

4. **Update references**
   - Search and replace imports across workspace
   - Update `package-lock.json`
   - Rebuild all packages

### Phase 4: Testing & Validation (Critical)
1. **Unit tests**
   - ConfigLoader parsing
   - Schema validation
   - Sound registry operations

2. **Integration tests**
   - Load all sound presets
   - Verify backward compatibility
   - Test samplers with new config

3. **Migration script**
   - Validate no sounds lost
   - Verify all metadata preserved
   - Compare old vs new output

## Benefits of New Architecture

### 1. **Flexibility**
- Swap entire sound packs without code changes
- Override specific sounds per environment
- A/B test different sound sets
- User-customizable sound packs

### 2. **Maintainability**
- Sound data separate from logic
- Easier to review/edit sound properties
- Version control friendly (YAML diffs)
- Non-developers can contribute sounds

### 3. **Extensibility**
- Plugin system for custom sound packs
- Future: Load sounds from remote URLs
- Future: User uploads custom sounds
- Future: Dynamic sound generation params

### 4. **Performance**
- Lazy loading of sound definitions
- Selective loading (only needed categories)
- Config caching with invalidation
- Precomputed lookups preserved

## Backward Compatibility

### Breaking Changes
- ✅ Package name change: `@bots-n-cats/cat-sounds` → `@bots-n-cats/fx`
- ✅ Type renames: `CatSound` → `FxSound`, etc.
- ✅ Import paths change
- ⚠️ Constants no longer exported directly (use registry)

### Migration Path
```typescript
// Old
import { CAT_SOUND_CATALOG } from '@bots-n-cats/cat-sounds';

// New
import { SoundRegistry } from '@bots-n-cats/fx';
const catalog = SoundRegistry.getAllSounds();
```

### Gradual Migration
1. Keep both exports temporarily with deprecation warnings
2. Provide migration guide
3. Remove old exports in v2.0

## Configuration Examples

### Custom Sound Pack
```yaml
# config/presets/cyberpunk.yaml
version: "1.0"
metadata:
  name: "Cyberpunk FX Pack"
  extends: "default"  # Inherit from default

sounds:
  # Override specific sounds
  excited_chirp:
    name: "Digital Ping"
    file: "assets/digital_ping.wav"
    # Other properties inherited from default
  
  # Add new sounds
  synth_pulse:
    name: "Synth Pulse"
    category: rhythmic
    duration: 1.0
    loopable: true
    emotion: activity
    file: "assets/synth_pulse.wav"
```

### Environment Override
```yaml
# config/environments/development.yaml
sounds:
  # Use shorter sounds in dev for faster feedback
  purr_c2:
    duration: 0.5  # Override duration only
```

## Risk Assessment

### Low Risk
- ✅ Adding config infrastructure alongside existing code
- ✅ Creating YAML files without removing TypeScript
- ✅ Adding new types and interfaces

### Medium Risk
- ⚠️ Changing SampleRepository to load from config
- ⚠️ Updating file structure
- ⚠️ Migration testing

### High Risk
- 🔴 Package rename (affects all dependents)
- 🔴 Breaking type changes
- 🔴 Import path updates across workspace

## Rollback Plan

If issues arise:
1. **Phase 1-2**: No rollback needed (additive changes)
2. **Phase 3**: Git revert the rename commits
3. **Phase 4**: Restore from backup, fix issues, retry

## Timeline Estimate

- **Phase 1** (Config Infrastructure): 4-6 hours
- **Phase 2** (Migrate Data): 3-4 hours  
- **Phase 3** (Rename Package): 2-3 hours
- **Phase 4** (Testing): 3-4 hours
- **Total**: 12-17 hours of development

## Next Steps

1. ✅ Review this strategy with team
2. ⬜ Choose config format (YAML vs JSON - recommend YAML)
3. ⬜ Create branch for refactoring
4. ⬜ Implement Phase 1 (low risk)
5. ⬜ Test thoroughly before Phase 3 (breaking changes)

## Questions to Resolve

1. **Config Format**: YAML (human-friendly) vs JSON (simpler parsing)?
2. **Preset Strategy**: How many presets to ship initially?
3. **Migration Timing**: Do this before or after adding real sound files?
4. **Type Naming**: Keep "Cat" terminology or go fully generic with "FX"?
5. **Backward Compat**: How long to maintain deprecated exports?

---

**Recommendation**: Start with Phase 1 & 2 (non-breaking), validate thoroughly, then proceed with Phase 3 rename when ready for a breaking change release.
