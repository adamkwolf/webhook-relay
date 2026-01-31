# Webhook Relay - Sprint Breakdown

## Sprint 1: Foundation
**Goal:** Basic Cloudflare Worker that receives HTTP requests, routes them, and responds with JSON.
**Demo:** `curl POST /catch/test` returns `{"status":"accepted"}`, `GET /health` returns status.

### Tasks

#### 1.1 Project Scaffolding
- Initialize Wrangler project with TypeScript
- Configure `wrangler.toml` with project name, compatibility date
- Set up `tsconfig.json` with strict mode
- **Validation:** `wrangler dev` starts without errors

#### 1.2 Health Endpoint
- Create `src/index.ts` with basic request handler
- Implement `GET /health` returning `{"status":"healthy","version":"0.1.0"}`
- **Test:** Unit test verifies response shape and status code 200

#### 1.3 Router Implementation
- Create `src/router.ts` with path matching logic
- Support pattern `/catch/:source` with param extraction
- Handle 404 for unknown routes
- **Test:** Unit tests for path matching, param extraction, 404 handling

#### 1.4 Catch Endpoint Stub
- Create `POST /catch/:source` endpoint
- Extract `source` param from URL
- Return `{"status":"accepted","source":"<source>"}` for any POST
- Reject non-POST methods with 405
- **Test:** Unit tests for POST acceptance, method rejection, param extraction

#### 1.5 Request Body Parsing
- Parse JSON body from incoming requests
- Handle malformed JSON with 400 response
- Handle empty body gracefully
- **Test:** Unit tests for valid JSON, invalid JSON, empty body

#### 1.6 Error Handling Middleware
- Create centralized error handler
- Return consistent error response format: `{"status":"error","error":"message"}`
- Log errors to console (for now)
- **Test:** Unit tests verify error responses for thrown exceptions

#### 1.7 Local Development Setup
- Add `npm run dev` script for `wrangler dev`
- Add `npm run test` script for vitest
- Create `.dev.vars.example` for local secrets template
- **Validation:** `npm run dev` and `npm run test` both work

---

## Sprint 2: GitHub Webhook Support
**Goal:** Receive GitHub webhooks, validate HMAC-SHA256 signatures, parse events.
**Demo:** Send mock GitHub webhook with valid signature → accepted. Invalid signature → rejected.

### Tasks

#### 2.1 Types Definition
- Create `src/types.ts` with `NormalizedEvent` interface
- Define `WebhookSource` enum: `github | stripe | vercel | custom`
- Define `WebhookHandler` interface for source handlers
- **Validation:** TypeScript compiles without errors

#### 2.2 HMAC-SHA256 Utility
- Create `src/crypto/hmac.ts` with `verifyHmacSha256(secret, payload, signature)` function
- Use Web Crypto API (CF Workers compatible)
- Return boolean for valid/invalid
- **Test:** Unit tests with known HMAC vectors, invalid signatures, empty inputs

#### 2.3 GitHub Signature Parser
- Create `src/handlers/github/signature.ts`
- Parse `X-Hub-Signature-256` header (format: `sha256=<hex>`)
- Extract hex signature from header value
- Handle missing/malformed header
- **Test:** Unit tests for valid header parsing, missing header, malformed format

#### 2.4 GitHub Signature Verification
- Create `src/handlers/github/verify.ts`
- Combine HMAC utility with signature parser
- Verify request body against `GITHUB_WEBHOOK_SECRET`
- **Test:** Unit tests with real GitHub webhook examples, invalid signatures

#### 2.5 GitHub Event Type Extractor
- Create `src/handlers/github/events.ts`
- Parse `X-GitHub-Event` header for event type
- Parse `X-GitHub-Delivery` header for delivery ID
- Map to normalized event name (e.g., `star` → `github.star`)
- **Test:** Unit tests for header extraction, event mapping

#### 2.6 GitHub Payload Normalizer
- Create `src/handlers/github/normalize.ts`
- Transform GitHub payload to `NormalizedEvent` format
- Extract relevant fields (repo, action, sender, etc.)
- Generate UUID for event ID
- **Test:** Unit tests with sample payloads for push, star, PR, issues

#### 2.7 GitHub Handler Integration
- Create `src/handlers/github/index.ts` combining all GitHub modules
- Implement `WebhookHandler` interface
- Wire into router for `/catch/github`
- **Test:** Integration test: mock request → full handler → normalized response

#### 2.8 Environment Variable Access
- Create `src/config/env.ts` for typed env access
- Define `Env` interface with all expected variables
- Add `GITHUB_WEBHOOK_SECRET` to wrangler.toml (as secret reference)
- **Validation:** TypeScript provides autocomplete for env vars

---

## Sprint 3: Multi-Source Support
**Goal:** Add Stripe, Vercel, and generic webhook handlers with their signature schemes.
**Demo:** All four sources accept webhooks with valid signatures, reject invalid ones.

### Tasks

#### 3.1 Stripe Signature Parser
- Create `src/handlers/stripe/signature.ts`
- Parse `Stripe-Signature` header (format: `t=timestamp,v1=signature`)
- Extract timestamp and signature components
- **Test:** Unit tests for header parsing, missing components

#### 3.2 Stripe Signature Verification
- Create `src/handlers/stripe/verify.ts`
- Implement Stripe's signature scheme: `HMAC-SHA256(secret, timestamp.payload)`
- Verify timestamp is within tolerance (5 min default)
- **Test:** Unit tests with Stripe test vectors, expired timestamps

#### 3.3 Stripe Event Normalizer
- Create `src/handlers/stripe/normalize.ts`
- Transform Stripe event to `NormalizedEvent`
- Map event types (e.g., `payment_intent.succeeded` → `stripe.payment.succeeded`)
- Extract key fields (amount, customer, etc.)
- **Test:** Unit tests with sample Stripe payloads

#### 3.4 Stripe Handler Integration
- Create `src/handlers/stripe/index.ts`
- Implement `WebhookHandler` interface
- Wire into router for `/catch/stripe`
- Add `STRIPE_WEBHOOK_SECRET` env var
- **Test:** Integration test with mock Stripe webhook

#### 3.5 Vercel Signature Verification
- Create `src/handlers/vercel/verify.ts`
- Implement HMAC-SHA1 verification (Vercel's scheme)
- Parse `X-Vercel-Signature` header
- **Test:** Unit tests with mock Vercel signatures

#### 3.6 Vercel Event Normalizer
- Create `src/handlers/vercel/normalize.ts`
- Transform Vercel deployment events to `NormalizedEvent`
- Map event types (deployment.created, succeeded, failed)
- **Test:** Unit tests with sample Vercel payloads

#### 3.7 Vercel Handler Integration
- Create `src/handlers/vercel/index.ts`
- Implement `WebhookHandler` interface
- Wire into router for `/catch/vercel`
- Add `VERCEL_WEBHOOK_SECRET` env var
- **Test:** Integration test with mock Vercel webhook

#### 3.8 Generic/Custom Handler
- Create `src/handlers/custom/index.ts`
- Use standard HMAC-SHA256 with `X-Webhook-Signature` header
- Pass through event type from `X-Webhook-Event` header (or body field)
- Minimal normalization (wrap payload as-is)
- **Test:** Unit tests for signature verification, pass-through behavior

#### 3.9 Handler Registry
- Create `src/handlers/registry.ts`
- Map source names to handler implementations
- Provide `getHandler(source): WebhookHandler | null`
- Return null for unknown sources
- **Test:** Unit tests for handler lookup, unknown source handling

#### 3.10 Router Handler Integration
- Update router to use handler registry
- Call appropriate handler based on `:source` param
- Return 400 for unknown sources
- **Test:** Integration tests for all four sources through router

---

## Sprint 4: Clawdbot Integration
**Goal:** Forward normalized events to Clawdbot hooks endpoint with authentication.
**Demo:** Webhook received → normalized → forwarded to Clawdbot → TARS receives message.

### Tasks

#### 4.1 HTTP Client Utility
- Create `src/http/client.ts` with `postJson(url, body, headers)` function
- Handle timeouts (10s default)
- Return response status and body
- **Test:** Unit tests with mocked fetch

#### 4.2 Clawdbot Client
- Create `src/clawdbot/client.ts`
- Implement `forwardEvent(event: NormalizedEvent)` function
- Add `Authorization: Bearer <secret>` header
- Add `X-Webhook-Source` header
- **Test:** Unit tests verify correct headers, body format

#### 4.3 Clawdbot Response Handling
- Handle successful forward (2xx)
- Handle Clawdbot errors (4xx, 5xx)
- Parse error responses for logging
- **Test:** Unit tests for success, client error, server error responses

#### 4.4 Forward Integration
- Update webhook handlers to call Clawdbot client after normalization
- Return forwarding status in response
- Add `CLAWDBOT_HOOKS_URL` and `CLAWDBOT_HOOKS_SECRET` env vars
- **Test:** Integration test: webhook → normalize → forward → response

#### 4.5 Async Forwarding
- Use `ctx.waitUntil()` for non-blocking forward
- Return `accepted` immediately to webhook sender
- Forward happens in background
- **Test:** Verify immediate response, background execution

#### 4.6 Event ID Generation
- Create `src/utils/uuid.ts` with UUID v4 generation
- Use crypto.randomUUID() (CF Workers compatible)
- Prefix with `evt_` for readability
- **Test:** Unit tests for format, uniqueness

#### 4.7 Timestamp Handling
- Create `src/utils/time.ts` with ISO timestamp helpers
- `nowISO()` returns current time in ISO 8601
- Handle timezone consistently (UTC)
- **Test:** Unit tests for format correctness

---

## Sprint 5: Reliability & Logging
**Goal:** Add retry logic, KV logging, and failure handling.
**Demo:** Simulate Clawdbot down → retries → logs to KV → can retrieve failed events.

### Tasks

#### 5.1 KV Namespace Setup
- Add `WEBHOOK_RELAY_LOGS` KV namespace to wrangler.toml
- Create KV binding type definitions
- **Validation:** `wrangler kv:namespace list` shows namespace

#### 5.2 Event Logger
- Create `src/logging/event-logger.ts`
- Implement `logEvent(event, status, error?)` function
- Store to KV with key format: `log:{timestamp}:{id}`
- Set TTL (7 days default)
- **Test:** Unit tests with mocked KV, verify key format and TTL

#### 5.3 Retrieve Logs Endpoint
- Create `GET /logs` endpoint (auth required)
- List recent events from KV
- Support `?limit=N` query param
- **Test:** Integration test with seeded KV data

#### 5.4 Retry Logic
- Create `src/http/retry.ts` with `withRetry(fn, attempts, delays)` wrapper
- Implement exponential backoff (1s, 5s, 30s)
- Track attempt count
- **Test:** Unit tests for retry behavior, backoff timing

#### 5.5 Clawdbot Client with Retry
- Wrap `forwardEvent` with retry logic
- Log each attempt
- Return final status after all retries exhausted
- **Test:** Integration test simulating failures then success

#### 5.6 Dead Letter Logging
- Log events that fail all retry attempts to KV
- Use key prefix `dead:` for dead letters
- Include error details and attempt history
- **Test:** Unit tests verify dead letter format

#### 5.7 Dead Letter Retrieval
- Create `GET /dead-letters` endpoint (auth required)
- List failed events for manual review
- Support marking as resolved
- **Test:** Integration test for retrieval and resolution

#### 5.8 Structured Logging
- Create `src/logging/logger.ts` with log levels (debug, info, warn, error)
- Include context (request ID, source, event type)
- Output JSON for CF logging integration
- **Test:** Unit tests verify log format

#### 5.9 Request ID Tracking
- Generate unique request ID for each incoming webhook
- Include in all logs for traceability
- Return in response headers (`X-Request-ID`)
- **Test:** Verify request ID propagation through handler chain

---

## Sprint 6: Configuration & Filtering
**Goal:** KV-based configuration for enabling/disabling sources and filtering events.
**Demo:** Update KV config → source disabled → webhooks rejected. Enable specific events only.

### Tasks

#### 6.1 Config KV Namespace
- Add `WEBHOOK_RELAY_CONFIG` KV namespace
- Define config schema TypeScript types
- **Validation:** Namespace created and bound

#### 6.2 Config Loader
- Create `src/config/loader.ts`
- Load config from KV on each request (with caching strategy)
- Provide typed access to config values
- Fallback to defaults if KV empty
- **Test:** Unit tests for loading, caching, defaults

#### 6.3 Source Enable/Disable
- Check `sources.<source>.enabled` before processing
- Return 503 for disabled sources
- **Test:** Integration test: disable source → webhook rejected

#### 6.4 Event Filtering
- Check `sources.<source>.events` array
- Support wildcards (e.g., `deployment.*`)
- Skip forwarding for filtered events (still accept webhook)
- **Test:** Unit tests for exact match, wildcard, no match

#### 6.5 Config Update Endpoint
- Create `PUT /config` endpoint (auth required)
- Validate config schema before storing
- Return updated config
- **Test:** Integration test for config update flow

#### 6.6 Config Validation
- Create `src/config/validator.ts` with JSON schema validation
- Reject invalid config with detailed errors
- **Test:** Unit tests for valid config, various invalid configs

#### 6.7 Admin Authentication
- Create `src/auth/admin.ts` for admin endpoint auth
- Check `Authorization: Bearer <ADMIN_SECRET>` header
- Add `ADMIN_SECRET` env var
- **Test:** Unit tests for valid token, invalid token, missing token

---

## Sprint 7: Rate Limiting & Security
**Goal:** Protect against abuse with rate limiting and enhanced security.
**Demo:** Exceed rate limit → 429 response. Invalid signatures tracked and alerted.

### Tasks

#### 7.1 Rate Limiter Design
- Create `src/security/rate-limiter.ts`
- Use CF's built-in rate limiting or KV-based counter
- Track by source IP
- **Test:** Unit tests for counter increment, limit check

#### 7.2 Rate Limit Middleware
- Add rate limit check before handler processing
- Return 429 with `Retry-After` header when exceeded
- Configure limit via env var (`RATE_LIMIT_PER_MIN`)
- **Test:** Integration test simulating rate limit breach

#### 7.3 Signature Failure Tracking
- Count signature failures per source IP
- Log excessive failures (potential attack)
- **Test:** Unit tests for failure counting

#### 7.4 IP Blocking
- Block IPs with excessive signature failures
- Store blocklist in KV with TTL
- Check blocklist before processing
- **Test:** Integration test for block trigger and enforcement

#### 7.5 Sensitive Data Scrubbing
- Create `src/security/scrubber.ts`
- Remove sensitive fields before logging (tokens, secrets, passwords)
- Configurable field list
- **Test:** Unit tests verify sensitive fields removed

#### 7.6 CORS Headers
- Add appropriate CORS headers for browser-based testing
- Restrict to known origins in production
- **Test:** Verify CORS headers in responses

---

## Sprint 8: Deployment & Production
**Goal:** Deploy to production with proper secrets management and monitoring.
**Demo:** Live webhook from GitHub → processed → TARS reacts in real-time.

### Tasks

#### 8.1 Wrangler Secrets Setup
- Document all required secrets
- Create `scripts/setup-secrets.sh` for secret provisioning
- **Validation:** All secrets configured in CF dashboard

#### 8.2 Production Wrangler Config
- Add production environment to wrangler.toml
- Configure custom domain/route
- Set up production KV namespaces
- **Validation:** `wrangler deploy --env production` succeeds

#### 8.3 CI/CD Pipeline
- Create `.github/workflows/deploy.yml`
- Run tests on PR
- Deploy to production on main merge
- **Validation:** GitHub Actions workflow passes

#### 8.4 Health Check Monitoring
- Add external health check (e.g., UptimeRobot, Checkly)
- Alert on health endpoint failure
- **Validation:** Monitoring configured and alerting works

#### 8.5 Error Alerting
- Configure CF Worker analytics
- Set up alerts for error rate spikes
- **Validation:** Test alert triggers correctly

#### 8.6 README Documentation
- Write comprehensive README with setup instructions
- Document all environment variables
- Include examples for testing each source
- **Validation:** Someone else can set up from README alone

#### 8.7 GitHub Webhook Configuration
- Document how to configure GitHub webhook pointing to relay
- Include required events selection
- Provide test webhook instructions
- **Validation:** Real GitHub webhook received and processed

#### 8.8 End-to-End Verification
- Trigger real webhook from each configured source
- Verify TARS receives and responds
- Document any issues found
- **Validation:** All sources working in production

---

## Summary

| Sprint | Tasks | Goal |
|--------|-------|------|
| 1. Foundation | 7 | Basic Worker with routing |
| 2. GitHub | 8 | GitHub webhook support |
| 3. Multi-Source | 10 | Stripe, Vercel, Custom handlers |
| 4. Clawdbot | 7 | Forward events to Clawdbot |
| 5. Reliability | 9 | Retry logic, logging |
| 6. Configuration | 7 | KV config, filtering |
| 7. Security | 6 | Rate limiting, protection |
| 8. Deployment | 8 | Production ready |

**Total: 62 atomic tasks**
