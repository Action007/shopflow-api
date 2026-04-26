import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Laptops', maxLength: 50 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @ApiPropertyOptional({
        example: 'Portable computers and accessories',
        maxLength: 300,
    })
    @IsString()
    @IsOptional()
    @MaxLength(300)
    description?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    parentId?: string;
}
