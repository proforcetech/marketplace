import { IsEnum } from 'class-validator';
import { ListingStatus } from '@marketplace/shared';

export class ListingStatusDto {
  @IsEnum(ListingStatus)
  status!: ListingStatus;
}
