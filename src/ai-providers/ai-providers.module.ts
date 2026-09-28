import { Module } from '@nestjs/common';
import { AiProvidersService } from './ai-providers.service.js';
import { AiProvidersController } from './ai-providers.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [AiProvidersController],
  providers: [AiProvidersService],
  exports: [AiProvidersService],
})
export class AiProvidersModule {}
