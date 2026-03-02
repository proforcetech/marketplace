import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ enum: ['listing', 'user', 'message'] })
  @IsEnum(['listing', 'user', 'message'])
  targetType!: 'listing' | 'user' | 'message';

  @ApiProperty({ description: 'ID of the item being reported' })
  @IsString()
  targetId!: string;

  @ApiProperty({ enum: ['scam', 'spam', 'explicit', 'trafficking', 'harassment', 'misinformation', 'other'] })
  @IsEnum(['scam', 'spam', 'explicit', 'trafficking', 'harassment', 'misinformation', 'other'])
  reason!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
