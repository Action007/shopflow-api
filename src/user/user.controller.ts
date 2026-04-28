import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    ParseUUIDPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserQueryDto } from './dto/user-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
    ApiEnvelopeResponse,
    ApiErrorResponse,
} from 'src/common/swagger/api-response.decorators';
import { ErrorResponseDto, UserDto } from 'src/common/swagger/api-response.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    @ApiOperation({ summary: 'Get the current authenticated user profile' })
    @ApiEnvelopeResponse({
        description: 'Current user profile',
        type: UserDto,
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    getMe(@CurrentUser() user) {
        return this.userService.findById(user.id);
    }

    @Patch('me/password')
    @ApiOperation({
        summary:
            'Change the current user password and revoke all refresh tokens',
    })
    @ApiEnvelopeResponse({
        description: 'Password changed successfully',
    })
    @ApiErrorResponse(
        400,
        'Invalid payload or new password matches the current password',
    )
    @ApiUnauthorizedResponse({
        description:
            'Missing or invalid access token, or current password is wrong',
        type: ErrorResponseDto,
    })
    async changePassword(
        @Body() dto: ChangePasswordDto,
        @CurrentUser() user: { id: string },
    ): Promise<void> {
        await this.userService.changeOwnPassword(user.id, dto);
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Get()
    @ApiOperation({ summary: 'Get paginated users list (admin only)' })
    @ApiEnvelopeResponse({
        description: 'Paginated users list',
        type: UserDto,
        paginated: true,
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @ApiForbiddenResponse({
        description: 'Admin role required',
        type: ErrorResponseDto,
    })
    findAll(@Query() query: UserQueryDto) {
        return this.userService.findAll(query);
    }

    @Patch(':id')
    @ApiOperation({
        summary:
            'Update a user profile. Users can update themselves; admins can update any user.',
    })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Updated user profile',
        type: UserDto,
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @ApiForbiddenResponse({
        description: 'You cannot update another user unless you are an admin',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'User not found',
        type: ErrorResponseDto,
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
        @CurrentUser() user,
    ) {
        return this.userService.update(id, dto, user.id, user.role);
    }
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Delete(':id')
    @ApiOperation({ summary: 'Soft-delete a user (admin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'User deleted',
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @ApiForbiddenResponse({
        description: 'Admin role required',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'User not found',
        type: ErrorResponseDto,
    })
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.userService.remove(id);
    }
}
