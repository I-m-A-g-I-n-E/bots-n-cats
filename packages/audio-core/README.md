# @bots-n-cats/audio-core

Core audio infrastructure for the bots-n-cats SaaS platform.

## Overview

This package provides the foundational audio infrastructure that all other packages depend on:

- **ToneAudioCore**: Singleton AudioContext manager
- **AudioEventBus**: Event-driven coordination for decoupling webhook processing from music generation
- **ResourceManager**: Track and dispose Tone.js objects to prevent memory leaks
- **InstrumentFactory**: Factory pattern for creating Tone.js instruments

## Installation

```bash
npm install @bots-n-cats/audio-core
```

## Usage

### Initialize Audio Core

```typescript
import { ToneAudioCore } from '@bots-n-cats/audio-core';

const audioCore = ToneAudioCore.getInstance();
await audioCore.initialize();
```

### Use Event Bus

```typescript
import { AudioEventBus } from '@bots-n-cats/audio-core';

const eventBus = new AudioEventBus();

// Subscribe to events
eventBus.subscribe('webhook:github:push', (data) => {
  console.log('Push event received:', data);
});

// Publish events
await eventBus.publish('webhook:github:push', { commits: 5 });
```

### Track Resources

```typescript
import { ResourceManager } from '@bots-n-cats/audio-core';
import * as Tone from 'tone';

const resourceManager = new ResourceManager();

// Create and track a synth
const synth = new Tone.Synth();
const id = resourceManager.track('my-synth', synth);

// Later, dispose it
resourceManager.dispose(id);
```

### Create Instruments

```typescript
import { InstrumentFactory } from '@bots-n-cats/audio-core';

// Create by type
const synth = InstrumentFactory.create('synth', {
  oscillator: { type: 'sine' }
});

// Create by preset
const bass = InstrumentFactory.createPreset('bass');
```

## Architecture

This package follows the production-ready patterns outlined in the Linear issues:

- **Singleton Pattern**: Single AudioContext across the application
- **Composition over Inheritance**: Tone.js objects composed, not extended
- **Event-Driven Architecture**: Decouple components via AudioEventBus
- **Factory Pattern**: Centralized instrument creation
- **Resource Management**: Explicit disposal to prevent memory leaks

## Related Packages

- `@bots-n-cats/webhook-server`: GitHub webhook processing
- `@bots-n-cats/music-engine`: Event-to-music mapping

## License

MIT
