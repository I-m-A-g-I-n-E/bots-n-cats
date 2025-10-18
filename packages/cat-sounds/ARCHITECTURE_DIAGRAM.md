# Architecture Diagrams

## Current Architecture (Tightly Coupled)

```
┌─────────────────────────────────────────────────────────────┐
│                    @bots-n-cats/cat-sounds                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         constants/sounds.ts (406 lines)             │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │  export const CAT_SOUND_CATALOG = {          │  │  │
│  │  │    purr_c2: { /* hardcoded */ },             │  │  │
│  │  │    meow_c4: { /* hardcoded */ },             │  │  │
│  │  │    ... 30+ more sounds ...                   │  │  │
│  │  │  };                                           │  │  │
│  │  │                                               │  │  │
│  │  │  export const SOUNDS_BY_CATEGORY = { ... };  │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                                │
│                           │ import                         │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            SampleRepository.ts                      │  │
│  │  - Directly imports CAT_SOUND_CATALOG               │  │
│  │  - No configuration layer                           │  │
│  │  - Cannot swap sound sets                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         CatInstrumentManager.ts                     │  │
│  │  - Uses repository                                   │  │
│  │  - Tightly coupled to cat sound names               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Problems:
❌ Data mixed with code
❌ Cannot swap sounds without code changes
❌ Hard to maintain (400+ line constant file)
❌ No runtime flexibility
❌ Non-developers cannot edit sounds
```

## Proposed Architecture (Configuration-Driven)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           @bots-n-cats/fx                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                     config/ (Data Layer)                        │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  sounds.yaml (Default Sound Pack)                        │  │    │
│  │  │  ┌────────────────────────────────────────────────────┐  │  │    │
│  │  │  │  version: "1.0"                                    │  │  │    │
│  │  │  │  sounds:                                           │  │  │    │
│  │  │  │    purr_c2:                                        │  │  │    │
│  │  │  │      name: "Deep Bass Purr"                        │  │  │    │
│  │  │  │      category: rhythmic                            │  │  │    │
│  │  │  │      duration: 2.0                                 │  │  │    │
│  │  │  │      ...                                           │  │  │    │
│  │  │  └────────────────────────────────────────────────────┘  │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  │                                                                 │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  presets/                                                │  │    │
│  │  │    ├── default.yaml    (Full 30+ sounds)                │  │    │
│  │  │    ├── minimal.yaml    (Reduced set)                    │  │    │
│  │  │    └── cyberpunk.yaml  (Alternative theme)             │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                   │                                     │
│                                   │ loads                               │
│                                   ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              config/ (Configuration Layer)                      │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  ConfigLoader.ts                                         │  │    │
│  │  │  - Load YAML/JSON files                                  │  │    │
│  │  │  - Parse and validate                                    │  │    │
│  │  │  - Handle inheritance (extends)                          │  │    │
│  │  │  - Cache configs                                         │  │    │
│  │  │  - Hot reload (dev mode)                                 │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  │                          │                                      │    │
│  │                          ▼                                      │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  validator.ts                                            │  │    │
│  │  │  - Schema validation                                     │  │    │
│  │  │  - Type checking                                         │  │    │
│  │  │  - Error reporting                                       │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                   │                                     │
│                                   │ populates                           │
│                                   ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              config/ (Runtime Registry)                         │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  SoundRegistry.ts                                        │  │    │
│  │  │  - In-memory sound catalog                               │  │    │
│  │  │  - Fast lookups (Map-based)                              │  │    │
│  │  │  - Category indexing                                     │  │    │
│  │  │  - Sampler mappings                                      │  │    │
│  │  │  - Runtime modifications                                 │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                   │                                     │
│                                   │ queried by                          │
│                                   ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              repository/ (Business Logic)                       │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  SampleRepository.ts                                     │  │    │
│  │  │  - Uses SoundRegistry (not hardcoded constants)          │  │    │
│  │  │  - Business logic for sample management                  │  │    │
│  │  │  - Synthesis and playback                                │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                   │                                     │
│                                   ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              FxInstrumentManager.ts                             │    │
│  │  - Generic "FX" naming (not cat-specific)                      │    │
│  │  - Works with any sound configuration                          │    │
│  │  - Flexible and extensible                                     │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

Benefits:
✅ Data separated from code
✅ Runtime configuration swapping
✅ Easy to maintain (YAML > TypeScript for data)
✅ Full flexibility (presets, custom packs)
✅ Non-developer friendly
✅ Hot reload support
✅ Version control friendly
```

## Data Flow

### Old Flow (Static)
```
Developer edits sounds.ts
        ↓
Rebuild TypeScript
        ↓
Import constant
        ↓
Use in code
        ↓
No runtime changes possible
```

### New Flow (Dynamic)
```
Edit sounds.yaml
        ↓
ConfigLoader.loadConfig()
        ↓
Validate against schema
        ↓
SoundRegistry.loadFromConfig()
        ↓
Cache in memory (Map)
        ↓
SoundRegistry.getSound()
        ↓
Runtime changes possible ✅
```

## Configuration Loading Flow

```
                    ┌─────────────────────┐
                    │   Application       │
                    │   Startup           │
                    └──────────┬──────────┘
                               │
                               │ await ConfigLoader.initialize()
                               ▼
                    ┌─────────────────────┐
                    │  ConfigLoader       │
                    │  .loadConfig()      │
                    └──────────┬──────────┘
                               │
                  ┌────────────┴────────────┐
                  │                         │
                  ▼                         ▼
        ┌──────────────────┐    ┌──────────────────┐
        │  Read YAML file  │    │  Check cache     │
        └────────┬─────────┘    └────────┬─────────┘
                 │                       │ hit?
                 │                       └──────┐
                 ▼                              │ yes
        ┌──────────────────┐                   │
        │  Parse YAML      │                   │
        │  (js-yaml)       │                   │
        └────────┬─────────┘                   │
                 │                              │
                 ▼                              │
        ┌──────────────────┐                   │
        │  Validate        │                   │
        │  (validator.ts)  │                   │
        └────────┬─────────┘                   │
                 │                              │
                 │ valid?                       │
                 ▼                              │
        ┌──────────────────┐                   │
        │  Handle extends  │                   │
        │  (inheritance)   │                   │
        └────────┬─────────┘                   │
                 │                              │
                 ▼                              │
        ┌──────────────────┐                   │
        │  Cache result    │                   │
        └────────┬─────────┘                   │
                 │                              │
                 └──────────────┬───────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  SoundRegistry      │
                    │  .loadFromConfig()  │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Populate │   │ Index by │   │ Create   │
        │ sounds   │   │ category │   │ mappings │
        │ Map      │   │          │   │          │
        └──────────┘   └──────────┘   └──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Ready for use!     │
                    │  SoundRegistry      │
                    │  .getSound('id')    │
                    └─────────────────────┘
```

## Runtime Sound Access

```
Application needs sound
        ↓
SoundRegistry.getSound('purr_c2')
        ↓
Check initialized? ──No──> Throw error
        ↓ Yes
Lookup in Map<string, FxSound>
        ↓
Found? ──No──> Return undefined
        ↓ Yes
Return FxSound object
        ↓
Use in audio engine
```

## Configuration Extension (Inheritance)

```
┌─────────────────────────────────────────────────────────┐
│  config/presets/default.yaml (Base)                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │ sounds:                                           │ │
│  │   purr_c2: { duration: 2.0, ... }                │ │
│  │   meow_c4: { duration: 0.5, ... }                │ │
│  │   ... 30+ sounds ...                             │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        │ extends
                        ▼
┌─────────────────────────────────────────────────────────┐
│  config/presets/cyberpunk.yaml (Child)                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │ metadata:                                         │ │
│  │   extends: "default"    ← Inherit from base      │ │
│  │                                                   │ │
│  │ sounds:                                           │ │
│  │   purr_c2:              ← Override duration      │ │
│  │     duration: 1.0       ← Shorter in this theme  │ │
│  │                                                   │ │
│  │   synth_pulse:          ← Add new sound          │ │
│  │     name: "Synth"                                │ │
│  │     category: rhythmic                           │ │
│  │     ...                                          │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Merge
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Result (In Memory)                                     │
│  ┌───────────────────────────────────────────────────┐ │
│  │ sounds:                                           │ │
│  │   purr_c2: { duration: 1.0, ... }  ← Overridden  │ │
│  │   meow_c4: { duration: 0.5, ... }  ← From base   │ │
│  │   synth_pulse: { ... }             ← New         │ │
│  │   ... rest from base ...                         │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure Comparison

### Before: cat-sounds/
```
cat-sounds/
├── README.md
├── package.json              → @bots-n-cats/cat-sounds
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── CatInstrumentManager.ts
│   ├── constants/
│   │   └── sounds.ts         ← 406 lines of hardcoded data
│   ├── types/
│   │   └── cat-sounds.ts     ← CatSound types
│   ├── repository/
│   │   └── SampleRepository.ts
│   ├── samplers/
│   │   ├── PurrSampler.ts
│   │   ├── MeowSampler.ts
│   │   └── ChirpSampler.ts
│   └── mapping/
│       └── EventToCatSound.ts
└── dist/
```

### After: fx/
```
fx/
├── README.md
├── package.json                  → @bots-n-cats/fx
├── tsconfig.json
├── config/                       ← NEW: Configuration files
│   ├── sounds.yaml               ← Sound data (was sounds.ts)
│   ├── schema.json               ← JSON schema for validation
│   ├── presets/
│   │   ├── default.yaml
│   │   ├── minimal.yaml
│   │   └── cyberpunk.yaml
│   └── environments/
│       ├── development.yaml
│       └── production.yaml
├── src/
│   ├── index.ts
│   ├── FxInstrumentManager.ts    ← Renamed
│   ├── config/                   ← NEW: Config infrastructure
│   │   ├── ConfigLoader.ts       ← Load configs
│   │   ├── SoundRegistry.ts      ← Runtime registry
│   │   ├── validator.ts          ← Validation
│   │   └── types.ts              ← Config types
│   ├── types/
│   │   ├── fx-types.ts           ← Renamed from cat-sounds.ts
│   │   └── fx-config.ts          ← NEW: Config types
│   ├── repository/
│   │   └── SampleRepository.ts   ← Updated to use SoundRegistry
│   ├── instruments/              ← Renamed from samplers/
│   │   ├── PurrSampler.ts
│   │   ├── MeowSampler.ts
│   │   └── ChirpSampler.ts
│   └── mapping/
│       └── EventToFX.ts          ← Renamed
└── dist/
```

## Usage Pattern Comparison

### Before (Static)
```typescript
// Import at compile time
import { 
  CAT_SOUND_CATALOG,
  SOUNDS_BY_CATEGORY 
} from '@bots-n-cats/cat-sounds';

// Direct access
const sound = CAT_SOUND_CATALOG['meow_c4'];
const rhythmic = SOUNDS_BY_CATEGORY.rhythmic;

// No flexibility - fixed at compile time
```

### After (Dynamic)
```typescript
// Import registry
import { 
  ConfigLoader,
  SoundRegistry 
} from '@bots-n-cats/fx';

// Initialize (loads config)
await ConfigLoader.initialize();

// Dynamic access
const sound = SoundRegistry.getSound('meow_c4');
const rhythmic = SoundRegistry.getSoundsByCategory('rhythmic');

// Runtime flexibility
await ConfigLoader.loadPreset('minimal');
SoundRegistry.updateSound('meow_c4', { duration: 0.3 });
```

## Performance Comparison

### Memory Usage
```
Before: Constant object in memory (always loaded)
After:  Map-based cache (same performance, more flexible)
        
No performance penalty - still O(1) lookups
```

### Startup Time
```
Before: Import TypeScript constant    ~0ms
After:  Load + parse YAML + cache     ~10-50ms

Negligible difference for this use case
Can lazy-load if needed
```

### Runtime Access
```
Before: CAT_SOUND_CATALOG['id']      O(1)
After:  SoundRegistry.getSound('id')  O(1)

Both use Map/Object lookups - same performance
```

---

## Summary

The new architecture achieves:
- ✅ **Separation**: Data ↔ Code
- ✅ **Flexibility**: Runtime configuration changes
- ✅ **Maintainability**: YAML > TypeScript for data
- ✅ **Extensibility**: Easy to add presets, custom packs
- ✅ **Performance**: Same O(1) lookups with caching
- ✅ **Developer UX**: Better APIs, clearer structure
