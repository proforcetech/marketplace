import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageTypeDto {
  TEXT = 'text',
  OFFER = 'offer',
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message content', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ enum: MessageTypeDto, default: MessageTypeDto.TEXT })
  @IsOptional()
  @IsEnum(MessageTypeDto)
  messageType?: MessageTypeDto = MessageTypeDto.TEXT;
}
