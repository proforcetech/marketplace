import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveReportDto {
  @ApiProperty({ enum: ['investigating', 'resolved', 'dismissed'] })
  @IsEnum(['investigating', 'resolved', 'dismissed'])
  status!: 'investigating' | 'resolved' | 'dismissed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
