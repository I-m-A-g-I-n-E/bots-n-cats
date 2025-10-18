# Streaming Server Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     BOTS-N-CATS STREAMING                        │
│                     Real-Time SSE Architecture                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   GitHub     │
│   Webhook    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Webhook Server  │──────┐
└──────────────────┘      │
                          │ EventBus.publish('webhook:github:*')
                          │
                          ▼
                   ┌──────────────┐
                   │ Music Engine │
                   │   Mapper     │
                   └──────┬───────┘
                          │
                          │ EventBus.publish('music:generated', {
                          │   repoId, musicalParams
                          │ })
                          │
                          ▼
       ┌──────────────────────────────────────────┐
       │      STREAMING SERVICE (Orchestrator)     │
       │  ┌────────────────────────────────────┐  │
       │  │  1. Receive music:generated event   │  │
       │  └────────────────────────────────────┘  │
       │                    │                      │
       │                    ▼                      │
       │  ┌────────────────────────────────────┐  │
       │  │  2. OfflineRenderer.render()        │  │
       │  │     • Tone.Offline()                │  │
       │  │     • Create instruments            │  │
       │  │     • Schedule patterns             │  │
       │  │     • Render to AudioBuffer         │  │
       │  └────────────────────────────────────┘  │
       │                    │                      │
       │                    ▼                      │
       │  ┌────────────────────────────────────┐  │
       │  │  3. MultiClientAudioManager        │  │
       │  │     .broadcastBuffer(repoId)       │  │
       │  └────────────────────────────────────┘  │
       │                    │                      │
       │                    ▼                      │
       │  ┌────────────────────────────────────┐  │
       │  │  4. BufferSerializer.serialize()    │  │
       │  │     • Convert to JSON               │  │
       │  └────────────────────────────────────┘  │
       │                    │                      │
       │                    ▼                      │
       │  ┌────────────────────────────────────┐  │
       │  │  5. SSEManager.broadcast(repoId)   │  │
       │  │     • Send to all repo clients      │  │
       │  └────────────────────────────────────┘  │
       └──────────────────┬───────────────────────┘
                          │
                          │ SSE Messages
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │Browser │      │Browser │      │Browser │
    │Client 1│      │Client 2│      │Client 3│
    └────┬───┘      └────┬───┘      └────┬───┘
         │               │               │
         │               │               │
         ▼               ▼               ▼
    ┌──────────────────────────────────────┐
    │     Tone.js Audio Playback           │
    │  • Deserialize buffer                │
    │  • Create Tone.Player                │
    │  • Play audio                        │
    └──────────────────────────────────────┘
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    STREAMING SERVER                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              StreamingService                         │  │
│  │  • Event subscription & orchestration                 │  │
│  │  • Error handling                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                │                │                 │
│         │                │                │                 │
│         ▼                ▼                ▼                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐       │
│  │  Offline   │  │   Multi    │  │      SSE       │       │
│  │  Renderer  │  │   Client   │  │    Manager     │       │
│  │            │  │   Audio    │  │                │       │
│  │ • Tone.    │  │  Manager   │  │ • Connection   │       │
│  │   Offline  │  │            │  │   lifecycle    │       │
│  │ • Pattern  │  │ • Session  │  │ • Heartbeat    │       │
│  │   scheduling│  │   mgmt     │  │ • Broadcasting │       │
│  └────────────┘  └────────────┘  └────────────────┘       │
│         │                │                │                 │
│         └────────────────┴────────────────┘                 │
│                          │                                  │
│                          ▼                                  │
│                  ┌──────────────┐                          │
│                  │   Buffer     │                          │
│                  │ Serializer   │                          │
│                  │              │                          │
│                  │ • AudioBuffer│                          │
│                  │   → JSON     │                          │
│                  │ • Compression│                          │
│                  └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Session Management Flow

```
Client Connects
      │
      ▼
┌─────────────────────────────────────┐
│  SSEManager.connect()                │
│  • Set SSE headers                   │
│  • Store client connection           │
│  • Send 'connected' message          │
│  • Start heartbeat (30s interval)    │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  StreamingService                    │
│  .createClientSession()              │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  MultiClientAudioManager             │
│  .createSession(clientId, repoId)    │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  ClientSessionManager                │
│  • Create StreamingSession           │
│  • Track: clientId, repoId,          │
│    audioBuffer, lastActivity         │
└─────────────────────────────────────┘

                  │
                  │ Client remains connected
                  │ Heartbeat every 30s
                  │ Updates lastActivity
                  │
                  ▼

    Stale Detection (5 min timeout)
                  │
                  ▼
┌─────────────────────────────────────┐
│  Automatic Cleanup                   │
│  • SSEManager heartbeat detects      │
│  • ClientSessionManager cleanup      │
│  • MultiClientAudioManager cleanup   │
│  • Dispose resources                 │
└─────────────────────────────────────┘
```

## Message Flow

```
Music Generated Event
      │
      ├──────────────────────────────────────┐
      │                                      │
      ▼                                      ▼
Render Audio                          Create Sessions
(OfflineRenderer)                     (MultiClientAudioManager)
      │                                      │
      │                                      │
      └──────────────┬───────────────────────┘
                     │
                     ▼
            Serialize AudioBuffer
            (BufferSerializer)
                     │
                     ▼
         ┌───────────────────────┐
         │  SSEManager.broadcast │
         │  (repoId)             │
         └───────────┬───────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    Client 1    Client 2    Client 3
         │           │           │
         └───────────┼───────────┘
                     │
                     ▼
         All clients receive:
         {
           type: 'audio_buffer',
           data: {
             buffer: SerializedBuffer,
             params: MusicalParameters,
             repoId: string
           }
         }
```

## Health Monitoring

```
┌────────────────────────────────┐
│     Health Endpoints            │
│                                │
│  GET /health                   │
│  ┌──────────────────────────┐ │
│  │ • activeClients          │ │
│  │ • activeSessions         │ │
│  │ • totalBuffersCreated    │ │
│  │ • memoryUsage            │ │
│  │ • uptime                 │ │
│  │ • client details         │ │
│  └──────────────────────────┘ │
│                                │
│  GET /health/repo/:repoId      │
│  ┌──────────────────────────┐ │
│  │ • repoId                 │ │
│  │ • activeClients          │ │
│  │ • client details         │ │
│  │ • connection durations   │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

## Data Flow: Buffer Serialization

```
AudioBuffer (Server)
      │
      │ numberOfChannels: 2
      │ length: 220500
      │ sampleRate: 44100
      │ duration: 5s
      │
      ▼
BufferSerializer.serialize()
      │
      ▼
SerializedBuffer (JSON)
{
  numberOfChannels: 2,
  length: 220500,
  sampleRate: 44100,
  duration: 5,
  channels: [
    [0.1, 0.2, ...],  // Left channel
    [0.15, 0.25, ...] // Right channel
  ]
}
      │
      │ SSE Transport
      │
      ▼
Browser Client
      │
      ▼
BufferSerializer.deserialize()
(client.js)
      │
      ▼
AudioBuffer (Browser)
      │
      ▼
Tone.Player
      │
      ▼
Audio Output
```

## Error Handling Flow

```
Error Occurs
      │
      ├─────────────────────┬─────────────────────┐
      │                     │                     │
      ▼                     ▼                     ▼
Render Error        Session Error       SSE Error
      │                     │                     │
      ▼                     ▼                     ▼
StreamingService    SSEManager          SSEManager
 • Log error         • Disconnect       • Reconnect
 • Send error msg    • Cleanup          • Log
      │                     │                     │
      └─────────────────────┴─────────────────────┘
                            │
                            ▼
              Client receives error message
              {
                type: 'error',
                data: {
                  message: 'Error description',
                  code: 'ERROR_CODE'
                }
              }
```

## Technology Stack

### Server-Side
- **Express.js**: HTTP server and routing
- **Tone.js**: Audio synthesis and offline rendering
- **TypeScript**: Type safety and developer experience
- **@bots-n-cats/audio-core**: Session management

### Client-Side
- **Tone.js**: Audio playback
- **EventSource API**: SSE connections
- **Web Audio API**: AudioBuffer deserialization
- **Vanilla JavaScript**: No framework dependencies

### Communication
- **Server-Sent Events (SSE)**: One-way server-to-client streaming
- **JSON**: Message serialization
- **HTTP/1.1**: Transport protocol

## Performance Characteristics

### Offline Rendering
- No real-time constraints
- Deterministic output
- Parallel rendering possible
- Pre-computed compositions

### Memory Management
- Automatic cleanup after 5 minutes inactivity
- Health metrics tracking
- Periodic session cleanup (60s)
- Buffer disposal on disconnect

### Scalability
- Multiple clients per repository
- Per-repository broadcasting
- Session isolation
- Horizontal scaling ready (with Redis)

### Network Efficiency
- SSE (HTTP/1.1) - one connection per client
- Optional buffer compression (50% reduction)
- Heartbeat optimization (30s interval)
- Automatic reconnection handling
