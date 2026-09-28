import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { AuthGuard } from './guards/auth.guard.js';
import { CurrentUser } from './decorators/auth.decorators.js';
import type {
  LoginResponse,
  LogoutAllResponse,
  LogoutResponse,
  RefreshTokenResponse,
  UserProfileResponse,
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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResponse> {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<LogoutResponse> {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser('sub') userId: string,
  ): Promise<LogoutAllResponse> {
    return this.authService.logoutAll(userId);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @CurrentUser('sub') userId: string,
  ): Promise<UserProfileResponse> {
    return this.authService.getProfile(userId);
  }
}
