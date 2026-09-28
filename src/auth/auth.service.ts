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
import { User } from '../generated/client/client.js';
import type {
  JwtPayload,
  LoginResponse,
  LogoutAllResponse,
  LogoutResponse,
  SessionMetadata,
} from './types/auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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

    // 3. Generate accessToken with required payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // Create a new session in database for tracking
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        expiresAt,
      },
    });

    // 4. Return formatted response
    return {
      success: true,
      message: 'Login successful',
      accessToken,
    };
  }

  async logout(token: string): Promise<LogoutResponse> {
    const session = await this.prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.isRevoked) {
      throw new NotFoundException(
        'Active session not found or already logged out',
      );
    }

    await this.prisma.session.update({
      where: { token },
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
      revokedCount: result.count,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
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
