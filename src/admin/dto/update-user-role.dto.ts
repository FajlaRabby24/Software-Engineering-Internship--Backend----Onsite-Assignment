import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../generated/client/enums.js';

export class UpdateUserRoleDto {
  @IsEnum(Role, { message: 'Role must be either USER or ADMIN' })
  @IsNotEmpty({ message: 'Role cannot be empty' })
  role: Role;
}
