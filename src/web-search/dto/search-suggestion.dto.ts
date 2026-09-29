import { IsNotEmpty, IsString } from 'class-validator';

export class SearchSuggestionDto {
  @IsString()
  @IsNotEmpty({ message: 'Search prefix q cannot be empty' })
  q: string;
}
