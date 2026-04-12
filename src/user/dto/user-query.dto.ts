import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class UserQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsIn(['createdAt', 'updatedAt', 'email', 'firstName', 'lastName'])
    override sortBy?:
        | 'createdAt'
        | 'updatedAt'
        | 'email'
        | 'firstName'
        | 'lastName' = 'createdAt';
}
