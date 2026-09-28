import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Password is required to confirm account deletion' })
  password: string;
}
