import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AiProvidersModule } from './ai-providers/ai-providers.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { ChatModule } from './chat/chat.module.js';
import { WebSearchModule } from './web-search/web-search.module.js';
import { AdminModule } from './admin/admin.module.js';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`${process.cwd()}/.env`, `${process.cwd()}/.env.local`],
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AiProvidersModule,
    SubscriptionsModule,
    ChatModule,
    WebSearchModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}

