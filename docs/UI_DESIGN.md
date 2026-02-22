# Marketplace UI/UX Design System

> **Version:** 1.0.0
> **Last Updated:** 2026-02-17
> **Status:** Foundation / Pre-Development

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Library Plan](#component-library-plan)
6. [Page Layouts & User Flows](#page-layouts--user-flows)
7. [Key Interaction Patterns](#key-interaction-patterns)
8. [Responsive Strategy](#responsive-strategy)
9. [Accessibility Standards](#accessibility-standards)
10. [Motion & Animation](#motion--animation)

---

## Design Philosophy

### Guiding Principles

**1. Mobile-First, Always.**
Over 70% of marketplace traffic comes from mobile devices. Every design decision starts at 320px and scales up. Desktop is the enhancement, not the baseline.

**2. Trust Through Clarity.**
A marketplace lives or dies on trust. The visual language must feel safe, professional, and transparent. We achieve this through clean layouts, generous whitespace, clear information hierarchy, and prominent safety features. The aesthetic goal is "Airbnb meets marketplace" -- warm, approachable, but structured enough to handle transactional complexity.

**3. Accessibility Is Not Optional.**
WCAG 2.1 AA compliance is a hard requirement, not a stretch goal. This means 4.5:1 contrast ratios for body text, 3:1 for large text and UI components, keyboard navigation for every flow, screen reader support via semantic HTML and ARIA, and no information conveyed through color alone.

**4. Low-Friction User Flows.**
Every additional tap, field, or screen in a flow increases abandonment. We ruthlessly minimize steps in the critical paths: browsing, listing creation, and messaging. Progressive disclosure keeps interfaces simple until the user asks for complexity.

**5. Consistent Visual Rhythm.**
An 8px base grid governs all spacing. Border radii, shadow depths, and color usage follow strict rules. When a user sees a pattern in one part of the app, they know what it means everywhere else.

---

## Color System

### Design Rationale

The palette anchors on a deep, trustworthy teal-blue as the primary brand color. This avoids the cold corporate feel of pure blue while conveying reliability. A warm amber accent provides energy for calls-to-action and promotional elements. The neutral scale uses a slightly warm gray (zinc-tinted) to keep the interface from feeling sterile.

### Primary Brand Colors

| Token                  | Hex       | HSL                  | Usage                                      |
|------------------------|-----------|----------------------|--------------------------------------------|
| `primary-50`           | `#EFF8F8` | 180, 43%, 95%        | Tinted backgrounds, hover states            |
| `primary-100`          | `#D7EEEF` | 183, 42%, 89%        | Light fills, selected row backgrounds       |
| `primary-200`          | `#B3DFE1` | 183, 41%, 79%        | Borders on active elements                  |
| `primary-300`          | `#7FC9CD` | 183, 39%, 65%        | Secondary icons                             |
| `primary-400`          | `#49ABB2` | 184, 42%, 49%        | Links, interactive text                     |
| `primary-500`          | `#2A8F97` | 184, 56%, 38%        | **Primary brand color** -- buttons, headers |
| `primary-600`          | `#217379` | 184, 56%, 30%        | Hover state on primary buttons              |
| `primary-700`          | `#1B5D62` | 184, 56%, 25%        | Active/pressed states                       |
| `primary-800`          | `#164B4F` | 184, 54%, 20%        | Dark accents, header backgrounds            |
| `primary-900`          | `#0F3436` | 184, 56%, 14%        | Dark mode primary surfaces                  |
| `primary-950`          | `#091F21` | 184, 55%, 8%         | Darkest brand tone                          |

### Secondary / Accent Colors

| Token                  | Hex       | HSL                  | Usage                                      |
|------------------------|-----------|----------------------|--------------------------------------------|
| `accent-50`            | `#FFFBEB` | 48, 100%, 96%        | Highlight backgrounds                       |
| `accent-100`           | `#FEF3C7` | 46, 97%, 89%         | Promotion badge backgrounds                 |
| `accent-200`           | `#FDE68A` | 45, 97%, 77%         | Star ratings fill                           |
| `accent-300`           | `#FCD34D` | 44, 96%, 65%         | Active star, price highlights               |
| `accent-400`           | `#FBBF24` | 43, 96%, 56%         | **Accent color** -- CTAs, highlights        |
| `accent-500`           | `#F59E0B` | 38, 92%, 50%         | Hover on accent buttons                     |
| `accent-600`           | `#D97706` | 33, 93%, 44%         | Active accent                               |
| `accent-700`           | `#B45309` | 28, 91%, 37%         | Dark accent text                            |
| `accent-800`           | `#92400E` | 26, 83%, 31%         | Dark mode accent                            |
| `accent-900`           | `#78350F` | 24, 79%, 27%         | Darkest accent                              |

### Semantic Colors

| Token                  | Hex       | Usage                                      |
|------------------------|-----------|--------------------------------------------|
| `success-50`           | `#F0FDF4` | Success background                          |
| `success-100`          | `#DCFCE7` | Success light fill                          |
| `success-500`          | `#22C55E` | Success icons, text                         |
| `success-600`          | `#16A34A` | Success buttons, strong indicators          |
| `success-700`          | `#15803D` | Success dark / hover                        |
| `warning-50`           | `#FFFBEB` | Warning background                          |
| `warning-100`          | `#FEF3C7` | Warning light fill                          |
| `warning-500`          | `#EAB308` | Warning icons, badges                       |
| `warning-600`          | `#CA8A04` | Warning text                                |
| `warning-700`          | `#A16207` | Warning dark                                |
| `error-50`             | `#FEF2F2` | Error background                            |
| `error-100`            | `#FEE2E2` | Error light fill                            |
| `error-500`            | `#EF4444` | Error icons, validation text                |
| `error-600`            | `#DC2626` | Error buttons, strong indicators            |
| `error-700`            | `#B91C1C` | Error dark / hover                          |
| `info-50`              | `#EFF6FF` | Info background                             |
| `info-100`             | `#DBEAFE` | Info light fill                             |
| `info-500`             | `#3B82F6` | Info icons, links                           |
| `info-600`             | `#2563EB` | Info buttons                                |
| `info-700`             | `#1D4ED8` | Info dark / hover                           |

### Neutral / Gray Scale

Built on a zinc base with a very slight warm tint for approachability.

| Token                  | Hex       | Usage                                      |
|------------------------|-----------|--------------------------------------------|
| `neutral-0`            | `#FFFFFF` | Page backgrounds, card surfaces             |
| `neutral-50`           | `#FAFAFA` | Subtle background differentiation           |
| `neutral-100`          | `#F4F4F5` | Input backgrounds, section dividers         |
| `neutral-200`          | `#E4E4E7` | Borders, divider lines                      |
| `neutral-300`          | `#D4D4D8` | Disabled borders, placeholder icons         |
| `neutral-400`          | `#A1A1AA` | Placeholder text, disabled text             |
| `neutral-500`          | `#71717A` | Secondary text, captions                    |
| `neutral-600`          | `#52525B` | Body text (secondary)                       |
| `neutral-700`          | `#3F3F46` | Body text (primary on light backgrounds)    |
| `neutral-800`          | `#27272A` | Headings, high-emphasis text                |
| `neutral-900`          | `#18181B` | Maximum contrast text                       |
| `neutral-950`          | `#09090B` | Near-black for dark mode text on light      |

### Dark Mode Palette

Dark mode uses the same hue families but shifts lightness values. Surfaces layer from darkest (background) to lightest (elevated cards).

| Token                      | Light Mode | Dark Mode  | Usage                         |
|----------------------------|------------|------------|-------------------------------|
| `surface-base`             | `#FFFFFF`  | `#09090B`  | Page background               |
| `surface-raised`           | `#FFFFFF`  | `#18181B`  | Card surfaces                 |
| `surface-overlay`          | `#FFFFFF`  | `#27272A`  | Modals, popovers, dropdowns   |
| `surface-sunken`           | `#F4F4F5`  | `#09090B`  | Inset areas, input backgrounds|
| `text-primary`             | `#18181B`  | `#FAFAFA`  | Primary text                  |
| `text-secondary`           | `#52525B`  | `#A1A1AA`  | Secondary text                |
| `text-tertiary`            | `#A1A1AA`  | `#71717A`  | Hints, captions               |
| `border-default`           | `#E4E4E7`  | `#27272A`  | Standard borders              |
| `border-strong`            | `#D4D4D8`  | `#3F3F46`  | Emphasized borders            |
| `primary-on-dark`          | `#2A8F97`  | `#49ABB2`  | Primary color shifts lighter  |

---

## Typography

### Font Families

```
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
```

**Inter** is the primary typeface: excellent readability at small sizes, variable font support for fine-grained weight control, free and open source, and optimized for screens. The system font fallback stack ensures fast initial render before the web font loads.

### Type Scale

Based on a 1.250 (major third) scale, anchored at 16px body text.

| Token          | Size (px) | Size (rem) | Weight  | Line Height | Letter Spacing | Usage                      |
|----------------|-----------|------------|---------|-------------|----------------|----------------------------|
| `display-lg`   | 40        | 2.5        | 700     | 1.1         | -0.02em        | Hero headings              |
| `display-sm`   | 32        | 2.0        | 700     | 1.15        | -0.015em       | Page titles                |
| `heading-lg`   | 24        | 1.5        | 600     | 1.25        | -0.01em        | Section headings           |
| `heading-md`   | 20        | 1.25       | 600     | 1.3         | -0.005em       | Card titles, dialog titles |
| `heading-sm`   | 16        | 1.0        | 600     | 1.4         | 0              | Subsection headings        |
| `body-lg`      | 18        | 1.125      | 400     | 1.6         | 0              | Lead paragraphs            |
| `body-md`      | 16        | 1.0        | 400     | 1.6         | 0              | **Default body text**      |
| `body-sm`      | 14        | 0.875      | 400     | 1.5         | 0.005em        | Supporting text, metadata  |
| `caption`      | 12        | 0.75       | 400     | 1.4         | 0.01em         | Captions, timestamps       |
| `label`        | 14        | 0.875      | 500     | 1.0         | 0.01em         | Form labels, button text   |
| `overline`     | 12        | 0.75       | 600     | 1.0         | 0.08em         | Category labels, tags      |

### Responsive Font Sizes

On mobile (< 640px), the display and heading sizes scale down:

| Token          | Mobile (px) | Desktop (px) |
|----------------|-------------|--------------|
| `display-lg`   | 28          | 40           |
| `display-sm`   | 24          | 32           |
| `heading-lg`   | 20          | 24           |
| `heading-md`   | 18          | 20           |

Implemented via CSS `clamp()`:
```css
--text-display-lg: clamp(1.75rem, 1.25rem + 1.5vw, 2.5rem);
--text-display-sm: clamp(1.5rem, 1.125rem + 1.125vw, 2rem);
```

---

## Spacing & Layout

### Base Grid

All spacing derives from a **4px base unit**. The primary spacing rhythm uses **8px increments** (multiples of the base).

### Spacing Scale

| Token   | Value (px) | Value (rem) | Usage Examples                              |
|---------|------------|-------------|---------------------------------------------|
| `0`     | 0          | 0           | Reset                                        |
| `px`    | 1          | 0.0625      | Hairline borders                             |
| `0.5`   | 2          | 0.125       | Micro adjustments                            |
| `1`     | 4          | 0.25        | Tight inner padding (badges, chips)          |
| `1.5`   | 6          | 0.375       | Icon-to-text gap                             |
| `2`     | 8          | 0.5         | Default gap between inline items             |
| `2.5`   | 10         | 0.625       | Small component padding                      |
| `3`     | 12         | 0.75        | Input padding, small card padding            |
| `4`     | 16         | 1.0         | **Standard component padding**, card padding |
| `5`     | 20         | 1.25        | Medium section padding                       |
| `6`     | 24         | 1.5         | Standard section spacing                     |
| `8`     | 32         | 2.0         | Large section spacing                        |
| `10`    | 40         | 2.5         | Container top/bottom padding                 |
| `12`    | 48         | 3.0         | Section separators                           |
| `16`    | 64         | 4.0         | Page section spacing                         |
| `20`    | 80         | 5.0         | Hero spacing                                 |
| `24`    | 96         | 6.0         | Maximum section spacing                      |

### Named Spacing Aliases

For easier reference in design discussions:

| Alias  | Token | Value  |
|--------|-------|--------|
| `xs`   | `1`   | 4px    |
| `sm`   | `2`   | 8px    |
| `md`   | `4`   | 16px   |
| `lg`   | `6`   | 24px   |
| `xl`   | `8`   | 32px   |
| `2xl`  | `12`  | 48px   |
| `3xl`  | `16`  | 64px   |

### Container Widths

| Breakpoint     | Container Max Width | Side Padding |
|----------------|---------------------|--------------|
| Mobile (< 640) | 100%                | 16px         |
| Tablet (640+)  | 640px               | 24px         |
| Desktop (1024+)| 1024px              | 32px         |
| Wide (1280+)   | 1280px              | 32px         |
| Ultra (1536+)  | 1440px              | 32px         |

### Grid System

12-column grid with responsive column spans:

| Breakpoint     | Columns | Gutter | Behavior                          |
|----------------|---------|--------|-----------------------------------|
| Mobile (< 640) | 4       | 16px   | Stack most elements               |
| Tablet (640+)  | 8       | 20px   | Two-column layouts                |
| Desktop (1024+)| 12      | 24px   | Full multi-column layouts         |

### Breakpoints

| Name       | Min Width | CSS Variable          |
|------------|-----------|----------------------|
| `sm`       | 640px     | `--breakpoint-sm`    |
| `md`       | 768px     | `--breakpoint-md`    |
| `lg`       | 1024px    | `--breakpoint-lg`    |
| `xl`       | 1280px    | `--breakpoint-xl`    |
| `2xl`      | 1536px    | `--breakpoint-2xl`   |

### Border Radius Scale

| Token          | Value  | Usage                                    |
|----------------|--------|------------------------------------------|
| `radius-none`  | 0      | Sharp edges (rare)                       |
| `radius-sm`    | 4px    | Small chips, tags                        |
| `radius-md`    | 8px    | Buttons, inputs, small cards             |
| `radius-lg`    | 12px   | Cards, image containers                  |
| `radius-xl`    | 16px   | Modals, bottom sheets                    |
| `radius-2xl`   | 24px   | Large hero cards                         |
| `radius-full`  | 9999px | Avatars, pills, circular buttons         |

### Shadow Scale

| Token          | Value                                          | Usage                     |
|----------------|------------------------------------------------|---------------------------|
| `shadow-xs`    | `0 1px 2px rgba(0,0,0,0.05)`                  | Subtle lift               |
| `shadow-sm`    | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` | Cards at rest |
| `shadow-md`    | `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | Hover cards, dropdowns |
| `shadow-lg`    | `0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)` | Modals, popovers |
| `shadow-xl`    | `0 24px 48px rgba(0,0,0,0.16), 0 8px 16px rgba(0,0,0,0.08)` | Full-screen overlays |

---

## Component Library Plan

### Architecture: Atomic Design

Components are organized using Atomic Design methodology, ensuring composability and reuse.

---

### Atoms

#### Button

The primary interactive element. Five variants cover all use cases.

**Variants:**
- **Primary** -- Filled with `primary-500`, white text. Main CTAs: "Publish Listing," "Send Message."
- **Secondary** -- Filled with `neutral-100`, `neutral-800` text. Secondary actions: "Save," "Share."
- **Outline** -- 1px `neutral-300` border, transparent fill. Tertiary actions: "Cancel," "View All."
- **Ghost** -- No border or fill, text only. In-line actions: "Edit," "Delete" (within context).
- **Danger** -- Filled with `error-600`, white text. Destructive actions: "Remove Listing," "Block User."

**Sizes:**
- `sm`: height 32px, padding 8px 12px, font 14px
- `md`: height 40px, padding 10px 16px, font 14px (default)
- `lg`: height 48px, padding 12px 24px, font 16px

**States:**
- Default, Hover (darken 8%), Active/Pressed (darken 12%), Focus (2px offset ring in `primary-400` at 50% opacity), Disabled (40% opacity, cursor not-allowed), Loading (spinner replaces text, same dimensions)

**Responsive:**
- Full-width on mobile (< 640px) when used as page-level CTA.
- Touch target minimum 44px (the `sm` size gets 44px hit area via padding even though visual height is 32px).

**Accessibility:**
- Semantic `<button>` element (never a styled `<div>`).
- `aria-disabled="true"` instead of `disabled` attribute when a tooltip needs to explain why.
- `aria-busy="true"` during loading state.
- Visible focus ring that is not removed.

---

#### Input

Text input with built-in label, validation, and helper text.

**Anatomy:**
1. Label (above, `body-sm` weight 500)
2. Input field (height 40px, padding 10px 12px, `neutral-200` border, `radius-md`)
3. Helper text or error message (below, `caption` size)
4. Optional leading/trailing icons (20px, `neutral-400`)

**States:**
- Default: `neutral-200` border, `neutral-0` background
- Focus: `primary-500` border (2px), light `primary-50` background, ring `primary-400/20`
- Error: `error-500` border, `error-50` background, error icon trailing
- Disabled: `neutral-100` background, `neutral-300` border, `neutral-400` text
- Read-only: `neutral-50` background, no border change

**Responsive:**
- Full-width by default. Side-by-side pairs on desktop when appropriate (e.g., First Name / Last Name).

**Accessibility:**
- Label linked via `htmlFor`/`id` pairing (never floating labels that disappear).
- `aria-describedby` pointing to helper/error text.
- `aria-invalid="true"` on error.
- Error messages announced via `aria-live="polite"`.

---

#### Badge

Small indicators for status, verification, and categorization.

**Types:**
- **Verification badge** -- Teal fill with check icon. "Verified Seller," "ID Verified."
- **Status badge** -- Semantic colors: green (Active), amber (Pending), red (Removed), gray (Expired/Closed).
- **Category badge** -- Neutral outlined. "Automotive," "Housing," "Services."
- **Promotion badge** -- Accent/amber fill. "Sponsored," "Featured," "Urgent."

**Sizes:**
- `sm`: height 20px, padding 2px 6px, `overline` text
- `md`: height 24px, padding 2px 8px, `caption` text (default)

**Accessibility:**
- Non-interactive badges use `<span>` with appropriate text content.
- Verification badges include `aria-label="Verified seller"` for screen readers.
- Color is never the only indicator -- icons and text provide redundant meaning.

---

#### Avatar

User profile image or initials fallback.

**Sizes:**
- `xs`: 24px (in-line mentions)
- `sm`: 32px (message list, compact views)
- `md`: 40px (card headers, comments)
- `lg`: 56px (profile headers)
- `xl`: 80px (profile page, settings)
- `2xl`: 120px (own profile edit)

**Fallback:** Two-letter initials on `primary-100` background with `primary-700` text.

**States:** Online indicator (green dot, bottom-right, 25% of avatar diameter).

**Accessibility:** `alt` text includes user name. Decorative avatars (alongside visible name) use `alt=""`.

---

#### Tag / Chip

Compact labels for filtering and categorization.

**Tag** (display-only): `neutral-100` background, `neutral-700` text, `radius-sm`, no interaction.

**Chip** (interactive): Same base style but with close icon (X) for removable filters. Hover shows `neutral-200` background.

**Filter Chip** (selectable): Outline style by default, switches to filled `primary-50` with `primary-500` border when selected.

---

### Molecules

#### SearchBar

The most critical molecule -- the entry point to the marketplace.

**Anatomy:**
1. Location input (leading map-pin icon, autocomplete dropdown for places)
2. Radius selector (dropdown or slider: 5, 10, 25, 50, 100 miles)
3. Keyword input (leading search icon, placeholder "Search cars, furniture, jobs...")
4. Search button (primary, hidden on mobile in favor of submit-on-enter)

**Desktop Layout:** Single row -- `[Location | Radius | Keyword | Search Button]` inside a card with `shadow-sm` and `radius-lg`.

**Mobile Layout:** Tapping the compact search bar expands to a full-screen overlay with stacked fields: Location (with "Use my location" option), Radius (slider with map circle preview), Keyword, and a prominent Search button at bottom.

**Accessibility:**
- `role="search"` on the containing form.
- `aria-label="Search marketplace listings"`.
- Autocomplete results navigable via arrow keys with `aria-activedescendant`.
- Live region announces result count: "24 results found."

---

#### ListingCard

The primary content unit across the entire application.

**Anatomy:**
1. Image area (aspect ratio 4:3, `radius-lg` top corners, lazy-loaded with blur-up placeholder)
2. Promotion badge (top-left overlay, if applicable: "Sponsored" / "Featured")
3. Favorite button (top-right, heart icon, 44px touch target)
4. Title (one line, `heading-sm`, truncate with ellipsis)
5. Price (`heading-md`, `primary-700` color; "Free" in `success-600`)
6. Location + distance (leading map-pin icon, `body-sm`, `neutral-500`)
7. Metadata row: condition badge, time posted (`caption`, `neutral-400`)

**Grid Layout:**
- Mobile: 2 columns, 8px gap
- Tablet: 3 columns, 12px gap
- Desktop: 4 columns, 16px gap
- Wide: 5 columns, 16px gap

**States:**
- Default: `shadow-xs` on card
- Hover: `shadow-md`, image scale 1.02 (150ms ease-out), slight upward translate (-2px)
- Pressed: scale 0.98 (100ms)
- Sold: grayscale overlay with "SOLD" badge

**Accessibility:**
- Entire card is a single `<a>` wrapping the content for easy tab navigation.
- Favorite button is a separate focusable element with `aria-label="Save listing: [title]"`.
- Image `alt` text auto-generated from listing title and category.

---

#### FilterChip Group

Horizontal scrolling row of selectable filter chips.

**Behavior:**
- Single-select for category (radio-like)
- Multi-select for attributes (checkbox-like)
- Scroll indicators (fade gradient) on overflow edges
- "Clear all" ghost button when any filter is active

---

#### PriceInput

Specialized number input for marketplace pricing.

**Anatomy:**
1. Currency symbol (leading, `neutral-500`)
2. Number input (formatted with commas as user types)
3. Price type selector (dropdown: Fixed, OBO, Free, Hourly)

**Guidance:** Below the input, display contextual price guidance when available: "Similar items in your area: $40 -- $60" in a `info-50` background card.

---

#### LocationPicker

Map-based location selection component.

**Anatomy:**
1. Text input with autocomplete (Google Places / Mapbox Search)
2. "Use my current location" button with GPS icon
3. Inline map preview showing pin
4. Radius circle visualization on the map (semi-transparent `primary-500` at 15% opacity)

**Privacy:** Display shows neighborhood-level precision by default ("Downtown Austin"), not exact address. Exact address revealed only after seller approves contact.

---

#### RatingStars

Dual-mode component for displaying and collecting ratings.

**Display Mode:**
- 5 stars, filled in `accent-300` up to the rating value.
- Supports half-star increments.
- Numeric rating and count beside: "4.5 (127 reviews)"

**Input Mode:**
- Stars enlarge on hover (scale 1.1).
- Click to select. Current selection highlighted.
- `aria-label="Rate [X] out of 5 stars"`, each star is a radio button in a `radiogroup`.

---

#### MessageBubble

Chat message display unit.

**Outgoing (sent by current user):**
- `primary-500` background, white text, `radius-lg` with `radius-sm` on bottom-right corner.
- Aligned right. Timestamp below, right-aligned.
- Status indicators: sending (clock), sent (single check), delivered (double check), read (double check in blue).

**Incoming:**
- `neutral-100` background, `neutral-800` text, `radius-lg` with `radius-sm` on bottom-left corner.
- Aligned left. Sender avatar (sm) to the left.

**System messages (safety prompts, listing context):**
- Centered, `neutral-50` rounded card, `caption` text, icon-led.
- Example: "Remember: Never send payment outside the app."

---

### Organisms

#### Header / Navigation

**Desktop:**
- Fixed top bar, 64px height, `neutral-0` background, `shadow-xs` bottom edge.
- Left: Logo/wordmark.
- Center: SearchBar (compact mode, 480px max-width).
- Right: Location indicator, Create Listing button (primary), Messages icon (with unread count badge), Notifications bell, User avatar dropdown.

**Mobile:**
- Fixed top bar, 56px height, with logo and condensed icons.
- Fixed bottom tab bar, 56px height + safe area inset: Home, Search, Create (+), Messages, Profile.
- Bottom bar uses `neutral-0` background, `shadow-lg` (inverted upward), `primary-500` for active tab icon.

**Accessibility:**
- `<nav>` landmark with `aria-label`.
- Skip-to-content link as first focusable element.
- Bottom bar items are `role="tab"` within `role="tablist"`.

---

#### ListingGrid

Responsive grid of ListingCard components.

**Features:**
- View toggle: Grid (default) / List.
- Sort controls: Distance, Newest, Price Low-High, Price High-Low.
- Result count: "248 listings within 25 miles."
- Infinite scroll with skeleton card placeholders (4--8 skeleton cards matching card dimensions).
- "Back to top" floating button appears after 2 screen-heights of scroll.

---

#### FilterSidebar

**Desktop:** 280px wide sidebar, left of ListingGrid, sticky below header.

**Mobile:** Bottom sheet that slides up to 70% of viewport height. Drag handle at top. "Apply Filters" sticky button at bottom of sheet.

**Contents:**
1. Category tree (expandable accordion)
2. Price range (dual-handle slider + min/max inputs)
3. Condition (chip group: New, Like New, Good, Fair, For Parts)
4. Posted within (chip group: 24h, 7 days, 30 days, Any)
5. Distance / Radius (slider: 1--100 miles with map circle update)
6. Category-specific filters (dynamic based on selected category):
   - Automotive: Year range, Make, Transmission, Fuel type, Title status
   - Housing: Beds, Baths, Pet-friendly, Furnished
   - Real Estate: Property type, HOA, Year built range

---

#### ChatWindow

**Desktop:** Two-panel layout. Left panel (320px): conversation list. Right panel: active conversation.

**Mobile:** Conversation list as full screen. Tapping opens conversation as a new screen (push navigation).

**Conversation list item:**
- Seller/buyer avatar (md), name, listing thumbnail (32px square), last message preview (one line), timestamp, unread count badge.

**Active conversation:**
- Top bar: Back arrow, other user's name + avatar, listing context card (collapsible), more menu (report, block).
- Message area: Scrollable, grouped by date. MessageBubble components.
- Listing context: Pinned mini-card at top showing listing image, title, price. Tappable to view listing.
- Input area: Text input, attachment button (photo), quick action menu (Suggest Safe Meetup, Make Offer), send button.
- Safety: System message injected at conversation start with safety tips.

---

#### ListingForm (Create/Edit)

Multi-step wizard for listing creation. Progress indicator at top.

**Step 1 -- Category:**
- Grid of category cards with icons (Automotive, Housing, Real Estate, For Sale, Services, Jobs, Community).
- Selecting reveals subcategory options in a secondary grid or dropdown.

**Step 2 -- Photos:**
- Drag-and-drop zone (desktop) / camera + gallery buttons (mobile).
- Grid preview of uploaded images with reorder via drag.
- Crop/rotate tool in a modal.
- First image auto-set as cover; draggable to reorder.
- Upload limit indicator: "3 of 10 photos."
- For automotive: Prompt for engine-start video.

**Step 3 -- Details:**
- Dynamic form fields based on category (pre-filled via AI image analysis when available).
- Title (required), Description (rich text light -- bold, bullet, link only).
- Category-specific structured fields rendered dynamically.

**Step 4 -- Pricing:**
- Price input with type selector.
- Price guidance display when data is available.

**Step 5 -- Visibility:**
- Radio group: Public, Followers Only, Private Link.
- Location precision control: neighborhood (default) or custom pin.

**Step 6 -- Review:**
- Full preview of the listing as it will appear.
- Edit buttons on each section to jump back.
- "Publish" primary CTA. "Save as Draft" secondary CTA.

**Responsive:**
- Mobile: Full-screen steps with next/back navigation at bottom.
- Desktop: Side panel or centered card (max 680px) with step navigation.

---

#### MapView

Interactive map showing listing locations.

**Desktop:** Side-by-side with listing grid (50/50 split, adjustable).
**Mobile:** Full-screen toggle from grid view.

**Map Features:**
- Cluster markers (show count when zoomed out).
- Individual pins with price label.
- Tapping a pin shows a mini ListingCard popup.
- Radius circle visualization around search center.
- "Search this area" button appears after user pans/zooms.

**Accessibility:**
- Map is supplementary to the list (not the only way to browse).
- `aria-label="Map showing listing locations"`.
- Keyboard-navigable pin list as an alternative.

---

#### UserProfileCard

Seller/buyer identity display.

**Anatomy:**
1. Avatar (lg or xl depending on context)
2. Display name + verification badges
3. Stats row: Member since, Response rate, Listings count, Rating
4. Bio (2 lines, expandable)
5. Action buttons: Message, View Profile, Report

---

### Templates

#### SearchResults Template

```
+--------------------------------------------------+
| [Header with search bar]                         |
+--------------------------------------------------+
| [Active filter chips] [Sort dropdown] [View toggle] [Map toggle] |
+----------+---------------------------------------+
| Filter   | Listing Grid                          |
| Sidebar  | [Card] [Card] [Card] [Card]           |
| (desktop)| [Card] [Card] [Card] [Card]           |
|          | [Skeleton cards on scroll...]          |
|          |                                       |
+----------+---------------------------------------+
```

Mobile: Filters behind bottom sheet. Full-width listing grid. Map as toggle overlay.

---

#### ListingDetail Template

```
+--------------------------------------------------+
| [Header]                                         |
+--------------------------------------------------+
| [Image Gallery - full width on mobile]           |
|                                                  |
| [< Back] [Share] [Save] [Report]                 |
+---------------------------+----------------------+
| Title                     | Seller Card          |
| Price         [Badges]    | [Avatar] Name        |
| Location + Distance       | [Stars] (reviews)    |
| Posted [time ago]         | [Badges: Verified]   |
|                           | [Message Seller] CTA |
| --- Details Section ---   | [Phone] (if shared)  |
| Category-specific fields  |                      |
| in structured layout      | Safety Tips Card     |
|                           | "Meet in public..."  |
| --- Description ---       |                      |
| Full text                 |                      |
|                           |                      |
| --- Similar Listings ---  |                      |
| [Card] [Card] [Card]     |                      |
+---------------------------+----------------------+
```

Mobile: Single column. Seller card becomes a sticky bottom bar with "Message Seller" CTA. Image gallery is swipeable carousel.

---

#### CreateListing Template

```
+--------------------------------------------------+
| [Header - simplified, logo + close/cancel]       |
+--------------------------------------------------+
| [Progress Steps: 1 2 3 4 5 6]                   |
+--------------------------------------------------+
|                                                  |
|  [Step Content Area - centered, max 680px]       |
|                                                  |
+--------------------------------------------------+
| [Back] .......................... [Next/Publish]  |
+--------------------------------------------------+
```

---

#### UserProfile Template

```
+--------------------------------------------------+
| [Header]                                         |
+--------------------------------------------------+
| [Cover area / gradient]                          |
| [Avatar XL] [Name] [Badges]                     |
| [Stats: Joined, Listings, Rating, Response Rate] |
| [Bio]                                            |
| [Edit Profile] (own) / [Message] [Report] (other)|
+--------------------------------------------------+
| [Tab Bar: Active Listings | Sold | Reviews]      |
+--------------------------------------------------+
| [ListingGrid or ReviewList based on active tab]  |
+--------------------------------------------------+
```

---

#### Messages Template

```
+------------------+-------------------------------+
| Conversations    | Active Chat                   |
| [Search]         | [User + Listing Context Bar]  |
|                  |                               |
| [Conv Item]      | [Safety System Message]       |
| [Conv Item] *    | [Message Bubbles...]          |
| [Conv Item]      |                               |
| [Conv Item]      |                               |
|                  | [Input + Actions Bar]         |
+------------------+-------------------------------+
```

Mobile: Single-screen conversation list, push to chat screen.

---

#### AdminDashboard Template

```
+--------+--------------------------------------------------+
| Sidebar| [Dashboard Header / Date Range Picker]           |
| Nav    +--------------------------------------------------+
|        | [Stats Cards Row]                                |
| Users  | [Listings Today] [Active Users] [Reports]        |
| Listings|                                                 |
| Reports+--------------------------------------------------+
| Mod    | [Moderation Queue]                               |
| Queue  | [Listing Snapshot | Signals | Actions]           |
| Analytics| [Listing Snapshot | Signals | Actions]         |
| Settings|                                                 |
|        +--------------------------------------------------+
|        | [Recent Activity Feed]                           |
+--------+--------------------------------------------------+
```

---

#### Seller Storefront Template (Phase 2)

```
+--------------------------------------------------+
| [Header]                                         |
+--------------------------------------------------+
| [Custom Banner / Branding Area]                  |
| [Business Avatar] [Business Name] [Badges]       |
| [Stats] [Rating] [Contact CTA]                   |
+--------------------------------------------------+
| [Category filter tabs for their inventory]       |
| [ListingGrid of their items]                     |
+--------------------------------------------------+
| [Reviews Section]                                |
+--------------------------------------------------+
```

---

## Page Layouts & User Flows

### 1. Home / Browse

**Purpose:** Orient the user, surface relevant content, encourage exploration.

**Layout (Top to Bottom):**

1. **Search bar** -- Most prominent element. On desktop, centered hero-style with subtle background gradient (`primary-50` to `neutral-0`). On mobile, compact bar at top of scroll area.

2. **Location indicator** -- Below search bar. Shows current location + radius. Tappable to change. Format: "Austin, TX -- 25 miles" with edit icon.

3. **Category quick-access** -- Horizontal scroll row of category cards. Each card: icon (40px), label, soft background color unique to category. 6--8 visible on desktop, 3.5 visible on mobile (revealing scroll).

4. **Featured/Promoted listings** -- "Featured Near You" section. Horizontal carousel of ListingCards with "Sponsored" badge. Max 10.

5. **Recent listings feed** -- "Just Listed Near You" section. Standard ListingGrid, infinite scroll. First load: 12--16 items.

6. **Saved searches nudge** -- If user has no saved searches, show a card: "Get notified when new items match your search." Links to saved search setup.

---

### 2. Search Results

**Purpose:** Help users find what they want with minimal effort.

**Flow:**
1. User enters query via SearchBar (location already set).
2. Results page loads with:
   - Active search parameters shown as removable filter chips at top.
   - Result count and sort controls.
   - Grid/List toggle and Map toggle.
3. Filter interactions update results in real-time (debounced 300ms).
4. Infinite scroll loads next batch. Skeleton cards shown during load.
5. Empty state: Illustration + "No listings found. Try expanding your search radius or adjusting filters."

---

### 3. Listing Detail

**Purpose:** Give buyer all information needed to decide to contact the seller.

**Critical path:** View details -> tap "Message Seller" -> compose first message.

**Image gallery:**
- Desktop: Large primary image (16:10 aspect) with thumbnail strip below.
- Mobile: Full-width swipeable carousel with dot indicators. Tap to open full-screen gallery with pinch-to-zoom.
- Photo count badge: "1/8" overlay.

**Info hierarchy:**
1. Price (largest text, `display-sm` weight 700)
2. Title (`heading-lg`)
3. Key badges: Condition, Posted time, Category
4. Location + distance
5. Structured fields (category-specific, in a clean key-value grid)
6. Description (expandable if > 4 lines)
7. Seller card (sticky on desktop sidebar, sticky bottom bar on mobile)
8. Similar listings carousel at bottom

---

### 4. Create Listing

**Purpose:** Get seller from "I want to sell this" to published listing with minimum friction.

**Flow (6 steps with ability to skip and return):**

1. Category selection (required first -- determines subsequent form fields)
2. Photos/video upload (strongly encouraged, not strictly required)
3. Details (title, description, category-specific fields)
4. Pricing (price, type, optional guidance display)
5. Visibility (public/followers/private)
6. Review and publish

**Friction reduction:**
- AI photo analysis auto-suggests category and title (when available).
- Draft auto-saved every 30 seconds and on navigation away.
- "Continue where you left off" prompt on next app open.
- Step indicators show completion state (green check, current step highlighted, future steps gray).

---

### 5. Chat / Messages

**Purpose:** Facilitate safe, context-rich communication between buyers and sellers.

**Flow:**
1. User taps "Message Seller" on a listing.
2. New conversation opens with listing context pinned at top.
3. Pre-populated message templates available: "Hi, is this still available?" / "What's the lowest price?" / custom.
4. Safety system message displayed once at start.
5. Contextual warnings injected when keywords like "Zelle" or "CashApp" detected.
6. Quick actions: "Suggest Safe Meetup," "Make Offer" (Phase 2), "Share Location."

---

### 6. User Profile

**Purpose:** Build trust through transparency about the user's marketplace history.

**Public Profile shows:**
- Display name, avatar, verification badges
- Member since date
- Response rate and time
- Rating (stars + count)
- Active listings grid
- Reviews from other users

**Own Profile (edit mode):**
- All of the above, plus edit controls
- Account settings link
- Verification prompt if not yet verified
- Listing management (active, drafts, sold, expired tabs)

---

### 7. Admin Dashboard

**Purpose:** Give moderators and admins efficient tools to keep the marketplace safe.

**Sections:**
- **Overview:** Key metrics cards (new listings/24h, flagged listings, active reports, new users, revenue).
- **Moderation queue:** Prioritized list of flagged listings with risk score, matched signals highlighted, one-click actions (approve, unlist, request changes, ban, shadow-ban).
- **User management:** Search, view history, adjust trust level, ban/suspend.
- **Listing management:** Search, bulk actions, category management.
- **Analytics:** Charts for listings volume, search trends, revenue, user growth.
- **Audit log:** Chronological feed of all admin actions with filters.

---

### 8. Seller Storefront (Phase 2)

**Purpose:** Give businesses a branded presence on the platform.

**Features:**
- Custom banner image and color accent
- Business description and hours
- Inventory grid with category tabs
- Review aggregation
- Contact CTA and social links

---

## Key Interaction Patterns

### Radius Search UX

The radius search is the product's defining feature and must feel intuitive.

**Desktop:**
- Slider control (1--100 miles, non-linear: 1, 2, 5, 10, 15, 25, 50, 75, 100).
- Map beside the slider shows a circle overlay updating in real-time as the slider moves.
- Circle uses `primary-500` at 12% opacity fill and 60% opacity 2px stroke.
- Listing count updates live: "~142 listings in this area."

**Mobile:**
- Full-screen map with draggable radius circle.
- Bottom card shows radius value and listing count.
- Pre-set quick buttons: 5mi, 10mi, 25mi, 50mi.

---

### Photo Upload

**Desktop:**
- Drag-and-drop zone with dashed border, icon, and "Drag photos here or click to browse."
- Drop zone highlights on dragover (`primary-50` background, `primary-300` border).
- Uploaded photos appear in a reorderable grid. Drag to reorder.
- Hover shows overlay with crop, rotate, and delete buttons.

**Mobile:**
- Two buttons: "Take Photo" (camera) and "Choose from Gallery."
- Selected photos appear in horizontal scroll strip.
- Long-press to reorder. Tap to see crop/delete options.

**Upload progress:** Individual progress bars per photo. Optimistic display (show immediately, upload in background).

**Constraints:**
- Client-side resize to max 2048px before upload.
- WebP conversion on upload.
- Max 10 photos, 1 video (60s max).

---

### Real-Time Chat

- Typing indicator: Animated three-dot pulse in the other user's bubble position.
- Message delivery states: Sending (gray clock), Sent (single check), Delivered (double check), Read (blue double check).
- New message: Scroll to bottom with smooth animation if user is near bottom. If scrolled up, show "New message" floating indicator.
- Push notification when app is backgrounded.

---

### Infinite Scroll with Skeleton Loading

- Sentinel element 2 viewport-heights before the end triggers next page load.
- Show 4--8 skeleton cards matching the actual card dimensions.
- Skeleton cards pulse with a shimmer animation (left-to-right gradient sweep, 1.5s duration, infinite).
- "End of results" message after final page.
- On error: "Something went wrong. Tap to retry" with retry button.

---

### Toast Notifications

- Position: Bottom-center on mobile, bottom-right on desktop.
- Stack up to 3 toasts. Oldest dismissed first.
- Auto-dismiss after 5 seconds (longer for errors: 8 seconds).
- Manual dismiss via close button or swipe (mobile).
- Types: Success (green left border + check icon), Error (red + X icon), Warning (amber + alert icon), Info (blue + info icon).
- Slide-in from bottom with fade (200ms ease-out). Slide-out to right with fade (150ms ease-in).

---

### Modal Confirmations

Used for destructive actions only: delete listing, block user, report, cancel transaction.

- Overlay: `neutral-950` at 50% opacity, click-outside to dismiss.
- Modal card: max-width 480px, `radius-xl`, `shadow-xl`, centered vertically.
- Content: Icon (contextual), title, description, two buttons (Cancel outline, Confirm danger).
- Enter key triggers confirm. Escape key triggers cancel.
- Focus trapped within modal. First focus on cancel button (safe default).

---

### Bottom Sheet (Mobile)

- Drag handle: 32px wide, 4px tall, `neutral-300`, `radius-full`, centered at top.
- Snap points: 40% (peek), 70% (default), 95% (expanded).
- Velocity-based dismiss: fast downward swipe closes.
- Background dims progressively with sheet height.
- Content scrolls within sheet when at max height.

---

## Responsive Strategy

### Breakpoint Behavior Matrix

| Component          | Mobile (< 640)          | Tablet (640-1024)       | Desktop (> 1024)         |
|--------------------|-------------------------|-------------------------|--------------------------|
| Navigation         | Bottom tab bar          | Bottom tab bar          | Top header bar           |
| Search bar         | Compact, tap to expand  | Inline, medium width    | Inline, full-featured    |
| Filters            | Bottom sheet            | Collapsible sidebar     | Persistent sidebar       |
| Listing grid       | 2 columns               | 3 columns               | 4-5 columns              |
| Map view           | Full-screen toggle      | Side-by-side toggle     | Side-by-side persistent  |
| Listing detail     | Single column stacked   | Two-column              | Two-column with sidebar  |
| Chat               | Full-screen push nav    | Split view              | Split view               |
| Create listing     | Full-screen steps       | Centered card steps     | Centered card steps      |
| Admin dashboard    | Not supported*          | Sidebar + content       | Sidebar + content        |

*Admin dashboard requires minimum 768px. Shows "Use a larger screen" message on mobile.

### Navigation Transitions

- **Mobile bottom bar to desktop top bar**: Components shared, position and arrangement change. No duplicate navigation rendered.
- **Mobile push navigation**: New screens slide in from right. Back slides out to right. 250ms ease-in-out.
- **Desktop navigation**: Standard page loads with content transition (fade 150ms).

### Image Handling

- Serve responsive images via `srcset` with breakpoint-appropriate sizes.
- Mobile: 320w, 640w.
- Tablet: 640w, 960w.
- Desktop: 960w, 1280w.
- Listing detail gallery: up to 1920w.
- All images served as WebP with JPEG fallback.
- Blur-up placeholder technique: tiny (20px) blurred version inline, full image lazy-loaded.

---

## Accessibility Standards

### WCAG 2.1 AA Compliance Checklist

**Perceivable:**
- [x] All images have meaningful `alt` text (or `alt=""` for decorative).
- [x] Color contrast ratios meet 4.5:1 (text) and 3:1 (UI components).
- [x] Information is never conveyed by color alone (icons, text, patterns supplement).
- [x] Text can be resized to 200% without loss of content.
- [x] Captions/transcripts for video content (Phase 2).

**Operable:**
- [x] All functionality available via keyboard.
- [x] Visible focus indicators on all interactive elements (2px ring, `primary-400` at 50% opacity, 2px offset).
- [x] No keyboard traps (except modals, which trap focus intentionally with Escape to close).
- [x] Skip-to-content link on every page.
- [x] Touch targets minimum 44x44px.
- [x] No content that flashes more than 3 times per second.

**Understandable:**
- [x] Consistent navigation across pages.
- [x] Form inputs have visible, persistent labels.
- [x] Error messages are specific and suggest correction.
- [x] Language attribute set on `<html>`.
- [x] Predictable behavior (no unexpected context changes).

**Robust:**
- [x] Semantic HTML5 elements (`nav`, `main`, `header`, `footer`, `article`, `section`).
- [x] ARIA landmarks for page regions.
- [x] ARIA live regions for dynamic content updates (search results count, toast notifications, chat messages).
- [x] Tested with screen readers (VoiceOver, NVDA, TalkBack).

### Focus Management

- Tab order follows visual order (left-to-right, top-to-bottom).
- Modal open: focus moves to first focusable element inside modal.
- Modal close: focus returns to the element that triggered the modal.
- Route change: focus moves to the main content heading (`<h1>`).
- Infinite scroll: new content does not steal focus from current position.

### Screen Reader Announcements

| Event                        | Announcement                                    |
|------------------------------|------------------------------------------------|
| Search results loaded        | "[N] listings found within [radius] miles"     |
| Filter applied               | "Filter applied. [N] results."                 |
| Listing saved                | "Listing saved to favorites"                    |
| Message sent                 | "Message sent"                                  |
| Photo uploaded               | "Photo [N] of [M] uploaded successfully"       |
| Listing published            | "Your listing is live"                          |
| Error occurred               | "[Specific error message]"                      |

---

## Motion & Animation

### Principles

1. **Purposeful**: Every animation communicates a state change, guides attention, or provides feedback. No animation for decoration.
2. **Subtle**: Durations between 150ms and 300ms. Users should feel the interface is responsive, not theatrical.
3. **Performant**: Only animate `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, or layout-triggering properties.
4. **Reducible**: Respect `prefers-reduced-motion`. When active, replace animations with instant state changes.

### Animation Tokens

| Token                | Duration | Easing               | Usage                          |
|----------------------|----------|----------------------|--------------------------------|
| `transition-fast`    | 150ms    | ease-out             | Hover states, color changes    |
| `transition-normal`  | 200ms    | ease-in-out          | Expand/collapse, toggles       |
| `transition-slow`    | 300ms    | ease-in-out          | Page transitions, modals       |
| `transition-spring`  | 400ms    | cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy entrances (sparingly) |

### Keyframe Animations

**Skeleton Shimmer:**
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
/* Applied: background: linear-gradient(90deg, neutral-100 25%, neutral-200 50%, neutral-100 75%);
   background-size: 200% 100%; animation: shimmer 1.5s infinite; */
```

**Fade In Up (page content entrance):**
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Pulse (typing indicator, live badges):**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Spin (loading spinners):**
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Slide In Bottom (toasts, bottom sheets):**
```css
@keyframes slideInBottom {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Scale In (modals, popovers):**
```css
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

---

## Appendix: Design Token Summary

All tokens are available as CSS custom properties (`--token-name`), Tailwind classes, and TypeScript constants. The source of truth is the Tailwind configuration file at `packages/ui/tailwind.config.ts`, which generates CSS custom properties via `globals.css`.

### File Structure

```
packages/ui/
  tailwind.config.ts      -- Theme configuration (colors, spacing, typography, etc.)
  src/
    globals.css            -- CSS custom properties, base styles, animations
    components/
      Button.tsx           -- Button atom
      Input.tsx            -- Input atom
      Badge.tsx            -- Badge atom
      ListingCard.tsx      -- ListingCard molecule
      SearchBar.tsx        -- SearchBar molecule
      RatingStars.tsx      -- RatingStars molecule
```
