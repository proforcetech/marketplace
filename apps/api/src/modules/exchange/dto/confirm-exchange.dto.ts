import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmExchangeDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
