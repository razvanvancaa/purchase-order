import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, ValidateIf } from 'class-validator';
import { POCategory } from '../purchase-order.entity';

export class UpdatePoDto {
  @ApiPropertyOptional({ example: 'Updated title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 200.00 })
  @IsNumber()
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
