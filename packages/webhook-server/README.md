# @bots-n-cats/webhook-server

GitHub webhook server for the bots-n-cats SaaS platform. Receives GitHub events, validates signatures, normalizes event data, and publishes to AudioEventBus for music generation.

**Issues Implemented:** BOC-1, BOC-2, BOC-9

## Architecture

```
GitHub Webhook POST
  ↓
SignatureValidator → Validates HMAC SHA-256 signature
  ↓
EventParser → Parses GitHub payload to NormalizedEvent
  ↓
AudioEventBus.publish('webhook:github:push', normalized) ← DECOUPLED!
  ↓
res.status(200).send('OK') ← Returns immediately
```

**Key Principle:** The webhook handler does NOT process music directly. It publishes events to the AudioEventBus and returns 200 OK quickly. Music generation happens asynchronously via event subscribers.

## Features

- ✅ Express server with `/webhook` endpoint
- ✅ GitHub signature validation (HMAC SHA-256)
- ✅ Event parser supporting 8 GitHub event types
- ✅ Emotion and intensity mapping for events
- ✅ AudioEventBus integration for event-driven architecture
- ✅ Structured logging
- ✅ Health check endpoint
- ✅ Graceful shutdown
- ✅ TypeScript with ESM

## Supported GitHub Events

| Event Type | Actions | Emotion Mapping |
|------------|---------|-----------------|
| `push` | commits | activity, growth, tension (force push) |
| `pull_request` | opened, closed, merged, etc. | growth (new), resolution (merged), tension (closed without merge) |
| `pull_request_review` | approved, changes_requested | resolution (approved), tension (changes requested) |
| `check_run` | completed | resolution (success), tension (failure) |
| `deployment_status` | success, failure, etc. | resolution (success), tension (failure) |
| `issues` | opened, closed | growth (new), resolution (closed) |
| `issue_comment` | created, edited | activity |
| `workflow_run` | completed | resolution (success), tension (failure) |

## Installation

```bash
# From webhook worktree root
cd /Users/preston/Projects/bots-webhook
npm install

# Build packages
npm run build
```

## Configuration

Create a `.env` file in `packages/webhook-server/`:

```bash
PORT=3000
GITHUB_WEBHOOK_SECRET=your_secret_here_minimum_16_characters
NODE_ENV=development
```

Generate a secure webhook secret:
```bash
openssl rand -hex 32
```

## Usage

### Development Mode

```bash
cd packages/webhook-server
npm run dev
```

### Production Mode

```bash
cd packages/webhook-server
npm run build
npm start
```

### Testing the Endpoint

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Webhook Info:**
```bash
curl http://localhost:3000/webhook
```

**Simulate GitHub Webhook:**
```bash
# Generate signature
PAYLOAD='{"action":"opened","repository":{"full_name":"test/repo"},"sender":{"login":"user"}}'
SECRET="your_secret_here"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/SHA2-256(stdin)= //')

# Send webhook
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "x-github-event: pull_request" \
  -H "x-github-delivery: 12345" \
  -H "x-hub-signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

## Project Structure

```
src/
├── index.ts              # Main entry point
├── server.ts             # Express server setup
├── routes/
│   └── webhook.ts        # POST /webhook endpoint
├── services/
│   ├── WebhookService.ts      # Main orchestrator
│   ├── SignatureValidator.ts  # HMAC SHA-256 validation
│   └── EventParser.ts         # GitHub → NormalizedEvent
├── types/
│   └── github.ts         # GitHub webhook payload types
└── utils/
    └── logger.ts         # Structured logging
```

## Service Layer

### WebhookService

Main orchestrator that coordinates validation, parsing, and publishing:

```typescript
import { AudioEventBus } from '@bots-n-cats/audio-core';
import { WebhookService } from './services/WebhookService.js';

const eventBus = new AudioEventBus();
const webhookService = new WebhookService(eventBus, process.env.GITHUB_WEBHOOK_SECRET);

await webhookService.handleWebhook(eventType, signature, rawPayload, payload);
```

### SignatureValidator

Validates GitHub webhook signatures using timing-safe comparison:

```typescript
import { SignatureValidator } from './services/SignatureValidator.js';

SignatureValidator.validate(payload, signature, secret);
// Throws Error if signature is invalid
```

### EventParser

Maps GitHub events to normalized format:

```typescript
import { EventParser } from './services/EventParser.js';

const normalized = EventParser.parse('push', payload);
// Returns: NormalizedEvent with emotion, intensity, metadata
```

## Event Bus Integration

The webhook server publishes events to AudioEventBus for decoupled processing:

```typescript
// Published events
eventBus.publish('webhook:github:push', normalizedEvent);
eventBus.publish('webhook:github:pull_request', normalizedEvent);
eventBus.publish('webhook:github:*', normalizedEvent); // All events
```

Music generation service (separate package) subscribes to these events:

```typescript
// In music-generation service
eventBus.subscribe('webhook:github:*', async (event) => {
  // Generate music based on event.emotion and event.intensity
  await generateMusic(event);
});
```

## Error Handling

| Status Code | Description |
|-------------|-------------|
| 200 | Webhook received and processed successfully |
| 400 | Bad request (missing headers, unsupported event type) |
| 401 | Unauthorized (invalid signature) |
| 500 | Internal server error |

## Logging

Structured logging with different formats for development and production:

**Development:**
```
[2025-10-17T22:00:00.000Z] INFO: Webhook event received {
  eventType: "push",
  action: "updated",
  repository: "user/repo"
}
```

**Production:**
```json
{"timestamp":"2025-10-17T22:00:00.000Z","level":"info","message":"Webhook event received","data":{"eventType":"push"}}
```

## Security

- ✅ HMAC SHA-256 signature validation
- ✅ Timing-safe signature comparison
- ✅ Environment variable validation
- ✅ Minimum secret length enforcement (16 characters)
- ✅ Raw body preservation for signature verification

## GitHub App Setup

When configuring your GitHub App webhook:

1. **Webhook URL:** `https://your-domain.com/webhook`
2. **Webhook secret:** Use the same value as `GITHUB_WEBHOOK_SECRET`
3. **Content type:** `application/json`
4. **Events:** Select the events you want to receive (push, pull_request, etc.)
5. **SSL verification:** Enable (required for production)

## Development

### Type Safety

Full TypeScript support with strict typing:

```typescript
import type {
  NormalizedEvent,
  GitHubEventType,
  EmotionCategory,
} from '@bots-n-cats/audio-core';

import type {
  WebhookPayload,
  PushEventPayload,
  PullRequestEventPayload,
} from './types/github.js';
```

### Testing

Run tests (when implemented):
```bash
npm test
```

## Dependencies

**Production:**
- `@bots-n-cats/audio-core` - Core audio infrastructure
- `express` - Web server framework
- `body-parser` - JSON request parsing
- `dotenv` - Environment variable loading

**Development:**
- `typescript` - Type checking and compilation
- `tsx` - TypeScript execution for development
- `nodemon` - Auto-restart on file changes
- `@types/express` - Express type definitions

## Next Steps

1. **Music Generation Service (BOC-3, BOC-4):** Subscribe to webhook events and generate music
2. **Testing:** Add unit and integration tests
3. **Monitoring:** Add metrics collection (Prometheus, DataDog, etc.)
4. **Rate Limiting:** Add rate limiting for webhook endpoint
5. **Webhook Replay:** Add webhook event storage and replay functionality

## Related Packages

- `@bots-n-cats/audio-core` - Core audio infrastructure (BOC-20)
- `@bots-n-cats/music-engine` - Music generation service (BOC-3, BOC-4)

## License

MIT

## Issues

- [BOC-1](https://linear.app/bots-n-cats/issue/BOC-1) - Set up Node.js webhook server with Express
- [BOC-2](https://linear.app/bots-n-cats/issue/BOC-2) - Create GitHub event parser and normalizer
- [BOC-9](https://linear.app/bots-n-cats/issue/BOC-9) - Initialize webhook server project structure
