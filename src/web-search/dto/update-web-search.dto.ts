import { PartialType } from '@nestjs/mapped-types';
import { CreateWebSearchDto } from './create-web-search.dto.js';

export class UpdateWebSearchDto extends PartialType(CreateWebSearchDto) {}
