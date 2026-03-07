/**
 * Authoritative category definitions for the Marketplace application.
 *
 * Derived from CATEGORIES.md (the master category matrix).
 * This file is self-contained -- it does not import from other files.
 */

// ---------------------------------------------------------------------------
// 1. CATEGORY_SLUGS -- every slug from the master category matrix
// ---------------------------------------------------------------------------

export const CATEGORY_SLUGS = {
  // ---- Marketplace items (top-level, no parent) ---------------------------
  ANTIQUES_COLLECTIBLES: 'antiques-collectibles',
  APPLIANCES: 'appliances',
  ARTS_CRAFTS: 'arts-crafts',
  AVIATION: 'aviation',
  BABY_KIDS: 'baby-kids',
  BARTER: 'barter',
  BEAUTY: 'beauty',
  BICYCLE_PARTS: 'bicycle-parts',
  BICYCLES: 'bicycles',
  BOOKS: 'books',
  CDS_DVDS_VHS: 'cds-dvds-vhs',
  CELL_PHONES: 'cell-phones',
  CLOTHING_ACCESSORIES: 'clothing-accessories',
  ELECTRONICS: 'electronics',
  FARM_GARDEN: 'farm-garden',
  FREE: 'free',
  GARAGE_SALE: 'garage-sale',
  GENERAL: 'general',
  JEWELRY_WATCHES: 'jewelry-watches',
  MATERIALS: 'materials',
  MUSIC_INSTRUMENTS: 'music-instruments',
  PHOTO_VIDEO: 'photo-video',
  CAMPING_OUTDOORS: 'camping-outdoors',
  SPORTING_GOODS: 'sporting-goods',
  TICKETS: 'tickets',
  TOOLS: 'tools',
  VIDEO_GAMING: 'video-gaming',
  WANTED: 'wanted',

  // ---- Section parents (top-level) ----------------------------------------
  VEHICLES: 'vehicles',
  VEHICLE_PARTS: 'vehicle-parts',
  HOME: 'home',
  BUSINESS_COMMERCIAL_INDUSTRIAL: 'business-commercial-industrial',
  ALTERNATIVE_FUEL_ENERGY: 'alternative-fuel-energy',
  HOUSING: 'housing',
  SERVICES: 'services',
  JOBS: 'jobs',
  GIGS: 'gigs',

  // ---- Vehicles subcategories ---------------------------------------------
  CARS_TRUCKS: 'cars-trucks',
  CLASSIC_CARS: 'classic-cars',
  COLLECTOR_CARS: 'collector-cars',
  COMMERCIAL_TRUCKS: 'commercial-trucks',
  EXOTIC_CARS: 'exotic-cars',
  MARINE_BOATS: 'marine-boats',
  MOTORCYCLES: 'motorcycles',
  POWERSPORTS: 'powersports',
  RVS_CAMPERS: 'rvs-campers',
  TRAILERS: 'trailers',
  OTHER_VEHICLES: 'other-vehicles',
  PARTS_VEHICLES: 'parts-vehicles',
  GOLF_CARTS: 'golf-carts',

  // ---- Vehicle Parts subcategories ----------------------------------------
  AUTO_TRUCK_PARTS: 'auto-truck-parts',
  MOTORCYCLE_PARTS: 'motorcycle-parts',
  POWERSPORTS_PARTS: 'powersports-parts',
  MARINE_PARTS: 'marine-parts',
  RV_PARTS: 'rv-parts',
  TRAILER_PARTS: 'trailer-parts',
  WHEELS_TIRES: 'wheels-tires',
  OTHER_VEHICLE_PARTS: 'other-vehicle-parts',
  // parts-vehicles also appears under Vehicle Parts (shared slug)

  // ---- Home subcategories -------------------------------------------------
  HOME_DECOR: 'home-decor',
  HOUSEHOLD: 'household',
  GAMES_TOYS: 'games-toys',

  // ---- Business / Commercial / Industrial subcategories -------------------
  BUILDING_MATERIALS: 'building-materials',
  TOOLS_LIGHT_EQUIPMENT_WORKSHOP: 'tools-light-equipment-workshop',
  ELECTRICAL_EQUIPMENT_SUPPLIES: 'electrical-equipment-supplies',
  FASTENERS_HARDWARE: 'fasteners-hardware',
  HEALTHCARE_LAB_DENTAL: 'healthcare-lab-dental',
  HEAVY_EQUIPMENT_PARTS_ATTACHMENTS: 'heavy-equipment-parts-attachments',
  HVAC_REFRIGERATION: 'hvac-refrigeration',
  HYDRAULICS: 'hydraulics',
  PNEUMATICS: 'pneumatics',
  PUMPS_PLUMBING: 'pumps-plumbing',
  MATERIAL_HANDLING: 'material-handling',
  PRINTING_GRAPHIC_ARTS: 'printing-graphic-arts',
  RESTAURANT_FOOD_SERVICE_EQUIPMENT: 'restaurant-food-service-equipment',
  TESTING_MEASUREMENT_INSPECTION: 'testing-measurement-inspection',
  PALLET_SALES: 'pallet-sales',

  // ---- Alternative Fuel & Energy subcategories ----------------------------
  WOOD_HEATING: 'wood-heating',
  WASTE_OIL_HEATING: 'waste-oil-heating',
  WOOD_PELLETS: 'wood-pellets',
  SOLAR: 'solar',
  WIND: 'wind',
  OTHER_ALTERNATIVE_ENERGY: 'other-alternative-energy',

  // ---- Housing subcategories ----------------------------------------------
  APARTMENTS_HOUSING_RENT: 'apartments-housing-rent',
  HOUSING_SWAP: 'housing-swap',
  HOUSING_WANTED: 'housing-wanted',
  OFFICE_COMMERCIAL: 'office-commercial',
  PARKING_STORAGE: 'parking-storage',
  REAL_ESTATE_FOR_SALE: 'real-estate-for-sale',
  ROOMS_SHARED: 'rooms-shared',
  ROOMS_WANTED: 'rooms-wanted',
  SUBLETS_TEMPORARY: 'sublets-temporary',
  VACATION_RENTALS: 'vacation-rentals',

  // ---- Services subcategories ---------------------------------------------
  AUTOMOTIVE_SERVICES: 'automotive',
  BEAUTY_SERVICES: 'beauty',
  CELL_MOBILE: 'cell-mobile',
  COMPUTER: 'computer',
  CREATIVE: 'creative',
  CYCLE: 'cycle',
  EVENT: 'event',
  FARM_GARDEN_SERVICES: 'farm-garden-services',
  FINANCIAL: 'financial',
  HEALTH_WELLNESS: 'health-wellness',
  HOUSEHOLD_SERVICES: 'household-services',
  BUSINESS_SERVICES: 'business-services',
  LABOR_MOVING: 'labor-moving',
  LEGAL: 'legal',
  LESSONS: 'lessons',
  MARINE_SERVICES: 'marine-services',
  PET: 'pet',
  REAL_ESTATE_SERVICES: 'real-estate-services',
  SKILLED_TRADE_SERVICES: 'skilled-trade-services',
  SMALL_BUSINESS_ADS: 'small-business-ads',
  TRAVEL_VACATION: 'travel-vacation',
  WRITING_EDITING_TRANSLATION: 'writing-editing-translation',

  // ---- Jobs subcategories -------------------------------------------------
  ACCOUNTING_FINANCE: 'accounting-finance',
  ADMINISTRATIVE_OFFICE: 'administrative-office',
  ARCHITECTURE: 'architecture',
  ENGINEERING: 'engineering',
  ART_MEDIA_DESIGN: 'art-media-design',
  BIOTECH_SCIENCE: 'biotech-science',
  BUSINESS_MANAGEMENT: 'business-management',
  CUSTOMER_SERVICE: 'customer-service',
  EDUCATION: 'education',
  MISCELLANEOUS: 'miscellaneous',
  HOSPITALITY: 'hospitality',
  GENERAL_LABOR: 'general-labor',
  GOVERNMENT: 'government',
  HUMAN_RESOURCES: 'human-resources',
  LEGAL_PARALEGAL: 'legal-paralegal',
  MANUFACTURING: 'manufacturing',
  MARKETING_PUBLIC_RELATIONS: 'marketing-public-relations',
  MEDICAL_HEALTH: 'medical-health',
  NONPROFIT: 'nonprofit',
  REAL_ESTATE_JOBS: 'real-estate-jobs',
  RETAIL_WHOLESALE: 'retail-wholesale',
  SALES: 'sales',
  SALON_SPA_FITNESS: 'salon-spa-fitness',
  SECURITY: 'security',
  SKILLED_TRADE_JOBS: 'skilled-trade-jobs',
  SOFTWARE_IT_TECHNICAL_SUPPORT: 'software-it-technical-support',
  TRANSPORTATION: 'transportation',
  TV_FILM_VIDEO: 'tv-film-video',
  WEB_INFORMATION_DESIGN: 'web-information-design',
  WRITING_EDITING: 'writing-editing',

  // ---- Gigs subcategories -------------------------------------------------
  COMPUTER_GIGS: 'computer-gigs',
  CREATIVE_DESIGN_GIGS: 'creative-design-gigs',
  CREW: 'crew',
  DOMESTIC: 'domestic',
  EVENT_GIGS: 'event-gigs',
  GENERAL_LABOR_GIGS: 'general-labor-gigs',
  TALENT: 'talent',
  WRITING_GIGS: 'writing-gigs',
} as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[keyof typeof CATEGORY_SLUGS];

// ---------------------------------------------------------------------------
// 2. NAVIGATION_SECTIONS -- how categories are grouped for browsing UI
// ---------------------------------------------------------------------------

export interface NavigationSection {
  id: string;
  label: string;
  /** Slugs shown in this section. For alternate-nav items the slug points to the canonical category. */
  categorySlugs: readonly CategorySlug[];
}

export const NAVIGATION_SECTIONS: readonly NavigationSection[] = [
  {
    id: 'marketplace',
    label: 'Marketplace',
    categorySlugs: [
      'antiques-collectibles',
      'appliances',
      'arts-crafts',
      'aviation',
      'baby-kids',
      'barter',
      'beauty',
      'bicycle-parts',
      'bicycles',
      'books',
      'cds-dvds-vhs',
      'cell-phones',
      'clothing-accessories',
      'electronics',
      'farm-garden',
      'free',
      'garage-sale',
      'general',
      'jewelry-watches',
      'materials',
      'music-instruments',
      'photo-video',
      'camping-outdoors',
      'sporting-goods',
      'tickets',
      'tools',
      'video-gaming',
      'wanted',
      // Alternate-nav shortcuts (canonical home is under vehicles):
      'trailers',
      'marine-boats',
      'powersports',
    ],
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    categorySlugs: [
      'cars-trucks',
      'classic-cars',
      'collector-cars',
      'commercial-trucks',
      'exotic-cars',
      'marine-boats',
      'motorcycles',
      'powersports',
      'rvs-campers',
      'trailers',
      'other-vehicles',
      'parts-vehicles',
      'golf-carts',
    ],
  },
  {
    id: 'vehicle-parts',
    label: 'Vehicle Parts',
    categorySlugs: [
      'auto-truck-parts',
      'motorcycle-parts',
      'powersports-parts',
      'marine-parts',
      'rv-parts',
      'trailer-parts',
      'wheels-tires',
      'other-vehicle-parts',
      'parts-vehicles',
    ],
  },
  {
    id: 'home',
    label: 'Home',
    categorySlugs: [
      'home-decor',
      'household',
      'games-toys',
    ],
  },
  {
    id: 'business-commercial-industrial',
    label: 'Business / Commercial / Industrial',
    categorySlugs: [
      'building-materials',
      'tools-light-equipment-workshop',
      'electrical-equipment-supplies',
      'fasteners-hardware',
      'healthcare-lab-dental',
      'heavy-equipment-parts-attachments',
      'hvac-refrigeration',
      'hydraulics',
      'pneumatics',
      'pumps-plumbing',
      'material-handling',
      'printing-graphic-arts',
      'restaurant-food-service-equipment',
      'testing-measurement-inspection',
      'pallet-sales',
    ],
  },
  {
    id: 'alternative-fuel-energy',
    label: 'Alternative Fuel & Energy',
    categorySlugs: [
      'wood-heating',
      'waste-oil-heating',
      'wood-pellets',
      'solar',
      'wind',
      'other-alternative-energy',
    ],
  },
  {
    id: 'housing',
    label: 'Housing',
    categorySlugs: [
      'apartments-housing-rent',
      'housing-swap',
      'housing-wanted',
      'office-commercial',
      'parking-storage',
      'real-estate-for-sale',
      'rooms-shared',
      'rooms-wanted',
      'sublets-temporary',
      'vacation-rentals',
    ],
  },
  {
    id: 'services',
    label: 'Services',
    categorySlugs: [
      'automotive',
      'beauty',
      'cell-mobile',
      'computer',
      'creative',
      'cycle',
      'event',
      'farm-garden-services',
      'financial',
      'health-wellness',
      'household-services',
      'business-services',
      'labor-moving',
      'legal',
      'lessons',
      'marine-services',
      'pet',
      'real-estate-services',
      'skilled-trade-services',
      'small-business-ads',
      'travel-vacation',
      'writing-editing-translation',
    ],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    categorySlugs: [
      'accounting-finance',
      'administrative-office',
      'architecture',
      'engineering',
      'art-media-design',
      'biotech-science',
      'business-management',
      'customer-service',
      'education',
      'miscellaneous',
      'hospitality',
      'general-labor',
      'government',
      'human-resources',
      'legal-paralegal',
      'manufacturing',
      'marketing-public-relations',
      'medical-health',
      'nonprofit',
      'real-estate-jobs',
      'retail-wholesale',
      'sales',
      'salon-spa-fitness',
      'security',
      'skilled-trade-jobs',
      'software-it-technical-support',
      'transportation',
      'tv-film-video',
      'web-information-design',
      'writing-editing',
    ],
  },
  {
    id: 'gigs',
    label: 'Gigs',
    categorySlugs: [
      'computer-gigs',
      'creative-design-gigs',
      'crew',
      'domestic',
      'event-gigs',
      'general-labor-gigs',
      'talent',
      'writing-gigs',
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// 3. ALTERNATE_NAV_SLUGS
// ---------------------------------------------------------------------------

/** Slugs that appear in multiple navigation sections. Their canonical home is under the vehicles section. */
export const ALTERNATE_NAV_SLUGS: readonly CategorySlug[] = [
  'trailers',
  'marine-boats',
  'powersports',
] as const;

// ---------------------------------------------------------------------------
// 4. Search parameter definitions (search params per category scope)
// ---------------------------------------------------------------------------

export interface SearchParamDef {
  key: string;
  label: string;
  inputType: 'range' | 'single-select' | 'multi-select' | 'text' | 'boolean';
  options?: readonly string[];
  /** Category slugs this parameter applies to. `undefined` = universal. */
  appliesToSlugs?: readonly CategorySlug[];
}

/** Universal params -- apply to most categories. */
export const UNIVERSAL_SEARCH_PARAMS: readonly SearchParamDef[] = [
  { key: 'price', label: 'Price', inputType: 'range' },
  { key: 'condition', label: 'Condition', inputType: 'single-select', options: ['New', 'Like New', 'Good', 'Fair', 'Poor'] },
  { key: 'date_posted', label: 'Date Posted', inputType: 'single-select', options: ['Today', 'This Week', 'This Month'] },
  { key: 'has_photos', label: 'Has Photos', inputType: 'boolean' },
  { key: 'delivery', label: 'Pickup / Delivery / Shipping', inputType: 'multi-select', options: ['Local Pickup', 'Shipping Available', 'Delivery Available'] },
] as const;

// Slug lists used by vehicle search params
const VEHICLE_YEAR_MAKE_MODEL_SLUGS: readonly CategorySlug[] = [
  'cars-trucks', 'classic-cars', 'collector-cars', 'commercial-trucks',
  'exotic-cars', 'motorcycles', 'rvs-campers', 'marine-boats',
  'powersports', 'trailers', 'other-vehicles', 'golf-carts',
] as const;

const VEHICLE_MILEAGE_SLUGS: readonly CategorySlug[] = [
  'cars-trucks', 'classic-cars', 'collector-cars', 'commercial-trucks',
  'exotic-cars', 'motorcycles', 'rvs-campers',
] as const;

const VEHICLE_FUEL_TRANS_DRIVE_SLUGS: readonly CategorySlug[] = [
  'cars-trucks', 'classic-cars', 'collector-cars', 'commercial-trucks',
  'exotic-cars',
] as const;

const VEHICLE_BODY_STYLE_SLUGS: readonly CategorySlug[] = [
  'cars-trucks', 'classic-cars', 'collector-cars', 'exotic-cars',
] as const;

const VEHICLE_TITLE_STATUS_SLUGS: readonly CategorySlug[] = [
  'cars-trucks', 'classic-cars', 'collector-cars', 'commercial-trucks',
  'exotic-cars', 'motorcycles', 'rvs-campers', 'marine-boats',
  'powersports', 'trailers', 'other-vehicles', 'parts-vehicles',
] as const;

const VEHICLE_COLOR_VIN_SLUGS: readonly CategorySlug[] = [
  'cars-trucks', 'classic-cars', 'collector-cars', 'commercial-trucks',
  'exotic-cars', 'motorcycles',
] as const;

export const VEHICLE_SEARCH_PARAMS: readonly SearchParamDef[] = [
  { key: 'year', label: 'Year', inputType: 'range', appliesToSlugs: VEHICLE_YEAR_MAKE_MODEL_SLUGS },
  { key: 'make', label: 'Make', inputType: 'single-select', appliesToSlugs: VEHICLE_YEAR_MAKE_MODEL_SLUGS },
  { key: 'model', label: 'Model', inputType: 'single-select', appliesToSlugs: VEHICLE_YEAR_MAKE_MODEL_SLUGS },
  { key: 'trim', label: 'Trim', inputType: 'single-select', appliesToSlugs: VEHICLE_FUEL_TRANS_DRIVE_SLUGS },
  { key: 'mileage', label: 'Mileage', inputType: 'range', appliesToSlugs: VEHICLE_MILEAGE_SLUGS },
  { key: 'fuel_type', label: 'Fuel Type', inputType: 'single-select', options: ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid', 'Other'], appliesToSlugs: VEHICLE_FUEL_TRANS_DRIVE_SLUGS },
  { key: 'transmission', label: 'Transmission', inputType: 'single-select', options: ['Automatic', 'Manual', 'CVT', 'Other'], appliesToSlugs: VEHICLE_FUEL_TRANS_DRIVE_SLUGS },
  { key: 'drive_type', label: 'Drive Type', inputType: 'single-select', options: ['FWD', 'RWD', 'AWD', '4WD'], appliesToSlugs: VEHICLE_FUEL_TRANS_DRIVE_SLUGS },
  { key: 'body_style', label: 'Body Style', inputType: 'single-select', options: ['Sedan', 'Coupe', 'SUV', 'Truck', 'Van', 'Wagon', 'Convertible', 'Hatchback', 'Other'], appliesToSlugs: VEHICLE_BODY_STYLE_SLUGS },
  { key: 'title_status', label: 'Title Status', inputType: 'single-select', options: ['Clean', 'Salvage', 'Rebuilt', 'Lien', 'Parts Only'], appliesToSlugs: VEHICLE_TITLE_STATUS_SLUGS },
  { key: 'exterior_color', label: 'Exterior Color', inputType: 'text', appliesToSlugs: VEHICLE_COLOR_VIN_SLUGS },
  { key: 'vin', label: 'VIN', inputType: 'text', appliesToSlugs: VEHICLE_COLOR_VIN_SLUGS },
] as const;

const VEHICLE_PARTS_ALL_SLUGS: readonly CategorySlug[] = [
  'auto-truck-parts', 'motorcycle-parts', 'powersports-parts',
  'marine-parts', 'rv-parts', 'trailer-parts', 'wheels-tires',
  'other-vehicle-parts',
] as const;

export const VEHICLE_PARTS_SEARCH_PARAMS: readonly SearchParamDef[] = [
  { key: 'make', label: 'Make', inputType: 'single-select', appliesToSlugs: VEHICLE_PARTS_ALL_SLUGS },
  { key: 'model', label: 'Model', inputType: 'single-select', appliesToSlugs: VEHICLE_PARTS_ALL_SLUGS },
  { key: 'year', label: 'Year', inputType: 'single-select', appliesToSlugs: VEHICLE_PARTS_ALL_SLUGS },
  { key: 'part_type', label: 'Part Type', inputType: 'single-select', appliesToSlugs: VEHICLE_PARTS_ALL_SLUGS },
  { key: 'part_number', label: 'Part Number', inputType: 'text', appliesToSlugs: VEHICLE_PARTS_ALL_SLUGS },
  { key: 'oem_aftermarket', label: 'OEM / Aftermarket', inputType: 'single-select', options: ['OEM', 'Aftermarket'], appliesToSlugs: VEHICLE_PARTS_ALL_SLUGS },
  { key: 'fits_multiple_vehicles', label: 'Fits Multiple Vehicles', inputType: 'boolean', appliesToSlugs: VEHICLE_PARTS_ALL_SLUGS },
  { key: 'pickup_shipping', label: 'Local Pickup / Shipping Available', inputType: 'single-select', options: ['Local Pickup', 'Shipping Available', 'Both'], appliesToSlugs: VEHICLE_PARTS_ALL_SLUGS },
] as const;

export const WHEELS_TIRES_SEARCH_PARAMS: readonly SearchParamDef[] = [
  { key: 'wheel_diameter', label: 'Wheel Diameter', inputType: 'single-select', appliesToSlugs: ['wheels-tires'] },
  { key: 'wheel_width', label: 'Wheel Width', inputType: 'single-select', appliesToSlugs: ['wheels-tires'] },
  { key: 'bolt_pattern', label: 'Bolt Pattern', inputType: 'single-select', appliesToSlugs: ['wheels-tires'] },
  { key: 'center_bore', label: 'Center Bore', inputType: 'single-select', appliesToSlugs: ['wheels-tires'] },
  { key: 'offset', label: 'Offset', inputType: 'single-select', appliesToSlugs: ['wheels-tires'] },
  { key: 'tire_size', label: 'Tire Size', inputType: 'single-select', appliesToSlugs: ['wheels-tires'] },
  { key: 'tire_type', label: 'Tire Type', inputType: 'multi-select', options: ['Winter', 'All-Season', 'Summer', 'All-Terrain', 'Mud-Terrain'], appliesToSlugs: ['wheels-tires'] },
  { key: 'wheel_material', label: 'Wheel Material', inputType: 'multi-select', options: ['Steel', 'Aluminum / Alloy'], appliesToSlugs: ['wheels-tires'] },
] as const;

const HOUSING_ALL_SLUGS: readonly CategorySlug[] = [
  'apartments-housing-rent', 'housing-swap', 'housing-wanted',
  'office-commercial', 'parking-storage', 'real-estate-for-sale',
  'rooms-shared', 'rooms-wanted', 'sublets-temporary', 'vacation-rentals',
] as const;

export const HOUSING_SEARCH_PARAMS: readonly SearchParamDef[] = [
  { key: 'bathrooms', label: 'Bathrooms', inputType: 'range', appliesToSlugs: HOUSING_ALL_SLUGS },
  { key: 'bedrooms', label: 'Bedrooms', inputType: 'range', appliesToSlugs: HOUSING_ALL_SLUGS },
  {
    key: 'property_type', label: 'Property Type', inputType: 'multi-select',
    options: [
      'House', 'Apartment', 'Room', 'Condo', 'Townhouse', 'Duplex', 'Flat',
      'In-Law Suite', 'Cottage', 'Cabin', 'Manufactured Home', 'Assisted Living',
      'Land', 'Trailer / Mobile Home',
    ],
    appliesToSlugs: HOUSING_ALL_SLUGS,
  },
  {
    key: 'pet_policy', label: 'Pet Policy', inputType: 'multi-select',
    options: ['Pets Allowed', 'Dog Friendly', 'Cat Friendly', 'No Pets'],
    appliesToSlugs: HOUSING_ALL_SLUGS,
  },
  { key: 'ev_charging', label: 'EV Charging', inputType: 'boolean', appliesToSlugs: HOUSING_ALL_SLUGS },
  { key: 'wheelchair_accessible', label: 'Wheelchair Accessible', inputType: 'boolean', appliesToSlugs: HOUSING_ALL_SLUGS },
  { key: 'air_conditioning', label: 'Air Conditioning', inputType: 'boolean', appliesToSlugs: HOUSING_ALL_SLUGS },
  { key: 'furnished', label: 'Furnished', inputType: 'boolean', appliesToSlugs: HOUSING_ALL_SLUGS },
  {
    key: 'rental_period', label: 'Rental Period', inputType: 'single-select',
    options: ['Daily', 'Weekly', 'Monthly', 'Lease'],
    appliesToSlugs: HOUSING_ALL_SLUGS,
  },
  {
    key: 'laundry', label: 'Laundry', inputType: 'single-select',
    options: ['In Unit', 'Hookups', 'On Site', 'Laundry Building', 'No Laundry'],
    appliesToSlugs: HOUSING_ALL_SLUGS,
  },
  {
    key: 'parking', label: 'Parking', inputType: 'multi-select',
    options: [
      'Carport', 'Attached Garage', 'Detached Garage', 'Off-Street Parking',
      'Street Parking', 'Valet', 'Parking Garage / Structure', 'No Parking',
    ],
    appliesToSlugs: HOUSING_ALL_SLUGS,
  },
] as const;

export const COMMERCIAL_SEARCH_PARAMS: readonly SearchParamDef[] = [
  { key: 'price', label: 'Price', inputType: 'range', appliesToSlugs: ['office-commercial'] },
  { key: 'price_per_sqft', label: 'Price per Sq. Ft.', inputType: 'range', appliesToSlugs: ['office-commercial'] },
  { key: 'lease_rate', label: 'Lease Rate', inputType: 'range', appliesToSlugs: ['office-commercial'] },
  { key: 'commercial_property_type', label: 'Property Type', inputType: 'single-select', appliesToSlugs: ['office-commercial'] },
  { key: 'lease_term_length', label: 'Lease Term Length', inputType: 'single-select', appliesToSlugs: ['office-commercial'] },
] as const;

export const PARKING_STORAGE_SEARCH_PARAMS: readonly SearchParamDef[] = [
  { key: 'indoor_outdoor', label: 'Indoor / Outdoor', inputType: 'single-select', options: ['Indoor', 'Outdoor'], appliesToSlugs: ['parking-storage'] },
  { key: 'secured_access', label: 'Secured Access', inputType: 'boolean', appliesToSlugs: ['parking-storage'] },
  { key: 'camera_system', label: 'Camera System', inputType: 'boolean', appliesToSlugs: ['parking-storage'] },
  { key: 'climate_controlled', label: 'Climate Controlled', inputType: 'boolean', appliesToSlugs: ['parking-storage'] },
] as const;

/** All search parameter groups collected for lookup. */
const ALL_SEARCH_PARAM_GROUPS: readonly (readonly SearchParamDef[])[] = [
  VEHICLE_SEARCH_PARAMS,
  VEHICLE_PARTS_SEARCH_PARAMS,
  WHEELS_TIRES_SEARCH_PARAMS,
  HOUSING_SEARCH_PARAMS,
  COMMERCIAL_SEARCH_PARAMS,
  PARKING_STORAGE_SEARCH_PARAMS,
];

// ---------------------------------------------------------------------------
// 5. getSearchParamsForCategory helper
// ---------------------------------------------------------------------------

/** Returns the search params applicable to a given category slug. */
export function getSearchParamsForCategory(slug: CategorySlug): readonly SearchParamDef[] {
  const result: SearchParamDef[] = [...UNIVERSAL_SEARCH_PARAMS];

  for (const group of ALL_SEARCH_PARAM_GROUPS) {
    for (const param of group) {
      if (param.appliesToSlugs === undefined || param.appliesToSlugs.includes(slug)) {
        // Avoid adding duplicate keys (e.g. universal "price" vs commercial "price")
        if (!result.some((r) => r.key === param.key)) {
          result.push(param);
        }
      }
    }
  }

  return result;
}

// ===========================================================================
// LEGACY / BACKWARDS-COMPATIBLE EXPORTS
// ===========================================================================
// The constants and interfaces below preserve the API that existed prior to
// the rewrite. They are used by the mobile app, seed scripts, and other
// consumers. Values have been updated to match the master category matrix.
// ===========================================================================

// ---------------------------------------------------------------------------
// Field type primitives (unchanged)
// ---------------------------------------------------------------------------

export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'year';

export interface CategoryField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: readonly string[];
  min?: number;
  max?: number;
}

// ---------------------------------------------------------------------------
// Shared option sets (values updated to match CATEGORIES.md)
// ---------------------------------------------------------------------------

export const VEHICLE_TYPES = [
  'car', 'truck', 'suv', 'van', 'motorcycle', 'rv', 'boat', 'atv', 'trailer', 'other',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const TRANSMISSION_TYPES = ['automatic', 'manual', 'cvt', 'other'] as const;
export type TransmissionType = (typeof TRANSMISSION_TYPES)[number];

export const FUEL_TYPES = ['gasoline', 'diesel', 'electric', 'hybrid', 'plug-in-hybrid', 'other'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const DRIVETRAIN_TYPES = ['fwd', 'rwd', 'awd', '4wd'] as const;
export type DrivetrainType = (typeof DRIVETRAIN_TYPES)[number];

export const TITLE_STATUSES = ['clean', 'salvage', 'rebuilt', 'lien', 'parts-only'] as const;
export type TitleStatus = (typeof TITLE_STATUSES)[number];

export const PROPERTY_TYPES = [
  'house', 'apartment', 'room', 'condo', 'townhouse', 'duplex', 'flat',
  'in-law-suite', 'cottage', 'cabin', 'manufactured-home', 'assisted-living',
  'land', 'trailer-mobile-home', 'other',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PET_POLICIES = ['pets-allowed', 'dog-friendly', 'cat-friendly', 'no-pets'] as const;
export type PetPolicy = (typeof PET_POLICIES)[number];

export const LAUNDRY_TYPES = ['in-unit', 'hookups', 'on-site', 'laundry-building', 'no-laundry'] as const;
export type LaundryType = (typeof LAUNDRY_TYPES)[number];

export const PARKING_TYPES = [
  'carport', 'attached-garage', 'detached-garage', 'off-street-parking',
  'street-parking', 'valet', 'parking-garage', 'no-parking',
] as const;
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
  icon: string;
  subcategories: Subcategory[];
  /** Fields that apply to every subcategory in this top-level category */
  sharedFields?: CategoryField[];
}

export const CATEGORY_TREE: TopLevelCategory[] = [
  // ---- VEHICLES -----------------------------------------------------------
  {
    slug: 'vehicles',
    label: 'Vehicles',
    icon: 'car',
    sharedFields: [
      { key: 'make', label: 'Make', type: 'text', required: true },
      { key: 'model', label: 'Model', type: 'text', required: true },
      { key: 'year', label: 'Year', type: 'year', required: true, min: 1885, max: 2027 },
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
          { key: 'bodyStyle', label: 'Body Style', type: 'select', required: false, options: ['Sedan', 'Coupe', 'SUV', 'Truck', 'Van', 'Wagon', 'Convertible', 'Hatchback', 'Other'] },
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
          { key: 'color', label: 'Exterior color', type: 'text', required: false },
        ],
      },
      {
        slug: 'classic-cars',
        label: 'Classic Cars',
        fields: [
          { key: 'transmission', label: 'Transmission', type: 'select', required: false, options: TRANSMISSION_TYPES },
          { key: 'fuelType', label: 'Fuel type', type: 'select', required: false, options: FUEL_TYPES },
          { key: 'bodyStyle', label: 'Body Style', type: 'select', required: false, options: ['Sedan', 'Coupe', 'SUV', 'Truck', 'Van', 'Wagon', 'Convertible', 'Hatchback', 'Other'] },
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
          { key: 'color', label: 'Exterior color', type: 'text', required: false },
        ],
      },
      {
        slug: 'collector-cars',
        label: 'Collector Cars',
        fields: [
          { key: 'transmission', label: 'Transmission', type: 'select', required: false, options: TRANSMISSION_TYPES },
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
          { key: 'color', label: 'Exterior color', type: 'text', required: false },
        ],
      },
      {
        slug: 'commercial-trucks',
        label: 'Commercial Trucks',
        fields: [
          { key: 'transmission', label: 'Transmission', type: 'select', required: false, options: TRANSMISSION_TYPES },
          { key: 'fuelType', label: 'Fuel type', type: 'select', required: false, options: FUEL_TYPES },
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
        ],
      },
      {
        slug: 'exotic-cars',
        label: 'Exotic Cars',
        fields: [
          { key: 'transmission', label: 'Transmission', type: 'select', required: false, options: TRANSMISSION_TYPES },
          { key: 'fuelType', label: 'Fuel type', type: 'select', required: false, options: FUEL_TYPES },
          { key: 'bodyStyle', label: 'Body Style', type: 'select', required: false, options: ['Sedan', 'Coupe', 'SUV', 'Truck', 'Van', 'Wagon', 'Convertible', 'Hatchback', 'Other'] },
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
          { key: 'color', label: 'Exterior color', type: 'text', required: false },
        ],
      },
      {
        slug: 'marine-boats',
        label: 'Marine / Boats',
        fields: [
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
          { key: 'length', label: 'Length (ft)', type: 'number', required: false, min: 5 },
          { key: 'hullMaterial', label: 'Hull material', type: 'select', required: false, options: ['fiberglass', 'aluminum', 'wood', 'inflatable', 'other'] },
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
        slug: 'powersports',
        label: 'Powersports',
        fields: [
          { key: 'engineCC', label: 'Engine (cc)', type: 'number', required: false, min: 50 },
          { key: 'titleStatus', label: 'Title status', type: 'select', required: true, options: TITLE_STATUSES },
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
        slug: 'trailers',
        label: 'Trailers',
        fields: [
          { key: 'titleStatus', label: 'Title status', type: 'select', required: false, options: TITLE_STATUSES },
          { key: 'length', label: 'Length (ft)', type: 'number', required: false, min: 4 },
        ],
      },
      {
        slug: 'other-vehicles',
        label: 'Other Vehicles',
        fields: [
          { key: 'titleStatus', label: 'Title status', type: 'select', required: false, options: TITLE_STATUSES },
        ],
      },
      {
        slug: 'parts-vehicles',
        label: 'Parts Vehicles',
        fields: [
          { key: 'titleStatus', label: 'Title status', type: 'select', required: false, options: TITLE_STATUSES },
        ],
      },
      {
        slug: 'golf-carts',
        label: 'Golf Carts',
        fields: [
          { key: 'fuelType', label: 'Power source', type: 'select', required: false, options: ['electric', 'gasoline'] },
        ],
      },
    ],
  },

  // ---- VEHICLE PARTS ------------------------------------------------------
  {
    slug: 'vehicle-parts',
    label: 'Vehicle Parts',
    icon: 'wrench',
    sharedFields: [
      { key: 'fitsMake', label: 'Fits make', type: 'text', required: false },
      { key: 'fitsModel', label: 'Fits model', type: 'text', required: false },
      { key: 'fitsYear', label: 'Fits year', type: 'year', required: false, min: 1885, max: 2027 },
      { key: 'partType', label: 'Part type', type: 'text', required: false },
    ],
    subcategories: [
      { slug: 'auto-truck-parts', label: 'Auto & Truck Parts', fields: [] },
      { slug: 'motorcycle-parts', label: 'Motorcycle Parts', fields: [] },
      { slug: 'powersports-parts', label: 'Powersports Parts', fields: [] },
      { slug: 'marine-parts', label: 'Marine Parts', fields: [] },
      { slug: 'rv-parts', label: 'RV Parts', fields: [] },
      { slug: 'trailer-parts', label: 'Trailer Parts', fields: [] },
      {
        slug: 'wheels-tires',
        label: 'Wheels & Tires',
        fields: [
          { key: 'wheelDiameter', label: 'Wheel diameter', type: 'text', required: false },
          { key: 'boltPattern', label: 'Bolt pattern', type: 'text', required: false },
          { key: 'centerBore', label: 'Center bore', type: 'text', required: false },
          { key: 'tireSize', label: 'Tire size', type: 'text', required: false },
          { key: 'tireType', label: 'Tire type', type: 'multiselect', required: false, options: ['Winter', 'All-Season', 'Summer', 'All-Terrain', 'Mud-Terrain'] },
          { key: 'wheelMaterial', label: 'Wheel material', type: 'multiselect', required: false, options: ['Steel', 'Aluminum / Alloy'] },
        ],
      },
      { slug: 'other-vehicle-parts', label: 'Other Vehicle Parts', fields: [] },
    ],
  },

  // ---- HOME ---------------------------------------------------------------
  {
    slug: 'home',
    label: 'Home',
    icon: 'home',
    subcategories: [
      { slug: 'home-decor', label: 'Home & Decor', fields: [] },
      { slug: 'household', label: 'Household', fields: [] },
      { slug: 'games-toys', label: 'Games & Toys', fields: [] },
    ],
  },

  // ---- BUSINESS / COMMERCIAL / INDUSTRIAL ---------------------------------
  {
    slug: 'business-commercial-industrial',
    label: 'Business / Commercial / Industrial',
    icon: 'building',
    subcategories: [
      { slug: 'building-materials', label: 'Building Materials', fields: [] },
      { slug: 'tools-light-equipment-workshop', label: 'Tools, Light Equipment & Workshop Equipment', fields: [] },
      { slug: 'electrical-equipment-supplies', label: 'Electrical Equipment & Supplies', fields: [] },
      { slug: 'fasteners-hardware', label: 'Fasteners & Hardware', fields: [] },
      { slug: 'healthcare-lab-dental', label: 'Healthcare, Lab & Dental', fields: [] },
      { slug: 'heavy-equipment-parts-attachments', label: 'Heavy Equipment, Parts & Attachments', fields: [] },
      { slug: 'hvac-refrigeration', label: 'HVAC & Refrigeration', fields: [] },
      { slug: 'hydraulics', label: 'Hydraulics', fields: [] },
      { slug: 'pneumatics', label: 'Pneumatics', fields: [] },
      { slug: 'pumps-plumbing', label: 'Pumps & Plumbing', fields: [] },
      { slug: 'material-handling', label: 'Material Handling', fields: [] },
      { slug: 'printing-graphic-arts', label: 'Printing & Graphic Arts', fields: [] },
      { slug: 'restaurant-food-service-equipment', label: 'Restaurant & Food Service Equipment', fields: [] },
      { slug: 'testing-measurement-inspection', label: 'Testing, Measurement & Inspection', fields: [] },
      { slug: 'pallet-sales', label: 'Pallet Sales', fields: [] },
    ],
  },

  // ---- ALTERNATIVE FUEL & ENERGY ------------------------------------------
  {
    slug: 'alternative-fuel-energy',
    label: 'Alternative Fuel & Energy',
    icon: 'leaf',
    subcategories: [
      { slug: 'wood-heating', label: 'Wood Heating', fields: [] },
      { slug: 'waste-oil-heating', label: 'Waste Oil Heating', fields: [] },
      { slug: 'wood-pellets', label: 'Wood & Pellets', fields: [] },
      { slug: 'solar', label: 'Solar', fields: [] },
      { slug: 'wind', label: 'Wind', fields: [] },
      { slug: 'other-alternative-energy', label: 'Other Alternative Energy', fields: [] },
    ],
  },

  // ---- HOUSING ------------------------------------------------------------
  {
    slug: 'housing',
    label: 'Housing',
    icon: 'house',
    sharedFields: [
      { key: 'propertyType', label: 'Property type', type: 'select', required: false, options: PROPERTY_TYPES },
      { key: 'bedrooms', label: 'Bedrooms', type: 'number', required: false, min: 0, max: 20 },
      { key: 'bathrooms', label: 'Bathrooms', type: 'number', required: false, min: 0, max: 20 },
      { key: 'sqft', label: 'Square footage', type: 'number', required: false, min: 100 },
    ],
    subcategories: [
      {
        slug: 'apartments-housing-rent',
        label: 'Apartments / Housing for Rent',
        fields: [
          { key: 'petsAllowed', label: 'Pet Policy', type: 'select', required: false, options: PET_POLICIES },
          { key: 'laundry', label: 'Laundry', type: 'select', required: false, options: LAUNDRY_TYPES },
          { key: 'parking', label: 'Parking', type: 'multiselect', required: false, options: PARKING_TYPES },
          { key: 'furnished', label: 'Furnished', type: 'boolean', required: false },
          { key: 'evCharging', label: 'EV Charging', type: 'boolean', required: false },
          { key: 'wheelchairAccessible', label: 'Wheelchair Accessible', type: 'boolean', required: false },
          { key: 'airConditioning', label: 'Air Conditioning', type: 'boolean', required: false },
          { key: 'rentalPeriod', label: 'Rental Period', type: 'select', required: false, options: ['Daily', 'Weekly', 'Monthly', 'Lease'] },
        ],
      },
      { slug: 'housing-swap', label: 'Housing Swap', fields: [] },
      { slug: 'housing-wanted', label: 'Housing Wanted', fields: [] },
      {
        slug: 'office-commercial',
        label: 'Office / Commercial',
        fields: [
          { key: 'pricePerSqft', label: 'Price per Sq. Ft.', type: 'number', required: false, min: 0 },
          { key: 'leaseRate', label: 'Lease Rate', type: 'number', required: false, min: 0 },
          { key: 'leaseTermLength', label: 'Lease Term Length', type: 'text', required: false },
        ],
      },
      {
        slug: 'parking-storage',
        label: 'Parking / Storage',
        fields: [
          { key: 'indoorOutdoor', label: 'Indoor / Outdoor', type: 'select', required: false, options: ['Indoor', 'Outdoor'] },
          { key: 'securedAccess', label: 'Secured Access', type: 'boolean', required: false },
          { key: 'cameraSystem', label: 'Camera System', type: 'boolean', required: false },
          { key: 'climateControlled', label: 'Climate Controlled', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'real-estate-for-sale',
        label: 'Real Estate for Sale',
        fields: [
          { key: 'lotSize', label: 'Lot size (acres)', type: 'number', required: false, min: 0 },
          { key: 'yearBuilt', label: 'Year built', type: 'year', required: false, min: 1800, max: 2027 },
        ],
      },
      {
        slug: 'rooms-shared',
        label: 'Rooms / Shared',
        fields: [
          { key: 'furnished', label: 'Furnished', type: 'boolean', required: false },
          { key: 'petsAllowed', label: 'Pet Policy', type: 'select', required: false, options: PET_POLICIES },
        ],
      },
      { slug: 'rooms-wanted', label: 'Rooms Wanted', fields: [] },
      { slug: 'sublets-temporary', label: 'Sublets / Temporary', fields: [] },
      {
        slug: 'vacation-rentals',
        label: 'Vacation Rentals',
        fields: [
          { key: 'maxGuests', label: 'Max guests', type: 'number', required: false, min: 1 },
          { key: 'minimumNights', label: 'Minimum nights', type: 'number', required: false, min: 1 },
          { key: 'petsAllowed', label: 'Pet Policy', type: 'select', required: false, options: PET_POLICIES },
        ],
      },
    ],
  },

  // ---- MARKETPLACE (general for-sale items, no parent section) ------------
  {
    slug: 'general' as CategorySlug,
    label: 'Marketplace',
    icon: 'tag',
    subcategories: [
      { slug: 'antiques-collectibles', label: 'Antiques & Collectibles', fields: [] },
      {
        slug: 'appliances',
        label: 'Appliances',
        fields: [
          { key: 'applianceType', label: 'Type', type: 'select', required: false, options: ['refrigerator', 'washer', 'dryer', 'dishwasher', 'stove-oven', 'microwave', 'freezer', 'other'] },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
        ],
      },
      { slug: 'arts-crafts', label: 'Arts & Crafts', fields: [] },
      { slug: 'aviation', label: 'Aviation', fields: [] },
      {
        slug: 'baby-kids',
        label: 'Baby & Kids',
        fields: [
          { key: 'ageGroup', label: 'Age group', type: 'select', required: false, options: TOY_AGE_GROUPS },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
        ],
      },
      { slug: 'barter', label: 'Barter', fields: [] },
      { slug: 'beauty', label: 'Beauty', fields: [] },
      { slug: 'bicycle-parts', label: 'Bicycle Parts', fields: [] },
      { slug: 'bicycles', label: 'Bicycles', fields: [] },
      { slug: 'books', label: 'Books', fields: [] },
      { slug: 'cds-dvds-vhs', label: 'CDs, DVDs & VHS', fields: [] },
      {
        slug: 'cell-phones',
        label: 'Cell Phones',
        fields: [
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'storageGB', label: 'Storage (GB)', type: 'number', required: false, min: 0 },
          { key: 'carrier', label: 'Carrier', type: 'text', required: false },
        ],
      },
      {
        slug: 'clothing-accessories',
        label: 'Clothing & Accessories',
        fields: [
          { key: 'clothingType', label: 'Type', type: 'select', required: false, options: CLOTHING_SUBTYPES },
          { key: 'size', label: 'Size', type: 'select', required: false, options: CLOTHING_SIZES },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
        ],
      },
      {
        slug: 'electronics',
        label: 'Electronics',
        fields: [
          { key: 'electronicsType', label: 'Type', type: 'select', required: false, options: ELECTRONICS_SUBTYPES },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'model', label: 'Model', type: 'text', required: false },
        ],
      },
      { slug: 'farm-garden', label: 'Farm & Garden', fields: [] },
      { slug: 'free', label: 'Free', fields: [] },
      { slug: 'garage-sale', label: 'Garage Sale', fields: [] },
      { slug: 'jewelry-watches', label: 'Jewelry & Watches', fields: [] },
      { slug: 'materials', label: 'Materials', fields: [] },
      {
        slug: 'music-instruments',
        label: 'Music Instruments',
        fields: [
          { key: 'instrumentType', label: 'Instrument', type: 'text', required: false },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
        ],
      },
      { slug: 'photo-video', label: 'Photo & Video', fields: [] },
      { slug: 'camping-outdoors', label: 'Camping & Outdoors', fields: [] },
      {
        slug: 'sporting-goods',
        label: 'Sporting Goods',
        fields: [
          { key: 'sportCategory', label: 'Sport/category', type: 'select', required: false, options: SPORT_SUBCATEGORIES },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
        ],
      },
      { slug: 'tickets', label: 'Tickets', fields: [] },
      { slug: 'tools', label: 'Tools', fields: [] },
      { slug: 'video-gaming', label: 'Video Gaming', fields: [] },
      { slug: 'wanted', label: 'Wanted', fields: [] },
    ],
  },

  // ---- SERVICES -----------------------------------------------------------
  {
    slug: 'services',
    label: 'Services',
    icon: 'briefcase',
    subcategories: [
      { slug: 'automotive', label: 'Automotive', fields: [] },
      { slug: 'beauty', label: 'Beauty', fields: [] },
      { slug: 'cell-mobile', label: 'Cell / Mobile', fields: [] },
      { slug: 'computer', label: 'Computer', fields: [] },
      { slug: 'creative', label: 'Creative', fields: [] },
      { slug: 'cycle', label: 'Cycle', fields: [] },
      { slug: 'event', label: 'Event', fields: [] },
      { slug: 'farm-garden-services', label: 'Farm & Garden', fields: [] },
      { slug: 'financial', label: 'Financial', fields: [] },
      { slug: 'health-wellness', label: 'Health & Wellness', fields: [] },
      { slug: 'household-services', label: 'Household', fields: [] },
      { slug: 'business-services', label: 'Business Services', fields: [] },
      { slug: 'labor-moving', label: 'Labor / Moving', fields: [] },
      { slug: 'legal', label: 'Legal', fields: [] },
      { slug: 'lessons', label: 'Lessons', fields: [] },
      { slug: 'marine-services', label: 'Marine', fields: [] },
      { slug: 'pet', label: 'Pet', fields: [] },
      { slug: 'real-estate-services', label: 'Real Estate', fields: [] },
      { slug: 'skilled-trade-services', label: 'Skilled Trade', fields: [] },
      { slug: 'small-business-ads', label: 'Small Business Ads', fields: [] },
      { slug: 'travel-vacation', label: 'Travel / Vacation', fields: [] },
      { slug: 'writing-editing-translation', label: 'Writing / Editing / Translation', fields: [] },
    ],
  },

  // ---- JOBS ---------------------------------------------------------------
  {
    slug: 'jobs',
    label: 'Jobs',
    icon: 'briefcase',
    subcategories: [
      { slug: 'accounting-finance', label: 'Accounting & Finance', fields: [] },
      { slug: 'administrative-office', label: 'Administrative / Office', fields: [] },
      { slug: 'architecture', label: 'Architecture', fields: [] },
      { slug: 'engineering', label: 'Engineering', fields: [] },
      { slug: 'art-media-design', label: 'Art / Media / Design', fields: [] },
      { slug: 'biotech-science', label: 'Biotech / Science', fields: [] },
      { slug: 'business-management', label: 'Business / Management', fields: [] },
      { slug: 'customer-service', label: 'Customer Service', fields: [] },
      { slug: 'education', label: 'Education', fields: [] },
      { slug: 'miscellaneous', label: 'Miscellaneous', fields: [] },
      { slug: 'hospitality', label: 'Hospitality', fields: [] },
      { slug: 'general-labor', label: 'General Labor', fields: [] },
      { slug: 'government', label: 'Government', fields: [] },
      { slug: 'human-resources', label: 'Human Resources', fields: [] },
      { slug: 'legal-paralegal', label: 'Legal / Paralegal', fields: [] },
      { slug: 'manufacturing', label: 'Manufacturing', fields: [] },
      { slug: 'marketing-public-relations', label: 'Marketing / Public Relations', fields: [] },
      { slug: 'medical-health', label: 'Medical & Health', fields: [] },
      { slug: 'nonprofit', label: 'Nonprofit', fields: [] },
      { slug: 'real-estate-jobs', label: 'Real Estate', fields: [] },
      { slug: 'retail-wholesale', label: 'Retail / Wholesale', fields: [] },
      { slug: 'sales', label: 'Sales', fields: [] },
      { slug: 'salon-spa-fitness', label: 'Salon / Spa / Fitness', fields: [] },
      { slug: 'security', label: 'Security', fields: [] },
      { slug: 'skilled-trade-jobs', label: 'Skilled Trade', fields: [] },
      { slug: 'software-it-technical-support', label: 'Software / IT / Technical Support', fields: [] },
      { slug: 'transportation', label: 'Transportation', fields: [] },
      { slug: 'tv-film-video', label: 'TV / Film / Video', fields: [] },
      { slug: 'web-information-design', label: 'Web / Information Design', fields: [] },
      { slug: 'writing-editing', label: 'Writing / Editing', fields: [] },
    ],
  },

  // ---- GIGS ---------------------------------------------------------------
  {
    slug: 'gigs',
    label: 'Gigs',
    icon: 'zap',
    subcategories: [
      { slug: 'computer-gigs', label: 'Computer', fields: [] },
      { slug: 'creative-design-gigs', label: 'Creative / Design', fields: [] },
      { slug: 'crew', label: 'Crew', fields: [] },
      { slug: 'domestic', label: 'Domestic', fields: [] },
      { slug: 'event-gigs', label: 'Event', fields: [] },
      { slug: 'general-labor-gigs', label: 'General Labor', fields: [] },
      { slug: 'talent', label: 'Talent', fields: [] },
      { slug: 'writing-gigs', label: 'Writing', fields: [] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Flat lookup maps (backwards compatible)
// ---------------------------------------------------------------------------

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
