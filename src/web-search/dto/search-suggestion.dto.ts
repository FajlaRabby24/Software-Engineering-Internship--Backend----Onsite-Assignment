import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchSuggestionDto {
  @ApiProperty({
    description: 'Search prefix query to get autocompletions for',
    example: 'type',
  })
  @IsString()
  @IsNotEmpty({ message: 'Search prefix q cannot be empty' })
  q: string;
}

