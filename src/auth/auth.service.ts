import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { Role, User } from '../generated/client/client.js';
import type {
  JwtPayload,
  LoginResponse,
  LogoutAllResponse,
  LogoutResponse,
  RefreshTokenResponse,
  SessionMetadata,
} from './types/auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // register user
  async create(createAuthDto: CreateAuthDto): Promise<{ message: string }> {
    // 1. Check if user already exists
    const existingUser = await this.findByEmail(createAuthDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 2. Hash password with bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createAuthDto.password,
      saltRounds,
    );

    // 3. Create user in prisma
    const user = await this.prisma.user.create({
      data: {
        ...createAuthDto,
        password: hashedPassword,
      },
      select: {
        id: true,
      },
    });
    if (!user) {
      throw new ConflictException('User could not be created');
    }

    // 4. Send success message
    return {
      message: 'User registered successfully',
    };
  }

  // login user
  async login(
    loginDto: LoginDto,
    metadata?: SessionMetadata,
  ): Promise<LoginResponse> {
    // 1. Find user by email
    const user = await this.findByEmail(loginDto.email);

    // 2. If not found throw error
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is inactive. Please contact support',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Generate both Access Token (15m) and Refresh Token (7d)
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // 4. Save session with Refresh Token (valid for 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        expiresAt,
      },
    });

 

    // 5. Return response with both tokens
    return {
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
    };
  }

  // refresh token
  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ;

    try {
      await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Find active session in database
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.isRevoked) {
      throw new UnauthorizedException(
        'Session revoked or not found. Please log in again',
      );
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Session has expired. Please log in again',
      );
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException(
        'Account is inactive. Please contact support',
      );
    }

    // Token rotation: generate new access and refresh tokens
    const tokens = await this.generateTokens(session.user);

    // Update session record with the new rotated refresh token
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: newExpiresAt,
      },
    });

    return {
      success: true,
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string): Promise<LogoutResponse> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.isRevoked) {
      throw new NotFoundException(
        'Active session not found or already logged out',
      );
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    return {
      success: true,
      message: 'Logged out successfully from this device',
    };
  }

  async logoutAll(userId: string): Promise<LogoutAllResponse> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    return {
      success: true,
      message: `Logged out successfully from all devices (${result.count} session(s) revoked)`,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Generate both Access Token and Refresh Token
  private async generateTokens(user: {
    id: string;
    email: string;
    role: Role;
    isActive: boolean;
    isEmailVerified: boolean;
    phoneNumber: string | null;
    avatarUrl: string | null;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
    };

    const accessSecret =
      process.env.JWT_ACCESS_SECRET ;
    const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any;

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ;
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ||
      '7d') as any;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
