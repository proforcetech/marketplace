import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PriceType,
  ItemCondition,
  ListingVisibility,
  LocationPrecision,
} from '@marketplace/shared';

export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zip?: string;
}

export class CreateListingDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsEnum(PriceType)
  priceType!: PriceType;

  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @IsOptional()
  @IsEnum(ListingVisibility)
  visibility?: ListingVisibility;

  @IsOptional()
  @IsEnum(LocationPrecision)
  locationPrecision?: LocationPrecision;

  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;
}
