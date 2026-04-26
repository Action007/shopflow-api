import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ProductQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({
        example: '100.00',
        description: 'Minimum product price as a decimal string',
    })
    @IsOptional()
    @IsString()
    @Matches(/^\d+(\.\d{1,2})?$/, {
        message: 'minPrice must be a valid decimal',
    })
    minPrice?: string;

    @ApiPropertyOptional({
        example: '2500.00',
        description: 'Maximum product price as a decimal string',
    })
    @IsOptional()
    @IsString()
    @Matches(/^\d+(\.\d{1,2})?$/, {
        message: 'maxPrice must be a valid decimal',
    })
    maxPrice?: string;

    @ApiPropertyOptional({ example: 'monitor' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        enum: ['createdAt', 'updatedAt', 'name', 'price', 'stockQuantity'],
        default: 'createdAt',
    })
    @IsOptional()
    @IsIn(['createdAt', 'updatedAt', 'name', 'price', 'stockQuantity'])
    override sortBy?:
        | 'createdAt'
        | 'updatedAt'
        | 'name'
        | 'price'
        | 'stockQuantity' = 'createdAt';
}
