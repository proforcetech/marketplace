import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ListingStatus } from '@marketplace/shared';
import { PaginationDto } from '../../../common/pipes/validation.pipe';

export class ListingQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsString()
  sortBy?: 'created_at' | 'price' | 'updated_at';
}
