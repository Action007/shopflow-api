import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class UserQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        enum: ['createdAt', 'updatedAt', 'email', 'firstName', 'lastName'],
        default: 'createdAt',
    })
    @IsOptional()
    @IsIn(['createdAt', 'updatedAt', 'email', 'firstName', 'lastName'])
    override sortBy?:
        | 'createdAt'
        | 'updatedAt'
        | 'email'
        | 'firstName'
        | 'lastName' = 'createdAt';
}
