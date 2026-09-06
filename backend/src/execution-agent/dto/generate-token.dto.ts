import {
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class GenerateConnectionTokenDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  expiresInDays?: number;
}
