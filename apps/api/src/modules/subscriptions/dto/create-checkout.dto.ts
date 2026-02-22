import { IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsIn(['basic', 'pro', 'unlimited'])
  tier!: 'basic' | 'pro' | 'unlimited';
}
