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

    private async getDepth(categoryId: string): Promise<number> {
        let depth = 0;
        let currentCategoryId: string | null = categoryId;

        while (currentCategoryId) {
            const category = await this.prisma.category.findFirst({
                where: { id: currentCategoryId, deletedAt: null },
            });

            if (!category) {
                break;
            }

            depth += 1;
            currentCategoryId = category.parentId;
        }

        return depth;
    }

    async create(dto: CreateCategoryDto): Promise<Category> {
        if (dto.parentId) {
            const parent = await this.prisma.category.findFirst({
                where: { id: dto.parentId, deletedAt: null },
            });

            if (!parent)
                throw new NotFoundException(
                    ServiceErrorMessage.PARENT_CATEGORY_NOT_FOUND,
                );

            const parentDepth = await this.getDepth(dto.parentId);

            if (parentDepth >= 3) {
                throw new BadRequestException(
                    'Category depth cannot exceed 3 levels',
                );
            }
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
            include: {
                children: {
                    where: { deletedAt: null },
                    include: {
                        children: {
                            where: { deletedAt: null },
                        },
                    },
                },
            },
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

        if (!category)
            throw new NotFoundException(ServiceErrorMessage.CATEGORY_NOT_FOUND);

        if (dto.parentId && dto.parentId === id) {
            throw new BadRequestException(
                ServiceErrorMessage.CATEGORY_SELF_PARENT,
            );
        }

        if (dto.parentId) {
            let currentCategoryId: string | null = dto.parentId;
            let depth = 1;

            while (currentCategoryId) {
                if (currentCategoryId === id) {
                    throw new BadRequestException(
                        ServiceErrorMessage.CATEGORY_SELF_PARENT,
                    );
                }

                const currentCategory = await this.prisma.category.findFirst({
                    where: { id: currentCategoryId, deletedAt: null },
                });

                if (!currentCategory) {
                    break;
                }

                if (depth >= 3) {
                    throw new BadRequestException(
                        'Category depth cannot exceed 3 levels',
                    );
                }

                currentCategoryId = currentCategory.parentId;
                depth += 1;
            }
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

        if (!category)
            throw new NotFoundException(ServiceErrorMessage.CATEGORY_NOT_FOUND);

        await this.prisma.category.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
}
