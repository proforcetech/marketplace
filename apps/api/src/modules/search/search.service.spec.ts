import { SearchService, PRISMA_SERVICE } from './search.service';
import { Test, TestingModule } from '@nestjs/testing';

const mockPrisma = {
  $queryRaw: jest.fn(),
  $queryRawUnsafe: jest.fn(),
};

// Helper to create a minimal SearchResultRow-shaped object
function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'listing-1',
    title: 'Test Listing',
    price: 5000,
    price_type: 'fixed',
    condition: 'used',
    location_city: 'Austin',
    location_state: 'TX',
    latitude: 30.27,
    longitude: -97.74,
    thumbnail_url: 'https://example.com/thumb.jpg',
    is_promoted: false,
    published_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    distance_miles: 5.123,
    category_slug: 'for-sale',
    category_name: 'For Sale',
    user_id: 'user-1',
    display_name: 'Test Seller',
    identity_verified: false,
    rating_avg: 4.5,
    ...overrides,
  };
}

describe('SearchService – mapSearchResult', () => {
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  // Access the private method via type cast for unit testing purposes
  function mapResult(row: Record<string, unknown>): Record<string, unknown> {
    return (service as unknown as { mapSearchResult: (row: unknown) => Record<string, unknown> })
      .mapSearchResult(row);
  }

  it('includes latitude and longitude as flat top-level fields', () => {
    const result = mapResult(makeRow({ latitude: 30.27, longitude: -97.74 }));
    expect(result['latitude']).toBe(30.27);
    expect(result['longitude']).toBe(-97.74);
  });

  it('passes through null latitude/longitude', () => {
    const result = mapResult(makeRow({ latitude: null, longitude: null }));
    expect(result['latitude']).toBeNull();
    expect(result['longitude']).toBeNull();
  });

  it('rounds distance to one decimal place', () => {
    const result = mapResult(makeRow({ distance_miles: 5.555 }));
    const location = result['location'] as Record<string, unknown>;
    expect(location['distanceMiles']).toBe(5.6);
  });

  it('maps snake_case fields to camelCase', () => {
    const result = mapResult(makeRow());
    expect(result['priceType']).toBe('fixed');
    expect(result['thumbnailUrl']).toBe('https://example.com/thumb.jpg');
    expect(result['isPromoted']).toBe(false);
    expect(result['createdAt']).toBe('2026-01-01T00:00:00Z');
  });

  it('includes seller sub-object', () => {
    const result = mapResult(makeRow());
    const seller = result['seller'] as Record<string, unknown>;
    expect(seller['id']).toBe('user-1');
    expect(seller['displayName']).toBe('Test Seller');
    expect(seller['identityVerified']).toBe(false);
    expect(seller['ratingAvg']).toBe(4.5);
  });

  it('includes location sub-object with city and state', () => {
    const result = mapResult(makeRow({ location_city: 'Austin', location_state: 'TX' }));
    const location = result['location'] as Record<string, unknown>;
    expect(location['city']).toBe('Austin');
    expect(location['state']).toBe('TX');
  });

  it('isPromoted is true for promoted listings', () => {
    const result = mapResult(makeRow({ is_promoted: true }));
    expect(result['isPromoted']).toBe(true);
  });
});
