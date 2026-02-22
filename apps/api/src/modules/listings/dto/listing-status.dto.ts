import { IsEnum } from 'class-validator';
import { ListingStatus } from '@marketplace/shared/types';

export class ListingStatusDto {
  @IsEnum(ListingStatus)
  status!: ListingStatus;
}
