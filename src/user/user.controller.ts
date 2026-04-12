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
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserQueryDto } from './dto/user-query.dto';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    getMe(@CurrentUser() user) {
        return this.userService.findById(user.id);
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Get()
    findAll(@Query() query: UserQueryDto) {
        return this.userService.findAll(query);
    }

    @Patch(':id')
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
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.userService.remove(id);
    }
}
