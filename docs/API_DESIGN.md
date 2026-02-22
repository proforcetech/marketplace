# API Design

This document defines the REST API conventions, endpoint catalog, authentication flows, error handling, and rate limiting for the Marketplace backend.

All endpoints are prefixed with `/api/v1` unless otherwise noted.

---

## Table of Contents

- [Conventions](#conventions)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Auth](#auth)
  - [Users](#users)
  - [Listings](#listings)
  - [Search](#search)
  - [Messages](#messages)
  - [Payments](#payments)
  - [Ratings](#ratings)
  - [Reports](#reports)
  - [Admin](#admin)
- [Request and Response Format](#request-and-response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Conventions

### Versioning

- API version is embedded in the URL path: `/api/v1/...`
- Breaking changes require a new version (`/api/v2/...`)
- Non-breaking additions (new optional fields, new endpoints) do not require a version bump

### URL naming

- Use **plural nouns** for resource collections: `/listings`, `/users`, `/messages`
- Use **kebab-case** for multi-word segments: `/saved-searches`, `/moderation-actions`
- Nest resources logically: `/users/:id/listings`, `/conversations/:id/messages`
- Actions that do not map to CRUD use verb endpoints: `/auth/login`, `/auth/refresh`

### HTTP methods

| Method | Usage |
|---|---|
| `GET` | Retrieve a resource or collection |
| `POST` | Create a resource or trigger an action |
| `PATCH` | Partial update of a resource |
| `DELETE` | Remove a resource (soft-delete where appropriate) |

`PUT` is not used; prefer `PATCH` for updates.

### Pagination

All collection endpoints support cursor-based pagination:

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "prev_cursor": null,
    "has_more": true,
    "total": 342
  }
}
```

Query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `cursor` | string | -- | Opaque cursor for the next page |
| `limit` | integer | 20 | Items per page (max 100) |
| `sort` | string | varies | Sort field (e.g., `created_at`, `price`, `distance`) |
| `order` | string | `desc` | Sort direction: `asc` or `desc` |

### Filtering

Filters are passed as query parameters with the field name:

```
GET /api/v1/listings?category=automotive&min_price=5000&max_price=20000&condition=used
```

### Timestamps

All timestamps are ISO 8601 in UTC: `2026-02-17T14:30:00.000Z`

---

## Authentication

### Overview

The API uses **JWT-based authentication** with short-lived access tokens and long-lived refresh tokens.

| Token | Lifetime | Storage |
|---|---|---|
| Access token | 15 minutes | Memory / `Authorization` header |
| Refresh token | 7 days | HTTP-only secure cookie |

### Flow

```
1. User signs up or logs in
   POST /auth/signup  or  POST /auth/login
   Response: { access_token, user }  +  Set-Cookie: refresh_token

2. User makes authenticated requests
   Authorization: Bearer <access_token>

3. Access token expires, client refreshes
   POST /auth/refresh  (refresh token sent via cookie)
   Response: { access_token }  +  Set-Cookie: refresh_token (rotated)

4. User logs out
   POST /auth/logout
   Invalidates the refresh token server-side
```

### Phone verification (OTP)

Phone verification is required before posting listings:

```
1. POST /auth/send-otp   { phone: "+15551234567" }
2. POST /auth/verify-otp  { phone: "+15551234567", code: "123456" }
```

OTP codes are 6 digits, valid for 10 minutes, rate-limited to 3 attempts per phone per hour.

---

## Endpoints

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | No | Create a new account |
| `POST` | `/auth/login` | No | Log in with email + password |
| `POST` | `/auth/logout` | Yes | Invalidate refresh token |
| `POST` | `/auth/refresh` | Cookie | Rotate and issue new tokens |
| `POST` | `/auth/send-otp` | Yes | Send OTP to phone number |
| `POST` | `/auth/verify-otp` | Yes | Verify phone OTP code |
| `POST` | `/auth/forgot-password` | No | Initiate password reset |
| `POST` | `/auth/reset-password` | No | Complete password reset with token |

#### `POST /auth/signup`

Request:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss1",
  "display_name": "Jane Doe"
}
```

Response `201`:
```json
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "display_name": "Jane Doe",
      "phone_verified": false,
      "created_at": "2026-02-17T10:00:00.000Z"
    },
    "access_token": "eyJhbGciOi..."
  }
}
```

#### `POST /auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss1"
}
```

Response `200`: Same shape as signup response.

---

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users/:id` | No | Get public user profile |
| `PATCH` | `/users/:id` | Yes (owner) | Update own profile |
| `GET` | `/users/:id/listings` | No | Get a user's active listings |
| `GET` | `/users/me` | Yes | Get the authenticated user's full profile |
| `GET` | `/users/me/sessions` | Yes | List active sessions |
| `DELETE` | `/users/me/sessions/:id` | Yes | Revoke a session |

#### `GET /users/:id`

Response `200`:
```json
{
  "data": {
    "id": "usr_abc123",
    "display_name": "Jane Doe",
    "avatar_url": "https://cdn.example.com/avatars/abc123.webp",
    "location_city": "Austin",
    "location_state": "TX",
    "member_since": "2026-02-17T10:00:00.000Z",
    "identity_verified": true,
    "rating_avg": 4.8,
    "rating_count": 23,
    "response_rate": 0.95,
    "listing_count": 12
  }
}
```

---

### Listings

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/listings` | Yes (verified phone) | Create a new listing |
| `GET` | `/listings/:id` | No | Get listing details |
| `PATCH` | `/listings/:id` | Yes (owner) | Update a listing |
| `DELETE` | `/listings/:id` | Yes (owner) | Soft-delete a listing |
| `POST` | `/listings/:id/media` | Yes (owner) | Upload media to a listing |
| `DELETE` | `/listings/:id/media/:mediaId` | Yes (owner) | Remove media from a listing |
| `POST` | `/listings/:id/renew` | Yes (owner) | Renew an expired listing |
| `PATCH` | `/listings/:id/status` | Yes (owner) | Transition listing status |

#### Listing status transitions

```
draft --> pending_review --> active --> sold | closed
                                   --> expired --> (renew) --> active
                         --> rejected
Any state --> removed (admin action)
```

#### `POST /listings`

Request:
```json
{
  "title": "2020 Honda Civic EX - Low Miles",
  "description": "Well-maintained, single owner, clean title...",
  "category_id": "cat_automotive",
  "price": 18500,
  "price_type": "fixed",
  "condition": "used",
  "location": {
    "lat": 30.2672,
    "lng": -97.7431,
    "city": "Austin",
    "state": "TX",
    "zip": "78701"
  },
  "visibility": "public",
  "fields": {
    "vehicle_type": "car",
    "year": 2020,
    "make": "Honda",
    "model": "Civic",
    "trim": "EX",
    "mileage": 32000,
    "transmission": "automatic",
    "fuel_type": "gasoline",
    "drivetrain": "fwd",
    "title_status": "clean"
  }
}
```

Response `201`:
```json
{
  "data": {
    "id": "lst_xyz789",
    "status": "draft",
    "title": "2020 Honda Civic EX - Low Miles",
    "slug": "2020-honda-civic-ex-low-miles-xyz789",
    "created_at": "2026-02-17T12:00:00.000Z",
    "...": "..."
  }
}
```

#### `PATCH /listings/:id/status`

Request:
```json
{
  "status": "active"
}
```

Valid transitions depend on the current status and user role (owner vs. admin).

---

### Search

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/search` | No | Search listings with geo + filters |
| `GET` | `/search/suggestions` | No | Autocomplete suggestions |
| `POST` | `/saved-searches` | Yes | Save a search query |
| `GET` | `/saved-searches` | Yes | List saved searches |
| `DELETE` | `/saved-searches/:id` | Yes | Remove a saved search |
| `GET` | `/categories` | No | List all categories |
| `GET` | `/categories/:id` | No | Get category details + fields |

#### `GET /search`

This is the primary search endpoint, always location-aware.

Query parameters:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | float | Yes | Latitude of search center |
| `lng` | float | Yes | Longitude of search center |
| `radius` | integer | No (default 25) | Search radius in miles |
| `q` | string | No | Full-text search query |
| `category` | string | No | Category slug or ID |
| `min_price` | integer | No | Minimum price filter |
| `max_price` | integer | No | Maximum price filter |
| `condition` | string | No | Item condition filter |
| `posted_within` | string | No | Time filter: `24h`, `7d`, `30d` |
| `sort` | string | No | `distance`, `newest`, `price_asc`, `price_desc` |
| `cursor` | string | No | Pagination cursor |
| `limit` | integer | No | Results per page (default 20, max 100) |

Response `200`:
```json
{
  "data": [
    {
      "id": "lst_xyz789",
      "title": "2020 Honda Civic EX - Low Miles",
      "price": 18500,
      "price_type": "fixed",
      "category": "automotive",
      "condition": "used",
      "thumbnail_url": "https://cdn.example.com/listings/xyz789/thumb.webp",
      "location": {
        "city": "Austin",
        "state": "TX",
        "distance_miles": 3.2
      },
      "is_promoted": false,
      "created_at": "2026-02-17T12:00:00.000Z",
      "seller": {
        "id": "usr_abc123",
        "display_name": "Jane Doe",
        "identity_verified": true,
        "rating_avg": 4.8
      }
    }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "has_more": true,
    "total": 156
  },
  "meta": {
    "search_center": { "lat": 30.2672, "lng": -97.7431 },
    "radius_miles": 25,
    "result_count": 20
  }
}
```

---

### Messages

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/conversations` | Yes | List user's conversations |
| `POST` | `/conversations` | Yes | Start a new conversation (linked to a listing) |
| `GET` | `/conversations/:id` | Yes (participant) | Get conversation details |
| `GET` | `/conversations/:id/messages` | Yes (participant) | List messages in a conversation |
| `POST` | `/conversations/:id/messages` | Yes (participant) | Send a message |
| `PATCH` | `/conversations/:id/read` | Yes (participant) | Mark conversation as read |
| `POST` | `/conversations/:id/block` | Yes (participant) | Block the other participant |

#### `POST /conversations`

Request:
```json
{
  "listing_id": "lst_xyz789",
  "message": "Hi, is this still available?"
}
```

Response `201`:
```json
{
  "data": {
    "id": "conv_001",
    "listing": {
      "id": "lst_xyz789",
      "title": "2020 Honda Civic EX - Low Miles"
    },
    "participants": ["usr_abc123", "usr_def456"],
    "last_message": {
      "id": "msg_001",
      "body": "Hi, is this still available?",
      "sender_id": "usr_def456",
      "created_at": "2026-02-17T14:00:00.000Z"
    },
    "created_at": "2026-02-17T14:00:00.000Z"
  }
}
```

#### Real-time messages

In addition to the REST endpoints, messages are delivered in real-time via WebSocket:

```
Event: message:new
Payload: { conversation_id, message }

Event: message:read
Payload: { conversation_id, read_at }

Event: typing:start / typing:stop
Payload: { conversation_id, user_id }
```

Clients connect to the WebSocket server at `/ws` with the access token.

---

### Payments

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/promotions/purchase` | Yes | Purchase a promotion for a listing |
| `GET` | `/promotions/plans` | No | List available promotion plans |
| `GET` | `/promotions/:id` | Yes (owner) | Get promotion details + analytics |
| `GET` | `/promotions` | Yes | List user's active promotions |
| `POST` | `/webhooks/stripe` | No (verified via signature) | Handle Stripe webhook events |

#### `POST /promotions/purchase`

Request:
```json
{
  "listing_id": "lst_xyz789",
  "plan_id": "plan_featured_7d",
  "payment_method_id": "pm_xxx"
}
```

Response `201`:
```json
{
  "data": {
    "id": "promo_001",
    "listing_id": "lst_xyz789",
    "plan": "featured_7d",
    "status": "active",
    "starts_at": "2026-02-17T15:00:00.000Z",
    "ends_at": "2026-02-24T15:00:00.000Z",
    "analytics": {
      "impressions": 0,
      "clicks": 0,
      "messages": 0
    },
    "receipt_url": "https://pay.stripe.com/receipts/..."
  }
}
```

#### Promotion plans

| Plan | Duration | Placement | Description |
|---|---|---|---|
| `bump` | 24 hours | Re-sort to top of results | Moves listing to top of organic results |
| `featured_7d` | 7 days | Featured section + badge | Highlighted in category and search results |
| `spotlight_3d` | 3 days | Category page hero | Top placement on category landing page |

---

### Ratings

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/ratings` | Yes | Submit a rating for a user |
| `GET` | `/users/:id/ratings` | No | Get ratings for a user |
| `GET` | `/ratings/:id` | No | Get a specific rating |

#### `POST /ratings`

Request:
```json
{
  "rated_user_id": "usr_abc123",
  "listing_id": "lst_xyz789",
  "conversation_id": "conv_001",
  "score": 5,
  "comment": "Great seller, item exactly as described."
}
```

Constraints:
- Score: 1-5 integer
- A qualifying interaction must exist (conversation with messages)
- Each user can rate the other once per listing
- Ratings cannot be edited after 48 hours

---

### Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/reports` | Yes | Submit a report |
| `GET` | `/reports` | Yes (admin) | List reports (admin) |
| `PATCH` | `/reports/:id` | Yes (admin) | Update report status (admin) |

#### `POST /reports`

Request:
```json
{
  "type": "listing",
  "target_id": "lst_xyz789",
  "reason": "scam",
  "details": "Price is suspiciously low and seller is asking for payment via Zelle.",
  "evidence": {
    "message_ids": ["msg_005", "msg_008"],
    "screenshot_urls": []
  }
}
```

Report reasons by type:

| Target | Reasons |
|---|---|
| `listing` | `scam`, `prohibited_item`, `explicit_content`, `trafficking_concern`, `wrong_category`, `spam`, `other` |
| `user` | `harassment`, `scam`, `fake_profile`, `underage_concern`, `other` |
| `message` | `harassment`, `spam`, `explicit_content`, `trafficking_concern`, `threats`, `other` |

---

### Admin

All admin endpoints require the `admin` role.

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/moderation-queue` | List items pending review |
| `PATCH` | `/admin/listings/:id/moderate` | Approve, reject, or remove a listing |
| `GET` | `/admin/users` | Search and list users |
| `PATCH` | `/admin/users/:id` | Update user status (ban, suspend, shadow-ban) |
| `GET` | `/admin/users/:id/activity` | View user activity log |
| `GET` | `/admin/reports` | List and filter reports |
| `PATCH` | `/admin/reports/:id` | Resolve a report with action |
| `GET` | `/admin/audit-logs` | Query audit trail |
| `GET` | `/admin/stats` | Dashboard statistics |

#### `PATCH /admin/listings/:id/moderate`

Request:
```json
{
  "action": "reject",
  "reason": "Listing violates prohibited items policy.",
  "notify_user": true
}
```

Actions: `approve`, `reject`, `remove`, `request_changes`

#### `PATCH /admin/users/:id`

Request:
```json
{
  "status": "suspended",
  "reason": "Multiple confirmed scam reports.",
  "duration_days": 30
}
```

Statuses: `active`, `suspended`, `banned`, `shadow_banned`

---

## Request and Response Format

### Request headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
Accept: application/json
X-Request-ID: <uuid>  (optional, for tracing)
```

### Success response envelope

All successful responses follow this format:

```json
{
  "data": { ... },
  "pagination": { ... },
  "meta": { ... }
}
```

- `data`: The primary response payload (object or array)
- `pagination`: Present on collection endpoints
- `meta`: Optional additional context (search metadata, etc.)

### Error response envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      {
        "field": "price",
        "message": "Price must be a positive number."
      }
    ],
    "request_id": "req_abc123"
  }
}
```

---

## Error Handling

### HTTP status codes

| Code | Meaning | When to use |
|---|---|---|
| `200` | OK | Successful GET, PATCH, or action |
| `201` | Created | Successful POST that creates a resource |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid input, malformed JSON |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Authenticated but insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Duplicate resource or invalid state transition |
| `413` | Payload Too Large | Upload exceeds size limit |
| `422` | Unprocessable Entity | Semantic validation failure |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server failure |

### Error code catalog

| Error Code | HTTP Status | Description |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token has expired |
| `AUTH_TOKEN_INVALID` | 401 | Token is malformed or tampered |
| `AUTH_REFRESH_EXPIRED` | 401 | Refresh token has expired or been revoked |
| `AUTH_PHONE_NOT_VERIFIED` | 403 | Phone verification required for this action |
| `AUTH_ACCOUNT_SUSPENDED` | 403 | Account is suspended |
| `AUTH_ACCOUNT_BANNED` | 403 | Account is permanently banned |
| `VALIDATION_ERROR` | 400 | One or more fields failed validation |
| `RESOURCE_NOT_FOUND` | 404 | The requested resource does not exist |
| `RESOURCE_ALREADY_EXISTS` | 409 | A duplicate resource already exists |
| `LISTING_INVALID_TRANSITION` | 409 | Invalid status transition for this listing |
| `LISTING_LIMIT_REACHED` | 429 | Daily listing creation limit exceeded |
| `LISTING_EXPIRED` | 410 | Listing has expired; renew to reactivate |
| `MEDIA_TOO_LARGE` | 413 | Uploaded file exceeds the size limit |
| `MEDIA_INVALID_TYPE` | 400 | File type is not supported |
| `MEDIA_LIMIT_REACHED` | 429 | Maximum media uploads reached |
| `CHAT_BLOCKED` | 403 | You have been blocked by this user |
| `CHAT_RATE_LIMITED` | 429 | Message rate limit exceeded |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `PAYMENT_ALREADY_ACTIVE` | 409 | A promotion is already active for this listing |
| `RATING_ALREADY_EXISTS` | 409 | You have already rated this user for this listing |
| `RATING_NO_INTERACTION` | 403 | A qualifying interaction is required before rating |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests; retry after the indicated time |
| `OTP_INVALID` | 400 | OTP code is incorrect |
| `OTP_EXPIRED` | 400 | OTP code has expired |
| `OTP_RATE_LIMITED` | 429 | Too many OTP requests; try again later |
| `INTERNAL_ERROR` | 500 | An unexpected error occurred |

---

## Rate Limiting

Rate limits protect the API from abuse and ensure fair usage.

### Tiers

| Tier | Scope | Limit | Window |
|---|---|---|---|
| **Anonymous** | Per IP | 60 requests | 1 minute |
| **Authenticated** | Per user | 120 requests | 1 minute |
| **Elevated** | Verified users | 200 requests | 1 minute |
| **Admin** | Admin users | 500 requests | 1 minute |

### Endpoint-specific limits

| Endpoint | Limit | Window | Notes |
|---|---|---|---|
| `POST /auth/login` | 5 attempts | 15 minutes | Per IP, prevents brute force |
| `POST /auth/send-otp` | 3 requests | 1 hour | Per phone number |
| `POST /auth/verify-otp` | 5 attempts | 10 minutes | Per phone number |
| `POST /listings` | 10 listings | 24 hours | Per user; new accounts: 3/day |
| `POST /conversations/:id/messages` | 30 messages | 1 minute | Per user, per conversation |
| `POST /conversations` | 20 new conversations | 1 hour | Per user; anti-spam |
| `POST /listings/:id/media` | 20 uploads | 1 hour | Per user |
| `GET /search` | 60 requests | 1 minute | Per IP or user |

### Rate limit response headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1708182660
Retry-After: 42  (only on 429 responses)
```

When a rate limit is exceeded, the API returns `429 Too Many Requests` with the `RATE_LIMIT_EXCEEDED` error code and a `Retry-After` header indicating when the client can retry.
