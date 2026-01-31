# Product Requirements Document: Webhook Relay

**Project:** TARS Webhook Relay  
**Version:** 1.0  
**Date:** 2026-01-31  
**Author:** TARS  

---

## 1. Overview

### 1.1 Problem Statement
TARS needs to react to events from external services (GitHub, Stripe, Vercel, etc.) but currently has no unified way to receive webhooks. Each service has different payload formats, authentication mechanisms, and delivery patterns.

### 1.2 Solution
A single Cloudflare Worker endpoint that:
- Catches webhooks from any configured source
- Validates signatures per provider
- Normalizes payloads to a standard format
- Forwards events to Clawdbot for TARS to process

### 1.3 Goals
- **Unified endpoint**: One URL pattern for all webhook sources
- **Security**: Proper signature verification for each provider
- **Reliability**: Logging, basic retry logic, event tracking
- **Extensibility**: Easy to add new webhook sources
- **Event-driven TARS**: Enable real-time reactions to external events

---

## 2. Architecture

```
┌─────────────┐
│   GitHub    │──┐
├─────────────┤  │
│   Stripe    │──┤     ┌──────────────────┐     ┌───────────────┐     ┌──────┐
├─────────────┤  ├────▶│  Webhook Relay   │────▶│   Clawdbot    │────▶│ TARS │
│   Vercel    │──┤     │  (CF Worker)     │     │   (hooks)     │     │      │
├─────────────┤  │     └──────────────────┘     └───────────────┘     └──────┘
│   Custom    │──┘            │
└─────────────┘               │
                              ▼
                    ┌──────────────────┐
                    │   Cloudflare KV  │
                    │   (config/logs)  │
                    └──────────────────┘
```

---

## 3. Functional Requirements

### 3.1 Endpoint Pattern

| Route | Description |
|-------|-------------|
| `POST /catch/:source` | Receive webhook from `:source` |
| `GET /health` | Health check endpoint |
| `GET /sources` | List configured sources (auth required) |

**Examples:**
- `POST /catch/github` — GitHub webhooks
- `POST /catch/stripe` — Stripe webhooks
- `POST /catch/vercel` — Vercel webhooks
- `POST /catch/custom` — Generic webhooks

### 3.2 Signature Verification

| Provider | Method | Header |
|----------|--------|--------|
| GitHub | HMAC-SHA256 | `X-Hub-Signature-256` |
| Stripe | Stripe signature v1 | `Stripe-Signature` |
| Vercel | HMAC-SHA1 | `X-Vercel-Signature` |
| Custom | HMAC-SHA256 | `X-Webhook-Signature` |

Each provider's secret stored in environment variables:
- `GITHUB_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET`
- `VERCEL_WEBHOOK_SECRET`
- `CUSTOM_WEBHOOK_SECRET`

### 3.3 Payload Normalization

All incoming webhooks transformed to standard format:

```typescript
interface NormalizedEvent {
  id: string;           // Generated UUID
  source: string;       // "github" | "stripe" | "vercel" | "custom"
  event: string;        // Event type (e.g., "push", "payment.succeeded")
  data: object;         // Original payload (or relevant subset)
  timestamp: string;    // ISO 8601 timestamp
  metadata: {
    delivery_id?: string;   // Provider's delivery ID if available
    signature_valid: boolean;
    received_at: string;
  };
}
```

### 3.4 Event Type Mapping

**GitHub:**
| Webhook Event | Normalized Event |
|---------------|------------------|
| `push` | `github.push` |
| `pull_request` | `github.pull_request` |
| `issues` | `github.issues` |
| `star` | `github.star` |
| `release` | `github.release` |

**Stripe:**
| Webhook Event | Normalized Event |
|---------------|------------------|
| `payment_intent.succeeded` | `stripe.payment.succeeded` |
| `customer.subscription.created` | `stripe.subscription.created` |
| `invoice.paid` | `stripe.invoice.paid` |

**Vercel:**
| Webhook Event | Normalized Event |
|---------------|------------------|
| `deployment.created` | `vercel.deployment.created` |
| `deployment.succeeded` | `vercel.deployment.succeeded` |
| `deployment.failed` | `vercel.deployment.failed` |

### 3.5 Forwarding to Clawdbot

Forward normalized events to Clawdbot's hooks endpoint:

```
POST {CLAWDBOT_HOOKS_URL}
Headers:
  Content-Type: application/json
  Authorization: Bearer {CLAWDBOT_HOOKS_SECRET}
  X-Webhook-Source: {source}
Body: NormalizedEvent
```

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Response time: < 500ms for webhook receipt
- Forward to Clawdbot: < 2s total processing
- Support: 100+ webhooks/minute

### 4.2 Reliability
- **Retry logic**: 3 attempts with exponential backoff (1s, 5s, 30s)
- **Timeout**: 10s per forward attempt
- **Dead letter**: Log failed deliveries to KV for manual review

### 4.3 Observability
- Log all incoming webhooks (source, event type, timestamp)
- Log forwarding success/failure
- Track signature validation failures (potential attack indicator)

### 4.4 Security
- Validate signatures before processing
- Reject requests with invalid/missing signatures
- Rate limit by source IP (100 req/min default)
- No sensitive data in logs

---

## 5. Configuration

### 5.1 Environment Variables

```bash
# Clawdbot connection
CLAWDBOT_HOOKS_URL=https://your-gateway.com/hooks
CLAWDBOT_HOOKS_SECRET=your-shared-secret

# Provider secrets
GITHUB_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_SECRET=whsec_...
VERCEL_WEBHOOK_SECRET=whsec_...
CUSTOM_WEBHOOK_SECRET=your-custom-secret

# Optional
RATE_LIMIT_PER_MIN=100
LOG_LEVEL=info
```

### 5.2 KV Store Schema

**Namespace: `WEBHOOK_RELAY_CONFIG`**

```json
{
  "sources": {
    "github": {
      "enabled": true,
      "events": ["push", "pull_request", "star", "release"],
      "repos": ["*"]  // or specific repos
    },
    "stripe": {
      "enabled": true,
      "events": ["payment_intent.succeeded", "customer.subscription.*"]
    },
    "vercel": {
      "enabled": true,
      "events": ["deployment.*"]
    },
    "custom": {
      "enabled": true,
      "events": ["*"]
    }
  },
  "routing": {
    "default_channel": "telegram",
    "event_overrides": {
      "github.star": { "channel": "telegram", "priority": "low" },
      "stripe.payment.succeeded": { "channel": "telegram", "priority": "high" }
    }
  }
}
```

**Namespace: `WEBHOOK_RELAY_LOGS`**

Event logs stored with TTL (7 days default):
```json
{
  "key": "log:{timestamp}:{uuid}",
  "value": {
    "event": NormalizedEvent,
    "forwarded": true,
    "attempts": 1,
    "error": null
  }
}
```

---

## 6. API Reference

### 6.1 Receive Webhook

```
POST /catch/:source
```

**Request:**
- Headers: Provider-specific signature headers
- Body: Provider's webhook payload

**Response:**
```json
// Success
{ "status": "accepted", "id": "evt_abc123" }

// Invalid signature
{ "status": "rejected", "error": "invalid_signature" }

// Unknown source
{ "status": "rejected", "error": "unknown_source" }
```

### 6.2 Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "sources": ["github", "stripe", "vercel", "custom"]
}
```

---

## 7. TARS Integration

### 7.1 Message Format

TARS receives events as Clawdbot hook messages:

```
🔔 **GitHub**: adamkwolf starred tars-first-light
🔔 **Stripe**: Payment received - $50.00 from customer_abc123
🔔 **Vercel**: Deployment succeeded - tars-website (production)
```

### 7.2 Actionable Events

TARS can respond to certain events:

| Event | Possible Actions |
|-------|------------------|
| `github.star` | Thank the user, log milestone |
| `github.issues` | Summarize issue, suggest labels |
| `stripe.payment.succeeded` | Log revenue, send thanks |
| `vercel.deployment.failed` | Alert, check logs, suggest fixes |

---

## 8. Implementation Phases

### Phase 1: MVP (Week 1)
- [ ] Basic Cloudflare Worker setup
- [ ] GitHub webhook support with signature verification
- [ ] Forward to Clawdbot hooks
- [ ] Basic logging

### Phase 2: Multi-Source (Week 2)
- [ ] Add Stripe support
- [ ] Add Vercel support
- [ ] Add generic/custom webhook support
- [ ] KV-based configuration

### Phase 3: Reliability (Week 3)
- [ ] Retry logic with exponential backoff
- [ ] Dead letter logging
- [ ] Rate limiting
- [ ] Event filtering by config

### Phase 4: Polish (Week 4)
- [ ] Dashboard/stats endpoint (optional)
- [ ] Event replay capability
- [ ] Documentation
- [ ] Monitoring/alerting integration

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Webhook delivery success rate | > 99% |
| Average processing latency | < 500ms |
| Signature validation accuracy | 100% |
| TARS reaction time | < 5s from event |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Provider changes signature format | Webhooks rejected | Monitor validation failures, version handlers |
| Clawdbot endpoint down | Events lost | Retry logic, dead letter queue |
| High webhook volume | Rate limits hit | Queue-based processing (future) |
| Secret exposure | Security breach | Rotate secrets, use Wrangler secrets |

---

## 11. Open Questions

1. Should we support webhook replay for debugging?
2. Do we need a UI for viewing event history?
3. Should certain events trigger different Clawdbot sessions?
4. How long should we retain event logs?

---

## 12. Appendix

### A. Example GitHub Webhook Payload

```json
{
  "action": "created",
  "starred_at": "2026-01-31T03:20:00Z",
  "repository": {
    "full_name": "adamkwolf/tars-first-light",
    "stargazers_count": 42
  },
  "sender": {
    "login": "awesome-user",
    "avatar_url": "https://..."
  }
}
```

### B. Example Normalized Event

```json
{
  "id": "evt_01HQ3X...",
  "source": "github",
  "event": "github.star",
  "data": {
    "action": "created",
    "repo": "adamkwolf/tars-first-light",
    "stars": 42,
    "user": "awesome-user"
  },
  "timestamp": "2026-01-31T03:20:00.000Z",
  "metadata": {
    "delivery_id": "abc123",
    "signature_valid": true,
    "received_at": "2026-01-31T03:20:00.123Z"
  }
}
```

---

*Document generated by TARS | Last updated: 2026-01-31*
