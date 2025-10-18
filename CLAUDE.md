# CLAUDE.md - Agent Development Guide for bots-n-cats

## Project Overview

**bots-n-cats** is a GitHub App SaaS that transforms development activity into a live, feline-themed ambient soundtrack. Teams install the app on their repos, then stream their code's soundtrack with cat sounds woven into the music as instruments.

**Where your code purrs and your deploys meow!** 🐱

## Architecture

This is a **TypeScript monorepo** with workspaces, organized for parallel development using git worktrees.

### Core Principle: Event-Driven Decoupling

```
GitHub Webhook → EventBus.publish('webhook:github:push', payload)
    ↓
AudioService subscribes → translates metadata to musical params
    ↓
Factory creates instruments → Object pool provides synths
    ↓
Offline rendering generates complete composition
    ↓
MultiClientAudioManager streams buffers via SSE
    ↓
Browser clients: Tone.js playback + cat sample layer
```

## Monorepo Structure

```
bots-n-cats/                    # Main repo (this location)
├── packages/
│   ├── audio-core/            # BOC-20: Foundation (COMPLETED ✅)
│   ├── webhook-server/        # BOC-1, BOC-2, BOC-9
│   └── music-engine/          # BOC-3, BOC-4
├── tsconfig.base.json         # Shared TypeScript config
└── package.json               # Workspace definitions

# Git Worktrees (parallel development)
../bots-webhook/               # webhook-pipeline branch
../bots-audio/                 # audio-services branch
../bots-music/                 # music-generation branch
../bots-cats/                  # cat-sounds branch
../bots-stream/                # streaming branch
```

## Core Dependencies

All packages depend on `@bots-n-cats/audio-core`:

```typescript
import {
  ToneAudioCore,      // Singleton AudioContext manager
  AudioEventBus,      // Event-driven pub/sub
  ResourceManager,    // Track/dispose Tone.js objects
  InstrumentFactory,  // Factory pattern for instruments
} from '@bots-n-cats/audio-core';
```

### BOC-20: Core Audio Infrastructure ✅ COMPLETED

**Location:** `packages/audio-core/`

**Key Classes:**

1. **ToneAudioCore** - Singleton pattern
   - `getInstance()` - Get singleton instance
   - `initialize(config?)` - Set up AudioContext
   - `getContext()` - Access Tone.Context
   - `dispose()` - Clean shutdown

2. **AudioEventBus** - Pub/sub pattern
   - `subscribe(event, callback)` - Subscribe to events (returns unsubscribe fn)
   - `publish(event, data)` - Publish async (waits for subscribers)
   - `publishSync(event, data)` - Fire and forget
   - `clear(event?)` - Clear subscribers

3. **ResourceManager** - Memory management
   - `track(name, resource)` - Track Tone.js object
   - `dispose(id)` - Dispose single resource
   - `disposeAll()` - Dispose all tracked
   - `getStats()` - Resource statistics

4. **InstrumentFactory** - Factory pattern
   - `create(type, options)` - Create instrument
   - `createPreset(preset)` - Use preset config
   - `createPool(type, count)` - Create multiple for pooling

**Usage Example:**

```typescript
// Initialize audio core
const audioCore = ToneAudioCore.getInstance();
await audioCore.initialize();

// Set up event bus
const eventBus = new AudioEventBus();
eventBus.subscribe('webhook:github:push', async (data) => {
  console.log('Push event:', data);
});

// Track resources
const resourceMgr = new ResourceManager();
const synth = InstrumentFactory.create('synth');
const id = resourceMgr.track('push-synth', synth);

// Later: cleanup
resourceMgr.dispose(id);
```

## Worktree → Issue Mapping

### 1. `../bots-webhook/` (webhook-pipeline)

**Branch:** `webhook-pipeline`
**Focus:** GitHub webhook processing and event normalization

**Issues:**
- **BOC-1**: Set up Node.js webhook server with Express
- **BOC-2**: Create GitHub event parser and normalizer
- **BOC-9**: Initialize webhook server project structure

**Deliverables:**
- Express server on port 3000
- POST `/webhook` endpoint
- GitHub signature validation (HMAC SHA-256)
- Event parser → NormalizedEvent format
- **Publishes to AudioEventBus** (doesn't process directly!)

**Key Pattern:**
```typescript
// webhook-handler.ts
webhookHandler(req, res) {
  validateSignature(req);
  const normalized = eventParser.parse(req.body);
  eventBus.publish(`webhook:github:${normalized.eventType}`, normalized);
  res.status(200).send('OK');
}
```

---

### 2. `../bots-audio/` (audio-services)

**Branch:** `audio-services`
**Focus:** Complete BOC-20 implementation with service layers

**Issues:**
- **BOC-20**: Core Audio Infrastructure (stub → full implementation)
- Additional service layers (AudioService, TransportService, SequencingService, EffectsService)

**Deliverables:**
- Fully implemented service layers
- Object pooling for synths
- Client session management
- Health metrics and monitoring

**Service Layer Pattern:**
```typescript
class AudioService {
  constructor(factory, resourceMgr, eventBus) {
    this.factory = factory;
    this.resources = resourceMgr;
    this.eventBus = eventBus;
  }

  createInstrument(type, options) {
    const instrument = this.factory.create(type, options);
    const id = this.resources.track('instrument', instrument);
    return { id, instrument };
  }
}
```

---

### 3. `../bots-music/` (music-generation)

**Branch:** `music-generation`
**Focus:** Event → Music transformation logic

**Issues:**
- **BOC-3**: Build music mapping engine (events → musical transformations)
- **BOC-4**: Create pattern generator that writes valid patterns.js

**Deliverables:**
- Service that subscribes to webhook events
- Maps GitHub metadata to musical parameters:
  - Commit frequency → BPM
  - Lines changed → Duration
  - Programming language → Instrument type
  - Test pass/fail → Effects intensity
- Pattern generation for Tone.js

**Emotion Categories (from BOC-3):**
1. **Tension** - failures, conflicts → minor key, dissonance
2. **Resolution** - merges, fixes → major key, consonance
3. **Activity** - commits, comments → increased rhythm
4. **Growth** - new features → layering, complexity

---

### 4. `../bots-cats/` (cat-sounds)

**Branch:** `cat-sounds`
**Focus:** Cat sound library and musical integration

**Issues:**
- **BOC-11**: Source and prepare cat sound library (30+ sounds)
- **BOC-12**: Implement musical cat sound integration engine

**Deliverables:**
- Cat sound library (WAV, 44.1kHz, pitch-tuned)
- Categories: rhythmic (purrs), melodic (meows), textural (ambiance), expressive (events)
- Repository pattern for sample management
- Composition-based integration (cat sounds as instruments)

**Key Principle:** Cat sounds are INSTRUMENTS, not notifications!
- Purrs: Bass notes, rhythmic elements
- Meows: Melodic phrases
- Chirps: Percussion
- Hisses: Dissonance (sparingly!)

---

### 5. `../bots-stream/` (streaming)

**Branch:** `streaming`
**Focus:** Real-time streaming to multiple clients

**Issues:**
- **BOC-13**: Build real-time streaming system (SSE) for music updates

**Deliverables:**
- Offline rendering with Tone.Offline
- Server-Sent Events (SSE) implementation
- MultiClientAudioManager
- Client session lifecycle management
- Auto-cleanup for inactive sessions

**Architecture:**
```typescript
class MultiClientAudioManager {
  createSession(clientId, repoId) { }
  async broadcastBuffer(repoId, audioBuffer) { }
  cleanup(clientId) { }
}
```

---

## Critical Architectural Patterns

### 1. Composition over Inheritance

❌ **WRONG:** Extending Tone.js classes
```typescript
class MySynth extends Tone.Synth { }  // Don't do this!
```

✅ **RIGHT:** Composing with Tone.js objects
```typescript
class AudioPlayer {
  constructor(synth, effects) {
    this.synth = synth;
    this.effects = effects;
  }
}
```

### 2. Singleton AudioContext

❌ **WRONG:** Multiple contexts
```typescript
const ctx1 = new Tone.Context();
const ctx2 = new Tone.Context();  // Don't do this!
```

✅ **RIGHT:** Single shared context
```typescript
const audioCore = ToneAudioCore.getInstance();
await audioCore.initialize();
```

### 3. Event-Driven Coordination

❌ **WRONG:** Direct coupling
```typescript
webhookHandler(req, res) {
  const music = generateMusic(req.body);  // Direct call
}
```

✅ **RIGHT:** Event bus decoupling
```typescript
webhookHandler(req, res) {
  eventBus.publish('webhook:received', req.body);
  res.status(200).send('OK');
}

// Elsewhere
eventBus.subscribe('webhook:received', async (data) => {
  const music = await generateMusic(data);
});
```

### 4. Explicit Resource Disposal

❌ **WRONG:** Forgetting to dispose
```typescript
const synth = new Tone.Synth();
synth.toDestination();
// Memory leak!
```

✅ **RIGHT:** Track and dispose
```typescript
const synth = new Tone.Synth().toDestination();
const id = resourceMgr.track('synth', synth);

// Later
resourceMgr.dispose(id);
```

### 5. Object Pooling

For high-frequency operations (webhook bursts):

```typescript
class SynthPool {
  available = [];
  inUse = new Set();

  acquire() {
    const synth = this.available.pop() || this.createSynth();
    this.inUse.add(synth);
    return synth;
  }

  release(synth) {
    synth.triggerRelease();
    this.inUse.delete(synth);
    this.available.push(synth);
  }
}
```

---

## Important: Linear Issues > tonejs-guide.md

**When there's a discrepancy between `tonejs-guide.md` and the Linear issues, FOLLOW THE LINEAR ISSUES.**

The Linear issues contain:
- Specific architectural decisions for this project
- Event bus as the core decoupling mechanism
- Service layer patterns
- Offline rendering + SSE streaming approach

The `tonejs-guide.md` is general advice. Linear issues are our specific implementation plan.

### Key Discrepancies Noted:

1. **AudioEventBus is critical** - Linear emphasizes this heavily
2. **Offline rendering** - Linear specifies Tone.Offline for composition generation
3. **Service layers** - Linear defines specific services (AudioService, TransportService, etc.)
4. **Multi-client SaaS** - Linear focuses on session management for multiple streaming clients

---

## Development Workflow

### 1. Set Up Your Worktree

```bash
cd ../bots-webhook  # Or whichever worktree you're working in
npm install         # Install dependencies
```

### 2. Import from audio-core

```typescript
import {
  ToneAudioCore,
  AudioEventBus,
  ResourceManager,
  InstrumentFactory,
  type NormalizedEvent,
  type GitHubEventType,
} from '@bots-n-cats/audio-core';
```

### 3. Follow the Pattern

- **Initialize audio core first** (in services that use Tone.js)
- **Use EventBus for all cross-service communication**
- **Track all Tone.js objects with ResourceManager**
- **Create instruments via InstrumentFactory**
- **Dispose resources explicitly**

### 4. Testing Considerations

- Use `Tone.Offline` for deterministic testing
- Mock AudioEventBus for unit tests
- Test disposal in cleanup hooks

### 5. Commit and Merge

When your work is complete:
```bash
git add .
git commit -m "feat: implement BOC-X ..."
git push origin your-branch

# Then create PR to main
```

---

## Package.json Dependencies

Each package should have:

```json
{
  "dependencies": {
    "@bots-n-cats/audio-core": "workspace:*",
    "tone": "^14.7.77"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  }
}
```

For webhook-server, also add:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "body-parser": "^1.20.2"
  }
}
```

---

## TypeScript Configuration

Each package extends `tsconfig.base.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

---

## Questions or Clarifications?

1. Check the Linear issue for your specific task
2. Review the audio-core source code in `packages/audio-core/src/`
3. Look at type definitions in `packages/audio-core/src/types/`
4. Ask Preston Temple (project lead) for architectural decisions

---

## Key Contacts

- **Preston Temple** - Project Lead
- **Cyrus** (AI Agent) - Currently working on BOC-1, BOC-19 (webhook server)

---

## Quick Reference: Core Exports

```typescript
// From @bots-n-cats/audio-core

// Classes
ToneAudioCore.getInstance()
new AudioEventBus()
new ResourceManager()
InstrumentFactory.create(type, options)

// Types
type EventCallback<T>
type UnsubscribeFn
type ToneResource
type InstrumentType = 'synth' | 'fmSynth' | 'polySynth' | 'sampler'
type GitHubEventType = 'push' | 'pull_request' | ...
type EmotionCategory = 'tension' | 'resolution' | 'activity' | 'growth'

interface NormalizedEvent
interface AudioCoreConfig
interface InstrumentOptions
```

---

## Success Criteria

Your implementation is ready for review when:

- ✅ All Linear issue acceptance criteria met
- ✅ Uses AudioEventBus for coordination
- ✅ All Tone.js objects tracked and disposed
- ✅ TypeScript compiles without errors
- ✅ Follows composition over inheritance
- ✅ Service layer patterns implemented
- ✅ Tests pass (when applicable)

---

**Remember:** We're building a production SaaS application. Code quality, memory management, and architectural patterns matter!

🐱 Let's make this code purr! 🎵
