import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlanType {
  BUMP = 'bump',
  FEATURED = 'featured',
  SPOTLIGHT = 'spotlight',
}

export class PurchasePromotionDto {
  @ApiProperty({ description: 'ID of the listing to promote' })
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @ApiProperty({ enum: PlanType, description: 'Promotion plan type' })
  @IsEnum(PlanType)
  planType: PlanType;
}
