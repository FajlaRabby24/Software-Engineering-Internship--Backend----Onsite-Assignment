import { Injectable } from '@nestjs/common';
import { CreateWebSearchDto } from './dto/create-web-search.dto.js';
import { UpdateWebSearchDto } from './dto/update-web-search.dto.js';

@Injectable()
export class WebSearchService {
  create(createWebSearchDto: CreateWebSearchDto) {
    return 'This action adds a new webSearch';
  }

  findAll() {
    return `This action returns all webSearch`;
  }

  findOne(id: number) {
    return `This action returns a #${id} webSearch`;
  }

  update(id: number, updateWebSearchDto: UpdateWebSearchDto) {
    return `This action updates a #${id} webSearch`;
  }

  remove(id: number) {
    return `This action removes a #${id} webSearch`;
  }
}
