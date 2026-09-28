import { Test, TestingModule } from '@nestjs/testing';
import { AiProvidersController } from './ai-providers.controller.js';
import { AiProvidersService } from './ai-providers.service.js';

describe('AiProvidersController', () => {
  let controller: AiProvidersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiProvidersController],
      providers: [AiProvidersService],
    }).compile();

    controller = module.get<AiProvidersController>(AiProvidersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
