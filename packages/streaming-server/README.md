# @bots-n-cats/streaming-server

Real-time audio streaming server using Server-Sent Events (SSE) for the bots-n-cats SaaS platform.

**Linear Issue**: BOC-13 - Build real-time streaming system (SSE) for music updates

## Overview

The streaming server broadcasts musical compositions to multiple browser clients in real-time using Server-Sent Events (SSE). It leverages Tone.js Offline rendering for deterministic audio generation and the audio-core session management system for client lifecycle handling.

## Architecture

```
GitHub Webhook Event
  ↓
MusicMapper generates musical parameters
  ↓
Tone.Offline() renders complete composition (no real-time constraints)
  ↓
MultiClientAudioManager broadcasts AudioBuffer to clients
  ↓
SSE stream sends buffer data to each connected browser
  ↓
Browser: Tone.js loads buffer and plays
```

## Features

- Server-Sent Events (SSE) for real-time streaming
- Offline rendering with Tone.js for deterministic compositions
- Multi-client session management
- AudioBuffer serialization for network transmission
- Automatic heartbeat and connection maintenance
- Stale connection cleanup (5-minute timeout)
- Health metrics and monitoring
- Express.js-based REST API

## Installation

```bash
pnpm install
```

## Build

```bash
pnpm run build
```

## Usage

### Starting the Server

```bash
# Development
pnpm run dev:server

# Production
pnpm run start
```

The server runs on port 3001 by default (configurable via PORT environment variable).

### Environment Variables

- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - CORS origin (default: *)

### Endpoints

#### SSE Stream
```
GET /stream/:repoId?clientId=<optional>
```
Establishes SSE connection for real-time audio streaming for a specific repository.

#### Test Audio Generation
```
POST /stream/:repoId/test
Content-Type: application/json

{
  "tempo": 120,
  "duration": 5,
  "instrumentType": "synth"
}
```
Triggers test audio generation (useful for development/testing).

#### Health Check
```
GET /health
```
Returns server health metrics including active clients, sessions, and memory usage.

#### Repository Health
```
GET /health/repo/:repoId
```
Returns health metrics for a specific repository.

## Client Integration

### Browser Example

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/tone@14.7.77"></script>
</head>
<body>
  <script>
    const repoId = 'owner/repo-name';
    const eventSource = new EventSource(`http://localhost:3001/stream/${repoId}`);

    eventSource.addEventListener('message', async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'audio_buffer') {
        // Deserialize buffer
        const audioContext = new AudioContext();
        const buffer = audioContext.createBuffer(
          message.data.buffer.numberOfChannels,
          message.data.buffer.length,
          message.data.buffer.sampleRate
        );

        message.data.buffer.channels.forEach((channelData, i) => {
          buffer.copyToChannel(new Float32Array(channelData), i);
        });

        // Play with Tone.js
        const player = new Tone.Player(buffer).toDestination();
        player.start();
      }
    });
  </script>
</body>
</html>
```

See `client/index.html` for a complete working example.

## Services

### StreamingService
Main orchestrator that coordinates rendering, session management, and SSE broadcasting.

### OfflineRenderer
Uses Tone.Offline to render compositions deterministically without real-time constraints.

### SSEManager
Manages Server-Sent Events connections, heartbeats, and client lifecycle.

### BufferSerializer
Converts AudioBuffer to/from JSON for network transmission.

## Session Management

The streaming server integrates with `@bots-n-cats/audio-core` session management:

- **MultiClientAudioManager**: Broadcasts audio buffers to multiple clients
- **ClientSessionManager**: Manages individual client sessions
- Automatic cleanup of stale sessions
- Health metrics and monitoring

## Message Types

### Connected
```json
{
  "type": "connected",
  "timestamp": 1234567890,
  "data": {
    "message": "Streaming audio for repo: owner/repo",
    "clientId": "client_abc123",
    "repoId": "owner/repo"
  }
}
```

### Audio Buffer
```json
{
  "type": "audio_buffer",
  "timestamp": 1234567890,
  "data": {
    "buffer": {
      "sampleRate": 44100,
      "length": 220500,
      "duration": 5,
      "numberOfChannels": 2,
      "channels": [[...], [...]]
    },
    "params": {
      "tempo": 120,
      "scale": ["C4", "E4", "G4"],
      "instrumentType": "synth"
    },
    "repoId": "owner/repo"
  }
}
```

### Heartbeat
```json
{
  "type": "heartbeat",
  "timestamp": 1234567890
}
```

### Error
```json
{
  "type": "error",
  "timestamp": 1234567890,
  "data": {
    "message": "Failed to generate audio",
    "code": "RENDER_ERROR"
  }
}
```

## Development

### Running Tests
```bash
pnpm test
```

### Building
```bash
pnpm run build
```

### Watching for Changes
```bash
pnpm run dev
```

## Production Considerations

- **nginx**: Set `X-Accel-Buffering: no` header (already configured in SSEManager)
- **Load Balancing**: Use sticky sessions for SSE connections
- **Memory**: Monitor `memoryUsage` metric via `/health` endpoint
- **Scaling**: Consider using Redis for cross-instance session management
- **Buffer Size**: AudioBuffer serialization can be memory-intensive; monitor and optimize as needed

## License

Part of the bots-n-cats SaaS platform.
