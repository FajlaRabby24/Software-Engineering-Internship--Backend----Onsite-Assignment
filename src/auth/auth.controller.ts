import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Headers,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { AuthGuard } from './guards/auth.guard.js';
import { CurrentToken, CurrentUser } from './decorators/auth.decorators.js';
import type {
  LoginResponse,
  LogoutAllResponse,
  LogoutResponse,
} from './types/auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
   @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createAuthDto: CreateAuthDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.create(createAuthDto);
    return {
      success: true,
      message: 'User registered successfully',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ): Promise<LoginResponse> {
    return this.authService.login(loginDto, { userAgent, ipAddress });
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentToken() token: string): Promise<LogoutResponse> {
    return this.authService.logout(token);
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser('sub') userId: string,
  ): Promise<LogoutAllResponse> {
    return this.authService.logoutAll(userId);
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
