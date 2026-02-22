# Listing Ranking & Promotion Rules

Last updated: 2026-02-19

This document defines how organic search results are ranked and how promoted listings interleave with organic results. It serves as the authoritative spec for the search service and the basis for future A/B testing.

---

## Table of Contents

- [Organic Ranking](#organic-ranking)
- [Promotion Tiers](#promotion-tiers)
- [Search Result Layout](#search-result-layout)
- [Promoted Slot Rules](#promoted-slot-rules)
- [Ranking Score Formula](#ranking-score-formula)
- [Anti-Gaming Rules](#anti-gaming-rules)
- [Future Improvements](#future-improvements)

---

## Organic Ranking

Organic listings are ranked by a composite score computed at query time. The default sort order is **relevance** when a text search query is present, or **distance** when browsing without a text query.

### Ranking Signals

| Signal | Weight | Notes |
|---|---|---|
| **Distance** | 35% | Closer listings rank higher. Linear decay from 0 mi (max) to radius edge (0). |
| **Recency** | 25% | Time since listing was last bumped/renewed/created. Log decay over 30 days. |
| **Seller trust score** | 20% | Composite of: phone verified (+10), identity verified (+15), rating ≥ 4.0 (+10), account age > 90 days (+5), zero reports (+5). Max 45 pts, normalized to 0–1. |
| **Text relevance** | 15% | PostgreSQL `tsvector` rank (`ts_rank_cd`) when a search query is present; 0 otherwise. |
| **Engagement** | 5% | Normalized click-through rate for the listing over last 7 days (cold-start: 0.5). |

When `sortBy=price_asc` or `sortBy=price_desc` or `sortBy=newest` is specified, the composite score is **overridden** and results are sorted by the selected dimension. Distance filter still applies.

### Distance Decay Function

```
distance_score = max(0, 1 - (distance_miles / radius_miles))
```

A listing at the search center scores 1.0; a listing at the exact radius edge scores 0.0.

---

## Promotion Tiers

Three promotion products are available. Promotions stack — a listing can have a Bump and Featured active simultaneously (Featured takes visual precedence).

| Tier | Price | Duration | Slot Type | Effect |
|---|---|---|---|---|
| **Bump** | $2.99 | 24 hours | Organic rank boost | Resets `bumped_at` timestamp to now; listing treated as just-renewed for recency scoring. Max 1 active bump per listing at a time. |
| **Featured** | $9.99 | 7 days | Interstitial featured slot | Listing eligible for featured slots (positions 1, 4, 7 in result pages). Marked with "Featured" badge. |
| **Spotlight** | $19.99 | 7 days | Top spotlight slot | Listing eligible for the exclusive spotlight slot (position 0, above all results including Featured). Marked with "Spotlight" badge. |

---

## Search Result Layout

### Standard Page Layout (20 results per page)

```
┌─────────────────────────────────────────┐
│  [SPOTLIGHT] (0 or 1 per page)          │  ← Spotlight slot (if active promo exists)
├─────────────────────────────────────────┤
│  Organic result #1                      │
│  [FEATURED] #2  (if featured promo)     │
│  Organic result #3                      │
│  [FEATURED] #4  (if featured promo)     │
│  Organic result #5                      │
│  Organic result #6                      │
│  [FEATURED] #7  (if featured promo)     │
│  ...                                    │
│  Organic result #20                     │
└─────────────────────────────────────────┘
```

**Slots:** Spotlight: position 0 (1 per page, page 1 only). Featured: positions 1, 4, 7 (3 per page, pages 1–3).

Featured and Spotlight slots are clearly labeled with a "Featured" or "Spotlight" badge on the listing card.

### Slot Filling Rules

1. **Spotlight slot (page 1 only):**
   - Filled by the highest-bid active Spotlight promotion among eligible listings in the result set.
   - If no Spotlight promo applies to the current query result set, slot is not shown (no blank space).
   - Tiebreaker: earlier purchase time wins.

2. **Featured slots (pages 1–3):**
   - Filled by active Featured promotions from the result set, ranked by purchase time (older purchases shown first, ensuring first-mover advantage).
   - Max 3 featured listings per page.
   - Featured listings are **not** duplicated — they appear once in a featured slot and are removed from their organic position.
   - Page 4+ has no featured slots; promoted listings return to organic ranking.

3. **Fallback:**
   - If fewer than 3 active Featured promos exist for the query, unfilled featured slots collapse (no blank rows).

---

## Promoted Slot Rules

### Eligibility
A listing is eligible for promoted slots only if:
- Status is `active`
- Promotion is `active` (not expired, not cancelled)
- Listing passes the geo filter (within search radius)
- Listing matches category and text filters (if present)
- Listing is not from a shadow-banned account

### Deduplication
- A single seller's listings may occupy at most **1 Spotlight** and **2 Featured** slots per results page.
- This prevents a single power seller from monopolizing the promoted slots.

### Category + Keyword Targeting (Phase 2)
Phase 1: Promoted listings appear in any relevant search within their geo radius.
Phase 2: Sellers will be able to target promotions to specific categories or keyword matches (ads-style targeting).

---

## Ranking Score Formula

The composite organic score for a listing is computed as:

```
score = (0.35 × distance_score)
      + (0.25 × recency_score)
      + (0.20 × trust_score)
      + (0.15 × text_relevance_score)
      + (0.05 × engagement_score)
```

### Recency Score
```
age_days = (now - MAX(bumped_at, renewed_at, created_at)) / 86400
recency_score = 1 / (1 + ln(1 + age_days))
```
A listing created or bumped today scores ≈ 1.0. A 30-day-old listing scores ≈ 0.29.

### Trust Score
```
trust_score = min(45, pts) / 45
where pts =
  phone_verified ? 10 : 0
  + identity_verified ? 15 : 0
  + rating_avg >= 4.0 ? 10 : 0
  + account_age_days >= 90 ? 5 : 0
  + report_count == 0 ? 5 : 0
```

### Text Relevance Score
When `q` is present: `text_relevance_score = ts_rank_cd(search_vector, plainto_tsquery(q))` normalized to [0, 1].
When `q` is absent: `text_relevance_score = 0` (distance + recency drive ranking).

### Implementation Note

The current implementation in `search.service.ts` uses raw PostGIS SQL. The composite score should be computed in the SQL query to allow the database to sort efficiently:

```sql
SELECT
  id, title, price, price_type, condition,
  ST_Distance(location, $point)::float / 1609.34 AS distance_miles,
  (
    0.35 * GREATEST(0, 1 - (ST_Distance(location, $point) / ($radius * 1609.34)))
    + 0.25 * (1.0 / (1 + LN(1 + EXTRACT(EPOCH FROM (NOW() - GREATEST(bumped_at, renewed_at, created_at))) / 86400)))
    + 0.20 * (LEAST(45,
        CASE WHEN seller.phone_verified THEN 10 ELSE 0 END
        + CASE WHEN seller.identity_verified THEN 15 ELSE 0 END
        + CASE WHEN seller.rating_avg >= 4.0 THEN 10 ELSE 0 END
        + CASE WHEN EXTRACT(EPOCH FROM NOW() - seller.created_at) / 86400 >= 90 THEN 5 ELSE 0 END
      ) / 45.0)
    + 0.15 * COALESCE(ts_rank_cd(search_vector, plainto_tsquery($q)), 0)
  ) AS rank_score
FROM listings
WHERE status = 'active'
  AND ST_DWithin(location, $point, $radius * 1609.34)
  -- additional filters...
ORDER BY rank_score DESC
LIMIT $limit OFFSET $offset
```

---

## Anti-Gaming Rules

| Rule | Enforcement |
|---|---|
| Max 1 active Bump per listing | `payments.service.ts` rejects purchase if active Bump exists |
| Max 1 active Spotlight per listing | Same as above |
| Bump resets recency but does not move listing to featured slots | Bump modifies `bumped_at` only; slot promotion requires Featured/Spotlight |
| Sellers cannot buy Spotlight for listings in moderation queue | Status check in `payments.service.ts` before creating Checkout session |
| No purchased promotion survives a listing removal | Admin remove action cancels all active promotions and issues pro-rated refund (Phase 2) |
| Impression fraud prevention | Impressions require unique visitor fingerprint; same visitor counted once per 24h per listing |

---

## Future Improvements

| Improvement | Priority | Notes |
|---|---|---|
| **A/B test ranking weights** | High | Run experiments to optimize conversion and seller satisfaction |
| **Category-targeted promoted slots** | Medium | Allow Featured/Spotlight to target a specific category or keyword |
| **Seller performance score** | Medium | Add sold-rate, response rate, and listing quality to trust score |
| **Algolia / Typesense migration** | Medium | When PostGIS search performance degrades at scale (est. > 500k active listings) |
| **Map view pin clustering** | Low | Surface promoted listings with different pin color on map |
| **Auction-style Spotlight bidding** | Low | Dynamic pricing for Spotlight based on real-time demand |
| **Engagement ML model** | Low | Replace 7-day CTR with a trained model using dwell time, message rate, and saves |
