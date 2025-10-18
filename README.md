# 🐱 bots-n-cats - GitHub Activity Soundtrack SaaS

**Where your code purrs and your deploys meow!**

A GitHub App SaaS that transforms development activity into a live, feline-themed ambient soundtrack. Teams install the app on repos, then stream their code's soundtrack with cat sounds woven into the music as instruments.

## 🎵 Core Features

- **Live Soundtrack**: GitHub events trigger musical evolution
- **Feline Theme**: Cat sounds woven INTO the music (purrs on beat, meows as melody, hisses for errors)
- **GitHub App**: OAuth install on any repo or org
- **Streaming Web UI**: Real-time music streaming via SSE
- **Theme Choice**: Leopard print elegance OR house cat cuteness

## 🏗️ Architecture

This is a **TypeScript monorepo** with production-grade audio infrastructure:

```
GitHub Webhook → EventBus → AudioService → Offline Rendering → SSE Stream → Browser
```

### Key Principles

- **Event-Driven**: AudioEventBus decouples webhook processing from music generation
- **Singleton AudioContext**: Shared context across all clients
- **Composition over Inheritance**: Tone.js objects composed, not extended
- **Object Pooling**: Pre-allocated synths for low-latency webhook response
- **Explicit Disposal**: Every Tone.js object tracked and disposed

## 📦 Packages

```
packages/
├── audio-core/         ✅ Core audio infrastructure (BOC-20)
│   ├── ToneAudioCore      Singleton AudioContext manager
│   ├── AudioEventBus      Event-driven pub/sub
│   ├── ResourceManager    Track/dispose Tone.js objects
│   └── InstrumentFactory  Factory pattern for instruments
│
├── webhook-server/     🚧 GitHub webhook processing (BOC-1, 2, 9)
└── music-engine/       🚧 Event-to-music mapping (BOC-3, 4)
```

## 🌳 Git Worktrees for Parallel Development

```bash
# Main repo
bots-n-cats/              # Foundation (main branch)

# Parallel worktrees
../bots-webhook/          # webhook-pipeline: BOC-1, 2, 9
../bots-audio/            # audio-services: BOC-20 implementation
../bots-music/            # music-generation: BOC-3, 4
../bots-cats/             # cat-sounds: BOC-11, 12
../bots-stream/           # streaming: BOC-13
```

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Build All Packages

```bash
npm run build
```

### Development

```bash
# Build in watch mode
npm run dev
```

## 📚 For Developers

See **[CLAUDE.md](./CLAUDE.md)** for comprehensive agent development guide including:

- Architecture patterns
- Worktree → Issue mapping
- Core dependencies and usage
- Development workflow
- Key architectural decisions

## 🎯 Linear Project

Track progress: [bots-n-cats Linear Project](https://linear.app/imajn/project/bots-n-cats-github-activity-soundtrack-saas-42d5247aec0f)

## 🔧 Tech Stack

- **TypeScript**: Type-safe development
- **Tone.js**: Web Audio synthesis framework
- **Express**: Webhook server
- **Node.js**: Runtime environment
- **npm workspaces**: Monorepo management

## 💰 Monetization (Planned)

- **Free**: 1 repo, basic cat sounds
- **Pro** ($9/mo): 10 repos, premium sounds, both themes
- **Team** ($29/mo): Unlimited repos, analytics, custom sounds
- **Enterprise**: Custom pricing, on-premise, SLA

## 📝 License

MIT

## 🐾 Status

**Foundation Complete**: Core audio infrastructure implemented and ready for parallel development.

Next steps:
- Webhook server implementation (BOC-1, 2, 9)
- Music mapping engine (BOC-3, 4)
- Cat sound library (BOC-11, 12)
- Streaming system (BOC-13)

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
