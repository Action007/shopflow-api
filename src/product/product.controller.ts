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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) {}

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(
        @Body() dto: CreateProductDto,
        @CurrentUser() user: { id: string; role: Role },
    ) {
        return this.productService.create(dto, user.id, user.role);
    }

    @Get()
    @Public()
    findAll(@Query() query: ProductQueryDto) {
        return this.productService.findAll(query);
    }

    @Get(':id')
    @Public()
    findById(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.findById(id);
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Patch(':id')
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
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.remove(id);
    }
}
