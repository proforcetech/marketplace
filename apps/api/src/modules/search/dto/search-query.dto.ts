import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ItemCondition } from '@marketplace/shared';
import type { SearchSortBy } from '@marketplace/shared';

export class SearchQueryDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusMiles?: number = 25;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(ItemCondition, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value;
  })
  condition?: ItemCondition[];

  @IsOptional()
  @IsString()
  @IsEnum(['distance', 'newest', 'price_asc', 'price_desc', 'relevance'] as const)
  sort?: SearchSortBy | 'relevance' = 'distance';

  @IsOptional()
  @IsString()
  postedWithin?: '24h' | '7d' | '30d';

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SuggestionsQueryDto {
  @IsString()
  @MaxLength(100)
  q!: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}
