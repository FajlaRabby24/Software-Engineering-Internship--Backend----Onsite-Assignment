import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../types/auth.types.js';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  token?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // Verify that this specific session is not soft-revoked in database
      const session = await this.prisma.session.findUnique({
        where: { token },
      });

      if (!session) {
        throw new UnauthorizedException(
          'Session not found. Please log in again',
        );
      }

      if (session.isRevoked) {
        throw new UnauthorizedException(
          'Session has been revoked. Please log in again',
        );
      }

      if (session.expiresAt < new Date()) {
        throw new UnauthorizedException(
          'Session has expired. Please log in again',
        );
      }

      request.user = payload;
      request.token = token;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
