import {
  PrismaClient,
  UserRole,
  ListingStatus,
  PriceType,
  ItemCondition,
  CategoryFieldType,
  Prisma,
} from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashPw(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function makeSlug(title: string, suffix = ''): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return suffix ? `${base}-${suffix}` : base;
}

function mustGet(map: Record<string, string>, key: string): string {
  const val = map[key];
  if (!val) throw new Error(`Key not found in map: ${key}`);
  return val;
}

/** Cast a plain array to the Prisma JSON input type. */
function jsonOptions(values: string[]): Prisma.InputJsonValue {
  return values as unknown as Prisma.InputJsonValue;
}

// ---------------------------------------------------------------------------
// Category field definitions
// ---------------------------------------------------------------------------

interface FieldDef {
  name: string;
  label: string;
  type: CategoryFieldType;
  options?: string[];
  isRequired?: boolean;
  isFilterable?: boolean;
}

const VEHICLE_FIELDS: FieldDef[] = [
  { name: 'make', label: 'Make', type: CategoryFieldType.text, isRequired: true, isFilterable: true },
  { name: 'model', label: 'Model', type: CategoryFieldType.text, isRequired: true },
  { name: 'year', label: 'Year', type: CategoryFieldType.number, isRequired: true, isFilterable: true },
  { name: 'mileage', label: 'Mileage', type: CategoryFieldType.number },
  { name: 'fuel_type', label: 'Fuel Type', type: CategoryFieldType.select, isFilterable: true, options: ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid', 'Other'] },
  { name: 'transmission', label: 'Transmission', type: CategoryFieldType.select, isFilterable: true, options: ['Automatic', 'Manual', 'CVT', 'Other'] },
  { name: 'drive_type', label: 'Drive Type', type: CategoryFieldType.select, isFilterable: true, options: ['FWD', 'RWD', 'AWD', '4WD'] },
  { name: 'body_style', label: 'Body Style', type: CategoryFieldType.select, isFilterable: true, options: ['Sedan', 'Coupe', 'SUV', 'Truck', 'Van', 'Wagon', 'Convertible', 'Hatchback', 'Other'] },
  { name: 'title_status', label: 'Title Status', type: CategoryFieldType.select, isFilterable: true, options: ['Clean', 'Salvage', 'Rebuilt', 'Lien', 'Parts Only'] },
  { name: 'exterior_color', label: 'Exterior Color', type: CategoryFieldType.text },
  { name: 'vin', label: 'VIN', type: CategoryFieldType.text },
];

const VEHICLE_PARTS_FIELDS: FieldDef[] = [
  { name: 'make', label: 'Make', type: CategoryFieldType.text, isFilterable: true },
  { name: 'model', label: 'Model', type: CategoryFieldType.text },
  { name: 'year', label: 'Year', type: CategoryFieldType.number, isFilterable: true },
  { name: 'part_type', label: 'Part Type', type: CategoryFieldType.text, isFilterable: true },
  { name: 'part_number', label: 'Part Number', type: CategoryFieldType.text },
  { name: 'oem_aftermarket', label: 'OEM / Aftermarket', type: CategoryFieldType.select, isFilterable: true, options: ['OEM', 'Aftermarket', 'Unknown'] },
  { name: 'fits_multiple_vehicles', label: 'Fits Multiple Vehicles', type: CategoryFieldType.boolean },
];

const WHEELS_TIRES_FIELDS: FieldDef[] = [
  { name: 'wheel_diameter', label: 'Wheel Diameter', type: CategoryFieldType.select, isFilterable: true, options: ['14"', '15"', '16"', '17"', '18"', '19"', '20"', '22"', '24"', 'Other'] },
  { name: 'wheel_width', label: 'Wheel Width', type: CategoryFieldType.select, options: ['6"', '7"', '8"', '9"', '10"', '11"', '12"', 'Other'] },
  { name: 'bolt_pattern', label: 'Bolt Pattern', type: CategoryFieldType.select, isFilterable: true, options: ['4x100', '4x114.3', '5x100', '5x108', '5x112', '5x114.3', '5x120', '5x127', '5x130', '6x135', '6x139.7', '8x165.1', 'Other'] },
  { name: 'center_bore', label: 'Center Bore', type: CategoryFieldType.text },
  { name: 'offset', label: 'Offset', type: CategoryFieldType.text },
  { name: 'tire_size', label: 'Tire Size', type: CategoryFieldType.text, isFilterable: true },
  { name: 'tire_type', label: 'Tire Type', type: CategoryFieldType.multiselect, isFilterable: true, options: ['Winter', 'All-Season', 'Summer', 'All-Terrain', 'Mud-Terrain'] },
  { name: 'wheel_material', label: 'Wheel Material', type: CategoryFieldType.multiselect, isFilterable: true, options: ['Steel', 'Aluminum / Alloy'] },
];

const HOUSING_FIELDS: FieldDef[] = [
  { name: 'bedrooms', label: 'Bedrooms', type: CategoryFieldType.number, isFilterable: true },
  { name: 'bathrooms', label: 'Bathrooms', type: CategoryFieldType.number, isFilterable: true },
  { name: 'property_type', label: 'Property Type', type: CategoryFieldType.multiselect, isFilterable: true, options: ['House', 'Apartment', 'Room', 'Condo', 'Townhouse', 'Duplex', 'Flat', 'In-Law Suite', 'Cottage', 'Cabin', 'Manufactured Home', 'Land', 'Trailer / Mobile Home'] },
  { name: 'pet_policy', label: 'Pet Policy', type: CategoryFieldType.multiselect, isFilterable: true, options: ['Pets Allowed', 'Dog Friendly', 'Cat Friendly', 'No Pets'] },
  { name: 'ev_charging', label: 'EV Charging', type: CategoryFieldType.boolean },
  { name: 'wheelchair_accessible', label: 'Wheelchair Accessible', type: CategoryFieldType.boolean },
  { name: 'air_conditioning', label: 'Air Conditioning', type: CategoryFieldType.boolean },
  { name: 'furnished', label: 'Furnished', type: CategoryFieldType.boolean },
  { name: 'rental_period', label: 'Rental Period', type: CategoryFieldType.select, isFilterable: true, options: ['Daily', 'Weekly', 'Monthly', 'Lease'] },
  { name: 'laundry', label: 'Laundry', type: CategoryFieldType.select, options: ['In Unit', 'Hookups', 'On Site', 'Laundry Building', 'No Laundry'] },
  { name: 'parking', label: 'Parking', type: CategoryFieldType.multiselect, options: ['Carport', 'Attached Garage', 'Detached Garage', 'Off-Street Parking', 'Street Parking', 'No Parking'] },
];

const COMMERCIAL_PROPERTY_FIELDS: FieldDef[] = [
  { name: 'property_type', label: 'Property Type', type: CategoryFieldType.select, isFilterable: true, options: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed Use', 'Other'] },
  { name: 'lease_term', label: 'Lease Term', type: CategoryFieldType.select, options: ['Month-to-Month', '6 Months', '1 Year', '2+ Years'] },
  { name: 'sq_ft', label: 'Square Feet', type: CategoryFieldType.number, isFilterable: true },
];

const PARKING_STORAGE_FIELDS: FieldDef[] = [
  { name: 'indoor_outdoor', label: 'Indoor / Outdoor', type: CategoryFieldType.select, isFilterable: true, options: ['Indoor', 'Outdoor'] },
  { name: 'secured_access', label: 'Secured Access', type: CategoryFieldType.boolean },
  { name: 'camera_system', label: 'Camera System', type: CategoryFieldType.boolean },
  { name: 'climate_controlled', label: 'Climate Controlled', type: CategoryFieldType.boolean },
];

const MARINE_BOATS_FIELDS: FieldDef[] = [
  { name: 'make', label: 'Make', type: CategoryFieldType.text, isRequired: true, isFilterable: true },
  { name: 'model', label: 'Model', type: CategoryFieldType.text },
  { name: 'year', label: 'Year', type: CategoryFieldType.number, isFilterable: true },
  { name: 'boat_type', label: 'Boat Type', type: CategoryFieldType.select, isFilterable: true, options: ['Sailboat', 'Motorboat', 'Pontoon', 'Fishing Boat', 'Jet Ski / PWC', 'Kayak / Canoe', 'Yacht', 'Other'] },
  { name: 'length_ft', label: 'Length (ft)', type: CategoryFieldType.number, isFilterable: true },
  { name: 'engine_hours', label: 'Engine Hours', type: CategoryFieldType.number },
  { name: 'hull_material', label: 'Hull Material', type: CategoryFieldType.select, options: ['Fiberglass', 'Aluminum', 'Wood', 'Inflatable', 'Other'] },
];

const CELL_PHONES_FIELDS: FieldDef[] = [
  { name: 'brand', label: 'Brand', type: CategoryFieldType.select, isFilterable: true, options: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Motorola', 'LG', 'Other'] },
  { name: 'storage', label: 'Storage', type: CategoryFieldType.select, isFilterable: true, options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
  { name: 'carrier', label: 'Carrier', type: CategoryFieldType.select, isFilterable: true, options: ['Unlocked', 'AT&T', 'Verizon', 'T-Mobile', 'Sprint', 'Other'] },
  { name: 'color', label: 'Color', type: CategoryFieldType.text },
];

const ELECTRONICS_FIELDS: FieldDef[] = [
  { name: 'brand', label: 'Brand', type: CategoryFieldType.text, isFilterable: true },
  { name: 'model', label: 'Model', type: CategoryFieldType.text },
];

const VIDEO_GAMING_FIELDS: FieldDef[] = [
  { name: 'platform', label: 'Platform', type: CategoryFieldType.select, isFilterable: true, options: ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'PC', 'Other'] },
  { name: 'game_type', label: 'Type', type: CategoryFieldType.select, isFilterable: true, options: ['Console', 'Game', 'Accessory', 'Other'] },
];

const BICYCLES_FIELDS: FieldDef[] = [
  { name: 'bike_type', label: 'Bike Type', type: CategoryFieldType.select, isFilterable: true, options: ['Road', 'Mountain', 'Hybrid', 'BMX', 'Electric', 'Cruiser', 'Kids', 'Other'] },
  { name: 'brand', label: 'Brand', type: CategoryFieldType.text, isFilterable: true },
  { name: 'frame_size', label: 'Frame Size', type: CategoryFieldType.text },
  { name: 'wheel_size', label: 'Wheel Size', type: CategoryFieldType.select, options: ['20"', '24"', '26"', '27.5"', '29"', '700c', 'Other'] },
];

const JOBS_FIELDS: FieldDef[] = [
  { name: 'job_type', label: 'Job Type', type: CategoryFieldType.select, isFilterable: true, options: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Volunteer'] },
  { name: 'remote', label: 'Remote', type: CategoryFieldType.select, isFilterable: true, options: ['On-site', 'Remote', 'Hybrid'] },
  { name: 'experience_level', label: 'Experience Level', type: CategoryFieldType.select, isFilterable: true, options: ['Entry Level', 'Mid Level', 'Senior Level', 'Manager', 'Director', 'Executive'] },
];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

interface CategoryDef {
  name: string;
  slug: string;
  icon?: string;
}

interface SubcategoryDef extends CategoryDef {
  parentSlug: string;
}

/**
 * Full category matrix from CATEGORIES.md.
 *
 * Top-level categories (no parent) include standalone marketplace categories
 * and section parents that have subcategories.
 *
 * trailers, marine-boats, and powersports are stored ONCE as children of
 * "vehicles". The marketplace top-level navigation shows them as shortcuts,
 * handled via shared-package constants -- no duplicate DB records.
 *
 * "parts-vehicles" appears under both Vehicles and Vehicle Parts in the
 * matrix. It is stored once under Vehicles; the Vehicle Parts section treats
 * it as a navigation alias (same canonical data group).
 *
 * Services > Beauty uses slug "beauty-services" to avoid conflict with the
 * top-level "beauty" category.
 */
async function seedCategories(): Promise<Record<string, string>> {
  console.log('Seeding categories...');

  // ── Top-level (root) categories ──────────────────────────────

  const roots: CategoryDef[] = [
    // Standalone marketplace categories
    { name: 'Antiques & Collectibles', slug: 'antiques-collectibles', icon: 'trophy-outline' },
    { name: 'Appliances', slug: 'appliances', icon: 'cube-outline' },
    { name: 'Arts & Crafts', slug: 'arts-crafts', icon: 'color-palette-outline' },
    { name: 'Aviation', slug: 'aviation', icon: 'airplane-outline' },
    { name: 'Baby & Kids', slug: 'baby-kids', icon: 'happy-outline' },
    { name: 'Barter', slug: 'barter', icon: 'swap-horizontal-outline' },
    { name: 'Beauty', slug: 'beauty', icon: 'sparkles-outline' },
    { name: 'Bicycle Parts', slug: 'bicycle-parts', icon: 'construct-outline' },
    { name: 'Bicycles', slug: 'bicycles', icon: 'bicycle-outline' },
    { name: 'Books', slug: 'books', icon: 'book-outline' },
    { name: 'CDs, DVDs & VHS', slug: 'cds-dvds-vhs', icon: 'disc-outline' },
    { name: 'Cell Phones', slug: 'cell-phones', icon: 'phone-portrait-outline' },
    { name: 'Clothing & Accessories', slug: 'clothing-accessories', icon: 'shirt-outline' },
    { name: 'Electronics', slug: 'electronics', icon: 'hardware-chip-outline' },
    { name: 'Farm & Garden', slug: 'farm-garden', icon: 'leaf-outline' },
    { name: 'Free', slug: 'free', icon: 'gift-outline' },
    { name: 'Garage Sale', slug: 'garage-sale', icon: 'storefront-outline' },
    { name: 'General', slug: 'general', icon: 'grid-outline' },
    { name: 'Jewelry & Watches', slug: 'jewelry-watches', icon: 'diamond-outline' },
    { name: 'Materials', slug: 'materials', icon: 'layers-outline' },
    { name: 'Music Instruments', slug: 'music-instruments', icon: 'musical-notes-outline' },
    { name: 'Photo & Video', slug: 'photo-video', icon: 'camera-outline' },
    { name: 'Camping & Outdoors', slug: 'camping-outdoors', icon: 'bonfire-outline' },
    { name: 'Sporting Goods', slug: 'sporting-goods', icon: 'football-outline' },
    { name: 'Tickets', slug: 'tickets', icon: 'ticket-outline' },
    { name: 'Tools', slug: 'tools', icon: 'hammer-outline' },
    { name: 'Video Gaming', slug: 'video-gaming', icon: 'game-controller-outline' },
    { name: 'Wanted', slug: 'wanted', icon: 'search-outline' },

    // Section parents (have subcategories)
    { name: 'Vehicles', slug: 'vehicles', icon: 'car-outline' },
    { name: 'Vehicle Parts', slug: 'vehicle-parts', icon: 'cog-outline' },
    { name: 'Home', slug: 'home', icon: 'home-outline' },
    { name: 'Business / Commercial / Industrial', slug: 'business-commercial-industrial', icon: 'business-outline' },
    { name: 'Alternative Fuel & Energy', slug: 'alternative-fuel-energy', icon: 'flash-outline' },
    { name: 'Housing', slug: 'housing', icon: 'bed-outline' },
    { name: 'Services', slug: 'services', icon: 'construct-outline' },
    { name: 'Jobs', slug: 'jobs', icon: 'briefcase-outline' },
    { name: 'Gigs', slug: 'gigs', icon: 'megaphone-outline' },
  ];

  // ── Subcategories (grouped by parent) ────────────────────────

  const subs: SubcategoryDef[] = [
    // Vehicles children
    { parentSlug: 'vehicles', name: 'Cars & Trucks', slug: 'cars-trucks', icon: 'car-outline' },
    { parentSlug: 'vehicles', name: 'Classic Cars', slug: 'classic-cars', icon: 'car-outline' },
    { parentSlug: 'vehicles', name: 'Collector Cars', slug: 'collector-cars', icon: 'car-outline' },
    { parentSlug: 'vehicles', name: 'Commercial Trucks', slug: 'commercial-trucks', icon: 'bus-outline' },
    { parentSlug: 'vehicles', name: 'Exotic Cars', slug: 'exotic-cars', icon: 'car-sport-outline' },
    { parentSlug: 'vehicles', name: 'Marine / Boats', slug: 'marine-boats', icon: 'boat-outline' },
    { parentSlug: 'vehicles', name: 'Motorcycles', slug: 'motorcycles', icon: 'bicycle-outline' },
    { parentSlug: 'vehicles', name: 'Powersports', slug: 'powersports', icon: 'speedometer-outline' },
    { parentSlug: 'vehicles', name: 'RVs & Campers', slug: 'rvs-campers', icon: 'bus-outline' },
    { parentSlug: 'vehicles', name: 'Trailers', slug: 'trailers', icon: 'trail-sign-outline' },
    { parentSlug: 'vehicles', name: 'Other Vehicles', slug: 'other-vehicles', icon: 'car-outline' },
    { parentSlug: 'vehicles', name: 'Parts Vehicles', slug: 'parts-vehicles', icon: 'car-outline' },
    { parentSlug: 'vehicles', name: 'Golf Carts', slug: 'golf-carts', icon: 'car-outline' },

    // Vehicle Parts children
    { parentSlug: 'vehicle-parts', name: 'Auto & Truck Parts', slug: 'auto-truck-parts', icon: 'cog-outline' },
    { parentSlug: 'vehicle-parts', name: 'Motorcycle Parts', slug: 'motorcycle-parts', icon: 'cog-outline' },
    { parentSlug: 'vehicle-parts', name: 'Powersports Parts', slug: 'powersports-parts', icon: 'cog-outline' },
    { parentSlug: 'vehicle-parts', name: 'Marine Parts', slug: 'marine-parts', icon: 'cog-outline' },
    { parentSlug: 'vehicle-parts', name: 'RV Parts', slug: 'rv-parts', icon: 'cog-outline' },
    { parentSlug: 'vehicle-parts', name: 'Trailer Parts', slug: 'trailer-parts', icon: 'cog-outline' },
    { parentSlug: 'vehicle-parts', name: 'Wheels & Tires', slug: 'wheels-tires', icon: 'ellipse-outline' },
    { parentSlug: 'vehicle-parts', name: 'Other Vehicle Parts', slug: 'other-vehicle-parts', icon: 'cog-outline' },

    // Home children
    { parentSlug: 'home', name: 'Home & Decor', slug: 'home-decor', icon: 'color-palette-outline' },
    { parentSlug: 'home', name: 'Household', slug: 'household', icon: 'home-outline' },
    { parentSlug: 'home', name: 'Games & Toys', slug: 'games-toys', icon: 'game-controller-outline' },

    // Business / Commercial / Industrial children
    { parentSlug: 'business-commercial-industrial', name: 'Building Materials', slug: 'building-materials', icon: 'construct-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Tools, Light Equipment & Workshop Equipment', slug: 'tools-light-equipment-workshop', icon: 'hammer-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Electrical Equipment & Supplies', slug: 'electrical-equipment-supplies', icon: 'flash-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Fasteners & Hardware', slug: 'fasteners-hardware', icon: 'construct-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Healthcare, Lab & Dental', slug: 'healthcare-lab-dental', icon: 'medkit-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Heavy Equipment, Parts & Attachments', slug: 'heavy-equipment-parts-attachments', icon: 'construct-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'HVAC & Refrigeration', slug: 'hvac-refrigeration', icon: 'thermometer-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Hydraulics', slug: 'hydraulics', icon: 'water-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Pneumatics', slug: 'pneumatics', icon: 'speedometer-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Pumps & Plumbing', slug: 'pumps-plumbing', icon: 'water-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Material Handling', slug: 'material-handling', icon: 'cube-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Printing & Graphic Arts', slug: 'printing-graphic-arts', icon: 'print-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Restaurant & Food Service Equipment', slug: 'restaurant-food-service-equipment', icon: 'restaurant-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Testing, Measurement & Inspection', slug: 'testing-measurement-inspection', icon: 'analytics-outline' },
    { parentSlug: 'business-commercial-industrial', name: 'Pallet Sales', slug: 'pallet-sales', icon: 'cube-outline' },

    // Alternative Fuel & Energy children
    { parentSlug: 'alternative-fuel-energy', name: 'Wood Heating', slug: 'wood-heating', icon: 'bonfire-outline' },
    { parentSlug: 'alternative-fuel-energy', name: 'Waste Oil Heating', slug: 'waste-oil-heating', icon: 'flame-outline' },
    { parentSlug: 'alternative-fuel-energy', name: 'Wood & Pellets', slug: 'wood-pellets', icon: 'leaf-outline' },
    { parentSlug: 'alternative-fuel-energy', name: 'Solar', slug: 'solar', icon: 'sunny-outline' },
    { parentSlug: 'alternative-fuel-energy', name: 'Wind', slug: 'wind', icon: 'cloudy-outline' },
    { parentSlug: 'alternative-fuel-energy', name: 'Other Alternative Energy', slug: 'other-alternative-energy', icon: 'flash-outline' },

    // Housing children
    { parentSlug: 'housing', name: 'Apartments / Housing for Rent', slug: 'apartments-housing-rent', icon: 'business-outline' },
    { parentSlug: 'housing', name: 'Housing Swap', slug: 'housing-swap', icon: 'swap-horizontal-outline' },
    { parentSlug: 'housing', name: 'Housing Wanted', slug: 'housing-wanted', icon: 'search-outline' },
    { parentSlug: 'housing', name: 'Office / Commercial', slug: 'office-commercial', icon: 'business-outline' },
    { parentSlug: 'housing', name: 'Parking / Storage', slug: 'parking-storage', icon: 'car-outline' },
    { parentSlug: 'housing', name: 'Real Estate for Sale', slug: 'real-estate-for-sale', icon: 'home-outline' },
    { parentSlug: 'housing', name: 'Rooms / Shared', slug: 'rooms-shared', icon: 'people-outline' },
    { parentSlug: 'housing', name: 'Rooms Wanted', slug: 'rooms-wanted', icon: 'search-outline' },
    { parentSlug: 'housing', name: 'Sublets / Temporary', slug: 'sublets-temporary', icon: 'time-outline' },
    { parentSlug: 'housing', name: 'Vacation Rentals', slug: 'vacation-rentals', icon: 'airplane-outline' },

    // Services children (beauty uses beauty-services slug to avoid clash)
    { parentSlug: 'services', name: 'Automotive', slug: 'automotive', icon: 'car-outline' },
    { parentSlug: 'services', name: 'Beauty', slug: 'beauty-services', icon: 'sparkles-outline' },
    { parentSlug: 'services', name: 'Cell / Mobile', slug: 'cell-mobile', icon: 'phone-portrait-outline' },
    { parentSlug: 'services', name: 'Computer', slug: 'computer', icon: 'laptop-outline' },
    { parentSlug: 'services', name: 'Creative', slug: 'creative', icon: 'color-palette-outline' },
    { parentSlug: 'services', name: 'Cycle', slug: 'cycle', icon: 'bicycle-outline' },
    { parentSlug: 'services', name: 'Event', slug: 'event', icon: 'calendar-outline' },
    { parentSlug: 'services', name: 'Farm & Garden', slug: 'farm-garden-services', icon: 'leaf-outline' },
    { parentSlug: 'services', name: 'Financial', slug: 'financial', icon: 'cash-outline' },
    { parentSlug: 'services', name: 'Health & Wellness', slug: 'health-wellness', icon: 'fitness-outline' },
    { parentSlug: 'services', name: 'Household', slug: 'household-services', icon: 'home-outline' },
    { parentSlug: 'services', name: 'Business Services', slug: 'business-services', icon: 'briefcase-outline' },
    { parentSlug: 'services', name: 'Labor / Moving', slug: 'labor-moving', icon: 'people-outline' },
    { parentSlug: 'services', name: 'Legal', slug: 'legal', icon: 'document-text-outline' },
    { parentSlug: 'services', name: 'Lessons', slug: 'lessons', icon: 'school-outline' },
    { parentSlug: 'services', name: 'Marine', slug: 'marine-services', icon: 'boat-outline' },
    { parentSlug: 'services', name: 'Pet', slug: 'pet', icon: 'paw-outline' },
    { parentSlug: 'services', name: 'Real Estate', slug: 'real-estate-services', icon: 'home-outline' },
    { parentSlug: 'services', name: 'Skilled Trade', slug: 'skilled-trade-services', icon: 'construct-outline' },
    { parentSlug: 'services', name: 'Small Business Ads', slug: 'small-business-ads', icon: 'megaphone-outline' },
    { parentSlug: 'services', name: 'Travel / Vacation', slug: 'travel-vacation', icon: 'airplane-outline' },
    { parentSlug: 'services', name: 'Writing / Editing / Translation', slug: 'writing-editing-translation', icon: 'create-outline' },

    // Jobs children
    { parentSlug: 'jobs', name: 'Accounting & Finance', slug: 'accounting-finance', icon: 'calculator-outline' },
    { parentSlug: 'jobs', name: 'Administrative / Office', slug: 'administrative-office', icon: 'document-outline' },
    { parentSlug: 'jobs', name: 'Architecture', slug: 'architecture', icon: 'business-outline' },
    { parentSlug: 'jobs', name: 'Engineering', slug: 'engineering', icon: 'build-outline' },
    { parentSlug: 'jobs', name: 'Art / Media / Design', slug: 'art-media-design', icon: 'color-palette-outline' },
    { parentSlug: 'jobs', name: 'Biotech / Science', slug: 'biotech-science', icon: 'flask-outline' },
    { parentSlug: 'jobs', name: 'Business / Management', slug: 'business-management', icon: 'briefcase-outline' },
    { parentSlug: 'jobs', name: 'Customer Service', slug: 'customer-service', icon: 'chatbubbles-outline' },
    { parentSlug: 'jobs', name: 'Education', slug: 'education', icon: 'school-outline' },
    { parentSlug: 'jobs', name: 'Miscellaneous', slug: 'miscellaneous', icon: 'ellipsis-horizontal-outline' },
    { parentSlug: 'jobs', name: 'Hospitality', slug: 'hospitality', icon: 'restaurant-outline' },
    { parentSlug: 'jobs', name: 'General Labor', slug: 'general-labor', icon: 'people-outline' },
    { parentSlug: 'jobs', name: 'Government', slug: 'government', icon: 'flag-outline' },
    { parentSlug: 'jobs', name: 'Human Resources', slug: 'human-resources', icon: 'people-outline' },
    { parentSlug: 'jobs', name: 'Legal / Paralegal', slug: 'legal-paralegal', icon: 'document-text-outline' },
    { parentSlug: 'jobs', name: 'Manufacturing', slug: 'manufacturing', icon: 'construct-outline' },
    { parentSlug: 'jobs', name: 'Marketing / Public Relations', slug: 'marketing-public-relations', icon: 'megaphone-outline' },
    { parentSlug: 'jobs', name: 'Medical & Health', slug: 'medical-health', icon: 'medkit-outline' },
    { parentSlug: 'jobs', name: 'Nonprofit', slug: 'nonprofit', icon: 'heart-outline' },
    { parentSlug: 'jobs', name: 'Real Estate', slug: 'real-estate-jobs', icon: 'home-outline' },
    { parentSlug: 'jobs', name: 'Retail / Wholesale', slug: 'retail-wholesale', icon: 'storefront-outline' },
    { parentSlug: 'jobs', name: 'Sales', slug: 'sales', icon: 'trending-up-outline' },
    { parentSlug: 'jobs', name: 'Salon / Spa / Fitness', slug: 'salon-spa-fitness', icon: 'fitness-outline' },
    { parentSlug: 'jobs', name: 'Security', slug: 'security', icon: 'shield-outline' },
    { parentSlug: 'jobs', name: 'Skilled Trade', slug: 'skilled-trade-jobs', icon: 'hammer-outline' },
    { parentSlug: 'jobs', name: 'Software / IT / Technical Support', slug: 'software-it-technical-support', icon: 'code-slash-outline' },
    { parentSlug: 'jobs', name: 'Transportation', slug: 'transportation', icon: 'bus-outline' },
    { parentSlug: 'jobs', name: 'TV / Film / Video', slug: 'tv-film-video', icon: 'videocam-outline' },
    { parentSlug: 'jobs', name: 'Web / Information Design', slug: 'web-information-design', icon: 'globe-outline' },
    { parentSlug: 'jobs', name: 'Writing / Editing', slug: 'writing-editing', icon: 'create-outline' },

    // Gigs children
    { parentSlug: 'gigs', name: 'Computer', slug: 'computer-gigs', icon: 'laptop-outline' },
    { parentSlug: 'gigs', name: 'Creative / Design', slug: 'creative-design-gigs', icon: 'color-palette-outline' },
    { parentSlug: 'gigs', name: 'Crew', slug: 'crew', icon: 'people-outline' },
    { parentSlug: 'gigs', name: 'Domestic', slug: 'domestic', icon: 'home-outline' },
    { parentSlug: 'gigs', name: 'Event', slug: 'event-gigs', icon: 'calendar-outline' },
    { parentSlug: 'gigs', name: 'General Labor', slug: 'general-labor-gigs', icon: 'people-outline' },
    { parentSlug: 'gigs', name: 'Talent', slug: 'talent', icon: 'star-outline' },
    { parentSlug: 'gigs', name: 'Writing', slug: 'writing-gigs', icon: 'create-outline' },
  ];

  const idMap: Record<string, string> = {};

  // Upsert root categories
  for (const [i, root] of roots.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: root.slug },
      update: { name: root.name, icon: root.icon, position: i },
      create: {
        name: root.name,
        slug: root.slug,
        icon: root.icon,
        position: i,
        isActive: true,
      },
    });
    idMap[root.slug] = cat.id;
  }

  // Upsert subcategories
  for (const [i, sub] of subs.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {
        name: sub.name,
        icon: sub.icon,
        parentId: mustGet(idMap, sub.parentSlug),
        position: i,
      },
      create: {
        name: sub.name,
        slug: sub.slug,
        icon: sub.icon,
        parentId: mustGet(idMap, sub.parentSlug),
        position: i,
        isActive: true,
      },
    });
    idMap[sub.slug] = cat.id;
  }

  // ── Seed CategoryField records ───────────────────────────────

  /**
   * For each slug in `slugs`, delete existing fields and recreate from `fields`.
   */
  async function seedFieldsForCategories(
    slugs: string[],
    fields: FieldDef[],
  ): Promise<void> {
    for (const slug of slugs) {
      const categoryId = mustGet(idMap, slug);
      await prisma.categoryField.deleteMany({ where: { categoryId } });
      await prisma.categoryField.createMany({
        data: fields.map((f, pos) => ({
          categoryId,
          name: f.name,
          label: f.label,
          type: f.type,
          options: f.options ? jsonOptions(f.options) : undefined,
          isRequired: f.isRequired ?? false,
          isFilterable: f.isFilterable ?? false,
          position: pos,
        })),
      });
    }
  }

  // Vehicles fields
  await seedFieldsForCategories(
    ['cars-trucks', 'classic-cars', 'collector-cars', 'commercial-trucks', 'exotic-cars', 'motorcycles', 'rvs-campers'],
    VEHICLE_FIELDS,
  );

  // Vehicle Parts fields
  await seedFieldsForCategories(
    ['auto-truck-parts', 'motorcycle-parts', 'powersports-parts', 'marine-parts', 'rv-parts', 'trailer-parts', 'other-vehicle-parts'],
    VEHICLE_PARTS_FIELDS,
  );

  // Wheels & Tires fields
  await seedFieldsForCategories(['wheels-tires'], WHEELS_TIRES_FIELDS);

  // Housing - General fields
  await seedFieldsForCategories(
    ['apartments-housing-rent', 'housing-swap', 'housing-wanted', 'rooms-shared', 'rooms-wanted', 'sublets-temporary', 'vacation-rentals', 'real-estate-for-sale'],
    HOUSING_FIELDS,
  );

  // Commercial Property fields
  await seedFieldsForCategories(['office-commercial'], COMMERCIAL_PROPERTY_FIELDS);

  // Parking & Storage fields
  await seedFieldsForCategories(['parking-storage'], PARKING_STORAGE_FIELDS);

  // Boats / Marine fields
  await seedFieldsForCategories(['marine-boats'], MARINE_BOATS_FIELDS);

  // Cell Phones fields
  await seedFieldsForCategories(['cell-phones'], CELL_PHONES_FIELDS);

  // Electronics fields
  await seedFieldsForCategories(['electronics'], ELECTRONICS_FIELDS);

  // Video Gaming fields
  await seedFieldsForCategories(['video-gaming'], VIDEO_GAMING_FIELDS);

  // Bicycles fields
  await seedFieldsForCategories(['bicycles'], BICYCLES_FIELDS);

  // Jobs fields (all job subcategories)
  await seedFieldsForCategories(
    [
      'accounting-finance', 'administrative-office', 'architecture', 'engineering',
      'art-media-design', 'biotech-science', 'business-management', 'customer-service',
      'education', 'miscellaneous', 'hospitality', 'general-labor', 'government',
      'human-resources', 'legal-paralegal', 'manufacturing', 'marketing-public-relations',
      'medical-health', 'nonprofit', 'real-estate-jobs', 'retail-wholesale', 'sales',
      'salon-spa-fitness', 'security', 'skilled-trade-jobs', 'software-it-technical-support',
      'transportation', 'tv-film-video', 'web-information-design', 'writing-editing',
    ],
    JOBS_FIELDS,
  );

  console.log(`  Done: ${Object.keys(idMap).length} categories seeded`);
  return idMap;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

interface SeedUser {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  locationLat: number;
  locationLng: number;
  locationCity: string;
  locationState: string;
  phoneVerified?: boolean;
}

async function seedUsers(): Promise<Record<string, string>> {
  console.log('Seeding users...');

  const users: SeedUser[] = [
    {
      email: 'admin@marketplace.local',
      password: 'Admin1234!',
      displayName: 'Admin User',
      role: UserRole.admin,
      locationLat: 37.7749,
      locationLng: -122.4194,
      locationCity: 'San Francisco',
      locationState: 'CA',
    },
    {
      email: 'mod@marketplace.local',
      password: 'Mod12345!',
      displayName: 'Mod User',
      role: UserRole.moderator,
      locationLat: 37.3382,
      locationLng: -121.8863,
      locationCity: 'San Jose',
      locationState: 'CA',
    },
    {
      email: 'alice@example.com',
      password: 'Alice123!',
      displayName: 'Alice Chen',
      role: UserRole.user,
      locationLat: 37.8044,
      locationLng: -122.2712,
      locationCity: 'Oakland',
      locationState: 'CA',
      phoneVerified: true,
    },
    {
      email: 'bob@example.com',
      password: 'Bob12345!',
      displayName: 'Bob Martinez',
      role: UserRole.user,
      locationLat: 37.5630,
      locationLng: -122.0530,
      locationCity: 'Fremont',
      locationState: 'CA',
      phoneVerified: true,
    },
    {
      email: 'carol@example.com',
      password: 'Carol123!',
      displayName: 'Carol Williams',
      role: UserRole.user,
      locationLat: 37.6879,
      locationLng: -122.4702,
      locationCity: 'Daly City',
      locationState: 'CA',
    },
  ];

  const idMap: Record<string, string> = {};

  for (const u of users) {
    const { password, email, locationLat, locationLng, ...rest } = u;
    const passwordHash = await hashPw(password);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash, locationLat, locationLng, ...rest },
    });
    idMap[email] = user.id;
  }

  // Sync PostGIS geography columns (best-effort -- column may not exist in all envs)
  for (const u of users) {
    try {
      await prisma.$executeRaw`
        UPDATE users
        SET location = ST_SetSRID(ST_MakePoint(${u.locationLng}, ${u.locationLat}), 4326)::geography
        WHERE email = ${u.email}
      `;
    } catch {
      // geography column not present; lat/lng float columns are still set
    }
  }

  console.log(`  Done: ${users.length} users`);
  console.log('  Credentials:');
  for (const u of users) {
    console.log(`    ${u.email}  /  ${u.password}  (${u.role})`);
  }

  return idMap;
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

interface SeedListing {
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  priceType: PriceType;
  condition: ItemCondition;
  status: ListingStatus;
  locationLat: number;
  locationLng: number;
  locationCity: string;
  locationState: string;
}

async function seedListings(
  categoryIds: Record<string, string>,
  userIds: Record<string, string>,
): Promise<void> {
  console.log('Seeding listings...');

  const alice = mustGet(userIds, 'alice@example.com');
  const bob = mustGet(userIds, 'bob@example.com');
  const carol = mustGet(userIds, 'carol@example.com');

  const listings: SeedListing[] = [
    {
      userId: alice,
      categoryId: mustGet(categoryIds, 'cell-phones'),
      title: 'iPhone 15 Pro 256GB -- Natural Titanium',
      description: 'Barely used iPhone 15 Pro in great condition. Comes with original box, charger, and two screen protectors. No scratches, face ID works perfectly.',
      price: 89900,
      priceType: PriceType.fixed,
      condition: ItemCondition.like_new,
      status: ListingStatus.active,
      locationLat: 37.8044,
      locationLng: -122.2712,
      locationCity: 'Oakland',
      locationState: 'CA',
    },
    {
      userId: alice,
      categoryId: mustGet(categoryIds, 'electronics'),
      title: 'MacBook Air M2 -- 16GB/512GB Space Gray',
      description: 'Selling my MacBook Air M2. Purchased 8 months ago, works flawlessly. Battery health at 97%. Includes charger and sleeve.',
      price: 119900,
      priceType: PriceType.obo,
      condition: ItemCondition.like_new,
      status: ListingStatus.active,
      locationLat: 37.8044,
      locationLng: -122.2712,
      locationCity: 'Oakland',
      locationState: 'CA',
    },
    {
      userId: bob,
      categoryId: mustGet(categoryIds, 'home-decor'),
      title: 'Mid-Century Modern Sofa -- Mustard Yellow',
      description: 'Beautiful mid-century modern 3-seater sofa in excellent condition. Pet-free and smoke-free home. Pickup only.',
      price: 45000,
      priceType: PriceType.obo,
      condition: ItemCondition.used,
      status: ListingStatus.active,
      locationLat: 37.5630,
      locationLng: -122.0530,
      locationCity: 'Fremont',
      locationState: 'CA',
    },
    {
      userId: bob,
      categoryId: mustGet(categoryIds, 'video-gaming'),
      title: 'PlayStation 5 Disc Edition + 2 Controllers',
      description: 'PS5 disc edition bundle with 2 DualSense controllers. Includes all original cables. Works perfectly.',
      price: 42500,
      priceType: PriceType.fixed,
      condition: ItemCondition.used,
      status: ListingStatus.active,
      locationLat: 37.5630,
      locationLng: -122.0530,
      locationCity: 'Fremont',
      locationState: 'CA',
    },
    {
      userId: carol,
      categoryId: mustGet(categoryIds, 'cars-trucks'),
      title: '2019 Honda Civic EX -- 42k Miles',
      description: 'Well maintained 2019 Honda Civic EX sedan. Single owner, clean title. Recent oil change and tire rotation. Great fuel economy.',
      price: 1895000,
      priceType: PriceType.obo,
      condition: ItemCondition.used,
      status: ListingStatus.active,
      locationLat: 37.6879,
      locationLng: -122.4702,
      locationCity: 'Daly City',
      locationState: 'CA',
    },
    {
      userId: carol,
      categoryId: mustGet(categoryIds, 'farm-garden'),
      title: 'Patio Dining Set -- 6 Chairs + Table',
      description: 'Aluminum outdoor dining set. Table and 6 chairs in good condition, some minor surface rust on table legs. Umbrella not included.',
      price: 28000,
      priceType: PriceType.fixed,
      condition: ItemCondition.used,
      status: ListingStatus.active,
      locationLat: 37.6879,
      locationLng: -122.4702,
      locationCity: 'Daly City',
      locationState: 'CA',
    },
    {
      userId: alice,
      categoryId: mustGet(categoryIds, 'free'),
      title: 'Free: Moving boxes -- various sizes',
      description: "About 30 boxes left over from our move. Various sizes. You haul, they're yours. Available weekends.",
      price: 0,
      priceType: PriceType.free,
      condition: ItemCondition.used,
      status: ListingStatus.active,
      locationLat: 37.8044,
      locationLng: -122.2712,
      locationCity: 'Oakland',
      locationState: 'CA',
    },
    {
      userId: bob,
      categoryId: mustGet(categoryIds, 'tools'),
      title: 'DeWalt 20V MAX Drill/Driver Kit',
      description: 'DeWalt DCD771C2 drill/driver kit. Two batteries, charger, and kit bag included. Used on a single project.',
      price: 8500,
      priceType: PriceType.fixed,
      condition: ItemCondition.like_new,
      status: ListingStatus.active,
      locationLat: 37.5630,
      locationLng: -122.0530,
      locationCity: 'Fremont',
      locationState: 'CA',
    },
  ];

  let count = 0;
  for (const listing of listings) {
    const { locationLat, locationLng, ...rest } = listing;
    const uniqueSlug = makeSlug(listing.title, String(Date.now() + count));
    const created = await prisma.listing.upsert({
      where: { slug: uniqueSlug },
      update: {},
      create: { ...rest, locationLat, locationLng, slug: uniqueSlug, publishedAt: new Date() },
    });

    try {
      await prisma.$executeRaw`
        UPDATE listings
        SET location = ST_SetSRID(ST_MakePoint(${locationLng}, ${locationLat}), 4326)::geography
        WHERE id = ${created.id}
      `;
    } catch {
      // geography column not present; lat/lng float columns are still set
    }

    count++;
  }

  console.log(`  Done: ${count} listings`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\nStarting database seed...\n');

  const categoryIds = await seedCategories();
  const userIds = await seedUsers();
  await seedListings(categoryIds, userIds);

  console.log('\nSeed complete.\n');
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
