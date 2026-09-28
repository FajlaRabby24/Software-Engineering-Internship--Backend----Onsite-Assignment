import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { User } from '../generated/client/client.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
