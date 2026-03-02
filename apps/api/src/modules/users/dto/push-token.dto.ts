import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterPushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxx]' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ enum: ['ios', 'android', 'web'] })
  @IsEnum(['ios', 'android', 'web'])
  platform!: 'ios' | 'android' | 'web';
}

export class RemovePushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxx]' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
