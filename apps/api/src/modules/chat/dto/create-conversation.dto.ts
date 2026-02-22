import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'ID of the listing to start a conversation about' })
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @ApiPropertyOptional({ description: 'Initial message to send', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
