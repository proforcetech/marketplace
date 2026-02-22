# Mobile Architecture - Location-Based Marketplace

## Table of Contents

1. [Framework Decision](#framework-decision)
2. [App Architecture](#app-architecture)
3. [Platform-Specific Features](#platform-specific-features)
4. [Performance Strategy](#performance-strategy)
5. [Deployment and CI/CD](#deployment-and-cicd)
6. [Cross-Platform Considerations](#cross-platform-considerations)
7. [Security](#security)

---

## Framework Decision

### React Native with Expo (SDK 52+)

**Selected:** React Native with Expo managed workflow and Expo Router for file-based navigation.

**Rationale:**

| Factor | React Native + Expo | Flutter | Native (Swift/Kotlin) |
|--------|--------------------:|--------:|----------------------:|
| Code sharing with Next.js web | High (shared TS types, business logic, API client) | None | None |
| Team velocity (single TS codebase) | High | Medium | Low (2 teams) |
| Native module access | Good (Expo Modules API + config plugins) | Good | Full |
| OTA updates | Yes (EAS Update) | No | No |
| Maps/Camera/Notifications ecosystem | Mature | Mature | Full |
| Startup time | Good | Good | Best |
| App size baseline | ~15 MB | ~10 MB | ~5 MB |

**Why Expo specifically (vs bare React Native):**

- **EAS Build** removes the need to maintain Xcode/Gradle build infrastructure locally.
- **EAS Update** enables over-the-air JS bundle updates for non-native changes, meaning bug fixes and UI changes ship in minutes rather than days (app store review).
- **Expo Router** provides file-based routing that mirrors Next.js conventions, reducing cognitive overhead when switching between web and mobile codebases.
- **Config plugins** allow native module integration without ejecting from the managed workflow. Modules like `expo-camera`, `expo-location`, `expo-notifications`, and `expo-secure-store` cover all required native APIs.
- **Prebuild** generates native projects on demand, so we can inspect and customize native code when needed without permanently maintaining it.

**Shared code strategy:**

```
packages/
  shared/
    src/
      types/          # TypeScript interfaces (Listing, User, Message, etc.)
      validators/     # Zod schemas shared between API, web, and mobile
      constants/      # Category trees, status enums, config values
      utils/          # Pure functions (formatting, calculations, geo math)
      api-client/     # Generated or hand-written typed API client
```

The `packages/shared` workspace package is consumed by both `apps/web` (Next.js) and `apps/mobile` (Expo) via the monorepo workspace. This guarantees type parity between web and mobile and eliminates drift in business logic.

---

## App Architecture

### Navigation Structure (Expo Router)

Expo Router uses file-system-based routing. The navigation hierarchy:

```
src/app/
  _layout.tsx                    # Root layout (providers, auth gate)
  (auth)/
    _layout.tsx                  # Auth stack layout
    login.tsx                    # Login screen
    register.tsx                 # Registration screen
    verify.tsx                   # OTP verification
  (tabs)/
    _layout.tsx                  # Tab bar layout
    index.tsx                    # Browse / Home feed
    search.tsx                   # Search with filters + map
    create.tsx                   # Create listing entry point
    messages.tsx                 # Conversations list
    profile.tsx                  # User profile + settings
  listing/
    [id].tsx                     # Listing detail (push from any tab)
    [id]/
      edit.tsx                   # Edit listing
      promote.tsx                # Purchase promotion
  chat/
    [id].tsx                     # Chat thread
  user/
    [id].tsx                     # Public user profile
  settings/
    _layout.tsx                  # Settings stack
    index.tsx                    # Settings menu
    account.tsx                  # Account settings
    notifications.tsx            # Notification preferences
    privacy.tsx                  # Privacy settings
    saved-searches.tsx           # Saved search alerts
  create/
    _layout.tsx                  # Create listing flow stack
    category.tsx                 # Category selection
    details.tsx                  # Listing details form
    media.tsx                    # Photo/video capture and upload
    pricing.tsx                  # Pricing and visibility
    review.tsx                   # Review before publish
```

**Deep Linking Strategy:**

| Route | Universal Link (iOS) | App Link (Android) |
|-------|---------------------:|--------------------:|
| Listing detail | `marketplace.app/listing/:id` | `marketplace.app/listing/:id` |
| User profile | `marketplace.app/user/:id` | `marketplace.app/user/:id` |
| Chat thread | `marketplace.app/chat/:id` | `marketplace.app/chat/:id` |
| Search | `marketplace.app/search?q=...&radius=...` | same |
| Create listing | `marketplace.app/create` | same |

Deep links are configured in `app.json` via Expo's `intentFilters` (Android) and `associatedDomains` (iOS). The `apple-app-site-association` and `.well-known/assetlinks.json` files are served from the web domain.

When a deep link opens the app:
1. If the user is authenticated, navigate directly to the target screen.
2. If not authenticated, redirect to login, then deep link destination after auth completes.
3. If the app is not installed, the universal link falls through to the web version.

### State Management

**Server state: TanStack Query (React Query v5)**

All data fetched from the API is managed by TanStack Query. This provides:
- Automatic caching and cache invalidation
- Background refetching (stale-while-revalidate)
- Optimistic updates (for actions like favoriting a listing)
- Offline persistence via `persistQueryClient` with MMKV storage
- Request deduplication
- Pagination and infinite scroll support via `useInfiniteQuery`

**Client state: Zustand**

Lightweight client-only state that does not come from the server:
- Auth state (current user, tokens)
- UI state (active filters, map viewport, create-listing draft)
- App preferences (theme, notification settings)
- WebSocket connection state

**Why this combination:**
- TanStack Query eliminates the need for manual loading/error/caching logic for server data.
- Zustand is simpler than Redux for the small amount of true client state.
- Both integrate cleanly with React Native and support middleware/persistence.

```typescript
// Example: Zustand auth store
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tokens: TokenPair) => void;
  clearAuth: () => void;
}

// Example: TanStack Query hook
function useListings(filters: ListingFilters) {
  return useInfiniteQuery({
    queryKey: ['listings', filters],
    queryFn: ({ pageParam }) => api.listings.search({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}
```

### API Client Strategy

The API client is a typed wrapper around `fetch` (or `ky`/`wretch` for ergonomics), shared between web and mobile via `packages/shared/api-client/`.

```typescript
// packages/shared/src/api-client/index.ts
class MarketplaceAPI {
  constructor(private baseUrl: string, private getToken: () => Promise<string | null>) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });
    if (!response.ok) throw new APIError(response);
    return response.json();
  }

  listings = {
    search: (params: SearchParams) => this.request<PaginatedResponse<Listing>>('/listings', { ... }),
    get: (id: string) => this.request<Listing>(`/listings/${id}`),
    create: (data: CreateListingDTO) => this.request<Listing>('/listings', { method: 'POST', ... }),
    // ...
  };
}
```

On mobile, the `getToken` function reads from `expo-secure-store`. On web, it reads from an httpOnly cookie or memory. Same API surface, different token storage backends.

### Offline Support Plan

**Tier 1 - Read Cache (MVP):**
- TanStack Query persists its cache to MMKV storage.
- Previously viewed listings, search results, and messages are available offline.
- A banner indicates "You are offline - showing cached data" when connectivity is lost.
- Cached data has a staleness indicator (e.g., "Last updated 2 hours ago").

**Tier 2 - Draft Persistence:**
- Listing creation drafts are stored locally in Zustand (persisted to MMKV).
- If the user closes the app mid-creation, they are prompted to resume on next launch.
- Photos selected for upload are kept in a temp directory and referenced by the draft.

**Tier 3 - Queued Actions (Phase 2+):**
- Sending messages while offline queues them with `pending` status.
- When connectivity resumes, the queue is flushed in order.
- Favoriting/unfavoriting uses optimistic updates; failures revert on reconnect.
- A background sync service reconciles local state with server state.

**Implementation:**
```
MMKV (react-native-mmkv)
  ├── TanStack Query cache (serialized)
  ├── Auth tokens (encrypted partition)
  ├── User preferences
  └── Draft listings

SQLite (expo-sqlite)
  └── Chat message history (for large message volumes)
```

MMKV is chosen over AsyncStorage for its synchronous API and significantly better performance (50-100x faster than AsyncStorage in benchmarks).

---

## Platform-Specific Features

### Location Services

**Permission Handling:**

| Scenario | iOS | Android |
|----------|----:|--------:|
| Initial prompt | `requestForegroundPermissionsAsync()` | `requestForegroundPermissionsAsync()` |
| Background location | Separate prompt required; must justify in App Store review | `ACCESS_BACKGROUND_LOCATION` (separate prompt on Android 11+) |
| "Always" to "While Using" downgrade | User can change in Settings | User can change in Settings |
| Approximate vs precise | iOS 14+ offers approximate option | Android 12+ offers approximate option |

**Permission flow:**

1. On first launch, do NOT immediately request location. Instead, show a pre-permission screen explaining why location matters for a marketplace ("Find items near you").
2. Request "While Using" permission first. This is sufficient for all browse/search functionality.
3. Only request "Always" (background) permission when the user enables saved search alerts with push notifications. Explain the value proposition at that moment.
4. If permission is denied, gracefully fall back to manual zip code or city entry.
5. Monitor permission changes via `expo-location` event listeners and adapt UI accordingly.

**Background Location (Saved Search Alerts):**

- Used only for the "Alert me when new items matching my search appear near me" feature.
- On iOS, use significant location change monitoring (low power, ~500m granularity) rather than continuous GPS tracking.
- On Android, use the Geofencing API to trigger checks when the user enters/exits defined regions.
- Background location is fully optional and clearly disclosed to the user.
- The privacy policy and App Store description must explain this usage.

**Location Accuracy Settings:**

```typescript
// User can control their location precision
type LocationPrecision = 'exact' | 'approximate' | 'manual';

// 'exact' - GPS coordinates (for distance sorting)
// 'approximate' - Rounded to ~1 mile (shown to other users)
// 'manual' - User enters zip code, no GPS used

// Listings always display approximate location to other users.
// Exact location is never shared. Distance calculations use exact
// coordinates server-side but only return the rounded distance.
```

### Camera and Media

**Camera-First Listing Creation Flow:**

The "Create Listing" tab opens directly to a camera interface, reducing friction to list an item. This is the primary differentiator for the mobile experience vs web.

```
[Camera viewfinder]
     |
     v
[Review captured photos] --> [Add more from gallery]
     |
     v
[AI analysis suggests category + title]  (Phase 2)
     |
     v
[Fill in details (pre-populated where possible)]
     |
     v
[Set price (with price guidance)]
     |
     v
[Review + Publish]
```

**Photo/Video Pipeline:**

1. **Capture:** `expo-camera` with quality preset `medium` (1080p photos, 720p video).
2. **Client-side resize:** Before upload, resize images to max 2048px on longest edge using `expo-image-manipulator`. This reduces a typical 4K phone photo from ~8 MB to ~500 KB.
3. **WebP conversion:** Convert to WebP format on-device using `expo-image-manipulator` (compress with quality 0.8). Falls back to JPEG if WebP encoding is unavailable on older devices.
4. **EXIF stripping:** Remove all EXIF metadata (especially GPS coordinates) on-device before upload using `expo-image-manipulator`. This is a privacy requirement, not optional.
5. **Upload:** Multipart upload to presigned S3 URLs. Progress indicator shown per image.
6. **Server-side processing:** The server generates additional sizes (thumbnail 200px, medium 600px, large 1200px) and stores all variants.

**Multi-Image Picker:**

- Use `expo-image-picker` with `allowsMultipleSelection: true`.
- Support reordering via drag-and-drop (using `react-native-reanimated` + gesture handler).
- Per-image crop tool (aspect ratio locked to listing card dimensions).
- Maximum 12 images per listing (enforced client and server side).
- Progress bar per image during upload.

### Push Notifications

**Architecture:**

```
                    +---------+
                    |   API   |
                    +----+----+
                         |
                    +----+----+
                    |  Queue  | (BullMQ)
                    +----+----+
                         |
              +----------+----------+
              |                     |
         +----+----+          +----+----+
         |   FCM   |          |  APNs   |
         | (Android)|          |  (iOS)  |
         +----+----+          +----+----+
              |                     |
         +----+----+          +----+----+
         | Android |          |   iOS   |
         |  Device |          |  Device |
         +---------+          +---------+
```

Expo Notifications (`expo-notifications`) abstracts FCM and APNs. Push tokens are registered with the API on login and refreshed on each app foreground.

**Notification Categories:**

| Category | Priority | Contains Image | Deep Link Target |
|----------|----------|---------------:|----------------:|
| `new_message` | High | Sender avatar | `/chat/:threadId` |
| `listing_approved` | Default | Listing thumbnail | `/listing/:id` |
| `listing_rejected` | Default | No | `/listing/:id/edit` |
| `promo_expiring` | Default | Listing thumbnail | `/listing/:id/promote` |
| `saved_search_alert` | Default | Listing thumbnail | `/listing/:id` |
| `new_rating` | Low | No | `/profile` |
| `safety_alert` | High | No | `/chat/:threadId` |

**Rich Notifications:**

- iOS: Use notification service extension (configured via Expo config plugin) to download and attach images before display.
- Android: Use `BigPictureStyle` via FCM data payload for image-rich notifications.
- Both platforms: Action buttons on message notifications ("Reply", "Mark as Read") using notification categories.

**Notification Preferences:**

Users can granularly control which categories they receive, with sensible defaults:
```typescript
interface NotificationPreferences {
  messages: boolean;        // default: true
  listingUpdates: boolean;  // default: true
  promoExpiring: boolean;   // default: true
  savedSearchAlerts: boolean; // default: true
  ratings: boolean;         // default: true
  safetyAlerts: boolean;    // default: true (non-disableable)
  marketingUpdates: boolean; // default: false
}
```

### Maps Integration

**Component:** `react-native-maps` (Apple Maps on iOS, Google Maps on Android).

Using Apple Maps on iOS avoids the Google Maps SDK license cost and provides a more native feel. Google Maps on Android is the platform default.

**Features:**

1. **Listing markers:** Custom markers showing price badges on the map. Tapping a marker shows a compact listing card overlay.
2. **Radius visualization:** A semi-transparent circle overlay centered on the user's search location, showing the active search radius.
3. **Cluster markers:** When zoomed out, nearby listings collapse into cluster markers showing count. Uses `react-native-map-clustering` with supercluster algorithm.
4. **Map/list toggle:** A toggle at the top of the search screen switches between list view (FlashList) and map view. Filter state is shared between both views.
5. **Region-based loading:** As the user pans the map, new listings are fetched for the visible region. Debounced to avoid excessive API calls (300ms after pan ends).

**Map Performance:**

- Limit visible markers to 100 at any zoom level. Use clustering aggressively.
- Marker images are pre-rendered and cached (not generated on each render).
- Map region changes are throttled and debounced.
- On low-memory devices, fall back to list-only view.

### Chat / Real-Time

**WebSocket Connection Management:**

```typescript
// Connection lifecycle
class ChatConnectionManager {
  // 1. Connect on app foreground + user authenticated
  // 2. Reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
  // 3. Disconnect on app background (after 30s grace period)
  // 4. Reconnect on app foreground, fetch missed messages via REST
  // 5. Heartbeat every 30s to detect stale connections
}
```

**Message Persistence:**

- Messages are stored in SQLite (`expo-sqlite`) for fast local queries.
- On app launch, sync strategy: fetch messages newer than the latest local message timestamp.
- SQLite schema supports full-text search for message history.
- Old messages (> 6 months) can be archived to reduce local DB size.

**Chat Features:**

| Feature | Implementation |
|---------|---------------:|
| Text messages | WebSocket send + REST fallback |
| Image sharing | Upload to S3, send URL via WebSocket |
| Typing indicators | WebSocket event (throttled to 1/3s) |
| Read receipts | WebSocket event + REST batch update |
| Listing context | Attached listing card at top of thread |
| Safety prompts | Injected by server based on message content analysis |
| Block/report | REST API call + local UI update |

**QR Code Handshake (Proof of Exchange):**

1. Buyer's app generates a unique, time-limited QR code for the transaction.
2. Seller scans it using `expo-camera` barcode scanner.
3. The scan triggers an API call that marks the listing as "transferred."
4. Both parties receive a prompt to rate each other.
5. The QR code contains a signed JWT with transaction ID, buyer ID, and expiry (15 minutes).

### Biometric Authentication

**Implementation using `expo-local-authentication`:**

```typescript
// Check biometric availability
const { hasHardware, isEnrolled, supportedTypes } = await LocalAuthentication.getEnrolledLevelAsync();

// supportedTypes: FINGERPRINT, FACIAL_RECOGNITION, IRIS

// Prompt for biometric auth
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Authenticate to access your account',
  cancelLabel: 'Use passcode',
  disableDeviceFallback: false, // Allow PIN/passcode fallback
});
```

**Token Storage:**

| Platform | Mechanism | Encryption |
|----------|----------:|----------:|
| iOS | Keychain via `expo-secure-store` | Hardware-backed (Secure Enclave) |
| Android | Keystore via `expo-secure-store` | Hardware-backed (TEE/StrongBox) |

**Auth Flow with Biometrics:**

1. User logs in with credentials (email/phone + password/OTP).
2. On successful login, prompt: "Enable Face ID / fingerprint for faster login?"
3. If accepted, store the refresh token in secure storage with biometric protection.
4. On subsequent launches, prompt biometric auth to unlock the stored token.
5. If biometric fails 3 times, fall back to full credential login.
6. If the user changes their biometric enrollment (adds a new fingerprint), invalidate stored tokens and require re-authentication.

---

## Performance Strategy

### Image Loading and Caching

**Library:** `expo-image` (built on SDWebImage for iOS, Glide for Android).

`expo-image` replaces the legacy `FastImage` library and ships with Expo. It provides:
- Disk and memory caching with configurable policies.
- Progressive JPEG/WebP loading (blur-up placeholder).
- Animated format support (GIF, animated WebP).
- `blurhash` or `thumbhash` placeholder support. The API returns a blurhash string with each image URL, so the placeholder renders instantly before the image downloads.

```typescript
<Image
  source={{ uri: listing.images[0].url }}
  placeholder={{ blurhash: listing.images[0].blurhash }}
  transition={200}
  contentFit="cover"
  recyclingKey={listing.id}
  style={{ width: '100%', aspectRatio: 4 / 3 }}
/>
```

### List Virtualization

**Library:** `@shopify/flash-list`

FlashList is used for all scrollable lists (listing feeds, search results, message lists, conversation lists). It provides:
- Recycling-based rendering (like `RecyclerListView`) rather than unmount/remount.
- Consistent 60fps scrolling even with complex list items.
- Built-in blank area tracking to measure and optimize list performance.

```typescript
<FlashList
  data={listings}
  renderItem={renderListingCard}
  estimatedItemSize={280}
  onEndReached={fetchNextPage}
  onEndReachedThreshold={0.5}
  ListEmptyComponent={<EmptyState type="no-listings" />}
  ListFooterComponent={isFetchingNextPage ? <LoadingSpinner /> : null}
/>
```

### Bundle Size Optimization

| Technique | Expected Impact |
|-----------|----------------:|
| Tree shaking (Metro bundler) | Remove unused code paths |
| Lazy loading non-critical screens | Reduce initial bundle by ~30% |
| Hermes engine (default in Expo) | Faster startup, lower memory via bytecode |
| Asset optimization (compressed images, subset fonts) | Reduce asset payload |
| Avoid large dependencies (moment.js -> date-fns, lodash -> individual imports) | Reduce JS bundle |

Target: Initial JS bundle under 2 MB (compressed). Hermes bytecode compilation reduces parse time significantly.

### Startup Time Optimization

**Target:** Cold start to interactive content in under 2 seconds on mid-range devices.

**Strategy:**

1. **Splash screen** (`expo-splash-screen`): Show branded splash immediately while JS loads.
2. **Minimal root component:** The root layout only initializes auth state and navigation. No heavy data fetching.
3. **Deferred initialization:** Non-critical services (analytics, crash reporting, notification registration) initialize after first frame renders.
4. **Prefetch on splash:** While the splash screen is visible, prefetch the home feed data so it is ready when the tab renders.
5. **Hermes engine:** Pre-compiled bytecode eliminates JS parse time.

### Memory Management for Media-Heavy Views

- **Image recycling:** `expo-image` and FlashList both support view recycling, preventing memory growth during long scrolls.
- **Video autoplay:** Only the visible video plays. Others are paused and their buffers released.
- **Gallery view:** When viewing a listing with 12 high-res images in a swiper, only load full-res for the current and adjacent images. Others show thumbnails.
- **Memory warnings:** Register for `didReceiveMemoryWarning` (iOS) and trim image caches aggressively when triggered.
- **Monitoring:** Use `expo-dev-client` memory profiling during development. Set up Sentry performance monitoring in production.

---

## Deployment and CI/CD

### Build Pipeline (EAS Build)

```
GitHub Push/PR
     |
     v
GitHub Actions
     |
     +---> Lint + TypeScript check
     +---> Unit tests (Jest)
     +---> Integration tests
     |
     v (on merge to main)
EAS Build
     |
     +---> iOS build (ipa)
     +---> Android build (aab)
     |
     v
EAS Submit (automated)
     |
     +---> TestFlight (iOS internal testing)
     +---> Play Store Internal Track (Android)
     |
     v (manual promotion)
     |
     +---> App Store (phased rollout)
     +---> Play Store Production (staged rollout: 1% -> 5% -> 25% -> 100%)
```

### OTA Updates (EAS Update)

For changes that do not modify native modules (JS-only changes):

```
GitHub Push to main
     |
     v
EAS Update
     |
     +---> Publish update to "production" channel
     |
     v
App checks for updates on foreground
     |
     +---> Download in background
     +---> Apply on next cold start
```

**OTA update policies:**
- Critical bug fixes: Force update on next app open.
- Feature updates: Download in background, apply on next cold start.
- Non-native changes (UI tweaks, copy changes, business logic): Always OTA, never require store update.
- Native changes (new Expo module, SDK upgrade): Requires store build.

### Environment Strategy

| Environment | API | OTA Channel | Build Profile |
|-------------|----:|------------:|--------------:|
| Development | `dev-api.marketplace.app` | `development` | `development` (includes dev client) |
| Staging | `staging-api.marketplace.app` | `staging` | `preview` |
| Production | `api.marketplace.app` | `production` | `production` |

### Versioning Strategy

```
Version format: MAJOR.MINOR.PATCH (e.g., 1.2.3)

MAJOR: Breaking changes, major redesigns
MINOR: New features, significant changes
PATCH: Bug fixes, minor improvements

Build number: Auto-incremented by EAS Build

Runtime version: Tied to native module set. Changes when native dependencies
change. Used by EAS Update to ensure OTA updates only go to compatible builds.
```

### App Store Submission Checklist

**iOS (App Store Connect):**
- [ ] App privacy details (data collection declaration)
- [ ] Background location usage description (if enabled)
- [ ] Camera usage description
- [ ] Photo library usage description
- [ ] Notification permission description
- [ ] App Tracking Transparency (if any tracking)
- [ ] Screenshots for all required device sizes (6.7", 6.5", 5.5", iPad)
- [ ] Review notes explaining marketplace category and content moderation

**Android (Google Play Console):**
- [ ] Content rating questionnaire
- [ ] Data safety form
- [ ] Target SDK compliance (API 34+)
- [ ] Permissions declaration
- [ ] Store listing with required assets
- [ ] Review of Families Policy (if applicable, likely N/A)

---

## Cross-Platform Considerations

### Feature Parity Matrix

| Feature | iOS | Android | Notes |
|---------|----:|--------:|------:|
| Core browsing + search | Full | Full | |
| Map view | Apple Maps | Google Maps | Different SDKs, same UX |
| Camera capture | Full | Full | |
| Push notifications | APNs | FCM | Abstracted by expo-notifications |
| Background location | Significant change monitoring | Geofencing API | Different APIs, same user feature |
| Biometric auth | Face ID / Touch ID | Fingerprint / Face Unlock | Abstracted by expo-local-authentication |
| Deep links | Universal Links | App Links | Both require server-side verification files |
| Share extension | Phase 2 | Phase 2 | Share images directly into listing creation |
| Widgets | Phase 3 | Phase 3 | "Nearby deals" home screen widget |
| In-app purchases | Apple IAP required for digital goods | Google Play Billing | Promoted listings are NOT digital goods (they are advertising services), so Stripe is acceptable |

### Platform-Specific UI Adaptations

**Navigation:**
- iOS: Large title headers that collapse on scroll. Swipe-back gesture for stack navigation.
- Android: Standard toolbar headers. System back button and predictive back gesture (Android 14+).

**Tab Bar:**
- iOS: Bottom tab bar with labels, following Human Interface Guidelines.
- Android: Bottom navigation bar following Material Design 3 guidelines.

**Modals:**
- iOS: Sheet-style modals with drag-to-dismiss.
- Android: Full-screen or bottom sheet modals.

**Haptics:**
- iOS: `expo-haptics` for button presses, success/error feedback, pull-to-refresh.
- Android: Standard vibration patterns (more conservative, as haptic quality varies by device).

**Typography:**
- iOS: SF Pro (system font), Dynamic Type support for accessibility.
- Android: Roboto (system font), scalable text following Material guidelines.

Both platforms use `Platform.select()` or platform-specific file extensions (`.ios.tsx`, `.android.tsx`) for divergent implementations. The goal is ~95% shared code with 5% platform-specific polish.

### Permission Handling Differences

```typescript
// Unified permission hook
function usePermission(type: 'camera' | 'location' | 'notifications' | 'mediaLibrary') {
  // 1. Check current status
  // 2. If undetermined, show pre-permission rationale screen
  // 3. Request system permission
  // 4. If denied:
  //    - iOS: Direct user to Settings app (Linking.openSettings())
  //    - Android 11+: If denied twice, must go to Settings (system won't show prompt again)
  //    - Android <11: Can re-request
  // 5. Return { status, request, isGranted }
}
```

### Deep Linking / Universal Links / App Links

**Configuration:**

```json
// app.json excerpt
{
  "expo": {
    "ios": {
      "associatedDomains": ["applinks:marketplace.app"],
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Find items and services near your location.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Get notified when new items appear near you.",
        "NSCameraUsageDescription": "Take photos of items you want to sell.",
        "NSPhotoLibraryUsageDescription": "Select photos from your library for your listings."
      }
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [{ "scheme": "https", "host": "marketplace.app", "pathPrefix": "/" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

**Server-side requirements:**

`https://marketplace.app/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.marketplace.app",
        "paths": ["/listing/*", "/user/*", "/chat/*", "/search*"]
      }
    ]
  }
}
```

`https://marketplace.app/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.marketplace.app",
    "sha256_cert_fingerprints": ["..."]
  }
}]
```

---

## Security

### Secure Storage

- **Auth tokens:** Stored in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android). Never in AsyncStorage or MMKV.
- **Biometric-protected access:** Refresh tokens require biometric unlock to retrieve.
- **Token rotation:** Access tokens expire in 15 minutes. Refresh tokens expire in 30 days. Refresh token rotation on each use (old refresh token is invalidated).

### Network Security

- **Certificate pinning:** Configured via Expo config plugin for production builds. Pins the API server's certificate to prevent MITM attacks.
- **TLS 1.3:** API server requires TLS 1.3 minimum.
- **Request signing:** Critical mutation endpoints (create listing, send payment) include a request signature using a device-specific key.

### Data Protection

- **At rest:** All sensitive data (tokens, draft listings with personal info) is encrypted at rest via platform-level encryption (iOS Data Protection, Android FBE).
- **EXIF stripping:** Enforced both client-side (before upload) and server-side (belt and suspenders).
- **Location privacy:** User's exact coordinates are never exposed in API responses to other users. Only approximate distances are shown.
- **Clipboard protection:** Sensitive fields (OTP input) are excluded from clipboard history on Android 13+.
- **Screenshot prevention:** Chat screens containing sensitive information can optionally prevent screenshots (using `FLAG_SECURE` on Android, notification on iOS).

### App Integrity

- **Jailbreak/root detection:** Warn users on compromised devices but do not block (reduces false positives).
- **Tamper detection:** Hermes bytecode validation ensures the JS bundle has not been modified.
- **Play Integrity API (Android) / App Attest (iOS):** Used to verify API requests originate from a genuine app install, protecting against scrapers and automated abuse.

---

## Appendix: Key Dependencies

| Package | Purpose | Version Strategy |
|---------|--------:|----------------:|
| `expo` | Core framework | Latest SDK (52+) |
| `expo-router` | File-based navigation | Bundled with Expo |
| `expo-camera` | Camera access | Bundled with Expo |
| `expo-location` | GPS + geofencing | Bundled with Expo |
| `expo-notifications` | Push notifications | Bundled with Expo |
| `expo-image` | Image rendering + caching | Bundled with Expo |
| `expo-secure-store` | Secure token storage | Bundled with Expo |
| `expo-local-authentication` | Biometric auth | Bundled with Expo |
| `expo-image-manipulator` | Image resize/compress/EXIF strip | Bundled with Expo |
| `expo-haptics` | Haptic feedback | Bundled with Expo |
| `expo-sqlite` | Local message persistence | Bundled with Expo |
| `react-native-maps` | Map views | Community package + config plugin |
| `react-native-map-clustering` | Marker clustering | Community package |
| `@shopify/flash-list` | Performant lists | Community package |
| `@tanstack/react-query` | Server state management | v5 |
| `zustand` | Client state management | v5 |
| `react-native-mmkv` | Fast key-value storage | Community package |
| `react-native-reanimated` | Animations + gestures | Community package + config plugin |
| `react-native-gesture-handler` | Gesture system | Community package |
| `zod` | Schema validation (shared) | Via packages/shared |
