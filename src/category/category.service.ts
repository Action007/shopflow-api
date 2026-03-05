import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '@prisma/client';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';

@Injectable()
export class CategoryService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateCategoryDto): Promise<Category> {
        if (dto.parentId) {
            const parent = await this.prisma.category.findFirst({
                where: { id: dto.parentId, deletedAt: null },
            });

            if (!parent)
                throw new NotFoundException(ServiceErrorMessage.PARENT_CATEGORY_NOT_FOUND);
        }

        return await this.prisma.category.create({
            data: {
                name: dto.name,
                description: dto.description,
                parentId: dto.parentId,
            },
            include: { parent: true },
        });
    }

    async findAll(): Promise<Category[]> {
        return await this.prisma.category.findMany({
            where: { parentId: null, deletedAt: null },
            include: { children: true },
        });
    }

    async findById(id: string): Promise<Category> {
        const category = await this.prisma.category.findFirst({
            where: { id, deletedAt: null },
            include: { children: true, parent: true },
        });

        if (!category) {
            throw new NotFoundException(ServiceErrorMessage.CATEGORY_NOT_FOUND);
        }
        return category;
    }

    async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
        const category = await this.prisma.category.findFirst({
            where: { id, deletedAt: null },
        });

        if (!category) throw new NotFoundException(ServiceErrorMessage.CATEGORY_NOT_FOUND);

        if (dto.parentId && dto.parentId === id) {
            throw new BadRequestException(ServiceErrorMessage.CATEGORY_SELF_PARENT);
        }

        return this.prisma.category.update({
            where: { id },
            data: { ...dto },
            include: { parent: true, children: true },
        });
    }

    async remove(id: string): Promise<void> {
        const category = await this.prisma.category.findFirst({
            where: { id, deletedAt: null },
        });

        if (!category) throw new NotFoundException(ServiceErrorMessage.CATEGORY_NOT_FOUND);

        await this.prisma.category.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
}
