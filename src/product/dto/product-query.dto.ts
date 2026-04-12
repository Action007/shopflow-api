import {
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ProductQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d+(\.\d{1,2})?$/, {
        message: 'minPrice must be a valid decimal',
    })
    minPrice?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d+(\.\d{1,2})?$/, {
        message: 'maxPrice must be a valid decimal',
    })
    maxPrice?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(['createdAt', 'updatedAt', 'name', 'price', 'stockQuantity'])
    override sortBy?:
        | 'createdAt'
        | 'updatedAt'
        | 'name'
        | 'price'
        | 'stockQuantity' = 'createdAt';
}
