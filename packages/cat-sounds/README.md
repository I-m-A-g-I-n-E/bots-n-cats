# @bots-n-cats/cat-sounds

Cat Sound Library and Musical Integration Engine for bots-n-cats SaaS platform.

## Overview

This package implements **BOC-11** (Cat Sound Library) and **BOC-12** (Musical Cat Sound Integration Engine), providing the unique feature that makes bots-n-cats special: **cat sounds as musical instruments**.

## Core Principle

**Cat sounds are INSTRUMENTS, not notifications!**

Unlike typical notification sounds, cat sounds in bots-n-cats are:
- ✅ **Rhythmically synchronized** - Play on beat with the transport
- ✅ **Harmonically appropriate** - Melodic sounds are in key
- ✅ **Dynamically balanced** - Proper mixing with other instruments
- ✅ **Musically expressive** - Serve the emotional narrative

## Features

### 32+ Cat Sounds (BOC-11)

Organized into four categories:

#### 1. Rhythmic/Percussive (8 sounds)
For beats and rhythm patterns:
- Bass purrs (C2, C3) - Low-frequency foundation
- Percussion chirps - Hi-hat-like patterns
- Paw taps - Subtle percussion elements
- Breathing textures - Ambient layers

#### 2. Melodic (11 sounds)
For musical phrases:
- Pitch-tuned meows (C4-B4) - Full chromatic scale
- Cat trills (C5, G4) - Melodic flourishes
- Question/content meows - Pitch contours

#### 3. Textural (5 sounds)
For ambiance and pads:
- Gentle purr pads - Long sustain textures
- Kneading rhythms - Loopable patterns
- Grooming ambiance - Background layers
- Sleepy sighs - Resolution moments

#### 4. Expressive (8 sounds)
For specific events:
- Excited chirps - Features, deploys
- Happy sequences - Successful tests
- Playful meows - Commits, activity
- Disappointed mrrps - Merge conflicts (gentle!)
- Tiny hiss - Test failures (musical, not scary)

### Musical Integration Engine (BOC-12)

#### CatInstrumentManager
Main orchestrator that manages all cat sound playback:

```typescript
import { CatInstrumentManager } from '@bots-n-cats/cat-sounds';
import { ResourceManager, AudioEventBus } from '@bots-n-cats/audio-core';

const manager = new CatInstrumentManager(resourceManager, eventBus);
await manager.initialize();

// Play cat sounds musically
manager.playMeow('C4', '4n', '+0.5', 0.7);
manager.playPurr('C2', '2n', '@1m', 0.8);
manager.playChirp('+0.25', 0.6);
```

#### Three Specialized Samplers

**PurrSampler** - Rhythmic/bass purrs:
```typescript
purrSampler.play('C2', '4n', time, 0.7);
purrSampler.playChord(['C2', 'C3'], '2n', time, 0.6);
```

**MeowSampler** - Melodic meows:
```typescript
meowSampler.play('E4', '8n', time, 0.7);
meowSampler.playPhrase(['C4', 'E4', 'G4'], ['8n', '8n', '4n']);
meowSampler.playArpeggio(['C4', 'E4', 'G4', 'C5'], '16n', '8n');
```

**ChirpSampler** - Percussion chirps:
```typescript
chirpSampler.play(time, 0.6);
chirpSampler.playSequence(4, '16n', time, 0.5);
```

#### Event-to-Cat-Sound Mapping

Intelligent mapping from GitHub events to appropriate cat sounds:

```typescript
import { EventToCatSound } from '@bots-n-cats/cat-sounds';

const instruction = EventToCatSound.getCatSoundForEvent(normalizedEvent);
// Returns: { soundId, pitch, timing, volume, delay, duration }
```

**Event Mappings:**
- `pull_request:merged` → Content meow (C4, downbeat)
- `check_run:success` → Happy chirp sequence
- `check_run:failure` → Disappointed mrrp (subtle)
- `deployment:success` → Satisfied purr burst
- `push` → Playful meow (D4, quantized)

#### Timing Strategies

Cat sounds use five timing strategies for musical synchronization:

1. **Downbeat** - Play at the start of the next measure
2. **Upbeat** - Play on the next half measure
3. **Quantized** - Play on the next beat
4. **Offbeat** - Play on the 'and' of the beat
5. **Free** - Play immediately (with optional delay)

### Sample Repository

Repository pattern for loading and caching cat sound samples:

```typescript
import { SampleRepository } from '@bots-n-cats/cat-sounds';

const repo = new SampleRepository();
await repo.preloadBatch(['purr_c2', 'meow_c4', 'chirp_percussion']);

const buffer = await repo.load('meow_e4');
const metadata = repo.getMetadata('meow_e4');
```

#### Synthesis Fallback

Currently, all cat sounds are **synthesized** using Tone.js. This provides:
- Immediate availability (no audio file dependencies)
- Pitch-perfect tuning
- Consistent quality
- Easy prototyping

**Future:** Replace with recorded cat sounds while maintaining the same API.

## Installation

```bash
pnpm add @bots-n-cats/cat-sounds
```

## Usage Example

```typescript
import {
  CatInstrumentManager,
  CAT_SOUND_CATALOG,
  TOTAL_SOUND_COUNT
} from '@bots-n-cats/cat-sounds';
import { ResourceManager, AudioEventBus } from '@bots-n-cats/audio-core';

// Initialize
const resourceManager = new ResourceManager();
const eventBus = new AudioEventBus();
const catManager = new CatInstrumentManager(resourceManager, eventBus);

await catManager.initialize();
console.log(`Loaded ${TOTAL_SOUND_COUNT} cat sounds`);

// Subscribe to events (automatic)
// Cat sounds will play in response to GitHub events

// Manual playback
catManager.playMeow('C4', '4n', '+0.5', 0.7);        // Melodic
catManager.playPurr('C2', '2n', '@1m', 0.8);         // Rhythmic
catManager.playChirpSequence(4, '16n', '+0', 0.6);   // Percussion

// Musical phrases
catManager.playMeowPhrase(
  ['C4', 'E4', 'G4', 'C5'],
  ['8n', '8n', '8n', '4n'],
  '+1m',
  0.7
);

// Cleanup
catManager.dispose();
```

## Architecture

### Composition Over Inheritance

All samplers use **composition** rather than inheritance:

```typescript
// ❌ Don't do this
class MeowSampler extends Tone.Sampler { }

// ✅ Do this
class MeowSampler {
  private sampler: Tone.Sampler;
  constructor(repository, resourceManager) {
    // Compose, don't inherit
  }
}
```

### Resource Management

All Tone.js resources are tracked via `ResourceManager`:

```typescript
this.resourceManager.track('cat_meow_sampler', this.sampler);
```

This ensures proper cleanup and prevents memory leaks.

### Event-Driven Architecture

Cat sounds subscribe to the `AudioEventBus` for event-driven triggering:

```typescript
eventBus.subscribe('webhook:github:pull_request', (event) => {
  if (event.action === 'merged') {
    this.playMeow('C4', '4n', '+0.5', 0.8);
  }
});
```

## Sound Catalog

Access the complete catalog:

```typescript
import {
  CAT_SOUND_CATALOG,
  SOUNDS_BY_CATEGORY,
  MELODIC_SAMPLES_BY_PITCH
} from '@bots-n-cats/cat-sounds';

console.log(CAT_SOUND_CATALOG.meow_c4);
// {
//   id: 'meow_c4',
//   name: 'Meow - C4',
//   category: 'melodic',
//   pitch: 'C4',
//   duration: 0.5,
//   loopable: false,
//   emotion: 'activity',
//   description: 'Musical meow tuned to C4'
// }

console.log(SOUNDS_BY_CATEGORY.melodic.length);  // 11
console.log(SOUNDS_BY_CATEGORY.rhythmic.length); // 8
```

## TypeScript Types

Full TypeScript support with exported types:

```typescript
import type {
  CatSound,
  CatSoundCategory,
  CatSoundInstruction,
  CatSamplerConfig,
  SynthesisParams,
  TimingStrategy,
} from '@bots-n-cats/cat-sounds';
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Clean
pnpm clean
```

## Linear Issues

- **BOC-11**: Source and prepare cat sound library (30+ sounds) ✅
- **BOC-12**: Implement musical cat sound integration engine ✅

## Future Enhancements

1. **Recorded Cat Sounds** - Replace synthesized sounds with real cat recordings
2. **Dynamic Loading** - Stream sounds on demand for better performance
3. **Sound Variations** - Multiple variations per sound for more natural playback
4. **Cat Sound Effects** - Reverb, delay, filtering for different environments
5. **Cat Choir Mode** - Harmonized multiple cat voices

## License

Proprietary - Part of bots-n-cats SaaS platform

---

**Made with love for cats and code** 🐱
