/**
 * Top-level category slugs used across the application.
 * The full category tree with field definitions is stored in the database
 * (seeded from CATEGORY_TREE below); these constants provide type-safe references.
 */
export const CATEGORY_SLUGS = {
  AUTOMOTIVE: 'automotive',
  HOUSING_RENTALS: 'housing-rentals',
  REAL_ESTATE: 'real-estate',
  JOBS_SERVICES: 'jobs-services',
  FOR_SALE: 'for-sale',
  COMMUNITY: 'community',
} as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[keyof typeof CATEGORY_SLUGS];

// ---------------------------------------------------------------------------
// Field type primitives
// ---------------------------------------------------------------------------

export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'year';

export interface CategoryField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: readonly string[]; // for select / multiselect
  min?: number;
  max?: number;
}

// ---------------------------------------------------------------------------
// Shared option sets
// ---------------------------------------------------------------------------

export const VEHICLE_TYPES = [
  'car', 'truck', 'suv', 'van', 'motorcycle', 'rv', 'boat', 'atv', 'trailer', 'other',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const TRANSMISSION_TYPES = ['automatic', 'manual', 'cvt'] as const;
export type TransmissionType = (typeof TRANSMISSION_TYPES)[number];

export const FUEL_TYPES = ['gasoline', 'diesel', 'electric', 'hybrid', 'plug-in-hybrid', 'other'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const DRIVETRAIN_TYPES = ['fwd', 'rwd', 'awd', '4wd'] as const;
export type DrivetrainType = (typeof DRIVETRAIN_TYPES)[number];

export const TITLE_STATUSES = ['clean', 'salvage', 'rebuilt', 'lien', 'parts-only'] as const;
export type TitleStatus = (typeof TITLE_STATUSES)[number];

export const PROPERTY_TYPES = [
  'apartment', 'house', 'condo', 'townhouse', 'room', 'studio', 'loft', 'other',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PET_POLICIES = ['allowed', 'cats-only', 'dogs-only', 'no-pets', 'negotiable'] as const;
export type PetPolicy = (typeof PET_POLICIES)[number];

export const LAUNDRY_TYPES = ['in-unit', 'in-building', 'none'] as const;
export type LaundryType = (typeof LAUNDRY_TYPES)[number];

export const PARKING_TYPES = ['included', 'available-for-fee', 'street', 'none'] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];

export const JOB_TYPES = ['full-time', 'part-time', 'contract', 'freelance', 'internship'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const SERVICE_TYPES = [
  'cleaning', 'moving', 'lawn', 'handyman', 'plumbing', 'electrical',
  'painting', 'carpentry', 'auto-repair', 'pet-care', 'tutoring',
  'photography', 'catering', 'it-tech', 'other',
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const ELECTRONICS_SUBTYPES = [
  'phone', 'tablet', 'laptop', 'desktop', 'tv', 'camera',
  'gaming', 'audio', 'wearable', 'accessories', 'other',
] as const;

export const FURNITURE_SUBTYPES = [
  'sofa', 'bed', 'table', 'chair', 'dresser', 'bookcase', 'desk', 'outdoor', 'other',
] as const;

export const CLOTHING_SUBTYPES = [
  'tops', 'bottoms', 'shoes', 'outerwear', 'accessories', 'activewear', 'formal', 'other',
] as const;

export const CLOTHING_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
  '0', '2', '4', '6', '8', '10', '12', '14', '16', 'Plus', 'One size',
] as const;

export const SHOE_SIZES = [
  '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10',
  '10.5', '11', '11.5', '12', '12.5', '13', '14', '15',
] as const;

export const TOY_AGE_GROUPS = ['infant', 'toddler', '3-5', '6-8', '9-12', 'teen', 'all-ages'] as const;

export const SPORT_SUBCATEGORIES = [
  'bikes', 'exercise-equipment', 'outdoor-gear', 'team-sports', 'water-sports',
  'winter-sports', 'golf', 'hunting-fishing', 'other',
] as const;

// ---------------------------------------------------------------------------
// Full category tree with subcategories and required fields
// This drives both the database seed and the listing creation wizard.
// ---------------------------------------------------------------------------

export interface Subcategory {
  slug: string;
  label: string;
  fields: CategoryField[];
}

export interface TopLevelCategory {
  slug: CategorySlug;
  label: string;
  icon: string; // emoji fallback
  subcategories: Subcategory[];
  /** Fields that apply to every subcategory in this top-level category */
  sharedFields?: CategoryField[];
}

export const CATEGORY_TREE: TopLevelCategory[] = [
  // -------------------------------------------------------------------------
  // AUTOMOTIVE
  // -------------------------------------------------------------------------
  {
    slug: 'automotive',
    label: 'Automotive',
    icon: '🚗',
    sharedFields: [
      { key: 'make', label: 'Make', type: 'text', required: true },
      { key: 'model', label: 'Model', type: 'text', required: true },
      { key: 'year', label: 'Year', type: 'year', required: true, min: 1885, max: 2026 },
      { key: 'mileage', label: 'Mileage', type: 'number', required: false, min: 0 },
      { key: 'vin', label: 'VIN', type: 'text', required: false },
    ],
    subcategories: [
      {
        slug: 'cars-trucks',
        label: 'Cars & Trucks',
        fields: [
          { key: 'vehicleType', label: 'Vehicle type', type: 'select', required: true, options: VEHICLE_TYPES },
          { key: 'transmission', label: 'Transmission', type: 'select', required: false, options: TRANSMISSION_TYPES },
          { key: 'fuelType', label: 'Fuel type', type: 'select', required: false, options: FUEL_TYPES },
          { key: 'drivetrain', label: 'Drivetrain', type: 'select', required: false, options: DRIVETRAIN_TYPES },
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
          { key: 'accidents', label: 'Accident history', type: 'boolean', required: false },
          { key: 'color', label: 'Exterior color', type: 'text', required: false },
          { key: 'doors', label: 'Doors', type: 'number', required: false, min: 2, max: 6 },
        ],
      },
      {
        slug: 'motorcycles',
        label: 'Motorcycles',
        fields: [
          { key: 'engineCC', label: 'Engine (cc)', type: 'number', required: false, min: 50 },
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
          { key: 'color', label: 'Color', type: 'text', required: false },
        ],
      },
      {
        slug: 'rvs-campers',
        label: 'RVs & Campers',
        fields: [
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
          { key: 'sleeps', label: 'Sleeps', type: 'number', required: false, min: 1, max: 20 },
          { key: 'length', label: 'Length (ft)', type: 'number', required: false, min: 10 },
        ],
      },
      {
        slug: 'boats',
        label: 'Boats & Watercraft',
        fields: [
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
          { key: 'length', label: 'Length (ft)', type: 'number', required: false, min: 5 },
          { key: 'hullMaterial', label: 'Hull material', type: 'select', required: false, options: ['fiberglass', 'aluminum', 'wood', 'inflatable', 'other'] },
        ],
      },
      {
        slug: 'auto-parts',
        label: 'Auto Parts & Accessories',
        fields: [
          { key: 'partType', label: 'Part type', type: 'text', required: true },
          { key: 'fitsMake', label: 'Fits make', type: 'text', required: false },
          { key: 'fitsModel', label: 'Fits model', type: 'text', required: false },
          { key: 'fitsYear', label: 'Fits year', type: 'year', required: false, min: 1885, max: 2026 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // HOUSING / RENTALS
  // -------------------------------------------------------------------------
  {
    slug: 'housing-rentals',
    label: 'Housing & Rentals',
    icon: '🏠',
    sharedFields: [
      { key: 'propertyType', label: 'Property type', type: 'select', required: true, options: PROPERTY_TYPES },
      { key: 'bedrooms', label: 'Bedrooms', type: 'number', required: true, min: 0, max: 20 },
      { key: 'bathrooms', label: 'Bathrooms', type: 'number', required: true, min: 1, max: 20 },
      { key: 'sqft', label: 'Square footage', type: 'number', required: false, min: 100 },
      { key: 'availableDate', label: 'Available date', type: 'text', required: false },
    ],
    subcategories: [
      {
        slug: 'apartments-for-rent',
        label: 'Apartments for Rent',
        fields: [
          { key: 'petsAllowed', label: 'Pets', type: 'select', required: false, options: PET_POLICIES },
          { key: 'laundry', label: 'Laundry', type: 'select', required: false, options: LAUNDRY_TYPES },
          { key: 'parking', label: 'Parking', type: 'select', required: false, options: PARKING_TYPES },
          { key: 'furnished', label: 'Furnished', type: 'boolean', required: false },
          { key: 'utilitiesIncluded', label: 'Utilities included', type: 'boolean', required: false },
          { key: 'depositAmount', label: 'Security deposit ($)', type: 'number', required: false, min: 0 },
          { key: 'leaseTerm', label: 'Lease term', type: 'select', required: false, options: ['month-to-month', '6-months', '12-months', '24-months'] },
        ],
      },
      {
        slug: 'houses-for-rent',
        label: 'Houses for Rent',
        fields: [
          { key: 'petsAllowed', label: 'Pets', type: 'select', required: false, options: PET_POLICIES },
          { key: 'parking', label: 'Parking', type: 'select', required: false, options: PARKING_TYPES },
          { key: 'garage', label: 'Garage', type: 'boolean', required: false },
          { key: 'yard', label: 'Yard', type: 'boolean', required: false },
          { key: 'furnished', label: 'Furnished', type: 'boolean', required: false },
          { key: 'depositAmount', label: 'Security deposit ($)', type: 'number', required: false, min: 0 },
          { key: 'leaseTerm', label: 'Lease term', type: 'select', required: false, options: ['month-to-month', '6-months', '12-months', '24-months'] },
        ],
      },
      {
        slug: 'rooms-for-rent',
        label: 'Rooms for Rent',
        fields: [
          { key: 'petsAllowed', label: 'Pets', type: 'select', required: false, options: PET_POLICIES },
          { key: 'furnished', label: 'Furnished', type: 'boolean', required: false },
          { key: 'privateBath', label: 'Private bathroom', type: 'boolean', required: false },
          { key: 'utilitiesIncluded', label: 'Utilities included', type: 'boolean', required: false },
          { key: 'housemateGender', label: 'Preferred housemate', type: 'select', required: false, options: ['male', 'female', 'no-preference'] },
        ],
      },
      {
        slug: 'vacation-rentals',
        label: 'Vacation Rentals',
        fields: [
          { key: 'maxGuests', label: 'Max guests', type: 'number', required: true, min: 1 },
          { key: 'minimumNights', label: 'Minimum nights', type: 'number', required: false, min: 1 },
          { key: 'petsAllowed', label: 'Pets', type: 'select', required: false, options: PET_POLICIES },
          { key: 'pool', label: 'Pool', type: 'boolean', required: false },
          { key: 'hotTub', label: 'Hot tub', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'parking-storage',
        label: 'Parking & Storage',
        fields: [
          { key: 'parkingType', label: 'Type', type: 'select', required: true, options: ['garage', 'carport', 'outdoor', 'storage-unit', 'rv-storage'] },
          { key: 'indoor', label: 'Indoor', type: 'boolean', required: false },
          { key: 'sizeDescription', label: 'Size', type: 'text', required: false },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // REAL ESTATE (for sale)
  // -------------------------------------------------------------------------
  {
    slug: 'real-estate',
    label: 'Real Estate',
    icon: '🏡',
    sharedFields: [
      { key: 'propertyType', label: 'Property type', type: 'select', required: true, options: PROPERTY_TYPES },
      { key: 'bedrooms', label: 'Bedrooms', type: 'number', required: true, min: 0, max: 20 },
      { key: 'bathrooms', label: 'Bathrooms', type: 'number', required: true, min: 1, max: 20 },
      { key: 'sqft', label: 'Square footage', type: 'number', required: false, min: 100 },
      { key: 'lotSize', label: 'Lot size (acres)', type: 'number', required: false, min: 0 },
      { key: 'yearBuilt', label: 'Year built', type: 'year', required: false, min: 1800, max: 2026 },
      { key: 'hoa', label: 'HOA fees ($/mo)', type: 'number', required: false, min: 0 },
    ],
    subcategories: [
      {
        slug: 'homes-for-sale',
        label: 'Homes for Sale',
        fields: [
          { key: 'garage', label: 'Garage', type: 'boolean', required: false },
          { key: 'pool', label: 'Pool', type: 'boolean', required: false },
          { key: 'basement', label: 'Basement', type: 'boolean', required: false },
          { key: 'stories', label: 'Stories', type: 'number', required: false, min: 1, max: 5 },
        ],
      },
      {
        slug: 'condos-for-sale',
        label: 'Condos & Townhomes',
        fields: [
          { key: 'floor', label: 'Floor number', type: 'number', required: false, min: 1 },
          { key: 'parking', label: 'Parking', type: 'select', required: false, options: PARKING_TYPES },
        ],
      },
      {
        slug: 'land-for-sale',
        label: 'Land for Sale',
        fields: [
          { key: 'zoning', label: 'Zoning', type: 'select', required: false, options: ['residential', 'commercial', 'agricultural', 'mixed', 'other'] },
          { key: 'utilities', label: 'Utilities available', type: 'boolean', required: false },
          { key: 'roadAccess', label: 'Road access', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'commercial-real-estate',
        label: 'Commercial Real Estate',
        fields: [
          { key: 'commercialType', label: 'Type', type: 'select', required: true, options: ['office', 'retail', 'industrial', 'warehouse', 'restaurant', 'other'] },
          { key: 'zoning', label: 'Zoning', type: 'text', required: false },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // JOBS / SERVICES
  // -------------------------------------------------------------------------
  {
    slug: 'jobs-services',
    label: 'Jobs & Services',
    icon: '💼',
    subcategories: [
      {
        slug: 'jobs',
        label: 'Jobs',
        fields: [
          { key: 'jobType', label: 'Job type', type: 'select', required: true, options: JOB_TYPES },
          { key: 'industry', label: 'Industry', type: 'text', required: false },
          { key: 'salaryMin', label: 'Salary min ($/yr)', type: 'number', required: false, min: 0 },
          { key: 'salaryMax', label: 'Salary max ($/yr)', type: 'number', required: false, min: 0 },
          { key: 'remote', label: 'Remote', type: 'select', required: false, options: ['on-site', 'remote', 'hybrid'] },
          { key: 'experience', label: 'Experience required', type: 'select', required: false, options: ['entry', '1-2-years', '3-5-years', '5-plus-years'] },
        ],
      },
      {
        slug: 'services',
        label: 'Services Offered',
        fields: [
          { key: 'serviceType', label: 'Service type', type: 'select', required: true, options: SERVICE_TYPES },
          { key: 'licensed', label: 'Licensed & insured', type: 'boolean', required: false },
          { key: 'yearsExperience', label: 'Years of experience', type: 'number', required: false, min: 0 },
          { key: 'serviceArea', label: 'Service area (miles)', type: 'number', required: false, min: 1 },
        ],
      },
      {
        slug: 'gigs',
        label: 'Gigs & Skilled Trade',
        fields: [
          { key: 'gigType', label: 'Gig type', type: 'text', required: true },
          { key: 'availability', label: 'Availability', type: 'select', required: false, options: ['weekdays', 'weekends', 'evenings', 'flexible'] },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // FOR SALE (general goods)
  // -------------------------------------------------------------------------
  {
    slug: 'for-sale',
    label: 'For Sale',
    icon: '🛍️',
    subcategories: [
      {
        slug: 'electronics',
        label: 'Electronics',
        fields: [
          { key: 'electronicsType', label: 'Type', type: 'select', required: true, options: ELECTRONICS_SUBTYPES },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'model', label: 'Model', type: 'text', required: false },
          { key: 'storageGB', label: 'Storage (GB)', type: 'number', required: false, min: 0 },
          { key: 'carrier', label: 'Carrier (phones)', type: 'text', required: false },
          { key: 'includesOriginalBox', label: 'Includes original box', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'furniture',
        label: 'Furniture',
        fields: [
          { key: 'furnitureType', label: 'Type', type: 'select', required: true, options: FURNITURE_SUBTYPES },
          { key: 'material', label: 'Material', type: 'text', required: false },
          { key: 'color', label: 'Color', type: 'text', required: false },
          { key: 'dimensions', label: 'Dimensions (LxWxH)', type: 'text', required: false },
          { key: 'smokeFree', label: 'Smoke-free home', type: 'boolean', required: false },
          { key: 'petFree', label: 'Pet-free home', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'clothing',
        label: 'Clothing & Apparel',
        fields: [
          { key: 'clothingType', label: 'Type', type: 'select', required: true, options: CLOTHING_SUBTYPES },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'size', label: 'Size', type: 'select', required: false, options: CLOTHING_SIZES },
          { key: 'gender', label: 'Gender', type: 'select', required: false, options: ['mens', 'womens', 'unisex', 'boys', 'girls'] },
          { key: 'color', label: 'Color', type: 'text', required: false },
          { key: 'nwt', label: 'New with tags', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'shoes',
        label: 'Shoes',
        fields: [
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'size', label: 'Size (US)', type: 'select', required: false, options: SHOE_SIZES },
          { key: 'gender', label: 'Gender', type: 'select', required: false, options: ['mens', 'womens', 'kids', 'unisex'] },
          { key: 'color', label: 'Color', type: 'text', required: false },
        ],
      },
      {
        slug: 'appliances',
        label: 'Appliances',
        fields: [
          { key: 'applianceType', label: 'Type', type: 'select', required: true, options: ['refrigerator', 'washer', 'dryer', 'dishwasher', 'stove-oven', 'microwave', 'freezer', 'other'] },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'color', label: 'Color', type: 'text', required: false },
          { key: 'dimensions', label: 'Dimensions', type: 'text', required: false },
        ],
      },
      {
        slug: 'tools',
        label: 'Tools & Hardware',
        fields: [
          { key: 'toolType', label: 'Tool type', type: 'text', required: false },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'powerSource', label: 'Power source', type: 'select', required: false, options: ['corded', 'cordless', 'gas', 'manual'] },
        ],
      },
      {
        slug: 'sporting-goods',
        label: 'Sporting Goods',
        fields: [
          { key: 'sportCategory', label: 'Sport/category', type: 'select', required: true, options: SPORT_SUBCATEGORIES },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'size', label: 'Size', type: 'text', required: false },
        ],
      },
      {
        slug: 'toys-games',
        label: 'Toys & Games',
        fields: [
          { key: 'toyType', label: 'Type', type: 'text', required: false },
          { key: 'ageGroup', label: 'Age group', type: 'select', required: false, options: TOY_AGE_GROUPS },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'allPartsIncluded', label: 'All parts included', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'books-media',
        label: 'Books & Media',
        fields: [
          { key: 'mediaType', label: 'Type', type: 'select', required: true, options: ['book', 'textbook', 'dvd-blu-ray', 'vinyl', 'cd', 'video-game', 'other'] },
          { key: 'title', label: 'Title', type: 'text', required: false },
          { key: 'author', label: 'Author / Artist', type: 'text', required: false },
          { key: 'isbn', label: 'ISBN', type: 'text', required: false },
          { key: 'edition', label: 'Edition', type: 'text', required: false },
        ],
      },
      {
        slug: 'garden-outdoor',
        label: 'Garden & Outdoor',
        fields: [
          { key: 'itemType', label: 'Item type', type: 'text', required: false },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
        ],
      },
      {
        slug: 'musical-instruments',
        label: 'Musical Instruments',
        fields: [
          { key: 'instrumentType', label: 'Instrument', type: 'text', required: true },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'includesCase', label: 'Includes case', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'collectibles-art',
        label: 'Collectibles & Art',
        fields: [
          { key: 'collectibleType', label: 'Type', type: 'text', required: false },
          { key: 'era', label: 'Era / period', type: 'text', required: false },
          { key: 'authenticated', label: 'Authenticated / certified', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'baby-kids',
        label: 'Baby & Kids',
        fields: [
          { key: 'itemType', label: 'Item type', type: 'text', required: false },
          { key: 'ageGroup', label: 'Age group', type: 'select', required: false, options: TOY_AGE_GROUPS },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'smokeFree', label: 'Smoke-free home', type: 'boolean', required: false },
          { key: 'petFree', label: 'Pet-free home', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'health-beauty',
        label: 'Health & Beauty',
        fields: [
          { key: 'itemType', label: 'Item type', type: 'text', required: false },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'sealed', label: 'Sealed / unopened', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'free-stuff',
        label: 'Free Stuff',
        fields: [
          { key: 'itemType', label: 'Item type', type: 'text', required: false },
          { key: 'pickupRequired', label: 'Pickup required', type: 'boolean', required: true },
        ],
      },
      {
        slug: 'general-for-sale',
        label: 'General / Other',
        fields: [],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // COMMUNITY
  // -------------------------------------------------------------------------
  {
    slug: 'community',
    label: 'Community',
    icon: '🤝',
    subcategories: [
      {
        slug: 'events',
        label: 'Events',
        fields: [
          { key: 'eventDate', label: 'Event date', type: 'text', required: true },
          { key: 'eventTime', label: 'Event time', type: 'text', required: false },
          { key: 'venue', label: 'Venue', type: 'text', required: false },
          { key: 'freeEntry', label: 'Free entry', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'lost-found',
        label: 'Lost & Found',
        fields: [
          { key: 'itemType', label: 'Item / animal type', type: 'text', required: true },
          { key: 'lostOrFound', label: 'Lost or found', type: 'select', required: true, options: ['lost', 'found'] },
          { key: 'dateOccurred', label: 'Date lost/found', type: 'text', required: false },
          { key: 'color', label: 'Color / description', type: 'text', required: false },
        ],
      },
      {
        slug: 'pets',
        label: 'Pets',
        fields: [
          { key: 'petType', label: 'Pet type', type: 'select', required: true, options: ['dog', 'cat', 'bird', 'fish', 'reptile', 'small-animal', 'other'] },
          { key: 'breed', label: 'Breed', type: 'text', required: false },
          { key: 'age', label: 'Age', type: 'text', required: false },
          { key: 'gender', label: 'Gender', type: 'select', required: false, options: ['male', 'female'] },
          { key: 'vaccinated', label: 'Vaccinated', type: 'boolean', required: false },
          { key: 'spayedNeutered', label: 'Spayed / neutered', type: 'boolean', required: false },
          { key: 'rehomingFee', label: 'Rehoming fee', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'rideshare',
        label: 'Rideshare',
        fields: [
          { key: 'origin', label: 'Departure city', type: 'text', required: true },
          { key: 'destination', label: 'Destination city', type: 'text', required: true },
          { key: 'departureDate', label: 'Departure date', type: 'text', required: true },
          { key: 'seatsAvailable', label: 'Seats available', type: 'number', required: true, min: 1, max: 8 },
          { key: 'smokeFree', label: 'Smoke-free ride', type: 'boolean', required: false },
          { key: 'petsWelcome', label: 'Pets welcome', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'volunteers',
        label: 'Volunteers Needed',
        fields: [
          { key: 'organization', label: 'Organization', type: 'text', required: false },
          { key: 'cause', label: 'Cause / type', type: 'text', required: false },
          { key: 'commitment', label: 'Time commitment', type: 'text', required: false },
        ],
      },
      {
        slug: 'missed-connections',
        label: 'Missed Connections',
        fields: [
          { key: 'location', label: 'Location / venue', type: 'text', required: false },
          { key: 'dateOccurred', label: 'Date', type: 'text', required: false },
        ],
      },
    ],
  },
];

/** Flat map of all subcategory slugs to their parent + field definitions. */
export const SUBCATEGORY_MAP = new Map(
  CATEGORY_TREE.flatMap((cat) =>
    cat.subcategories.map((sub) => [
      sub.slug,
      {
        parentSlug: cat.slug,
        parentLabel: cat.label,
        ...sub,
        fields: [...(cat.sharedFields ?? []), ...sub.fields],
      },
    ]),
  ),
);

/** All required fields for a given subcategory slug. */
export function getRequiredFields(subcategorySlug: string): CategoryField[] {
  const sub = SUBCATEGORY_MAP.get(subcategorySlug);
  return sub ? sub.fields.filter((f) => f.required) : [];
}

/** All field definitions (required + optional) for a given subcategory slug. */
export function getAllFields(subcategorySlug: string): CategoryField[] {
  const sub = SUBCATEGORY_MAP.get(subcategorySlug);
  return sub ? sub.fields : [];
}
