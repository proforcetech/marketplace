import { PrismaClient, UserRole, ListingStatus, PriceType, ItemCondition, CategoryFieldType } from '@prisma/client';
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

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

async function seedCategories(): Promise<Record<string, string>> {
  console.log('Seeding categories…');

  const roots: Array<{ name: string; slug: string; icon: string }> = [
    { name: 'Electronics', slug: 'electronics', icon: 'phone-portrait-outline' },
    { name: 'Vehicles', slug: 'vehicles', icon: 'car-outline' },
    { name: 'Home & Garden', slug: 'home-garden', icon: 'home-outline' },
    { name: 'Clothing & Accessories', slug: 'clothing', icon: 'shirt-outline' },
    { name: 'Sporting Goods', slug: 'sporting-goods', icon: 'football-outline' },
    { name: 'Toys & Games', slug: 'toys-games', icon: 'game-controller-outline' },
    { name: 'Books & Media', slug: 'books-media', icon: 'book-outline' },
    { name: 'Services', slug: 'services', icon: 'construct-outline' },
    { name: 'Free Stuff', slug: 'free-stuff', icon: 'gift-outline' },
    { name: 'Other', slug: 'other', icon: 'ellipsis-horizontal-outline' },
  ];

  const idMap: Record<string, string> = {};

  for (const [i, root] of roots.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: root.slug },
      update: {},
      create: { name: root.name, slug: root.slug, icon: root.icon, position: i, isActive: true },
    });
    idMap[root.slug] = cat.id;
  }

  // Sub-categories
  const subs: Array<{ parent: string; name: string; slug: string; icon: string }> = [
    { parent: 'electronics', name: 'Phones & Tablets', slug: 'phones-tablets', icon: 'phone-portrait-outline' },
    { parent: 'electronics', name: 'Computers & Laptops', slug: 'computers-laptops', icon: 'laptop-outline' },
    { parent: 'electronics', name: 'TVs & Audio', slug: 'tvs-audio', icon: 'tv-outline' },
    { parent: 'electronics', name: 'Cameras', slug: 'cameras', icon: 'camera-outline' },
    { parent: 'electronics', name: 'Gaming', slug: 'gaming', icon: 'game-controller-outline' },
    { parent: 'vehicles', name: 'Cars & Trucks', slug: 'cars-trucks', icon: 'car-outline' },
    { parent: 'vehicles', name: 'Motorcycles', slug: 'motorcycles', icon: 'bicycle-outline' },
    { parent: 'vehicles', name: 'Boats', slug: 'boats', icon: 'boat-outline' },
    { parent: 'vehicles', name: 'RVs & Campers', slug: 'rvs-campers', icon: 'bus-outline' },
    { parent: 'home-garden', name: 'Furniture', slug: 'furniture', icon: 'bed-outline' },
    { parent: 'home-garden', name: 'Appliances', slug: 'appliances', icon: 'cube-outline' },
    { parent: 'home-garden', name: 'Tools', slug: 'tools', icon: 'hammer-outline' },
    { parent: 'home-garden', name: 'Garden & Outdoor', slug: 'garden-outdoor', icon: 'leaf-outline' },
    { parent: 'clothing', name: "Men's", slug: 'mens-clothing', icon: 'person-outline' },
    { parent: 'clothing', name: "Women's", slug: 'womens-clothing', icon: 'person-outline' },
    { parent: 'clothing', name: 'Kids', slug: 'kids-clothing', icon: 'happy-outline' },
    { parent: 'clothing', name: 'Shoes', slug: 'shoes', icon: 'footsteps-outline' },
    { parent: 'services', name: 'Home Services', slug: 'home-services', icon: 'home-outline' },
    { parent: 'services', name: 'Lessons & Tutoring', slug: 'lessons-tutoring', icon: 'school-outline' },
    { parent: 'services', name: 'Events', slug: 'events', icon: 'calendar-outline' },
  ];

  for (const [i, sub] of subs.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {},
      create: {
        name: sub.name,
        slug: sub.slug,
        icon: sub.icon,
        parentId: mustGet(idMap, sub.parent),
        position: i,
        isActive: true,
      },
    });
    idMap[sub.slug] = cat.id;
  }

  // Category fields for phones
  await prisma.categoryField.deleteMany({ where: { category: { slug: 'phones-tablets' } } });
  const phoneCatId = mustGet(idMap, 'phones-tablets');
  await prisma.categoryField.createMany({
    data: [
      { categoryId: phoneCatId, name: 'brand', label: 'Brand', type: CategoryFieldType.select, options: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Other'], isFilterable: true, position: 0 },
      { categoryId: phoneCatId, name: 'storage', label: 'Storage', type: CategoryFieldType.select, options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'], isFilterable: true, position: 1 },
      { categoryId: phoneCatId, name: 'color', label: 'Color', type: CategoryFieldType.text, position: 2 },
      { categoryId: phoneCatId, name: 'carrier', label: 'Carrier', type: CategoryFieldType.select, options: ['Unlocked', 'AT&T', 'Verizon', 'T-Mobile', 'Other'], isFilterable: true, position: 3 },
    ],
  });

  // Category fields for cars
  await prisma.categoryField.deleteMany({ where: { category: { slug: 'cars-trucks' } } });
  const carCatId = mustGet(idMap, 'cars-trucks');
  await prisma.categoryField.createMany({
    data: [
      { categoryId: carCatId, name: 'make', label: 'Make', type: CategoryFieldType.text, isRequired: true, isFilterable: true, position: 0 },
      { categoryId: carCatId, name: 'model', label: 'Model', type: CategoryFieldType.text, isRequired: true, position: 1 },
      { categoryId: carCatId, name: 'year', label: 'Year', type: CategoryFieldType.number, isRequired: true, isFilterable: true, position: 2 },
      { categoryId: carCatId, name: 'mileage', label: 'Mileage', type: CategoryFieldType.number, position: 3 },
      { categoryId: carCatId, name: 'transmission', label: 'Transmission', type: CategoryFieldType.select, options: ['Automatic', 'Manual', 'CVT'], isFilterable: true, position: 4 },
      { categoryId: carCatId, name: 'fuel_type', label: 'Fuel Type', type: CategoryFieldType.select, options: ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid'], isFilterable: true, position: 5 },
    ],
  });

  console.log(`  ✓ ${Object.keys(idMap).length} categories`);
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
  console.log('Seeding users…');

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

  // Sync PostGIS geography columns (best-effort — column may not exist in all envs)
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

  console.log(`  ✓ ${users.length} users`);
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
  console.log('Seeding listings…');

  const alice = mustGet(userIds, 'alice@example.com');
  const bob = mustGet(userIds, 'bob@example.com');
  const carol = mustGet(userIds, 'carol@example.com');

  const listings: SeedListing[] = [
    {
      userId: alice,
      categoryId: mustGet(categoryIds, 'phones-tablets'),
      title: 'iPhone 15 Pro 256GB – Natural Titanium',
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
      categoryId: mustGet(categoryIds, 'computers-laptops'),
      title: 'MacBook Air M2 – 16GB/512GB Space Gray',
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
      categoryId: mustGet(categoryIds, 'furniture'),
      title: 'Mid-Century Modern Sofa – Mustard Yellow',
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
      categoryId: mustGet(categoryIds, 'gaming'),
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
      title: '2019 Honda Civic EX – 42k Miles',
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
      categoryId: mustGet(categoryIds, 'garden-outdoor'),
      title: 'Patio Dining Set – 6 Chairs + Table',
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
      categoryId: mustGet(categoryIds, 'free-stuff'),
      title: 'Free: Moving boxes – various sizes',
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

  console.log(`  ✓ ${count} listings`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\nStarting database seed…\n');

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
