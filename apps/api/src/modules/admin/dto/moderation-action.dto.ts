import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ModerationActionDto {
  @ApiProperty({ description: 'Reason for the moderation action' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
