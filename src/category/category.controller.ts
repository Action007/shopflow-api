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
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateCategoryDto) {
        return this.categoryService.create(dto);
    }

    @Get()
    findAll() {
        return this.categoryService.findAll();
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.categoryService.findById(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.categoryService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.categoryService.remove(id);
    }
}