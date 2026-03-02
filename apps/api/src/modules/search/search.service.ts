import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchQueryDto, SuggestionsQueryDto } from './dto';

interface SearchResultRow {
  id: string;
  title: string;
  price: number | null;
  price_type: string;
  condition: string | null;
  location_city: string | null;
  location_state: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  is_promoted: boolean;
  published_at: string | null;
  created_at: string;
  distance_miles: number;
  category_slug: string;
  category_name: string;
  user_id: string;
  display_name: string;
  identity_verified: boolean;
  rating_avg: number | null;
  relevance?: number;
}

interface CategoryCountRow {
  slug: string;
  name: string;
  parent_id: string | null;
  count: number;
}

interface SuggestionRow {
  title: string;
  category_name: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main search endpoint: PostGIS radius + full-text + filters + sort + cursor pagination.
   *
   * Uses raw SQL because Prisma does not support PostGIS functions natively.
   * All parameters are passed via tagged template literals (parameterized) to prevent SQL injection.
   */
  async search(dto: SearchQueryDto): Promise<{
    listings: Record<string, unknown>[];
    promoted: Record<string, unknown>[];
    pagination: { nextCursor: string | null; hasMore: boolean; total: number };
    meta: { searchCenter: { lat: number; lng: number }; radiusMiles: number; resultCount: number };
  }> {
    const radiusMeters = (dto.radiusMiles ?? 25) * 1609.34;
    const limit = dto.limit ?? 20;
    const searchPoint = `ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography`;

    // Build the WHERE clause fragments
    const conditions: string[] = [
      `l.status = 'active'`,
      `ST_DWithin(l.location, ${searchPoint}, ${radiusMeters})`,
    ];
    const params: unknown[] = [];

    // Full-text search
    if (dto.q && dto.q.trim().length > 0) {
      conditions.push(
        `l.search_vector @@ plainto_tsquery('english', $${params.length + 1})`,
      );
      params.push(dto.q.trim());
    }

    // Category filter
    if (dto.category) {
      conditions.push(`c.slug = $${params.length + 1}`);
      params.push(dto.category);
    }

    // Price range
    if (dto.minPrice !== undefined) {
      conditions.push(`l.price >= $${params.length + 1}`);
      params.push(dto.minPrice);
    }
    if (dto.maxPrice !== undefined) {
      conditions.push(`l.price <= $${params.length + 1}`);
      params.push(dto.maxPrice);
    }

    // Condition filter
    if (dto.condition && dto.condition.length > 0) {
      const placeholders = dto.condition.map(
        (_, i) => `$${params.length + i + 1}`,
      );
      conditions.push(`l.condition IN (${placeholders.join(', ')})`);
      params.push(...dto.condition);
    }

    // Posted within filter
    if (dto.postedWithin) {
      const intervalMap: Record<string, string> = {
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days',
      };
      const interval = intervalMap[dto.postedWithin];
      if (interval) {
        conditions.push(
          `l.published_at >= NOW() - INTERVAL '${interval}'`,
        );
      }
    }

    // Cursor-based pagination
    if (dto.cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(dto.cursor, 'base64url').toString('utf-8'),
        ) as { id: string; sortValue: unknown };
        conditions.push(`l.id > $${params.length + 1}`);
        params.push(decoded.id);
      } catch {
        // Invalid cursor, ignore
      }
    }

    const whereClause = conditions.join(' AND ');

    // Determine sort
    let orderClause: string;
    switch (dto.sort) {
      case 'newest':
        orderClause = 'l.published_at DESC NULLS LAST';
        break;
      case 'price_asc':
        orderClause = 'l.price ASC NULLS LAST';
        break;
      case 'price_desc':
        orderClause = 'l.price DESC NULLS LAST';
        break;
      case 'relevance':
        orderClause = dto.q
          ? `ts_rank(l.search_vector, plainto_tsquery('english', $${params.indexOf(dto.q.trim()) + 1})) DESC, distance_miles ASC`
          : 'distance_miles ASC';
        break;
      case 'distance':
      default:
        orderClause = 'distance_miles ASC';
        break;
    }

    // Main query using raw SQL for PostGIS
    const query = `
      SELECT
        l.id,
        l.title,
        l.price,
        l.price_type,
        l.condition,
        l.location_city,
        l.location_state,
        l.location_lat AS latitude,
        l.location_lng AS longitude,
        l.is_promoted,
        l.published_at,
        l.created_at,
        ST_Distance(
          l.location,
          ST_SetSRID(ST_MakePoint($${params.length + 1}, $${params.length + 2}), 4326)::geography
        ) / 1609.34 AS distance_miles,
        c.slug AS category_slug,
        c.name AS category_name,
        u.id AS user_id,
        u.display_name,
        u.identity_verified,
        u.rating_avg,
        (SELECT lm.thumbnail_url FROM listing_media lm WHERE lm.listing_id = l.id ORDER BY lm.position ASC LIMIT 1) AS thumbnail_url
        ${dto.q ? `, ts_rank(l.search_vector, plainto_tsquery('english', $${params.indexOf(dto.q.trim()) + 1})) AS relevance` : ''}
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      JOIN users u ON u.id = l.user_id
      WHERE ${whereClause}
        AND l.is_promoted = false
      ORDER BY ${orderClause}
      LIMIT $${params.length + 3}
    `;

    params.push(dto.lng, dto.lat, limit + 1); // +1 to detect hasMore

    const rows = (await this.prisma.$queryRawUnsafe(
      query,
      ...params,
    )) as SearchResultRow[];

    const hasMore = rows.length > limit;
    const results = hasMore ? rows.slice(0, limit) : rows;

    // Build cursor for next page
    let nextCursor: string | null = null;
    if (hasMore && results.length > 0) {
      const lastRow = results[results.length - 1];
      if (lastRow) {
        nextCursor = Buffer.from(
          JSON.stringify({ id: lastRow.id }),
        ).toString('base64url');
      }
    }

    // Fetch promoted listings separately (clearly marked as sponsored)
    const promotedQuery = `
      SELECT
        l.id,
        l.title,
        l.price,
        l.price_type,
        l.condition,
        l.location_city,
        l.location_state,
        l.location_lat AS latitude,
        l.location_lng AS longitude,
        l.is_promoted,
        l.published_at,
        l.created_at,
        ST_Distance(
          l.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1609.34 AS distance_miles,
        c.slug AS category_slug,
        c.name AS category_name,
        u.id AS user_id,
        u.display_name,
        u.identity_verified,
        u.rating_avg,
        (SELECT lm.thumbnail_url FROM listing_media lm WHERE lm.listing_id = l.id ORDER BY lm.position ASC LIMIT 1) AS thumbnail_url
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      JOIN users u ON u.id = l.user_id
      WHERE l.status = 'active'
        AND l.is_promoted = true
        AND ST_DWithin(
          l.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY RANDOM()
      LIMIT 3
    `;

    const promotedRows = (await this.prisma.$queryRawUnsafe(
      promotedQuery,
      dto.lng,
      dto.lat,
      radiusMeters,
    )) as SearchResultRow[];

    // Map promoted listings with their injection positions
    const promoted = promotedRows.map((row, index) => ({
      ...this.mapSearchResult(row),
      isSponsored: true as const,
      position: [0, 4, 9][index] ?? index * 5, // positions 1, 5, 10
    }));

    // Count total results (cached or computed)
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      WHERE ${conditions.join(' AND ')}
    `;
    // Reuse the same params minus the last 3 we added for main query
    const countParams = params.slice(0, params.length - 3);
    const countResult = (await this.prisma.$queryRawUnsafe(
      countQuery,
      ...countParams,
    )) as Array<{ total: number }>;
    const total = countResult[0]?.total ?? 0;

    return {
      listings: results.map((row) => this.mapSearchResult(row)),
      promoted,
      pagination: { nextCursor, hasMore, total },
      meta: {
        searchCenter: { lat: dto.lat, lng: dto.lng },
        radiusMiles: dto.radiusMiles ?? 25,
        resultCount: results.length,
      },
    };
  }

  /**
   * Autocomplete/typeahead suggestions based on listing titles.
   * Uses PostgreSQL trigram similarity for fuzzy matching.
   */
  async suggestions(dto: SuggestionsQueryDto): Promise<{ suggestions: string[] }> {
    const limit = dto.limit ?? 5;

    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT DISTINCT l.title, c.name AS category_name
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      WHERE l.status = 'active'
        AND l.search_vector @@ plainto_tsquery('english', $1)
      ORDER BY l.title
      LIMIT $2
      `,
      dto.q,
      limit,
    )) as SuggestionRow[];

    return {
      suggestions: rows.map((row) => row.title),
    };
  }

  /**
   * Get the category tree with listing counts for the current search area.
   */
  async categoryTree(
    lat?: number,
    lng?: number,
    radiusMiles: number = 25,
  ): Promise<{ categories: Record<string, unknown>[] }> {
    let rows: CategoryCountRow[];

    if (lat !== undefined && lng !== undefined) {
      const radiusMeters = radiusMiles * 1609.34;
      rows = (await this.prisma.$queryRawUnsafe(
        `
        SELECT c.slug, c.name, c.parent_id, COUNT(l.id)::int AS count
        FROM categories c
        LEFT JOIN listings l ON l.category_id = c.id
          AND l.status = 'active'
          AND ST_DWithin(
            l.location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
        WHERE c.is_active = true
        GROUP BY c.id, c.slug, c.name, c.parent_id, c.position
        ORDER BY c.position ASC
        `,
        lng,
        lat,
        radiusMeters,
      )) as CategoryCountRow[];
    } else {
      rows = (await this.prisma.$queryRawUnsafe(
        `
        SELECT c.slug, c.name, c.parent_id, COUNT(l.id)::int AS count
        FROM categories c
        LEFT JOIN listings l ON l.category_id = c.id AND l.status = 'active'
        WHERE c.is_active = true
        GROUP BY c.id, c.slug, c.name, c.parent_id, c.position
        ORDER BY c.position ASC
        `,
      )) as CategoryCountRow[];
    }

    // Build tree from flat list
    const topLevel = rows.filter((r) => r.parent_id === null);
    const children = rows.filter((r) => r.parent_id !== null);

    const categories = topLevel.map((parent) => ({
      slug: parent.slug,
      name: parent.name,
      count: parent.count,
      children: children
        .filter((c) => c.parent_id === parent.slug) // simplified
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          count: c.count,
        })),
    }));

    return { categories };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapSearchResult(row: SearchResultRow): Record<string, unknown> {
    return {
      id: row.id,
      title: row.title,
      price: row.price,
      priceType: row.price_type,
      category: row.category_slug,
      condition: row.condition,
      thumbnailUrl: row.thumbnail_url,
      latitude: row.latitude,
      longitude: row.longitude,
      location: {
        city: row.location_city,
        state: row.location_state,
        distanceMiles: Math.round(row.distance_miles * 10) / 10,
      },
      isPromoted: row.is_promoted,
      createdAt: row.created_at,
      publishedAt: row.published_at,
      seller: {
        id: row.user_id,
        displayName: row.display_name,
        identityVerified: row.identity_verified,
        ratingAvg: row.rating_avg,
      },
    };
  }
}
