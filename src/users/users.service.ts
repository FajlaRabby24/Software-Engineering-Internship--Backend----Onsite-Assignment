import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { UserProfileResponse } from './types/user.types.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        phoneNumber: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      user,
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        phoneNumber: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      user: updatedUser,
    };
  }
}
