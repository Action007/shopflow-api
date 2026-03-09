import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';

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
    findAll() {
        return this.userService.findAll();
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
        @CurrentUser() user,
    ) {
        return this.userService.update(id, dto, user.id, user.role);
    }
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.userService.remove(id);
    }
}
