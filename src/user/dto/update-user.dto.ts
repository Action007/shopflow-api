import { OmitType, PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
    OmitType(CreateUserDto, ['email', 'password'] as const),
) {
    @ApiPropertyOptional({
        format: 'uuid',
        description: 'Pending upload id returned by POST /uploads/images',
    })
    @IsOptional()
    @IsUUID()
    imageUploadId?: string;
}
