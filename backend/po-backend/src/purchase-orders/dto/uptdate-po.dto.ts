import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, ValidateIf } from 'class-validator';
import { POCategory } from '../purchase-order.entity';

export class UpdatePoDto {
  @ApiPropertyOptional({ example: 'Updated title' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 200.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ enum: POCategory })
  @IsEnum(POCategory)
  @IsOptional()
  category?: POCategory;

  @ValidateIf(
    (o: UpdatePoDto) => !o.title && !o.description && !o.amount && !o.category,
  )
  @IsString({ message: 'At least one field must be provided' })
  _atLeastOne?: never;
}
