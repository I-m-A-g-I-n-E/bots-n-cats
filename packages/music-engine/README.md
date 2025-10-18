# @bots-n-cats/music-engine

Music mapping and generation engine for bots-n-cats.

## Overview

The music-engine package transforms GitHub webhook events into musical parameters and patterns using the audio-core services. It implements BOC-3 (Music Mapping Engine) and BOC-4 (Pattern Generator).

## Architecture

```
AudioEventBus (from webhook)
  ↓
MusicMapper subscribes to 'webhook:github:*'
  ↓
Determine musical parameters (BPM, key, instrument, effects)
  ↓
PatternGenerator creates Tone.js patterns
  ↓
Music plays!
```

## Core Components

### MusicMapper (Core Orchestrator)

Subscribes to all GitHub webhook events and orchestrates the music generation process.

```typescript
import { AudioEventBus } from '@bots-n-cats/audio-core';
import { MusicMapper } from '@bots-n-cats/music-engine';

const eventBus = new AudioEventBus();
const mapper = new MusicMapper(eventBus, services, { debug: true });
```

### Mappers

Transform GitHub metadata into musical parameters:

- **ParameterMapper**: Main mapper that coordinates all transformations
- **InstrumentMapper**: Programming language → Instrument type
- **TempoMapper**: Commit frequency → BPM
- **EffectsMapper**: Event context → Audio effects

### Generators

Create musical patterns from parameters:

- **PatternGenerator**: Complete Tone.js patterns
- **ChordGenerator**: Chord progressions
- **MelodyGenerator**: Melodic sequences

## Emotion Categories

The engine maps GitHub events to four emotion categories:

### 1. Tension (failures, conflicts, long-running issues)
```javascript
{
  scale: 'minor',
  filterRange: [300, 600],
  waveform: 'sawtooth',
  bpmModifier: -10,
  effects: ['distortion', 'delay']
}
```

### 2. Resolution (merges, fixes, completions)
```javascript
{
  scale: 'major',
  filterRange: [800, 1200],
  waveform: 'triangle',
  bpmModifier: 0,
  effects: ['reverb', 'chorus']
}
```

### 3. Activity (commits, comments, reviews)
```javascript
{
  scale: 'pentatonic',
  filterRange: [600, 1000],
  waveform: 'square',
  bpmModifier: 15,
  effects: ['phaser', 'delay']
}
```

### 4. Growth (new features, branches, refactors)
```javascript
{
  scale: 'dorian',
  filterRange: [500, 900],
  waveform: 'sine',
  bpmModifier: 5,
  effects: ['reverb', 'chorus', 'filter']
}
```

## Musical Mappings

### Language → Instrument
- JavaScript/TypeScript → FM Synth
- Python/Ruby/PHP → Synth
- Rust/C++/Java → Poly Synth
- Go → Synth

### Commit Frequency → BPM
- 0-1 commits/hr → 60-80 BPM
- 1-5 commits/hr → 80-120 BPM
- 5-10 commits/hr → 120-140 BPM
- 10+ commits/hr → 140-180 BPM

### Lines Changed → Duration
- Small changes (< 50 lines) → Short patterns (2s)
- Large changes (500+ lines) → Longer patterns (8s)

## Usage

```typescript
import {
  MusicMapper,
  ParameterMapper,
  PatternGenerator,
  EMOTION_MAPPINGS,
} from '@bots-n-cats/music-engine';

// Create mapper
const mapper = new MusicMapper(eventBus);

// Or manually map events
const event: NormalizedEvent = {
  eventType: 'push',
  emotion: 'activity',
  intensity: 0.8,
  metadata: {
    language: 'typescript',
    commitFrequency: 5,
    linesChanged: 120,
  },
};

const params = ParameterMapper.map(event);
const pattern = PatternGenerator.generate(params);

console.log(pattern);
// {
//   notes: ['C4', 'E4', 'G4', ...],
//   times: ['0:0:0', '0:1:0', ...],
//   durations: ['4n', '8n', ...],
//   metadata: { bpm: 120, key: 'C', scale: [...] }
// }
```

## API Reference

### MusicMapper

**Constructor:**
```typescript
new MusicMapper(
  eventBus: AudioEventBus,
  services?: {
    audioService?: AudioService;
    transportService?: TransportService;
    sequencingService?: SequencingService;
    effectsService?: EffectsService;
  },
  config?: MusicMapperConfig
)
```

**Methods:**
- `getStats()` - Get statistics about mapped events
- `dispose()` - Clean up resources

### ParameterMapper

**Static Methods:**
- `map(event: NormalizedEvent): MusicalParameters` - Map event to musical parameters
- `calculateOctave(metadata): number` - Calculate octave from metadata
- `intensityToVelocity(intensity): number` - Convert intensity to velocity
- `shouldIncludeChords(emotion): boolean` - Determine if chords should be included

### PatternGenerator

**Static Methods:**
- `generate(params: MusicalParameters): Pattern` - Generate complete pattern
- `generateRhythm(bpm, bars): TimeNotation[]` - Generate rhythmic pattern
- `fromChords(chords, arpeggiate): Pattern` - Create pattern from chords
- `quantize(pattern, grid): Pattern` - Quantize pattern to grid
- `scaleVelocity(pattern, factor): Pattern` - Scale pattern velocity

## Development

```bash
# Build
pnpm run build

# Watch mode
pnpm run dev

# Clean
pnpm run clean
```

## Dependencies

- `@bots-n-cats/audio-core` - Core audio infrastructure
- `tone` - Web Audio framework

## Notes

- Event-driven: Subscribes to AudioEventBus, doesn't call webhooks directly
- Designed to work with audio-services layer (services will be added later)
- All emotion mappings based on BOC-3 Linear issue specifications
- Generates valid Tone.js patterns

## License

MIT
