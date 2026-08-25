import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddTagDto {
  @IsString() @MaxLength(64) label!: string;
}

export class SetCategoryDto {
  @IsOptional() @IsString() categoryId!: string | null;
}

export class CreateCategoryDto {
  @IsString() @MaxLength(120) name!: string;
}
