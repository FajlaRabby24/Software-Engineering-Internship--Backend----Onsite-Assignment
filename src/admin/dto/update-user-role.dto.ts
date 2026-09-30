import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../generated/client/enums.js';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'New role for the target user',
    enum: Role,
    example: Role.ADMIN,
  })
  @IsEnum(Role, { message: 'Role must be either USER or ADMIN' })
  @IsNotEmpty({ message: 'Role cannot be empty' })
  role: Role;
}

