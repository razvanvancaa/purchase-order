import { IsNumber, IsPositive, IsUUID, IsOptional } from 'class-validator';

export class SetBudgetDto {
  @IsUUID()
  userId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  annual_limit!: number;

  @IsOptional()
  @IsNumber()
  year?: number;
}
