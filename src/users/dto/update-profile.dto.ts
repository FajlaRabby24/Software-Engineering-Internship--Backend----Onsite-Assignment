import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Updated display name',
    example: 'Johnathan Doe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated contact phone number',
    example: '+1987654321',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Public URL to avatar image',
    example: 'https://example.com/avatars/john.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

