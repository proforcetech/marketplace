# Category System & Search Parameters

Developer reference for the Marketplace category taxonomy, navigation structure, search filters, and data model.

**Source of truth:** [`/CATEGORIES.md`](../CATEGORIES.md) (master category matrix)

---

## Table of Contents

- [Overview](#overview)
- [Navigation Sections](#navigation-sections)
- [Full Category Reference](#full-category-reference)
- [Search Parameters](#search-parameters)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Adding New Categories](#adding-new-categories)

---

## Overview

### Hierarchy

The category system uses a three-level hierarchy:

```
Section (navigation grouping)
  └── Category (top-level or parent)
        └── Subcategory (child)
```

- **Sections** are navigation-level groupings (e.g., "Marketplace", "Vehicles", "Housing"). They determine how categories are presented in the UI but are not stored as database rows. There are 10 sections.
- **Categories** are top-level entries within a section. In the Marketplace section, these are standalone (no parent). In other sections, the section name itself is the parent category.
- **Subcategories** are children of a parent category (e.g., "Cars & Trucks" under "Vehicles").

### Listing-to-Category Relationship

A listing belongs to exactly **one canonical category** via the `category_id` foreign key on the `listings` table. There are no many-to-many relationships.

### Alternate Navigation Pattern

Three categories -- **Trailers**, **Marine / Boats**, and **Powersports** -- appear in two navigation contexts:

1. As standalone top-level items in the **Marketplace** browse section
2. As subcategories under the **Vehicles** section

These are stored **once** in the database under their canonical parent (Vehicles). The duplicate appearance in the Marketplace section is handled entirely through frontend navigation configuration and shared constants -- not by creating duplicate database rows.

When a user clicks "Trailers" from the Marketplace section or from the Vehicles section, they reach the same category and the same listings.

---

## Navigation Sections

| # | Section | Purpose | Category Count | Has Alternate Nav? |
|---|---------|---------|---------------:|:------------------:|
| 1 | Marketplace | General for-sale items, miscellaneous goods | 31 (28 unique + 3 alternate) | Yes |
| 2 | Vehicles | Motor vehicles of all types | 13 | Yes |
| 3 | Vehicle Parts | Parts and accessories for vehicles | 9 | No |
| 4 | Home | Home goods, decor, household items | 3 | No |
| 5 | Business / Commercial / Industrial | Commercial equipment, supplies, materials | 15 | No |
| 6 | Alternative Fuel & Energy | Heating, solar, wind, alternative energy | 6 | No |
| 7 | Housing | Rentals, real estate, rooms, parking | 10 | No |
| 8 | Services | Professional and personal services | 22 | No |
| 9 | Jobs | Employment listings by industry | 30 | No |
| 10 | Gigs | Short-term and freelance work | 8 | No |

### Alternate Navigation Categories

These three categories are canonical subcategories of **Vehicles** but also appear as top-level items in **Marketplace** browse:

| Category | Canonical Location | Alternate Location |
|----------|-------------------|-------------------|
| Trailers | Vehicles > Trailers | Marketplace > Trailers |
| Marine / Boats | Vehicles > Marine / Boats | Marketplace > Marine / Boats |
| Powersports | Vehicles > Powersports | Marketplace > Powersports |

---

## Full Category Reference

### Marketplace

| Display Path | Slug | Level | Alternate Nav? |
|-------------|------|-------|:--------------:|
| Antiques & Collectibles | `antiques-collectibles` | Category | No |
| Appliances | `appliances` | Category | No |
| Arts & Crafts | `arts-crafts` | Category | No |
| Aviation | `aviation` | Category | No |
| Baby & Kids | `baby-kids` | Category | No |
| Barter | `barter` | Category | No |
| Beauty | `beauty` | Category | No |
| Bicycle Parts | `bicycle-parts` | Category | No |
| Bicycles | `bicycles` | Category | No |
| Books | `books` | Category | No |
| CDs, DVDs & VHS | `cds-dvds-vhs` | Category | No |
| Cell Phones | `cell-phones` | Category | No |
| Clothing & Accessories | `clothing-accessories` | Category | No |
| Electronics | `electronics` | Category | No |
| Farm & Garden | `farm-garden` | Category | No |
| Free | `free` | Category | No |
| Garage Sale | `garage-sale` | Category | No |
| General | `general` | Category | No |
| Jewelry & Watches | `jewelry-watches` | Category | No |
| Materials | `materials` | Category | No |
| Music Instruments | `music-instruments` | Category | No |
| Photo & Video | `photo-video` | Category | No |
| Camping & Outdoors | `camping-outdoors` | Category | No |
| Sporting Goods | `sporting-goods` | Category | No |
| Tickets | `tickets` | Category | No |
| Tools | `tools` | Category | No |
| Video Gaming | `video-gaming` | Category | No |
| Wanted | `wanted` | Category | No |
| Trailers | `trailers` | Category | Yes |
| Marine / Boats | `marine-boats` | Category | Yes |
| Powersports | `powersports` | Category | Yes |

### Vehicles

| Display Path | Slug | Level | Alternate Nav? |
|-------------|------|-------|:--------------:|
| Vehicles > Cars & Trucks | `cars-trucks` | Subcategory | No |
| Vehicles > Classic Cars | `classic-cars` | Subcategory | No |
| Vehicles > Collector Cars | `collector-cars` | Subcategory | No |
| Vehicles > Commercial Trucks | `commercial-trucks` | Subcategory | No |
| Vehicles > Exotic Cars | `exotic-cars` | Subcategory | No |
| Vehicles > Marine / Boats | `marine-boats` | Subcategory | Yes |
| Vehicles > Motorcycles | `motorcycles` | Subcategory | No |
| Vehicles > Powersports | `powersports` | Subcategory | Yes |
| Vehicles > RVs & Campers | `rvs-campers` | Subcategory | No |
| Vehicles > Trailers | `trailers` | Subcategory | Yes |
| Vehicles > Other Vehicles | `other-vehicles` | Subcategory | No |
| Vehicles > Parts Vehicles | `parts-vehicles` | Subcategory | No |
| Vehicles > Golf Carts | `golf-carts` | Subcategory | No |

### Vehicle Parts

| Display Path | Slug | Level |
|-------------|------|-------|
| Vehicle Parts > Auto & Truck Parts | `auto-truck-parts` | Subcategory |
| Vehicle Parts > Motorcycle Parts | `motorcycle-parts` | Subcategory |
| Vehicle Parts > Powersports Parts | `powersports-parts` | Subcategory |
| Vehicle Parts > Marine Parts | `marine-parts` | Subcategory |
| Vehicle Parts > RV Parts | `rv-parts` | Subcategory |
| Vehicle Parts > Trailer Parts | `trailer-parts` | Subcategory |
| Vehicle Parts > Wheels & Tires | `wheels-tires` | Subcategory |
| Vehicle Parts > Other Vehicle Parts | `other-vehicle-parts` | Subcategory |
| Vehicle Parts > Parts Vehicles | `parts-vehicles` | Subcategory |

### Home

| Display Path | Slug | Level |
|-------------|------|-------|
| Home > Home & Decor | `home-decor` | Subcategory |
| Home > Household | `household` | Subcategory |
| Home > Games & Toys | `games-toys` | Subcategory |

### Business / Commercial / Industrial

| Display Path | Slug | Level |
|-------------|------|-------|
| Business / Commercial / Industrial > Building Materials | `building-materials` | Subcategory |
| Business / Commercial / Industrial > Tools, Light Equipment & Workshop Equipment | `tools-light-equipment-workshop` | Subcategory |
| Business / Commercial / Industrial > Electrical Equipment & Supplies | `electrical-equipment-supplies` | Subcategory |
| Business / Commercial / Industrial > Fasteners & Hardware | `fasteners-hardware` | Subcategory |
| Business / Commercial / Industrial > Healthcare, Lab & Dental | `healthcare-lab-dental` | Subcategory |
| Business / Commercial / Industrial > Heavy Equipment, Parts & Attachments | `heavy-equipment-parts-attachments` | Subcategory |
| Business / Commercial / Industrial > HVAC & Refrigeration | `hvac-refrigeration` | Subcategory |
| Business / Commercial / Industrial > Hydraulics | `hydraulics` | Subcategory |
| Business / Commercial / Industrial > Pneumatics | `pneumatics` | Subcategory |
| Business / Commercial / Industrial > Pumps & Plumbing | `pumps-plumbing` | Subcategory |
| Business / Commercial / Industrial > Material Handling | `material-handling` | Subcategory |
| Business / Commercial / Industrial > Printing & Graphic Arts | `printing-graphic-arts` | Subcategory |
| Business / Commercial / Industrial > Restaurant & Food Service Equipment | `restaurant-food-service-equipment` | Subcategory |
| Business / Commercial / Industrial > Testing, Measurement & Inspection | `testing-measurement-inspection` | Subcategory |
| Business / Commercial / Industrial > Pallet Sales | `pallet-sales` | Subcategory |

### Alternative Fuel & Energy

| Display Path | Slug | Level |
|-------------|------|-------|
| Alternative Fuel & Energy > Wood Heating | `wood-heating` | Subcategory |
| Alternative Fuel & Energy > Waste Oil Heating | `waste-oil-heating` | Subcategory |
| Alternative Fuel & Energy > Wood & Pellets | `wood-pellets` | Subcategory |
| Alternative Fuel & Energy > Solar | `solar` | Subcategory |
| Alternative Fuel & Energy > Wind | `wind` | Subcategory |
| Alternative Fuel & Energy > Other Alternative Energy | `other-alternative-energy` | Subcategory |

### Housing

| Display Path | Slug | Level |
|-------------|------|-------|
| Housing > Apartments / Housing for Rent | `apartments-housing-rent` | Subcategory |
| Housing > Housing Swap | `housing-swap` | Subcategory |
| Housing > Housing Wanted | `housing-wanted` | Subcategory |
| Housing > Office / Commercial | `office-commercial` | Subcategory |
| Housing > Parking / Storage | `parking-storage` | Subcategory |
| Housing > Real Estate for Sale | `real-estate-for-sale` | Subcategory |
| Housing > Rooms / Shared | `rooms-shared` | Subcategory |
| Housing > Rooms Wanted | `rooms-wanted` | Subcategory |
| Housing > Sublets / Temporary | `sublets-temporary` | Subcategory |
| Housing > Vacation Rentals | `vacation-rentals` | Subcategory |

### Services

| Display Path | Slug | Level |
|-------------|------|-------|
| Services > Automotive | `automotive` | Subcategory |
| Services > Beauty | `beauty` | Subcategory |
| Services > Cell / Mobile | `cell-mobile` | Subcategory |
| Services > Computer | `computer` | Subcategory |
| Services > Creative | `creative` | Subcategory |
| Services > Cycle | `cycle` | Subcategory |
| Services > Event | `event` | Subcategory |
| Services > Farm & Garden | `farm-garden-services` | Subcategory |
| Services > Financial | `financial` | Subcategory |
| Services > Health & Wellness | `health-wellness` | Subcategory |
| Services > Household | `household-services` | Subcategory |
| Services > Business Services | `business-services` | Subcategory |
| Services > Labor / Moving | `labor-moving` | Subcategory |
| Services > Legal | `legal` | Subcategory |
| Services > Lessons | `lessons` | Subcategory |
| Services > Marine | `marine-services` | Subcategory |
| Services > Pet | `pet` | Subcategory |
| Services > Real Estate | `real-estate-services` | Subcategory |
| Services > Skilled Trade | `skilled-trade-services` | Subcategory |
| Services > Small Business Ads | `small-business-ads` | Subcategory |
| Services > Travel / Vacation | `travel-vacation` | Subcategory |
| Services > Writing / Editing / Translation | `writing-editing-translation` | Subcategory |

### Jobs

| Display Path | Slug | Level |
|-------------|------|-------|
| Jobs > Accounting & Finance | `accounting-finance` | Subcategory |
| Jobs > Administrative / Office | `administrative-office` | Subcategory |
| Jobs > Architecture | `architecture` | Subcategory |
| Jobs > Engineering | `engineering` | Subcategory |
| Jobs > Art / Media / Design | `art-media-design` | Subcategory |
| Jobs > Biotech / Science | `biotech-science` | Subcategory |
| Jobs > Business / Management | `business-management` | Subcategory |
| Jobs > Customer Service | `customer-service` | Subcategory |
| Jobs > Education | `education` | Subcategory |
| Jobs > Miscellaneous | `miscellaneous` | Subcategory |
| Jobs > Hospitality | `hospitality` | Subcategory |
| Jobs > General Labor | `general-labor` | Subcategory |
| Jobs > Government | `government` | Subcategory |
| Jobs > Human Resources | `human-resources` | Subcategory |
| Jobs > Legal / Paralegal | `legal-paralegal` | Subcategory |
| Jobs > Manufacturing | `manufacturing` | Subcategory |
| Jobs > Marketing / Public Relations | `marketing-public-relations` | Subcategory |
| Jobs > Medical & Health | `medical-health` | Subcategory |
| Jobs > Nonprofit | `nonprofit` | Subcategory |
| Jobs > Real Estate | `real-estate-jobs` | Subcategory |
| Jobs > Retail / Wholesale | `retail-wholesale` | Subcategory |
| Jobs > Sales | `sales` | Subcategory |
| Jobs > Salon / Spa / Fitness | `salon-spa-fitness` | Subcategory |
| Jobs > Security | `security` | Subcategory |
| Jobs > Skilled Trade | `skilled-trade-jobs` | Subcategory |
| Jobs > Software / IT / Technical Support | `software-it-technical-support` | Subcategory |
| Jobs > Transportation | `transportation` | Subcategory |
| Jobs > TV / Film / Video | `tv-film-video` | Subcategory |
| Jobs > Web / Information Design | `web-information-design` | Subcategory |
| Jobs > Writing / Editing | `writing-editing` | Subcategory |

### Gigs

| Display Path | Slug | Level |
|-------------|------|-------|
| Gigs > Computer | `computer-gigs` | Subcategory |
| Gigs > Creative / Design | `creative-design-gigs` | Subcategory |
| Gigs > Crew | `crew` | Subcategory |
| Gigs > Domestic | `domestic` | Subcategory |
| Gigs > Event | `event-gigs` | Subcategory |
| Gigs > General Labor | `general-labor-gigs` | Subcategory |
| Gigs > Talent | `talent` | Subcategory |
| Gigs > Writing | `writing-gigs` | Subcategory |

---

## Search Parameters

### Universal Parameters

These filters apply across most categories.

| Parameter | Input Type | Allowed Values | Notes |
|-----------|-----------|----------------|-------|
| Price | Range | Min / Max (integer, cents) | |
| Condition | Single select | New; Like New; Good; Fair; Poor | |
| Location | Location | lat/lng coordinate pair | Required for all searches |
| Distance / Radius | Single select | Integer (miles) | Default: 25 |
| Keyword Search | Free text | String | Full-text search via `q` param |
| Date Posted | Single select | `24h`; `7d`; `30d` | |
| Has Photos | Boolean | Yes / No | |
| Pickup / Delivery / Shipping | Multi-select | | |

### Vehicles

Applies to: Cars & Trucks, Classic Cars, Collector Cars, Commercial Trucks, Exotic Cars, Motorcycles, RVs & Campers, and most vehicle subcategories.

| Parameter | Input Type | Allowed Values | Notes |
|-----------|-----------|----------------|-------|
| Year | Range | Min / Max | |
| Make | Single select | Dynamic list | |
| Model | Single select | Dynamic list (depends on Make) | |
| Trim | Single select | Dynamic list | |
| Mileage | Range | Min / Max | |
| Fuel Type | Single select | Gasoline; Diesel; Electric; Hybrid; Flex Fuel | |
| Transmission | Single select | Automatic; Manual; CVT | |
| Drive Type | Single select | FWD; RWD; AWD; 4WD | |
| Body Style | Single select | Sedan; SUV; Truck; Coupe; Hatchback; Van; Wagon; Convertible | |
| Title Status | Single select | Clean; Salvage; Rebuilt; Lemon; Parts Only | |
| Exterior Color | Single select | | |
| VIN Search | Free text | 17-character VIN | |

### Vehicle Parts

Applies to: All subcategories under Vehicle Parts.

| Parameter | Input Type | Allowed Values | Notes |
|-----------|-----------|----------------|-------|
| Make | Single select | Dynamic list | |
| Model | Single select | Dynamic list | |
| Year | Single select | | |
| Part Type | Single select | Category-dependent | |
| Part Number | Free text | | |
| OEM / Aftermarket | Single select | OEM; Aftermarket | |
| Fits Multiple Vehicles | Boolean | Yes / No | |
| Local Pickup / Shipping Available | Single select | | |

### Wheels & Tires

Applies to: Vehicle Parts > Wheels & Tires only.

| Parameter | Input Type | Allowed Values | Notes |
|-----------|-----------|----------------|-------|
| Wheel Diameter | Single select | Inches | |
| Wheel Width | Single select | Inches | |
| Bolt Pattern | Single select | e.g., 5x114.3, 6x139.7 | |
| Center Bore | Single select | mm | |
| Offset | Single select | mm | |
| Tire Size | Single select | e.g., 265/70R17 | |
| Tire Type | Multi-select | Winter; All-Season; Summer; All-Terrain; Mud-Terrain | |
| Wheel Material | Multi-select | Steel; Aluminum / Alloy | |

### Housing

Applies to: All subcategories under Housing.

| Parameter | Input Type | Allowed Values | Notes |
|-----------|-----------|----------------|-------|
| Bedrooms | Range | Min / Max | |
| Bathrooms | Range | Min / Max | |
| Property Type | Multi-select | House; Apartment; Room; Condo; Townhouse; Duplex; Flat; In-Law Suite; Cottage; Cabin; Manufactured Home; Assisted Living; Land; Trailer / Mobile Home | |
| Pet Policy | Multi-select | Pets Allowed; Dog Friendly; Cat Friendly; No Pets | |
| EV Charging | Boolean | Yes / No | |
| Wheelchair Accessible | Boolean | Yes / No | |
| Air Conditioning | Boolean | Yes / No | |
| Furnished | Boolean | Yes / No | |
| Rental Period | Single select | Daily; Weekly; Monthly; Lease | |
| Laundry | Single select | In Unit; Hookups; On Site; Laundry Building; No Laundry | |
| Parking | Multi-select | Carport; Attached Garage; Detached Garage; Off-Street Parking; Street Parking; Valet; Parking Garage / Structure; No Parking | |

### Commercial Property

Applies to: Housing > Office / Commercial only.

| Parameter | Input Type | Allowed Values | Notes |
|-----------|-----------|----------------|-------|
| Price | Currency | | |
| Price per Sq. Ft. | Currency | | |
| Lease Rate | Currency | Per month / per year | |
| Property Type | Single select | | |
| Lease Term Length | Single select | | |

### Parking & Storage

Applies to: Housing > Parking / Storage only.

| Parameter | Input Type | Allowed Values | Notes |
|-----------|-----------|----------------|-------|
| Indoor / Outdoor | Single select | Indoor; Outdoor | |
| Secured Access | Boolean | Yes / No | |
| Camera System | Boolean | Yes / No | |
| Climate Controlled | Boolean | Yes / No | |

---

## Database Schema

### Category Storage

Categories are stored in the `categories` table with a self-referencing `parent_id` for hierarchy.

```
categories
├── id           text (CUID)     PK
├── parent_id    text            FK → categories.id (null = top-level section/category)
├── name         varchar(100)    Display name
├── slug         varchar(100)    URL-friendly identifier (unique)
├── description  text            Optional description
├── icon         varchar(50)     Icon identifier for UI
├── position     int             Display order within parent
├── is_active    boolean         Whether category is enabled
└── created_at   timestamptz
```

Prisma model:

```prisma
model Category {
  id          String  @id @default(cuid())
  parentId    String? @map("parent_id")
  name        String  @db.VarChar(100)
  slug        String  @unique @db.VarChar(100)
  description String?
  icon        String? @db.VarChar(50)
  position    Int     @default(0)
  isActive    Boolean @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()

  parent   Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children Category[] @relation("CategoryHierarchy")
  fields   CategoryField[]
  listings Listing[]

  @@index([parentId])
  @@index([isActive, position])
  @@map("categories")
}
```

### Category Fields (Search Parameters)

Category-specific search parameters and listing form fields are defined in `category_fields`. Each field belongs to one category and describes both how the data is collected (form input) and how it can be filtered (search parameter).

```
category_fields
├── id            text (CUID)           PK
├── category_id   text                  FK → categories.id
├── name          varchar(100)          Internal name (e.g., "mileage", "bolt_pattern")
├── label         varchar(100)          Display label (e.g., "Mileage", "Bolt Pattern")
├── type          category_field_type   text | number | select | multiselect | boolean
├── options       jsonb                 Allowed values for select/multiselect (JSON array)
├── is_required   boolean               Required for listing creation
├── is_filterable boolean               Exposed as a search filter
├── validation    jsonb                 Validation rules (min, max, pattern, etc.)
├── position      int                   Display order in forms
└── created_at    timestamptz
```

**`options` field format** (for `select` and `multiselect` types):

```json
["Gasoline", "Diesel", "Electric", "Hybrid", "Flex Fuel"]
```

**`validation` field format** (for `number` types):

```json
{ "min": 0, "max": 500000 }
```

### Listing Field Values (EAV Pattern)

When a listing is created, its category-specific data is stored in `listing_field_values` using an Entity-Attribute-Value pattern:

```
listing_field_values
├── id                text (CUID)    PK
├── listing_id        text           FK → listings.id
├── category_field_id text           FK → category_fields.id
├── value             text           Stored as text, validated against field type
└── created_at        timestamptz

Unique constraint: (listing_id, category_field_id)
```

This design allows each category to have a different set of structured fields without schema changes.

### How Listings Reference Categories

A listing has a single `category_id` foreign key pointing to its canonical category in the `categories` table:

```
listings.category_id  →  categories.id
```

There is no join table. One listing, one category.

### How Alternate Navigation Works

The three alternate-nav categories (Trailers, Marine / Boats, Powersports) exist as **one row each** in the `categories` table, stored canonically under the Vehicles parent.

The Marketplace-section appearance is handled through:

1. **Shared navigation constants** (in `packages/shared/src/constants/`) that map section slugs to the list of category slugs to display
2. **Frontend route configuration** that resolves the alternate display path to the canonical category slug

No duplicate database rows are created. The same `category_id` is used regardless of which navigation path the user followed.

### Relevant Indexes

```sql
-- Find children of a parent category
CREATE INDEX idx_categories_parent ON categories (parent_id);

-- Active categories sorted by position
CREATE INDEX idx_categories_active_pos ON categories (is_active, position);

-- Category fields by category
CREATE INDEX idx_category_fields_category ON category_fields (category_id);

-- Listing field values for filtering
CREATE INDEX idx_listing_field_values_field ON listing_field_values (category_field_id, value);
CREATE INDEX idx_listing_field_values_listing ON listing_field_values (listing_id);
```

---

## API Reference

### `GET /api/v1/categories`

Returns the full category tree. Top-level categories (where `parent_id` is null) include their children nested.

**Auth:** None required

**Response `200`:**

```json
{
  "data": [
    {
      "id": "cat_vehicles",
      "name": "Vehicles",
      "slug": "vehicles",
      "icon": "car",
      "position": 1,
      "children": [
        {
          "id": "cat_cars_trucks",
          "name": "Cars & Trucks",
          "slug": "cars-trucks",
          "icon": null,
          "position": 0,
          "field_count": 12
        }
      ]
    }
  ]
}
```

### `GET /api/v1/categories/:slug`

Returns a single category by slug, including its `CategoryField` definitions. Use this to build dynamic listing forms and filter UIs.

**Auth:** None required

**Response `200`:**

```json
{
  "data": {
    "id": "cat_cars_trucks",
    "name": "Cars & Trucks",
    "slug": "cars-trucks",
    "parent": {
      "id": "cat_vehicles",
      "name": "Vehicles",
      "slug": "vehicles"
    },
    "fields": [
      {
        "id": "fld_year",
        "name": "year",
        "label": "Year",
        "type": "number",
        "options": null,
        "is_required": true,
        "is_filterable": true,
        "validation": { "min": 1900, "max": 2027 },
        "position": 0
      },
      {
        "id": "fld_make",
        "name": "make",
        "label": "Make",
        "type": "select",
        "options": ["Acura", "Audi", "BMW", "..."],
        "is_required": true,
        "is_filterable": true,
        "validation": null,
        "position": 1
      }
    ]
  }
}
```

### `GET /api/v1/search`

Searches listings with geographic and category-based filters. When a `category` slug is provided, the response includes the category's filterable fields so the frontend can render filter controls.

**Key parameters for category filtering:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Category slug (e.g., `cars-trucks`). Filters results to this category and its children. |
| `fields[<name>]` | string | Category-specific field filter. Name matches `CategoryField.name`. |
| `fields[<name>][min]` | string | Range filter minimum (for number fields). |
| `fields[<name>][max]` | string | Range filter maximum (for number fields). |

**Example request:**

```
GET /api/v1/search?lat=30.27&lng=-97.74&radius=25&category=cars-trucks&fields[make]=Honda&fields[year][min]=2018&fields[year][max]=2022&fields[transmission]=automatic
```

See [API_DESIGN.md](./API_DESIGN.md#search) for the full search endpoint specification including pagination, sorting, and universal filters.

---

## Adding New Categories

### Step 1: Update the master matrix

Edit `/CATEGORIES.md` to add the new category row(s) with:
- Section assignment
- Display path
- Parent category (if subcategory)
- Category name
- Slug (kebab-case, unique)
- Level (Category or Subcategory)
- Canonical data group
- Alternate navigation flag (if applicable)

### Step 2: Add to the database seed

Edit `apps/api/prisma/seed.ts`:

```typescript
// Add the category
await prisma.category.upsert({
  where: { slug: 'new-category' },
  update: {},
  create: {
    name: 'New Category',
    slug: 'new-category',
    parentId: parentCategory.id,  // null for top-level
    position: 10,
    isActive: true,
  },
});

// Add category-specific fields (if any)
await prisma.categoryField.create({
  data: {
    categoryId: newCategory.id,
    name: 'field_name',
    label: 'Field Label',
    type: 'select',
    options: ['Option 1', 'Option 2'],
    isRequired: false,
    isFilterable: true,
    position: 0,
  },
});
```

### Step 3: Run the seed

```bash
pnpm --filter api db:seed
```

### Step 4: Update shared constants

If the new category needs alternate navigation or special frontend handling, update the navigation constants in `packages/shared/src/constants/`.

### Step 5: Verify

1. Check `GET /api/v1/categories` returns the new category in the tree
2. Check `GET /api/v1/categories/:slug` returns the correct fields
3. Create a test listing in the new category and verify field validation
4. Test search filtering with any new category-specific parameters
