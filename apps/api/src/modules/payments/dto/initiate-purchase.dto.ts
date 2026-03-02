import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePurchaseDto {
  @ApiProperty({ description: 'The listing ID to purchase' })
  @IsString()
  @IsNotEmpty()
  listingId!: string;
}
