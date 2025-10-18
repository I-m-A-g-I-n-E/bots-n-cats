# 🐱 bots-n-cats - GitHub Activity Soundtrack

**Where your code purrs and your deploys meow!**

Transform your GitHub repository activity into a live, ambient musical soundtrack with cat sounds woven in as actual musical instruments. Every commit, PR, deployment, and CI run contributes to an evolving composition that you can stream in real-time.

## 🎵 What It Does

bots-n-cats creates a **living soundtrack** for your development workflow:

- **Push commits** → Generates melodic patterns based on commit frequency and files changed
- **Open PRs** → Adds harmonic tension with minor scales and filtered synths
- **Merge PRs** → Resolves to major chords with triumphant cat meows
- **CI passes** → Happy cat chirps on the upbeat
- **CI fails** → Gentle disappointed mrrps (musical, not annoying!)
- **Deploy** → Satisfied bass purrs anchor the rhythm

**Cat sounds are musical instruments**, not notifications - they play in time, in key, and at appropriate volumes as part of the composition.

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- A **GitHub repository** you want to sonify

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd bots-n-cats
npm install
npm run build
```

### 2. Configure Environment Variables

Create environment files for each server:

**`packages/webhook-server/.env`**
```bash
PORT=3000
GITHUB_WEBHOOK_SECRET=your_secret_here_min_16_chars
NODE_ENV=development
```

**`packages/streaming-server/.env`**
```bash
PORT=3001
CORS_ORIGIN=http://localhost:3001
NODE_ENV=development
```

### 3. Start the Servers

Open **two terminal windows**:

**Terminal 1 - Webhook Server:**
```bash
cd packages/webhook-server
npm run dev:server
```

**Terminal 2 - Streaming Server:**
```bash
cd packages/streaming-server
npm run dev:server
```

### 4. Set Up GitHub Webhook

1. Go to your GitHub repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**: `http://your-server:3000/webhook` (use ngrok for local testing)
3. **Content type**: `application/json`
4. **Secret**: Same value as `GITHUB_WEBHOOK_SECRET` in your `.env`
5. **Events**: Select individual events:
   - Pushes
   - Pull requests
   - Pull request reviews
   - Check runs
   - Deployments
   - Issues
   - Issue comments
   - Workflow runs

### 5. Open the Streaming UI

Open your browser to:
```
http://localhost:3001
```

You'll see a beautiful UI where you can:
- Enter your repository ID (e.g., `owner/repo`)
- Connect to the live audio stream
- Generate test audio
- View activity logs and metrics

## 🎼 How It Works

### End-to-End Flow

```
GitHub Event
    ↓
Webhook Server (validates signature)
    ↓
EventParser (normalizes event → emotion)
    ↓
AudioEventBus (publishes "webhook:received")
    ↓
MusicMapper (subscribes, maps event → musical parameters)
    ↓
AudioEventBus (publishes "music:generated")
    ↓
StreamingService (renders audio offline)
    ↓
SSE Stream (broadcasts to all connected clients)
    ↓
Browser (deserializes buffer, plays with Tone.js)
```

### Musical Mappings

**Emotions** (based on GitHub event type and action):

| Emotion | Events | Scale | Synth | Filter | BPM Δ |
|---------|--------|-------|-------|--------|-------|
| **Tension** | PR opened, conflicts, issues | Minor | Sawtooth | Low | -10 |
| **Resolution** | PR merged, deployment success | Major | Triangle | High | +0 |
| **Activity** | Commits, comments | Pentatonic | Square | Mid | +15 |
| **Growth** | Stars, forks, new contributors | Dorian | Sine | Mid | +5 |

**Languages → Instruments**:
- JavaScript/TypeScript → FM Synth (complex harmonic)
- Python/Ruby → Synth (warm, smooth)
- Rust/C++/Java → PolySynth (structured, chord-based)
- Go/Elixir → Synth (clean, efficient)

**Commit Frequency → Tempo**:
- 0-1 commits/hr → 60-80 BPM (Adagio)
- 1-5 commits/hr → 80-120 BPM (Moderato)
- 5-10 commits/hr → 120-140 BPM (Allegro)
- 10+ commits/hr → 140-180 BPM (Presto)

**Cat Sounds as Instruments**:

| Sound | Type | Use Case | Timing |
|-------|------|----------|--------|
| Bass purr (C2, C3) | Rhythmic | Foundation, deployments | Downbeat |
| Meow scale (C4-C5) | Melodic | PR merged, CI passed | Quantized |
| Percussion chirps | Rhythmic | Commit activity | Offbeat |
| Happy chirp | Expressive | Tests pass | Upbeat |
| Disappointed mrrp | Expressive | CI fails (gentle!) | Offbeat |

## 🏗️ Architecture

### Packages

```
packages/
├── audio-core/           # Core audio infrastructure (BOC-20)
│   ├── ToneAudioCore       Singleton AudioContext manager
│   ├── AudioEventBus       Event-driven pub/sub system
│   ├── ResourceManager     Track & dispose Tone.js objects
│   ├── InstrumentFactory   Create instruments with presets
│   ├── Services/           Audio, Transport, Sequencing, Effects
│   ├── SynthPool           Object pooling for performance
│   └── Session/            Multi-client session management
│
├── webhook-server/       # GitHub webhook processing (BOC-1,2,9)
│   ├── EventParser         GitHub → NormalizedEvent
│   ├── SignatureValidator  HMAC SHA-256 security
│   └── WebhookService      Main orchestrator
│
├── music-engine/         # Event-to-music mapping (BOC-3,4)
│   ├── MusicMapper         Core orchestrator
│   ├── Mappers/            Parameter, Instrument, Tempo, Effects
│   ├── Generators/         Pattern, Chord, Melody
│   └── Constants/          Emotion mappings, scales
│
├── cat-sounds/           # Cat sound library (BOC-11,12)
│   ├── CatInstrumentManager Main orchestrator
│   ├── Samplers/           Purr, Meow, Chirp samplers
│   ├── SampleRepository    Load & cache samples
│   └── EventToCatSound     GitHub → Cat sound mapping
│
└── streaming-server/     # Real-time SSE streaming (BOC-13)
    ├── OfflineRenderer     Tone.Offline deterministic rendering
    ├── SSEManager          Server-Sent Events handling
    ├── StreamingService    Main orchestrator
    ├── BufferSerializer    AudioBuffer ↔ JSON
    └── client/             Browser UI (HTML/JS)
```

### Key Principles

- **Event-Driven Architecture**: AudioEventBus decouples services
- **Singleton AudioContext**: Shared across all clients (Tone.js requirement)
- **Composition over Inheritance**: Tone.js objects composed, not extended
- **Object Pooling**: Pre-allocated synths reduce GC pressure
- **Explicit Resource Management**: All Tone.js objects tracked and disposed
- **Offline Rendering**: Deterministic audio generation (no real-time constraints)
- **Multi-Client Support**: Multiple browsers can stream the same repo

## 🔧 Development

### Project Structure

```bash
bots-n-cats/              # Main repo (all branches merged)
  ├── packages/           # All 5 packages
  ├── CLAUDE.md           # Comprehensive dev guide
  ├── DEVELOPMENT.md      # Environment setup
  └── smoke-test.js       # Critical path verification
```

### Available Scripts

```bash
# Build all packages
npm run build

# Build specific package
npm run build -w @bots-n-cats/audio-core

# Clean build artifacts
npm run clean

# Development mode (watch)
npm run dev
```

### Running Tests

```bash
# Smoke test (verifies build structure)
node smoke-test.js

# Package-specific tests (coming soon)
npm test
```

### Environment Variables Reference

**webhook-server:**
- `PORT` - Server port (default: 3000)
- `GITHUB_WEBHOOK_SECRET` - GitHub webhook secret (min 16 chars)
- `NODE_ENV` - Environment (development/production)

**streaming-server:**
- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - CORS allowed origins (default: `http://localhost:3001`)
- `NODE_ENV` - Environment (development/production)

## 🐛 Troubleshooting

### "Cannot find module" errors

```bash
# Rebuild from main repo
npm run build
```

### TypeScript compilation errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Webhook not receiving events

1. Check webhook secret matches `.env` file
2. Verify webhook URL is accessible (use ngrok for local dev)
3. Check GitHub webhook delivery logs for errors
4. Ensure webhook server is running on correct port

### No audio in browser

1. Check browser console for errors
2. Verify streaming server is running
3. Check that repoId matches your GitHub repo
4. Click "Generate Test Audio" to verify connection
5. Ensure browser supports Web Audio API

### Memory leaks / high CPU

1. Check that all Tone.js objects are being disposed
2. Monitor ResourceManager stats via logging
3. Reduce SynthPool size if needed
4. Check for stale client sessions (5-minute auto-cleanup)

## 📊 Monitoring

### Health Endpoints

**Streaming Server:**
```bash
# Overall health
GET http://localhost:3001/health

# Repository-specific metrics
GET http://localhost:3001/health/repo/:repoId
```

### Logs

All services use structured logging:
```javascript
// Check webhook logs
tail -f packages/webhook-server/logs/*.log

// Check streaming logs
tail -f packages/streaming-server/logs/*.log
```

## 🎯 Production Deployment

### Build for Production

```bash
NODE_ENV=production npm run build
```

### Environment Configuration

1. Set `NODE_ENV=production`
2. Use strong webhook secrets (32+ characters)
3. Configure CORS for your domain
4. Set up HTTPS (required for GitHub webhooks)
5. Use process manager (PM2, systemd)

### Recommended Stack

- **Reverse Proxy**: nginx or Caddy
- **Process Manager**: PM2
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston → Elasticsearch
- **Hosting**: Any Node.js-compatible platform (Render, Railway, fly.io)

## 💰 Monetization (Planned)

- **Free**: 1 repo, basic cat sounds, 480p stream
- **Pro** ($9/mo): 10 repos, premium sounds, HD stream, both themes
- **Team** ($29/mo): Unlimited repos, analytics, custom sounds
- **Enterprise**: Custom pricing, on-premise, SLA, white-label

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive developer guide
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Environment setup guide
- **[CAT_SOUNDS_IMPLEMENTATION.md](./CAT_SOUNDS_IMPLEMENTATION.md)** - Cat sounds deep dive
- **[STREAMING-IMPLEMENTATION.md](./STREAMING-IMPLEMENTATION.md)** - Streaming architecture
- **Package READMEs** - Each package has detailed docs

## 🔖 Version Tags

- **v0.1.0-foundation** - Core audio infrastructure complete
- **v0.2.0-mvp** - Full end-to-end MVP (current)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow TypeScript + ESM conventions
4. Add tests for new functionality
5. Ensure `npm run build` passes
6. Submit a pull request

## 📝 License

MIT

## 🙏 Acknowledgments

- **Tone.js** - Incredible Web Audio framework
- **Linear** - Project management
- **Claude Code** - AI pair programming assistant

---

## 🎮 Try It Now!

```bash
# Terminal 1
cd packages/webhook-server && npm run dev:server

# Terminal 2
cd packages/streaming-server && npm run dev:server

# Browser
open http://localhost:3001
```

Then make a commit to your repo and watch the music evolve! 🎵🐱

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
