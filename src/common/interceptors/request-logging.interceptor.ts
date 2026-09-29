import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const startTime = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Skip logging for health checks or favicon requests to reduce clutter
    if (url === '/favicon.ico' || url === '/health') {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = res.statusCode || 200;
          const userId = req.user?.sub || req.user?.id || null;
          const ip =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            null;
          const userAgent = (req.headers['user-agent'] as string) || null;

          // Asynchronously record request log in background
          this.prisma.requestLog
            .create({
              data: {
                userId,
                method,
                endpoint: url,
                statusCode,
                durationMs,
                ip,
                userAgent,
              },
            })
            .catch(() => {
              // Silently handle logging failures so user request is never interrupted
            });
        },
        error: (err: any) => {
          const durationMs = Date.now() - startTime;
          const statusCode = err.status || 500;
          const userId = req.user?.sub || req.user?.id || null;
          const ip =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            null;
          const userAgent = (req.headers['user-agent'] as string) || null;
          const errorMessage =
            typeof err.message === 'string'
              ? err.message.slice(0, 500)
              : 'Internal error';

          this.prisma.requestLog
            .create({
              data: {
                userId,
                method,
                endpoint: url,
                statusCode,
                durationMs,
                ip,
                userAgent,
                errorMessage,
              },
            })
            .catch(() => {});
        },
      }),
    );
  }
}
