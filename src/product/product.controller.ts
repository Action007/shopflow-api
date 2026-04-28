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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
    ApiEnvelopeResponse,
    ApiErrorResponse,
} from 'src/common/swagger/api-response.decorators';
import {
    ErrorResponseDto,
    ProductDto,
} from 'src/common/swagger/api-response.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) {}

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Create a product (admin only)' })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Product created',
        type: ProductDto,
    })
    @ApiErrorResponse(400, 'Invalid payload or related upload cannot be used')
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @ApiForbiddenResponse({
        description: 'Admin role required',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Category not found',
        type: ErrorResponseDto,
    })
    create(
        @Body() dto: CreateProductDto,
        @CurrentUser() user: { id: string; role: Role },
    ) {
        return this.productService.create(dto, user.id, user.role);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Get paginated products list with filtering' })
    @ApiEnvelopeResponse({
        description: 'Paginated products list',
        type: ProductDto,
        paginated: true,
    })
    findAll(@Query() query: ProductQueryDto) {
        return this.productService.findAll(query);
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Get product details by id' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Product details',
        type: ProductDto,
    })
    @ApiNotFoundResponse({
        description: 'Product not found',
        type: ErrorResponseDto,
    })
    findById(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.findById(id);
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Patch(':id')
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Update a product (admin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Updated product',
        type: ProductDto,
    })
    @ApiErrorResponse(400, 'Invalid payload or related upload cannot be used')
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @ApiForbiddenResponse({
        description: 'Admin role required',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Product not found',
        type: ErrorResponseDto,
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateProductDto,
        @CurrentUser() user: { id: string; role: Role },
    ) {
        return this.productService.update(id, dto, user.id, user.role);
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Delete(':id')
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Soft-delete a product (admin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelopeResponse({
        description: 'Product deleted',
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
        description: 'Product not found',
        type: ErrorResponseDto,
    })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.remove(id);
    }
}
