import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export type OfferAction = 'accepted' | 'declined' | 'countered';

export class RespondOfferDto {
  @IsEnum(['accepted', 'declined', 'countered'])
  action!: OfferAction;

  /**
   * Required when action is 'countered'. Must be a positive integer (cents).
   */
  @ValidateIf((o: RespondOfferDto) => o.action === 'countered')
  @IsInt()
  @Min(1)
  counterAmountCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
