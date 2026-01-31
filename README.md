# Webhook Relay

A Cloudflare Worker that catches webhooks from GitHub, Stripe, Vercel, and custom sources, normalizes payloads, and forwards them to Clawdbot for TARS to react.

## Architecture

```
GitHub ─────┐
Stripe ─────┼──▶ Webhook Relay ──▶ Clawdbot ──▶ TARS reacts
Vercel ─────┤   (CF Worker)        (hooks)
Custom ─────┘
```

## Features

- **One URL, many sources** — `/catch/:source` pattern (e.g., `/catch/github`, `/catch/stripe`)
- **Signature verification** — HMAC-SHA256 for GitHub, Stripe's signature scheme, custom webhooks
- **Payload normalization** — Transforms provider-specific payloads into a standard format
- **Extensible** — Easy to add new webhook sources

## Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/health` | GET | Health check — returns `{"status":"healthy","version":"0.1.0"}` |
| `/catch/:source` | POST | Receive webhook from `:source` |

## Supported Sources

| Source | Signature Method | Header |
|--------|------------------|--------|
| GitHub | HMAC-SHA256 | `X-Hub-Signature-256` |
| Stripe | Stripe signature v1 | `Stripe-Signature` |
| Vercel | HMAC-SHA1 | `X-Vercel-Signature` |
| Custom | HMAC-SHA256 | `X-Webhook-Signature` |

## Normalized Event Format

All webhooks are transformed to this standard format:

```typescript
interface NormalizedEvent {
  id: string;           // Unique event ID
  source: string;       // "github" | "stripe" | "vercel" | "custom"
  eventType: string;    // e.g., "github.push", "stripe.payment.succeeded"
  timestamp: string;    // ISO 8601
  payload: any;         // Original payload
  metadata?: {
    repo?: string;
    action?: string;
    sender?: string;
    amount?: number;
    currency?: string;
    // ...
  };
}
```

## Setup

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Installation

```bash
git clone https://github.com/adamkwolf/webhook-relay.git
cd webhook-relay
npm install
```

### Configuration

Create a `.dev.vars` file for local development:

```bash
GITHUB_WEBHOOK_SECRET=your-github-secret
STRIPE_WEBHOOK_SECRET=your-stripe-secret
VERCEL_WEBHOOK_SECRET=your-vercel-secret
CUSTOM_WEBHOOK_SECRET=your-custom-secret
CLAWDBOT_HOOKS_URL=https://your-gateway/hooks
CLAWDBOT_HOOKS_SECRET=your-clawdbot-secret
```

For production, set secrets via Wrangler:

```bash
wrangler secret put GITHUB_WEBHOOK_SECRET
wrangler secret put STRIPE_WEBHOOK_SECRET
# etc.
```

### Development

```bash
npm run dev
```

### Deployment

```bash
npm run deploy
```

## Testing

### Health Check

```bash
curl http://localhost:8787/health
# {"status":"healthy","version":"0.1.0"}
```

### GitHub Webhook (mock)

```bash
curl -X POST http://localhost:8787/catch/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"ref":"refs/heads/main","repository":{"full_name":"user/repo"}}'
```

## Project Structure

```
src/
├── index.ts          # Worker entry point
├── router.ts         # URL routing with param extraction
├── types.ts          # TypeScript interfaces
├── crypto/
│   └── hmac.ts       # HMAC-SHA256 verification
└── handlers/
    ├── github/       # GitHub webhook handler
    ├── stripe/       # Stripe webhook handler
    ├── vercel/       # Vercel webhook handler
    └── custom/       # Generic webhook handler
```

## Built With

- [Cloudflare Workers](https://workers.cloudflare.com/) — Serverless edge computing
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) — CLI tooling

## Built By

This project was built autonomously by **Ralph** (Claude Code + automation) with guidance from **TARS**.

12 user stories implemented in a single session:
- US-001 → US-012: From project scaffolding to Stripe signature verification

## License

MIT
