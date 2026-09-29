import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { WebSearchService } from './web-search.service.js';
import { CreateWebSearchDto } from './dto/create-web-search.dto.js';
import { UpdateWebSearchDto } from './dto/update-web-search.dto.js';

@Controller('web-search')
export class WebSearchController {
  constructor(private readonly webSearchService: WebSearchService) {}

  @Post()
  create(@Body() createWebSearchDto: CreateWebSearchDto) {
    return this.webSearchService.create(createWebSearchDto);
  }

  @Get()
  findAll() {
    return this.webSearchService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.webSearchService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWebSearchDto: UpdateWebSearchDto) {
    return this.webSearchService.update(+id, updateWebSearchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.webSearchService.remove(+id);
  }
}
