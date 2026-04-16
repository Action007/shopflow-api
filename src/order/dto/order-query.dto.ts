import { OrderStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsDateString,
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class OrderQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        enum: OrderStatus,
        description: 'Filter by order status',
    })
    @IsOptional()
    @IsIn(Object.values(OrderStatus))
    status?: OrderStatus;

    @ApiPropertyOptional({
        description:
            'Search by order number, customer first/last name, or email',
    })
    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by customer id' })
    @IsOptional()
    @IsUUID()
    userId?: string;

    @ApiPropertyOptional({
        description: 'Filter orders created at or after this ISO date/time',
        example: '2026-04-01',
    })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({
        description: 'Filter orders created at or before this ISO date/time',
        example: '2026-04-16',
    })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiPropertyOptional({
        enum: ['createdAt'],
        default: 'createdAt',
        description: 'Order sort field',
    })
    @IsOptional()
    @IsIn(['createdAt'])
    override sortBy?: 'createdAt' = 'createdAt';
}
