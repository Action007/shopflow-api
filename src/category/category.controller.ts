import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import {
    ApiEnvelopeResponse,
    ApiErrorResponse,
} from 'src/common/swagger/api-response.decorators';
import {
    CategoryDto,
    ErrorResponseDto,
} from 'src/common/swagger/api-response.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @Post()
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Create a category (admin only)' })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Category created',
        type: CategoryDto,
    })
    @ApiErrorResponse(400, 'Invalid category hierarchy or payload')
    @ApiForbiddenResponse({
        description: 'Admin role required',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Parent category not found',
        type: ErrorResponseDto,
    })
    create(@Body() dto: CreateCategoryDto) {
        return this.categoryService.create(dto);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Get category tree' })
    @ApiEnvelopeResponse({
        description: 'Category tree',
        type: CategoryDto,
        isArray: true,
    })
    findAll() {
        return this.categoryService.findAll();
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Get category details by id' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Category details',
        type: CategoryDto,
    })
    @ApiNotFoundResponse({
        description: 'Category not found',
        type: ErrorResponseDto,
    })
    findById(@Param('id', ParseUUIDPipe) id: string) {
        return this.categoryService.findById(id);
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Patch(':id')
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Update a category (admin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Updated category',
        type: CategoryDto,
    })
    @ApiErrorResponse(400, 'Invalid category hierarchy or payload')
    @ApiForbiddenResponse({
        description: 'Admin role required',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Category not found',
        type: ErrorResponseDto,
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCategoryDto,
    ) {
        return this.categoryService.update(id, dto);
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Delete(':id')
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Soft-delete a category (admin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Category deleted',
    })
    @ApiForbiddenResponse({
        description: 'Admin role required',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Category not found',
        type: ErrorResponseDto,
    })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.categoryService.remove(id);
    }
}
