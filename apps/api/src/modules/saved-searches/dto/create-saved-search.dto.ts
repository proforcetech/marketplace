import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSavedSearchDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  /** Arbitrary search params (lat, lng, radius, query, category, etc.) */
  @IsObject()
  query: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}
