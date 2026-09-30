import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Ip,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
} from './types/auth.types.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Registers a new user account, creates default FREE subscription and usage records.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        success: true,
        message: 'User registered successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or email already in use',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email is already registered',
        error: 'Bad Request',
      },
    },
  })
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
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates user with email and password, creates an active session, and returns access & refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully',
    schema: {
      example: {
        success: true,
        message: 'Logged in successfully',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'b5a6c117-76fe-4f12-9c32-23fbe2e9d291',
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'USER',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid credentials or inactive user account',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid email or password',
        error: 'Bad Request',
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ): Promise<LoginResponse> {
    return this.authService.login(loginDto, { userAgent, ipAddress });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Uses a valid refresh token from an active session to rotate tokens and generate a fresh access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        success: true,
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid, expired, or revoked refresh token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid or expired refresh token',
        error: 'Unauthorized',
      },
    },
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResponse> {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout current session',
    description: 'Revokes the active session corresponding to the provided refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: {
        success: true,
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or revoked token',
  })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<LogoutResponse> {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout all sessions',
    description: 'Terminates all active sessions across all devices for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All user sessions revoked successfully',
    schema: {
      example: {
        success: true,
        message: 'Logged out from all devices',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid Bearer access token',
  })
  async logoutAll(
    @CurrentUser('sub') userId: string,
  ): Promise<LogoutAllResponse> {
    return this.authService.logoutAll(userId);
  }
}

