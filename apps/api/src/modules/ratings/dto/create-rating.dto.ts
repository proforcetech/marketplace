import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RatingType {
  BUYER_TO_SELLER = 'buyer_to_seller',
  SELLER_TO_BUYER = 'seller_to_buyer',
}

export class CreateRatingDto {
  @ApiProperty({ description: 'ID of the listing the interaction was about' })
  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @ApiProperty({ description: 'ID of the user being rated' })
  @IsString()
  @IsNotEmpty()
  revieweeId!: string;

  @ApiProperty({ description: 'Rating score (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiPropertyOptional({ description: 'Optional review comment', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiProperty({ enum: RatingType, description: 'Type of rating' })
  @IsEnum(RatingType)
  ratingType!: RatingType;
}
