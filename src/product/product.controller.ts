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
    Query,
    UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) {}

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateProductDto) {
        return this.productService.create(dto);
    }

    @Get()
    @Public()
    findAll(@Query() query: ProductQueryDto) {
        return this.productService.findAll(query);
    }

    @Get(':id')
    @Public()
    findById(@Param('id') id: string) {
        return this.productService.findById(id);
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
        return this.productService.update(id, dto);
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productService.remove(id);
    }
}
