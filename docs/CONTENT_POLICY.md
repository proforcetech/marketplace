# Content Policy

Last updated: 2026-02-19

This document defines what content is allowed on the Marketplace platform, how violations are handled, and the escalation ladder for enforcement. It is the authoritative reference for both automated moderation systems and human moderators.

---

## Table of Contents

- [Prohibited Content](#prohibited-content)
- [Restricted Content](#restricted-content)
- [Listing-Specific Rules](#listing-specific-rules)
- [User Conduct Rules](#user-conduct-rules)
- [Enforcement Ladder](#enforcement-ladder)
- [Moderation SLAs](#moderation-slas)
- [Appeals Process](#appeals-process)
- [Report Categories](#report-categories)
- [Auto-Moderation Signals](#auto-moderation-signals)

---

## Prohibited Content

The following are **absolutely prohibited** and result in immediate removal and account review:

### Illegal Items & Substances
- Firearms, ammunition, and weapons without proper licensing (varies by state)
- Controlled substances, drugs, or drug paraphernalia
- Counterfeit goods, fake IDs, or forged documents
- Stolen property or items known to be obtained illegally
- Human trafficking, escort services, or sexual content
- Child sexual abuse material (CSAM) — reported to NCMEC immediately

### Dangerous Goods
- Hazardous chemicals not permitted for consumer sale
- Recalled products (prohibited under CPSC regulations)
- Unpasteurized food products (where illegal)
- Items designed to harm people or animals
- Live animals from prohibited species lists (CITES protected)

### Financial Fraud
- Pyramid schemes, multi-level marketing recruitment
- Get-rich-quick schemes or investment solicitations
- Phishing links or credential-harvesting content
- Fake escrow or payment processing services
- Request for payment via gift cards, wire transfer, or cryptocurrency in exchange for goods

### Intellectual Property Violations
- Counterfeit branded goods (fake Louis Vuitton, Nike, etc.)
- Bootleg media (pirated DVDs, software, games)
- Reproductions falsely sold as originals

---

## Restricted Content

These categories are **allowed** but subject to additional review, age verification, or special handling:

| Category | Restriction | Notes |
|---|---|---|
| Alcohol (sealed, for collection) | Allowed if legal in user's jurisdiction | No open containers; must be 21+ |
| Tobacco & vaping products | Allowed for resale | No sales to minors; age gate on listings |
| Prescription medications | Prohibited for sale | Can list medical equipment only |
| OTC medications | Allowed if sealed | No expired products |
| Firearms accessories (legal) | Allowed | Scopes, holsters, cleaning kits |
| Hunting / fishing gear | Allowed | Legal equipment only |
| Replica / airsoft guns | Allowed | Must state "replica" clearly in title |
| Adult-oriented content (non-explicit) | Allowed in designated subcategory | No nudity; age gate on account |
| Pets | Allowed with welfare disclosure | No exotic species; see Pets policy below |
| Plants and seeds | Allowed | Invasive species restricted |

---

## Listing-Specific Rules

### All Listings
- Title must accurately describe the item (no keyword stuffing, no "OBO" in title)
- Price must match what is described (bait-and-switch prohibited)
- Photos must show the actual item being sold (stock photos allowed only if disclosed)
- Duplicate listings for the same item are prohibited — use the bump promotion instead
- Listing must be in the correct category

### Vehicle Listings
- VIN number strongly encouraged; if provided, must be accurate
- Salvage / rebuilt title must be disclosed prominently in description
- Known defects must be disclosed (CA law: Material Defect Disclosure)
- Odometer rollback is illegal and grounds for permanent ban

### Housing Listings
- Must comply with the Fair Housing Act (no discrimination based on protected classes)
- Square footage and bedroom count must be accurate
- Must disclose if property has active code violations or habitability issues
- No bait-and-switch (listing at one price, then raising it on contact)

### Jobs / Services
- No unpaid internships that violate FLSA guidelines
- Services must be legal and performed by listing owner or their authorized employees
- No multi-level marketing or affiliate recruitment disguised as job postings

### Pets
- No listing of endangered or CITES-protected species
- Dogs and cats must include vaccination/health status
- Rehoming fees for cats/dogs are allowed (max suggested: $250) — profit-oriented breeding listings require a "Breeder" tag and are subject to stricter review
- No listing animals that are visibly ill without full disclosure

---

## User Conduct Rules

### Prohibited Behaviors
- Harassment, threats, or abusive language toward other users
- Discrimination based on race, religion, gender, sexual orientation, national origin, disability, or other protected characteristics
- Coordinating to manipulate prices or suppress competing listings
- Creating multiple accounts to evade bans
- Posting the same listing from multiple accounts ("duplicate ring")
- Soliciting users to transact outside the platform to avoid safety features
- Sharing other users' personal information ("doxxing")

### Communication Rules
- No contact information (phone, email, external URLs) in listing descriptions during initial browse (permitted once a conversation is started, within the chat)
- No spam or unsolicited bulk messages
- No impersonating another user, company, or public figure

---

## Enforcement Ladder

Enforcement is graduated. Severity of the initial action depends on the violation type. Repeat offenses escalate automatically.

| Level | Action | Trigger | Duration |
|---|---|---|---|
| **0 — Warning** | In-app notice; listing flagged for revision | Minor policy violation, first offense | N/A |
| **1 — Listing Removed** | Listing taken down; user notified with reason | Prohibited content, inaccurate listing, duplicate | Indefinite (listing stays removed) |
| **2 — Posting Suspension** | Cannot create new listings | 2+ removed listings in 30 days; moderate fraud | 7 days default; escalates to 30 days on repeat |
| **3 — Shadow Ban** | Account active but listings hidden from search | Suspected fraud ring, fake reviews, ban evasion attempt | Until manual review |
| **4 — Full Suspension** | Login disabled; all listings removed | Confirmed fraud, harassment, CSAM-adjacent | 30 days; escalates to permanent |
| **5 — Permanent Ban** | Account terminated; device fingerprint blocked | CSAM, confirmed trafficking, repeat ban evasion | Permanent |

### Automatic Escalation Rules
- Level 1 × 3 within 30 days → Level 2 (7 days)
- Level 2 × 2 → Level 2 (30 days)
- Level 2 × 3 → Level 3 (shadow ban, manual review required to lift)
- Any CSAM report → Level 5 immediately + NCMEC report
- Any confirmed stolen goods → Level 4 + law enforcement referral flag

### Manual Review Override
Moderators may skip levels (up or down) with documented justification in the audit log.

---

## Moderation SLAs

| Priority | Trigger | Target Resolution Time |
|---|---|---|
| **P0 — Critical** | CSAM, active threat, confirmed trafficking | < 1 hour (24/7 on-call) |
| **P1 — High** | Fraud with victim contact, harassment with threats | < 4 hours |
| **P2 — Medium** | Prohibited goods, significant policy violations | < 24 hours |
| **P3 — Standard** | Listing policy violations, duplicate listings | < 72 hours |
| **P4 — Low** | Miscategorization, minor inaccuracies | < 7 days |

**Moderation queue SLA monitoring:** The admin dashboard shows listings aged by time-in-queue. Items approaching SLA breach are highlighted amber (50% of SLA elapsed) and red (90% elapsed).

---

## Appeals Process

Users have the right to appeal any enforcement action except Level 5 permanent bans resulting from CSAM.

1. **Initiation:** User submits appeal via in-app "Appeal Decision" button (available for 30 days after action)
2. **Acknowledgment:** System confirms receipt within 24 hours
3. **Review:** Senior moderator (not the original reviewer) evaluates within 72 hours for P3/P4; 24 hours for P1/P2
4. **Decision:** User notified of outcome with brief explanation
5. **Escalation:** If appeal denied, user may request one final escalation to Trust & Safety lead within 14 days

Appeals do not stay enforcement actions — listings remain removed during the appeal process.

---

## Report Categories

Users can report a listing, message, or user profile. The following reason codes are available:

| Code | Description |
|---|---|
| `prohibited_item` | Item is illegal or prohibited under content policy |
| `counterfeit` | Suspected fake or replica sold as authentic |
| `spam_duplicate` | Spam or duplicate of existing listing |
| `misleading` | Title or description is intentionally inaccurate |
| `wrong_category` | Listed in incorrect category |
| `harassment` | User sent threatening or abusive messages |
| `scam_fraud` | Suspected scam or fraudulent transaction |
| `discrimination` | Violates Fair Housing Act or anti-discrimination rules |
| `stolen_property` | Item appears to be stolen |
| `csam` | Child sexual abuse material (immediately escalated) |
| `other` | Other policy violation (free text required) |

---

## Auto-Moderation Signals

The risk scoring engine (`moderation/risk-scoring.service.ts`) evaluates listings automatically. Listings that exceed the risk threshold are held in the moderation queue rather than published directly.

Key automated signals:

| Signal | Weight | Notes |
|---|---|---|
| Account age < 24h | High | New accounts are inherently higher risk |
| Phone not verified | High | Required for posting in most categories |
| VPN / proxy detected | Medium | Geo-mismatch between IP and listed location |
| Posting velocity > 3/day (unverified) | High | Suggests automated or bulk posting |
| Prohibited keyword match | High | Keyword list maintained by Trust & Safety |
| Price anomaly (>3 std dev from median) | Medium | Signals bait-and-switch or stolen goods |
| Copy-paste pattern across listings | High | Template fraud signature |
| Prior removal history | Medium–High | Scales with count of previous removals |
| User report count ≥ 3 | High | Auto-escalates to P2 review |
| Text similarity to known scam templates | High | Cosine similarity threshold: 0.85 |

Listings scoring **≥ 70** (0–100 scale) are auto-held for human review.
Listings scoring **≥ 90** are auto-rejected with user notification and appeal option.
