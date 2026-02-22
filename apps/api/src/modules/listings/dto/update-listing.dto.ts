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
} from '@marketplace/shared/types';
import { LocationDto } from './create-listing.dto';

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number | null;

  @IsOptional()
  @IsEnum(PriceType)
  priceType?: PriceType;

  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

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
