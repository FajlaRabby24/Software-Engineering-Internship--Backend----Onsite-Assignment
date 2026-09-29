import { Test, TestingModule } from '@nestjs/testing';
import { WebSearchController } from './web-search.controller.js';
import { WebSearchService } from './web-search.service.js';

describe('WebSearchController', () => {
  let controller: WebSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebSearchController],
      providers: [WebSearchService],
    }).compile();

    controller = module.get<WebSearchController>(WebSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
