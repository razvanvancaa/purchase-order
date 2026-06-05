import {
    IsEnum,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    ValidateIf,
} from 'class-validator';
import { POCategory } from '../purchase-order.entity';

export class UpdatePoDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    amount?: number;

    @IsEnum(POCategory)
    @IsOptional()
    category?: POCategory;

    @ValidateIf(
        (o: UpdatePoDto) => !o.title && !o.description && !o.amount && !o.category,
    )
    @IsString({ message: 'At least one field must be provided' })
    _atLeastOne?: never;
}