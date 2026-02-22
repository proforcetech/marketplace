import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email address' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'SecureP@ss1', description: 'Password (8-128 characters)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password!: string;

  @ApiProperty({ example: 'Jane Doe', description: 'Public display name' })
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  @MaxLength(50, { message: 'Display name must be at most 50 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_.]+$/, {
    message: 'Display name can only contain letters, numbers, spaces, hyphens, underscores, and periods',
  })
  displayName!: string;
}
