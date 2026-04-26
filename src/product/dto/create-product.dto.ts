import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
    @ApiProperty({ example: 'MacBook Pro M4' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({
        example: '14-inch laptop for creators and developers',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        format: 'uuid',
        description: 'Pending upload id returned by POST /uploads/images',
    })
    @IsOptional()
    @IsUUID()
    imageUploadId?: string;

    @ApiProperty({
        example: '1999.99',
        description: 'Decimal string with up to 2 fraction digits',
    })
    @IsString()
    @Matches(/^\d+(\.\d{1,2})?$/, {
        message:
            'price must be a valid decimal with up to 2 decimal places (e.g. "29.99")',
    })
    price: string;

    @ApiProperty({ example: 15, minimum: 0 })
    @IsInt()
    @Min(0)
    stockQuantity: number;

    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    categoryId: string;
}
