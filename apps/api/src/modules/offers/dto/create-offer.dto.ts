import { IsString, IsInt, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateOfferDto {
  @IsString()
  listingId!: string;

  @IsString()
  conversationId!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
