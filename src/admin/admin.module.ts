import { Module } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { AiProvidersModule } from '../ai-providers/ai-providers.module.js';

@Module({
  imports: [AiProvidersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

