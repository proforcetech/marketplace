# Security Architecture -- Marketplace Platform

**Version:** 1.0
**Last Updated:** 2026-02-17
**Classification:** Internal -- Engineering

---

## Table of Contents

1. [Threat Model](#1-threat-model)
2. [Authentication & Authorization Architecture](#2-authentication--authorization-architecture)
3. [Anti-Spam & Anti-Fraud System Design](#3-anti-spam--anti-fraud-system-design)
4. [Content Moderation Pipeline](#4-content-moderation-pipeline)
5. [Data Privacy & Protection](#5-data-privacy--protection)
6. [API Security](#6-api-security)
7. [Infrastructure Security](#7-infrastructure-security)
8. [Stripe Integration Security](#8-stripe-integration-security)

---

## 1. Threat Model

### 1.1 Threat Actors

| Actor | Sophistication | Motivation | Examples |
|---|---|---|---|
| Opportunistic Scammer | Low | Financial gain | Fake listings, advance-fee fraud, counterfeit goods |
| Organized Fraud Ring | High | Scaled financial exploitation | Account farms, coordinated listing spam, payment fraud |
| Trafficking / Exploitation Operator | High | Criminal enterprise | Adult services fronting as legitimate listings, coded language, burner accounts |
| Spammer / SEO Abuser | Medium | Traffic generation | Link spam, keyword stuffing, listing-as-advertising |
| Credential Stuffer | Medium | Account takeover | Automated login attempts using breached credential databases |
| Data Harvester | Medium | PII collection / competitive intelligence | Scraping user data, listing data, pricing intelligence |
| Malicious Insider | High | Various | Admin abuse, data exfiltration, unauthorized access |
| Script Kiddie | Low | Disruption | XSS, SQL injection attempts, DDoS |

### 1.2 Threat Categories and Risk Assessment

Each threat is rated using a simplified CVSS-aligned model: Likelihood (1-5) x Impact (1-5) = Risk Score (1-25).

#### T1: Account Takeover / Credential Stuffing
- **Risk Score:** 20 (Likelihood: 4, Impact: 5)
- **Attack Surface:** Login endpoint, password reset, session tokens
- **Attack Vectors:**
  - Credential stuffing with breached password databases
  - Brute-force against weak passwords
  - Session hijacking via XSS or network interception
  - SIM swapping to intercept OTP codes
- **Impact:** Full account compromise, fraudulent listings under trusted identity, payment theft, reputation damage
- **Existing Controls Required:** Rate limiting on auth endpoints, bcrypt/argon2 password hashing, JWT rotation, device tracking, anomalous login detection

#### T2: Fake Listings / Scams
- **Risk Score:** 20 (Likelihood: 5, Impact: 4)
- **Attack Surface:** Listing creation, media upload, messaging
- **Attack Vectors:**
  - Non-existent items at attractive prices
  - Stolen photos from legitimate listings
  - Advance-fee schemes ("send deposit to hold")
  - Too-good-to-be-true pricing to lure victims
  - Hijacked legitimate accounts posting scam listings
- **Impact:** Financial loss for buyers, platform reputation damage, legal liability
- **Existing Controls Required:** Phone verification, progressive trust limits, image hash deduplication, price anomaly detection, seller verification badges

#### T3: Spam and Automated Abuse
- **Risk Score:** 16 (Likelihood: 4, Impact: 4)
- **Attack Surface:** Account registration, listing creation, messaging, search
- **Attack Vectors:**
  - Bot-driven mass account creation
  - Automated listing creation from templates
  - Message spam (phishing links, external platform redirects)
  - SEO spam via keyword-stuffed listings
- **Impact:** Degraded platform quality, user trust erosion, increased moderation costs
- **Existing Controls Required:** CAPTCHA, phone verification, rate limiting, device fingerprinting, behavioral analysis

#### T4: Adult Services / Trafficking (CRITICAL PRIORITY)
- **Risk Score:** 25 (Likelihood: 4, Impact: 5 -- regulatory, legal, moral)
- **Attack Surface:** Listing creation (services, housing, general), messaging, media uploads
- **Attack Vectors:**
  - Coded language in listing titles and descriptions ("roses," "donations," location-coded terms)
  - Posting in miscategorized sections (services, housing, community)
  - Rapid geographic rotation (same content posted in many cities)
  - Third-party contact info pushing (external messaging apps, phone numbers)
  - Reuse of known exploitative imagery
  - Multiple accounts per device/fingerprint with similar content
- **Impact:** Criminal liability under FOSTA-SESTA, platform shutdown, severe reputational damage, harm to victims
- **Existing Controls Required:** Multi-signal risk scoring, coded language detection, PhotoDNA-style image hashing, geographic anomaly detection, mandatory human review for flagged content, evidence preservation, law enforcement cooperation protocol
- **Regulatory Note:** Under FOSTA-SESTA (18 U.S.C. 2421A), platforms face criminal liability for knowingly facilitating sex trafficking. Proactive detection and swift enforcement are legally required, not optional.

#### T5: Payment Fraud
- **Risk Score:** 15 (Likelihood: 3, Impact: 5)
- **Attack Surface:** Stripe checkout (promoted listings), future Stripe Connect payouts
- **Attack Vectors:**
  - Stolen credit card use for promoted listings
  - Chargeback fraud after receiving service/goods
  - Stripe Connect payout manipulation (Phase 2+)
  - Price manipulation via API tampering
- **Impact:** Direct financial loss, Stripe account risk, increased processing fees
- **Existing Controls Required:** Stripe Radar, webhook signature verification, server-side price enforcement, velocity checks on purchases

#### T6: Data Exfiltration / Privacy Violations
- **Risk Score:** 16 (Likelihood: 4, Impact: 4)
- **Attack Surface:** API endpoints, user profiles, listing data, chat messages, location data
- **Attack Vectors:**
  - Bulk scraping of listings and user profiles
  - Unauthorized API access to PII
  - EXIF data leakage from uploaded images
  - Precise location exposure (exact address before trust established)
  - Chat data harvesting
- **Impact:** PII exposure, GDPR/CCPA violations, competitive intelligence loss, user safety risk (stalking)
- **Existing Controls Required:** EXIF stripping, location precision controls, API rate limiting, scraping detection, access controls on PII

#### T7: Injection & Client-Side Attacks (XSS, CSRF, SQLi)
- **Risk Score:** 12 (Likelihood: 3, Impact: 4)
- **Attack Surface:** All user input fields, listing content rendering, chat messages, search queries
- **Attack Vectors:**
  - Stored XSS via listing descriptions or chat messages
  - Reflected XSS via search parameters
  - SQL injection via search filters or listing fields
  - CSRF on state-changing operations
  - Template injection via server-side rendering
- **Impact:** Session hijacking, data theft, account takeover, defacement
- **Existing Controls Required:** Input validation, output encoding, parameterized queries (ORM), CSP headers, CSRF tokens, HttpOnly/Secure cookie flags

#### T8: API Abuse / Rate Limiting Bypass
- **Risk Score:** 12 (Likelihood: 4, Impact: 3)
- **Attack Surface:** All public API endpoints
- **Attack Vectors:**
  - Distributed requests across IPs to bypass per-IP rate limits
  - Token sharing/pooling for higher aggregate rates
  - Endpoint enumeration and fuzzing
  - GraphQL batching attacks (if applicable)
- **Impact:** Service degradation, increased infrastructure cost, data scraping enablement
- **Existing Controls Required:** Tiered rate limiting (IP + user + token), request fingerprinting, adaptive throttling, API key scoping

#### T9: Location Spoofing
- **Risk Score:** 9 (Likelihood: 3, Impact: 3)
- **Attack Surface:** Listing creation (location field), search (radius queries), "near me" feature
- **Attack Vectors:**
  - Manual coordinate injection via API
  - GPS spoofing on mobile devices
  - VPN/proxy to simulate different geographic presence
  - Listing in premium areas while actually located elsewhere
- **Impact:** Degraded search relevance, unfair competitive advantage, trust erosion
- **Existing Controls Required:** Server-side geocoding validation, IP-geolocation cross-reference, anomaly detection for rapid location changes, listing-to-IP proximity scoring

#### T10: Media-Based Attacks (Malicious Uploads)
- **Risk Score:** 12 (Likelihood: 3, Impact: 4)
- **Attack Surface:** Image upload, video upload, profile photo
- **Attack Vectors:**
  - Malware embedded in image metadata (polyglot files)
  - Server-side processing exploits (ImageMagick vulnerabilities, ffmpeg exploits)
  - Denial of service via decompression bombs (zip bombs in image formats)
  - CSAM or exploitative content upload
  - Steganographic data exfiltration
- **Impact:** Server compromise, malware distribution, legal liability (CSAM), service disruption
- **Existing Controls Required:** File type validation (magic bytes, not extension), image re-encoding (strip metadata and neutralize exploits), size limits, virus scanning, NSFW/CSAM detection, known-bad image hash matching

---

## 2. Authentication & Authorization Architecture

### 2.1 Authentication Flow

```
+------------------+     +------------------+     +------------------+
|   Client App     | --> |   Auth Service   | --> |   User Store     |
|  (React/Mobile)  |     |   (NestJS)       |     |  (PostgreSQL)    |
+------------------+     +------------------+     +------------------+
        |                        |
        |  1. Login (email+pw    |
        |     or phone+OTP)      |
        |----------------------->|
        |                        |  2. Validate credentials
        |                        |  3. Generate token pair
        |  4. Return {           |
        |    accessToken (15m),  |
        |    refreshToken (7d)   |
        |  }                     |
        |<-----------------------|
        |                        |
        |  5. API calls with     |
        |    Bearer accessToken  |
        |----------------------->|
        |                        |
        |  6. Refresh when       |
        |    access token        |
        |    expires             |
        |----------------------->|
        |                        |  7. Rotate refresh token
        |  8. New token pair     |     (invalidate old one)
        |<-----------------------|
```

### 2.2 JWT Access + Refresh Token Strategy

#### Access Token
- **Algorithm:** RS256 (asymmetric -- allows verification without exposing signing key)
- **Lifetime:** 15 minutes (short-lived to limit exposure window)
- **Payload Claims:**
  ```json
  {
    "sub": "user-uuid",
    "email": "user@example.com",
    "roles": ["user", "verified_seller"],
    "iat": 1708000000,
    "exp": 1708000900,
    "jti": "unique-token-id",
    "deviceId": "device-fingerprint-hash"
  }
  ```
- **Storage:** In-memory on client (never localStorage for web; secure memory on mobile)
- **Transmission:** `Authorization: Bearer <token>` header only

#### Refresh Token
- **Format:** Opaque random string (256-bit, base64url-encoded) -- NOT a JWT
- **Lifetime:** 7 days for web, 30 days for mobile (configurable)
- **Storage:**
  - Web: HttpOnly, Secure, SameSite=Strict cookie
  - Mobile: Secure enclave / Keychain (iOS) / Keystore (Android)
- **Server-Side Storage:** Hashed (SHA-256) in database with metadata:
  ```sql
  CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    device_id VARCHAR(255),
    device_name VARCHAR(255),
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    replaced_by UUID REFERENCES refresh_tokens(id)
  );
  CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
  CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;
  ```

#### Token Rotation
- Every refresh request issues a new refresh token and invalidates the old one
- **Reuse Detection:** If a revoked refresh token is presented, immediately revoke ALL tokens for that user (indicates token theft -- the legitimate user already rotated, so the attacker is replaying the old one)
- The `replaced_by` column enables tracing the rotation chain for forensics

### 2.3 Phone OTP Verification Flow (Twilio)

```
1. User requests OTP:
   POST /auth/otp/request { phone: "+1234567890" }

2. Server:
   a. Rate limit: max 3 OTP requests per phone per hour, max 5 per IP per hour
   b. Generate 6-digit code (cryptographically random, NOT Math.random)
   c. Store: { phone, code_hash: SHA256(code), attempts: 0, expires_at: NOW + 5min }
   d. Send via Twilio Verify API (preferred over raw SMS for deliverability + fraud protection)

3. User submits OTP:
   POST /auth/otp/verify { phone: "+1234567890", code: "123456" }

4. Server:
   a. Rate limit: max 5 verification attempts per code
   b. Lookup pending verification by phone
   c. Compare SHA256(submitted_code) with stored hash
   d. If match and not expired: mark phone verified, delete code record
   e. If failed: increment attempts counter, return generic error
   f. After 5 failed attempts: invalidate code, require new OTP request
```

**Security Controls:**
- OTP codes are hashed before storage (prevents database leak from exposing valid codes)
- Fixed-time comparison to prevent timing attacks
- Generic error messages ("Invalid or expired code") to prevent enumeration
- Twilio Verify API handles carrier-level fraud detection (toll fraud, SMS pumping)
- Phone number normalization to E.164 format before any operation

### 2.4 Session Management

#### Multi-Device Support
- Each device gets an independent refresh token
- Users can view active sessions: `GET /auth/sessions`
  ```json
  [
    {
      "id": "session-uuid",
      "deviceName": "iPhone 15 Pro",
      "lastActive": "2026-02-17T10:30:00Z",
      "ipAddress": "192.168.1.x",
      "location": "Austin, TX",
      "current": true
    }
  ]
  ```
- Users can revoke individual sessions: `DELETE /auth/sessions/:id`
- Users can revoke all other sessions: `POST /auth/sessions/revoke-others`

#### Session Revocation
- Admin-initiated: immediately revoke all tokens for a user (ban, security incident)
- Password change: revoke all sessions except current
- Suspicious activity detection: revoke and force re-authentication
- Implementation: revoked token JTIs stored in Redis with TTL matching token expiry (bounded memory)

### 2.5 Password Hashing

**Primary: Argon2id** (recommended by OWASP as of 2024)
- **Parameters:**
  - Memory: 64 MB (65536 KiB)
  - Iterations: 3
  - Parallelism: 4
  - Salt: 16 bytes (crypto.randomBytes)
  - Hash length: 32 bytes
- **Rationale:** Argon2id combines resistance to both GPU attacks (memory-hard) and side-channel attacks. The 64 MB memory parameter makes credential stuffing at scale prohibitively expensive.
- **Fallback:** bcrypt (cost factor 12) for environments where Argon2 is unavailable
- **Migration Strategy:** On successful login, if stored hash uses bcrypt, re-hash with Argon2id transparently

### 2.6 Account Recovery Flow

```
1. User requests recovery:
   POST /auth/recovery/request { email: "user@example.com" }
   - Always return 200 OK (prevent email enumeration)
   - If email exists: generate recovery token (32 bytes, crypto.randomBytes, base64url)
   - Store: { user_id, token_hash: SHA256(token), expires_at: NOW + 1hr, used: false }
   - Send email with reset link containing the raw token
   - Rate limit: max 3 recovery requests per email per hour

2. User submits new password:
   POST /auth/recovery/reset { token: "...", newPassword: "..." }
   - Validate token (hash and compare, check expiry, check not used)
   - Validate password strength (min 8 chars, check against top 100k breached passwords via k-anonymity HaveIBeenPwned API)
   - Hash new password with Argon2id
   - Mark recovery token as used
   - Revoke ALL existing sessions for the user
   - Send notification email: "Your password was changed"
   - Log security event
```

### 2.7 Role-Based Access Control (RBAC)

#### Role Hierarchy

| Role | Capabilities | Assignment |
|---|---|---|
| `user` | Browse, search, message, create listings (within trust limits), rate, report | Default on registration |
| `verified_seller` | All `user` + higher posting limits, verified badge, promo purchases, extended listing durations | Automatic upon Stripe Identity verification |
| `moderator` | All `user` + moderation queue access, listing actions (approve/reject/unlist), user warnings | Admin assignment |
| `admin` | All `moderator` + user management (ban/suspend), system configuration, audit log access, analytics | Admin assignment (requires 2FA) |
| `super_admin` | All `admin` + role management, admin creation, billing configuration, data export, destructive operations | Hardcoded seed, requires 2FA + approval |

#### Permission Model
```typescript
// Permissions are granular; roles are collections of permissions
enum Permission {
  // Listings
  LISTING_CREATE = 'listing:create',
  LISTING_EDIT_OWN = 'listing:edit:own',
  LISTING_DELETE_OWN = 'listing:delete:own',
  LISTING_EDIT_ANY = 'listing:edit:any',
  LISTING_DELETE_ANY = 'listing:delete:any',
  LISTING_APPROVE = 'listing:approve',
  LISTING_REJECT = 'listing:reject',

  // Users
  USER_VIEW_PROFILE = 'user:view:profile',
  USER_EDIT_OWN = 'user:edit:own',
  USER_BAN = 'user:ban',
  USER_SUSPEND = 'user:suspend',
  USER_SHADOW_BAN = 'user:shadow_ban',
  USER_VIEW_PII = 'user:view:pii',
  USER_MANAGE_ROLES = 'user:manage:roles',

  // Messaging
  MESSAGE_SEND = 'message:send',
  MESSAGE_VIEW_ANY = 'message:view:any',

  // Moderation
  MOD_QUEUE_VIEW = 'mod:queue:view',
  MOD_QUEUE_ACTION = 'mod:queue:action',
  MOD_REPORTS_VIEW = 'mod:reports:view',

  // Admin
  ADMIN_AUDIT_LOG = 'admin:audit_log',
  ADMIN_ANALYTICS = 'admin:analytics',
  ADMIN_CONFIG = 'admin:config',
  ADMIN_DATA_EXPORT = 'admin:data_export',
}
```

#### Enforcement Points
- **Guard-level:** `@Roles('admin')` decorator on controller methods (see `roles.guard.ts`)
- **Service-level:** Ownership checks within business logic (e.g., can only edit own listing unless `LISTING_EDIT_ANY`)
- **Query-level:** Database queries scoped to user's access level (e.g., shadow-banned users' listings excluded for non-admins)

### 2.8 API Key Management for Internal Services

- Internal services (media processor, notification worker, moderation pipeline) authenticate via HMAC-signed requests, not user JWTs
- Each service has a unique API key pair (key ID + secret)
- Keys are rotated on a 90-day schedule
- Request signing: `HMAC-SHA256(method + path + timestamp + body_hash, secret)`
- Timestamp validation: reject requests older than 5 minutes (replay protection)
- Keys are stored in a secrets manager (AWS Secrets Manager / HashiCorp Vault), never in code or environment variables in production

---

## 3. Anti-Spam & Anti-Fraud System Design

### 3.1 Prevention Layer

#### Progressive Trust System

Trust levels are based on account age, verification status, and behavioral history. Limits increase automatically as trust is earned.

| Trust Level | Criteria | Daily Listing Limit | Daily Message Limit | Media Upload Limit | Can Purchase Promos |
|---|---|---|---|---|---|
| 0 -- New | < 24h, no phone verify | 0 (cannot post) | 5 | 3 images | No |
| 1 -- Basic | Phone verified, < 7 days | 1 | 25 | 10 images | No |
| 2 -- Established | Phone verified, 7+ days, 0 active bans | 3 | 100 | 30 images | Yes |
| 3 -- Trusted | 30+ days, 3+ completed transactions, rating >= 4.0 | 10 | 500 | 100 images | Yes |
| 4 -- Verified | Stripe Identity verified | 25 | 1000 | 250 images | Yes |
| 5 -- Pro | Verified + subscription (Phase 2) | 100 | 5000 | 1000 images | Yes |

Trust levels can be demoted based on:
- Receiving 3+ reports in a 7-day window (drop 1 level, pending review)
- Listing removal by moderator (drop 1 level)
- Shadow-ban or suspension (drop to level 0)

#### Phone Verification Requirement
- **Hard gate:** No listing creation without verified phone number
- **Soft gate:** Messaging limited to 5/day without phone verification
- One phone number per account (check for existing associations)
- Recently-banned phone numbers are blocked for 90 days
- VOIP numbers flagged for additional scrutiny (not blocked outright, as some legitimate users use them)

#### CAPTCHA Strategy
CAPTCHA is triggered dynamically, not shown to every user. Triggers include:
- Registration from flagged IP ranges (VPN, datacenter, Tor exit nodes)
- 3+ failed login attempts
- Posting velocity exceeding 2x normal for trust level
- Device fingerprint associated with previously banned accounts
- Automated behavior signals (impossibly fast form completion, lack of mouse movement on web)

**Implementation:** hCaptcha (preferred over reCAPTCHA for privacy) with invisible mode for low-risk users and challenge mode for flagged users.

#### Rate Limiting Strategy

Implemented at multiple layers:

| Endpoint Category | Anonymous | Authenticated (L0-L1) | Authenticated (L2+) | Verified (L4+) | Admin |
|---|---|---|---|---|---|
| Auth (login/register) | 5/min per IP | N/A | N/A | N/A | N/A |
| Auth (OTP request) | 3/hr per phone | N/A | N/A | N/A | N/A |
| Search / Browse | 30/min per IP | 60/min | 120/min | 300/min | Unlimited |
| Listing Create | Blocked | 1/hr | 3/hr | 10/hr | Unlimited |
| Listing Update | Blocked | 5/hr | 15/hr | 30/hr | Unlimited |
| Message Send | Blocked | 5/hr | 30/hr | 100/hr | Unlimited |
| Media Upload | Blocked | 3/hr | 10/hr | 25/hr | Unlimited |
| Report | 5/hr per IP | 10/hr | 10/hr | 10/hr | Unlimited |
| Admin APIs | Blocked | Blocked | Blocked | Blocked | 300/min |

**Implementation:** Redis-backed sliding window counters (see `throttle.guard.ts`). Key format: `rl:{endpoint_category}:{user_id_or_ip}:{window}`.

#### Form Constraints & Prohibited Patterns
- Listing descriptions: max 5000 characters, strip HTML tags, block raw URLs in first listing (trust level 0-1)
- Phone numbers in listing body: detected and redacted for trust levels 0-2 (push to in-app messaging)
- External messaging app references (WhatsApp, Telegram, Signal usernames): flagged for review
- Short URL services (bit.ly, tinyurl): blocked in all user-generated content
- Duplicate content: fuzzy hash (simhash) comparison against recent listings; reject if similarity > 90%

### 3.2 Detection Layer

#### Risk Scoring Model

Every listing and account maintains a dynamic risk score (0-100). Scores above thresholds trigger automated actions.

##### Account-Level Signals

| Signal | Weight | Description |
|---|---|---|
| Account Age | -5 to +0 | Accounts < 48h: +5 risk. Logarithmic decay to 0 at 30 days |
| Phone Verification | -10 | Verified phone reduces risk by 10 |
| Stripe Identity Verified | -15 | Identity verification reduces risk by 15 |
| Email Domain | 0 to +5 | Disposable email domains: +5 |
| Posting Velocity | 0 to +20 | Posts per hour relative to trust level norm. Exceeding 2x: +10, 5x: +20 |
| Report Count (7d) | 0 to +25 | 1 report: +5, 2: +10, 3+: +25 |
| Device Fingerprint Reuse | 0 to +20 | Shared with banned account: +20, with flagged: +10 |
| VPN/Proxy Detection | 0 to +10 | Known datacenter IP: +10, residential VPN: +5 |
| Geographic Anomaly | 0 to +15 | Listing in city X but IP in city Y (>500mi): +10, different country: +15 |
| Message Behavior | 0 to +15 | High outbound, low reply rate: +10, copy-paste detected: +15 |

##### Listing-Level Signals

| Signal | Weight | Description |
|---|---|---|
| Text Similarity | 0 to +20 | Simhash similarity > 80% with another listing from different account: +15, same account: +10 |
| Prohibited Keywords | 0 to +25 | Direct match: +25 (auto-hold), fuzzy match: +15 |
| Coded Language Patterns | 0 to +20 | Known euphemism patterns (maintained list): +20 |
| Price Anomaly | 0 to +15 | Price < 30% of category median (same condition/area): +15 |
| Template Detection | 0 to +10 | Matches known spam template structure: +10 |
| Media Hash Match | 0 to +25 | Matches known-bad image hash: +25 (auto-reject) |
| NSFW Score | 0 to +25 | ML classifier output > 0.8: +25 (auto-hold), > 0.95: auto-reject |
| Contact Info in Text | 0 to +10 | Phone/email/external app reference detected: +5 to +10 depending on trust level |

##### Score Thresholds

| Score Range | Action |
|---|---|
| 0-20 | Auto-approve (standard publishing flow) |
| 21-45 | Auto-approve with async review flag (human reviews within 4 hours) |
| 46-65 | Hold for manual review before publishing |
| 66-85 | Auto-reject with notification to user, escalated review |
| 86-100 | Auto-reject, account flagged for immediate admin review, evidence preserved |

#### Content Analysis Pipeline

##### Prohibited Keyword System
- **Exact match list:** Maintained in database, cached in Redis, refreshed every 5 minutes
- **Fuzzy matching:** Levenshtein distance <= 2 for keywords > 5 characters; catches common evasion (l33tspeak, character substitution)
- **Obfuscation handling:**
  - Unicode normalization (NFKC) before matching
  - Homoglyph resolution (Cyrillic "a" to Latin "a", etc.)
  - Whitespace/zero-width character stripping
  - Character repetition collapsing ("seeeervices" -> "services")
- **Category-specific keyword sets:** Different prohibited terms for housing (fair housing violations), automotive (title washing terms), services (adult service euphemisms)
- **Performance:** Keywords compiled into Aho-Corasick automaton for O(n) multi-pattern matching against input text length, rebuilt on keyword list update

##### Price Anomaly Detection
- Maintain rolling 30-day median prices per category + subcategory + condition + metro area
- Flag listings priced below 30% of median (scam signal) or above 300% of median (potential money laundering)
- Automotive: cross-reference against KBB/NADA ranges if VIN decode is available (Phase 2)

##### Image Hash Matching
- **Perceptual hashing:** pHash for each uploaded image, stored in a search index
- **Known-bad database:** Integration point for NCMEC/PhotoDNA (for CSAM), plus internal database of images from previously removed listings
- **Near-duplicate detection:** Hamming distance <= 8 on pHash indicates near-duplicate, flagged if source listing was removed for policy violation
- **Performance:** pHash comparison is O(1) per image against bloom filter pre-check, with full hamming distance search only on bloom filter hit

##### Coded Language Detection
- Pattern-based rules (regex + NLP):
  - Rose/flower emoji + dollar amounts
  - Time-based pricing ("per hour," "hourly rates" in non-service categories)
  - Age-related terms in service listings
  - Hotel/motel references in service listings
  - "Incall/outcall" terminology
  - Excessive use of abbreviations common in exploitation contexts
- ML classifier (Phase 2): trained on labeled moderation data
- Patterns are reviewed monthly and updated based on evolving evasion tactics

#### Behavioral Analysis

##### Copy-Paste Message Detection
- Compute simhash of each outbound message
- If 5+ messages within 1 hour have simhash similarity > 90%, flag account for review
- Exclude common short messages ("Is this still available?", "What's the lowest price?") from analysis via an allowlist

##### Rapid-Fire Posting Detection
- Track posting intervals per account
- If 3+ listings created within 10 minutes, require CAPTCHA for next listing
- If 5+ listings within 30 minutes regardless of trust level, hold all for review

##### Low Reply Rate + High Outbound Volume
- Track: outbound_messages / unique_conversations_initiated ratio
- If > 20 conversations initiated in 24h with < 10% reply rate, flag for review
- Strong signal for spam/scam when combined with new account status

### 3.3 Response Layer

#### Moderation Queue Design

```
+------------------------------------------------------------------+
|  MODERATION QUEUE                                    Filter: All  |
+------------------------------------------------------------------+
|  Priority | Listing            | Risk Score | Signals    | Time  |
|-----------|---------------------|------------|------------|-------|
|  URGENT   | "Relaxation Svcs"  | 82         | T4,KW,GEO  | 2m   |
|  HIGH     | "iPhone 15 $50"    | 68         | PRICE,NEW   | 15m  |
|  MEDIUM   | "2019 Honda Civic"  | 48         | SIMHASH     | 1h   |
|  LOW      | "Dining Table"      | 32         | ASYNC_FLAG  | 3h   |
+------------------------------------------------------------------+
|  [Approve] [Request Changes] [Reject] [Ban User] [Shadow-Ban]   |
|  [View User History] [View Similar Listings] [Escalate]          |
+------------------------------------------------------------------+
```

Each queue item shows:
- Listing snapshot (title, description, images, category, price)
- Highlighted matched signals (which keywords, which rules triggered)
- Account summary (age, trust level, verification status, previous actions)
- Geographic context (IP location vs listing location)
- Related listings from same account or device fingerprint

#### Action Ladder

| Level | Action | Trigger | User-Facing | Duration |
|---|---|---|---|---|
| 1 | Warning | First minor violation | "Your listing was removed because..." | N/A |
| 2 | Restrict | 2nd violation within 30d | Posting limit reduced to 1/day, messages limited | 7 days |
| 3 | Shadow-Ban | Repeated violations or high-risk signals | User appears normal but listings hidden from others | Until review |
| 4 | Suspend | Serious violation or 3+ warnings in 90d | "Your account has been suspended" | 30 days (appealable) |
| 5 | Permanent Ban | T4 violations, fraud confirmed, legal requirement | "Your account has been permanently disabled" | Permanent |

**Shadow-Ban Implementation:**
- User can still create listings and send messages
- Listings are not indexed in search or visible to other users
- Messages are not delivered to recipients
- No indication to the user that they are shadow-banned (prevents creating new account and changing behavior)
- Admin must explicitly lift shadow-ban

#### Evidence Preservation
- When a listing is removed for T4 (trafficking/exploitation) or T5 (fraud) reasons:
  - Full listing content (text + media) is archived to a compliance-only storage bucket
  - Chat message threads involving the listing are preserved
  - Account metadata snapshot (registration info, IP history, device fingerprints)
  - Moderation action log (who flagged, what signals, what action taken)
  - Retention: 7 years minimum (per FOSTA-SESTA compliance guidance)
- Access to compliance archive requires `super_admin` role + audit log entry

#### Appeal Process
1. User submits appeal via in-app form (available for suspensions and listing removals)
2. Appeal enters a separate queue reviewed by senior moderators (not the original moderator)
3. Reviewer sees: original content, signals, original moderator's decision, user's appeal text
4. Outcome: reinstate, uphold, or escalate to admin
5. User notified of outcome within 48 hours
6. Each user gets max 1 appeal per action

---

## 4. Content Moderation Pipeline

### 4.1 Pre-Publish Automated Checks

Every listing submission goes through this pipeline before becoming visible:

```
User submits listing
        |
        v
[1. Input Validation]     -- Schema validation, field constraints
        |
        v
[2. Text Analysis]        -- Prohibited keywords, coded language, contact info extraction
        |
        v
[3. Price Analysis]       -- Anomaly detection against category medians
        |
        v
[4. Media Analysis]       -- NSFW detection, known-bad hash, EXIF strip, re-encode
        |
        v
[5. Account Risk Check]   -- Current trust level, recent history, device fingerprint
        |
        v
[6. Risk Score Calc]      -- Aggregate all signals into composite score
        |
        v
[7. Routing Decision]     -- Auto-approve / Hold / Reject based on thresholds
        |                     |                    |
        v                     v                    v
    [Publish]         [Moderation Queue]    [Reject + Notify]
```

**Performance Target:** Steps 1-6 complete within 2 seconds for text, 5 seconds including media analysis. Media analysis can be async (listing enters "processing" state briefly).

### 4.2 Risk Score Thresholds

| Outcome | Score Range | User Experience |
|---|---|---|
| Auto-Approve | 0-20 | Listing goes live immediately |
| Approve + Async Review | 21-45 | Listing goes live, queued for human review within 4 hours |
| Hold for Review | 46-65 | "Your listing is being reviewed" (target: review within 2 hours) |
| Auto-Reject | 66-85 | "Your listing could not be published. Reason: [policy reference]" |
| Auto-Reject + Escalate | 86-100 | Rejected, account flagged, admin notified |

### 4.3 Manual Review Queue

**Moderator Interface Features:**
- One-click actions: Approve, Reject, Request Changes, Ban User
- Side-by-side view: listing content vs matched policy rules
- Account history panel: previous listings, moderation actions, reports
- Similar listings panel: other listings from same device/IP/text similarity
- Decision shortcuts: keyboard shortcuts for rapid triage (a=approve, r=reject, etc.)
- Quality control: 5% of auto-approved listings randomly sampled for human review

### 4.4 Media Scanning

#### Image Pipeline
1. **Upload:** Client-side resize to max 2048px on longest edge (reduces bandwidth)
2. **Validation:** Server checks magic bytes (JPEG, PNG, WebP, HEIC only), rejects mismatched extension+content
3. **Re-encoding:** Image is decoded and re-encoded as WebP (strips metadata, neutralizes embedded exploits)
4. **EXIF Strip:** Explicitly strip all EXIF data before re-encoding (belt and suspenders with re-encode)
5. **Perceptual Hash:** Generate pHash, compare against known-bad database
6. **NSFW Detection:** ML classifier (AWS Rekognition or open-source model) scores image 0.0-1.0
   - < 0.3: Pass
   - 0.3-0.8: Flag for human review
   - > 0.8: Auto-reject
7. **Virus Scan:** ClamAV scan on original upload before processing
8. **Storage:** Only the re-encoded image is stored; original is discarded after processing

#### Video Pipeline (Phase 2)
- Frame extraction at 1fps for first 30 seconds
- Each frame through image pipeline (NSFW, hash matching)
- Audio transcription for keyword detection
- Max duration: 60 seconds, max size: 100MB

### 4.5 Category-Specific Rules

#### Housing -- Fair Housing Compliance
Housing listings are additionally scanned for Fair Housing Act violations:
- Prohibited discriminatory terms: race, religion, national origin, familial status, disability references that indicate preference or exclusion
- Required: listings must not exclude protected classes
- Flag: "no children," "Christian household," "English speakers only" (these may violate FHA)
- All flagged housing listings require human review regardless of risk score

#### Automotive -- VIN Checks (Phase 2)
- If VIN provided: decode via NHTSA API, cross-reference with listing details
- Mismatch between decoded VIN (year, make, model) and listed details: flag for review
- Future: check against stolen vehicle databases (NICB)

---

## 5. Data Privacy & Protection

### 5.1 PII Handling Strategy

#### Data Classification

| Classification | Examples | Encryption at Rest | Access Control | Logging |
|---|---|---|---|---|
| **Critical** | Passwords, payment tokens, recovery tokens | Argon2id / SHA-256 (hashed, not encrypted) | Auth service only | Never logged |
| **Sensitive** | Email, phone, real name, address, IP, device fingerprint | AES-256-GCM (application-level) | Owner + admin with audit | Masked in logs |
| **Internal** | User ID, trust level, risk scores, moderation decisions | Database encryption (TDE) | Service-level access | Logged with context |
| **Public** | Display name, listing content, ratings, profile photo | Database encryption (TDE) | Public API | Standard logging |

#### Application-Level Encryption for Sensitive Fields
- Sensitive PII fields (email, phone, legal name) are encrypted at the application layer using AES-256-GCM before database storage
- Encryption key stored in secrets manager, rotated annually
- Encrypted fields use a key version identifier to support rotation without re-encrypting all data immediately
- Searchable encrypted fields: use blind index (HMAC-SHA256 of normalized value) for equality lookups
  ```
  email_encrypted: AES-256-GCM(email)
  email_blind_index: HMAC-SHA256(normalize(email), index_key)
  ```

### 5.2 EXIF Stripping

- All uploaded images have EXIF data stripped before storage (see Section 4.4)
- This includes GPS coordinates, camera model, timestamps, and all other metadata
- Re-encoding to WebP inherently strips EXIF, but explicit stripping is performed first as defense in depth
- No EXIF data is stored or logged (not even for internal use)

### 5.3 Location Precision Controls

| Context | Precision | Rationale |
|---|---|---|
| Listing display (not contacted) | City/neighborhood level (~1 mile radius) | Prevent exact location tracking before trust established |
| Listing display (after contact) | Street level (~0.1 mile) | Allow reasonable proximity assessment |
| Search/distance calculation | Exact coordinates (server-side only) | Accurate distance sorting, but exact coords never sent to client |
| Map view pins | Jittered (random offset within 0.5 mile) | Visual proximity without exact location |
| User profile | City only | Protect residential privacy |
| Admin view | Exact (with audit log) | Necessary for fraud investigation |

**Implementation:**
- `listings` table stores exact `POINT` geometry for PostGIS queries
- API responses include only the precision-appropriate representation
- Client never receives exact coordinates for other users' listings
- Jittering is deterministic per listing (seeded random based on listing ID) so pins don't jump on refresh

### 5.4 Data Retention Policies

| Data Type | Retention Period | Deletion Method |
|---|---|---|
| Active account data | While account is active | N/A |
| Deleted account data | 30 days post-deletion request (grace period) | Hard delete + anonymize references |
| Chat messages | 1 year after last message in thread | Soft delete, then hard delete at 1 year |
| Listing content (active) | While listing is active | N/A |
| Listing content (expired/sold) | 90 days after expiry | Soft delete, then hard delete |
| Moderation evidence (standard) | 2 years | Hard delete |
| Moderation evidence (T4/trafficking) | 7 years | Hard delete (legal hold override possible) |
| Server logs | 90 days | Automatic rotation and deletion |
| Analytics events | 2 years (anonymized after 90 days) | Anonymization then deletion |
| Refresh tokens | 30 days after expiry | Hard delete |
| Audit logs | 3 years | Archived to cold storage, then deleted |

### 5.5 GDPR/CCPA Compliance

#### Right to Access (Data Export)
- `GET /user/data-export` -- triggers async job
- Generates JSON/ZIP archive of all user data within 72 hours
- Includes: profile, listings, messages, ratings, moderation history (user's perspective)
- Excludes: risk scores, internal moderation notes, other users' data
- Download link sent via email, valid for 7 days

#### Right to Deletion
- `DELETE /user/account` -- triggers deletion pipeline
- Immediate: account deactivated, removed from search, sessions revoked
- 30-day grace period: user can reactivate by logging in
- After 30 days:
  - PII hard deleted (name, email, phone, address, IP logs)
  - Listings anonymized ("Deleted User") or removed
  - Chat messages: sender reference anonymized, content retained for context if other party hasn't deleted
  - Ratings: anonymized but score preserved for integrity
  - Audit logs: user ID retained but PII removed
- Exception: data under legal hold (T4 investigations) is not deleted until hold is lifted

#### Right to Rectification
- Users can update their profile data at any time
- Changes to verified fields (email, phone) require re-verification

#### Data Processing Consent
- Clear consent captured at registration (not buried in ToS)
- Separate consent for: marketing emails, push notifications, analytics
- Consent records stored with timestamp and version of terms

### 5.6 Chat Data Handling

- Messages encrypted in transit (TLS 1.3)
- Messages stored encrypted at rest (database TDE + application-level encryption for message body)
- Chat history accessible only to participants + admin (with audit)
- Messages from blocked users are hidden but retained for potential reporting
- Automated safety messages (injected by system in high-risk contexts) are clearly labeled and cannot be modified

---

## 6. API Security

### 6.1 Input Validation Strategy

#### Per-Endpoint Schema Validation
- Every endpoint has a DTO (Data Transfer Object) validated by `class-validator` before reaching the handler
- Validation runs in a global `ValidationPipe` (see `validation.pipe.ts`)
- Strategy: whitelist properties (strip unknown fields), transform types, reject on first error
- Nested object validation supported via `@ValidateNested()`

#### Example Schema (Listing Creation)
```typescript
class CreateListingDto {
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-zA-Z0-9\s\-\.,!?']+$/)  // Restrict to safe characters
  title: string;

  @IsString()
  @Length(10, 5000)
  description: string;

  @IsNumber()
  @Min(0)
  @Max(10000000)
  price: number;

  @IsEnum(PriceType)
  priceType: PriceType;

  @IsEnum(ListingCategory)
  category: ListingCategory;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  mediaIds?: string[];
}
```

### 6.2 Rate Limiting Tiers

See Section 3.1 for the full rate limiting table. Implementation details:

- **Algorithm:** Sliding window counter (Redis MULTI/EXEC for atomicity)
- **Key structure:** `rl:{category}:{identifier}:{window_start}`
- **Identifiers:**
  - Anonymous: IP address (with /24 subnet grouping for distributed attacks)
  - Authenticated: user ID (primary) + IP (secondary)
- **Response headers:**
  ```
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 45
  X-RateLimit-Reset: 1708001000
  Retry-After: 30  (only on 429 responses)
  ```
- **429 response body:**
  ```json
  {
    "statusCode": 429,
    "message": "Rate limit exceeded. Try again in 30 seconds.",
    "retryAfter": 30
  }
  ```

### 6.3 CORS Configuration

```typescript
const corsOptions = {
  origin: [
    'https://marketplace.example.com',      // Production web
    'https://admin.marketplace.example.com', // Admin panel
    // Development origins only in non-production:
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://localhost:3001']
      : []),
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 24 hours preflight cache
};
```

**Important:** CORS is NOT a security boundary for mobile apps (which don't enforce CORS). Server-side authentication and authorization are the real controls.

### 6.4 Request Signing for Internal Services

```
Signature = HMAC-SHA256(
  key = service_secret,
  message = HTTP_METHOD + "\n" +
            PATH + "\n" +
            TIMESTAMP + "\n" +
            SHA256(BODY)
)

Headers:
  X-Service-Key-Id: <key_id>
  X-Timestamp: <unix_timestamp>
  X-Signature: <base64(signature)>
```

Validation:
1. Check `X-Timestamp` is within +/- 300 seconds of server time
2. Look up service secret by `X-Service-Key-Id`
3. Recompute signature and compare using constant-time comparison
4. Reject if any check fails

### 6.5 File Upload Security

| Control | Implementation |
|---|---|
| File type validation | Check magic bytes (first 8 bytes), not file extension |
| Allowed types | JPEG, PNG, WebP, HEIC (images); MP4, MOV (video Phase 2) |
| Max file size | 10 MB per image, 100 MB per video |
| Max files per request | 5 |
| Filename sanitization | Generate UUID filename, ignore original filename entirely |
| Storage path | Never user-controlled; `uploads/{type}/{date}/{uuid}.{ext}` |
| Virus scan | ClamAV on raw upload before any processing |
| Processing | Re-encode all images (strips embedded exploits) |
| Serving | Serve from CDN with `Content-Disposition: inline`, `X-Content-Type-Options: nosniff` |
| Direct upload | Pre-signed S3 URLs for upload (client -> S3 directly, bypassing API server for large files) |

### 6.6 SQL Injection Prevention

- **Primary defense:** TypeORM with parameterized queries (all query builder and repository methods use parameter binding)
- **Prohibition:** Raw SQL queries (`query()`) are banned in code review. If absolutely necessary, require security review sign-off and mandatory parameter binding
- **ORM configuration:** `synchronize: false` in production (schema changes only via migrations)
- **Database user permissions:** Application database user has no DDL permissions (cannot CREATE, ALTER, DROP)
- **Query logging:** Log slow queries (> 1s) but never log query parameters containing user input

### 6.7 XSS Prevention

- **Output encoding:** All user-generated content is HTML-encoded before rendering
- **Content Security Policy (CSP):**
  ```
  Content-Security-Policy:
    default-src 'self';
    script-src 'self' 'nonce-{random}';
    style-src 'self' 'unsafe-inline';
    img-src 'self' https://cdn.marketplace.example.com data:;
    font-src 'self';
    connect-src 'self' https://api.marketplace.example.com wss://ws.marketplace.example.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  ```
- **Additional headers:**
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 0  (deprecated, CSP is the real control; setting to 0 avoids XSS auditor bugs)
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(self)
  ```
- **Input sanitization:** Strip HTML tags from text fields at the API boundary (see `sanitize.interceptor.ts`)
- **Rich text:** If ever needed, use DOMPurify with a strict allowlist (no `<script>`, `<iframe>`, `<object>`, event handlers)

---

## 7. Infrastructure Security

### 7.1 Secrets Management

#### Development
- `.env` files for local development (never committed -- enforced via `.gitignore`)
- `.env.example` with placeholder values (committed, documents required variables)
- Developers receive secrets via a secure channel (1Password, Vault), never Slack/email

#### Staging / Production
- Secrets stored in AWS Secrets Manager (or HashiCorp Vault)
- Injected as environment variables at container startup (not baked into images)
- Secret rotation schedule:
  - Database credentials: 90 days
  - API keys (Stripe, Twilio, etc.): 180 days
  - JWT signing keys: annual (with overlap period for graceful rotation)
  - Internal service keys: 90 days
- No secrets in:
  - Source code (scan with `gitleaks` in CI/CD pipeline)
  - Docker images (multi-stage builds, no .env COPY)
  - Logs (sanitize all log output)
  - Error responses (generic errors to clients)

### 7.2 Network Security

#### VPC Architecture
```
+--------------------------------------------------+
|  VPC (10.0.0.0/16)                               |
|                                                    |
|  +-------------------+  +----------------------+  |
|  | Public Subnets     |  | Private Subnets      |  |
|  | (10.0.1.0/24,      |  | (10.0.10.0/24,       |  |
|  |  10.0.2.0/24)      |  |  10.0.20.0/24)       |  |
|  |                     |  |                      |  |
|  | - ALB               |  | - API containers     |  |
|  | - NAT Gateway       |  | - Worker containers  |  |
|  |                     |  | - Redis              |  |
|  +-------------------+  +----------------------+  |
|                                                    |
|  +----------------------------------------------+ |
|  | Isolated Subnets (10.0.100.0/24, .200.0/24)  | |
|  | - PostgreSQL (RDS)                            | |
|  | - No internet access                          | |
|  +----------------------------------------------+ |
+--------------------------------------------------+
```

#### Security Groups
- **ALB:** Inbound 443 (HTTPS) from 0.0.0.0/0, outbound to API containers on service port
- **API containers:** Inbound from ALB SG only, outbound to Redis/DB SGs and internet (via NAT for external APIs)
- **Redis:** Inbound from API/Worker SGs only, no internet
- **PostgreSQL:** Inbound from API/Worker SGs only, no internet, no public IP
- **Bastion (if needed):** Inbound SSH from allowlisted IPs only, outbound to private subnets

### 7.3 Logging and Monitoring

#### Security Event Logging
All security-relevant events are logged to a structured logging system (JSON format -> CloudWatch / ELK):

| Event | Severity | Data Logged | Data NOT Logged |
|---|---|---|---|
| Login success | INFO | user_id, IP, device, timestamp | password |
| Login failure | WARN | attempted_email (hashed), IP, failure_reason | password, full email |
| Token refresh | INFO | user_id, device, old_jti | token values |
| Refresh token reuse detected | CRITICAL | user_id, all_session_info | token values |
| Password change | WARN | user_id, IP | old/new password |
| Account lockout | WARN | user_id, IP, lockout_reason | |
| Listing moderation action | INFO | listing_id, moderator_id, action, signals | |
| Admin action on user | WARN | target_user_id, admin_id, action | |
| Rate limit exceeded | WARN | IP, user_id (if auth), endpoint, limit | |
| File upload rejection | WARN | user_id, file_type, rejection_reason | file content |
| Permission denied | WARN | user_id, resource, attempted_action | |
| Suspicious activity flag | WARN | user_id, signals, risk_score | |

#### Monitoring Alerts

| Alert | Condition | Severity | Response |
|---|---|---|---|
| Credential stuffing suspected | > 50 failed logins from single IP in 5 min | HIGH | Auto-block IP, notify on-call |
| Token reuse detected | Any refresh token reuse event | CRITICAL | Revoke all user sessions, notify user |
| Elevated moderation queue | Queue > 100 items for > 1 hour | MEDIUM | Notify moderation team |
| Error rate spike | 5xx rate > 5% for 5 minutes | HIGH | Notify on-call engineering |
| Database connection exhaustion | Active connections > 80% of pool | HIGH | Auto-scale, notify on-call |
| Suspicious admin activity | Admin accessing > 50 user PII records in 1 hour | HIGH | Notify super_admin |

### 7.4 Incident Response Plan Outline

#### Severity Levels

| Level | Description | Response Time | Examples |
|---|---|---|---|
| SEV1 | Active exploitation, data breach, platform down | 15 minutes | SQL injection being exploited, credential database leaked |
| SEV2 | Vulnerability discovered, localized outage | 1 hour | XSS vulnerability found, single service down |
| SEV3 | Security misconfiguration, potential vulnerability | 24 hours | Overly permissive CORS, missing rate limit on endpoint |
| SEV4 | Security improvement, best practice gap | Next sprint | Dependency update needed, logging gap |

#### Response Procedure (SEV1/SEV2)

1. **Detect:** Automated monitoring alert or manual report
2. **Triage:** On-call engineer assesses severity and scope within 15 minutes
3. **Contain:** Isolate affected systems (e.g., block attacking IP, disable compromised endpoint, revoke sessions)
4. **Communicate:** Notify stakeholders (engineering lead, security, legal if data breach)
5. **Investigate:** Determine root cause, scope of impact, data affected
6. **Remediate:** Deploy fix, verify resolution
7. **Recover:** Restore affected services, reset compromised credentials
8. **Post-Mortem:** Document timeline, root cause, lessons learned, action items (within 72 hours)

#### Data Breach Notification
- GDPR: 72-hour notification to supervisory authority, "without undue delay" to affected users
- CCPA: "Most expedient time possible" notification
- Notification includes: what data was affected, what happened, what we're doing, what users should do

---

## 8. Stripe Integration Security

### 8.1 Webhook Signature Verification

All Stripe webhooks MUST be verified using the webhook signing secret:

```typescript
import Stripe from 'stripe';

function verifyStripeWebhook(
  rawBody: Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event {
  // Stripe's library uses timing-safe comparison internally
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
```

**Critical implementation details:**
- Use the raw request body (Buffer), not parsed JSON (parsing may alter field ordering)
- Webhook endpoint must be excluded from body-parsing middleware
- Each webhook endpoint has its own signing secret (don't reuse across environments)
- Verify the event type matches expected types for the endpoint
- Idempotency: use `event.id` to deduplicate (webhook retries can deliver duplicates)
- Process webhooks asynchronously (return 200 immediately, queue event for processing)

### 8.2 PCI Compliance Approach

**Strategy: SAQ A (Stripe.js + Elements)**

The platform NEVER handles raw card data:
- **Client side:** Stripe.js collects card details directly into Stripe-hosted iframes (Elements)
- **Server side:** Only receives Stripe tokens/payment method IDs, never card numbers
- **Storage:** No card data stored anywhere in our systems
- **Network:** Card data never traverses our servers

**Compliance checklist:**
- [ ] All payment pages served over HTTPS
- [ ] Stripe.js loaded from `js.stripe.com` (not self-hosted)
- [ ] No card data in logs, errors, or analytics
- [ ] CSP allows `js.stripe.com` and `api.stripe.com`
- [ ] Annual SAQ A self-assessment questionnaire completed

### 8.3 Stripe Identity Integration Security

- Verification sessions created server-side only (prevents tampering)
- Verification result (`VerificationSession.status`) fetched server-side, never trusted from client
- Webhook `identity.verification_session.verified` triggers badge assignment
- Verification document images are stored by Stripe, NOT downloaded to our servers
- Verified status is cached on user profile but re-validated periodically (monthly)
- Failed verifications: user can retry after 24 hours, max 3 attempts (manual review after)

### 8.4 Payment Fraud Detection

#### Stripe Radar (Primary)
- Stripe Radar is enabled on the Stripe account for all charges
- Custom Radar rules for marketplace-specific patterns:
  - Block charges from countries where we don't operate
  - Require 3DS for charges > $100
  - Block if Stripe risk score > 75

#### Application-Level Controls
- **Price enforcement:** Server calculates and sets charge amount. Client never determines price.
- **Velocity checks:**
  - Max 5 promoted listing purchases per day per user
  - Max $500 in charges per day per user (unless verified seller)
  - Multiple failed charges in short period: block and flag
- **Refund fraud:** Track refund rate per user. If > 30% refund rate over 10+ transactions, flag for review
- **Idempotency keys:** All charge creation requests include an idempotency key to prevent duplicate charges on retry

---

## Appendix A: Security Headers Reference

Apply these headers on all responses from the API and web frontend:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: [see Section 6.7]
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Appendix B: Dependency Security

- **Automated scanning:** `npm audit` in CI/CD pipeline, fail build on high/critical findings
- **Dependabot / Renovate:** Automated PRs for dependency updates
- **Lock file integrity:** `package-lock.json` committed and verified in CI
- **License compliance:** Scan for GPL/AGPL dependencies that could affect licensing
- **Supply chain:** Use npm provenance when available, consider using a private registry mirror

## Appendix C: Security Review Checklist for New Features

Before any feature ships, verify:

- [ ] Input validation defined for all new endpoints (DTO with class-validator)
- [ ] Authorization checks for all new endpoints (guard + ownership check)
- [ ] Rate limiting appropriate for new endpoints
- [ ] No new raw SQL queries without parameter binding
- [ ] No secrets hardcoded or logged
- [ ] User-generated content properly encoded on output
- [ ] File uploads validated (type, size, scanned)
- [ ] PII fields encrypted and access-controlled
- [ ] Audit logging for sensitive operations
- [ ] Error responses don't leak internal details
- [ ] CORS configuration updated if new origins needed
- [ ] Dependency security scan passes
