import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateAiPreferenceDto {
  @IsBoolean() aiEnabled!: boolean;
}

export class GenerateInsightDto {
  @IsOptional() @IsBoolean() apply?: boolean;
}

export class AiSearchDto {
  @IsString() @MinLength(1) @MaxLength(500) query!: string;
  @IsOptional() @IsInt() @Min(1) @Max(25) limit?: number;
}
