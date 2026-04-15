import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import { buildPaginationMeta } from 'src/common/utils/paginate';
import { ProductQueryDto } from './dto/product-query.dto';
import { PaginatedResult } from 'src/common/types/paginated-result.type';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class ProductService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly uploadService: UploadService,
    ) {}

    async create(
        dto: CreateProductDto,
        currentUserId: string,
        currentUserRole: Role,
    ): Promise<Product> {
        return this.prisma.$transaction(async (tx) => {
            const category = await tx.category.findFirst({
                where: { id: dto.categoryId, deletedAt: null },
            });

            if (!category) {
                throw new NotFoundException(
                    ServiceErrorMessage.CATEGORY_NOT_FOUND,
                );
            }

            const upload = dto.imageUploadId
                ? await this.uploadService.consumePendingUpload({
                      uploadId: dto.imageUploadId,
                      currentUserId,
                      currentUserRole,
                      tx,
                  })
                : null;

            return tx.product.create({
                data: {
                    name: dto.name,
                    description: dto.description,
                    price: new Prisma.Decimal(dto.price),
                    stockQuantity: dto.stockQuantity,
                    categoryId: dto.categoryId,
                    imageUrl: upload?.url ?? null,
                },
                include: { category: true },
            });
        });
    }

    async findById(id: string): Promise<Product> {
        const product = await this.prisma.product.findFirst({
            where: { id, deletedAt: null },
            include: { category: true },
        });

        if (!product) {
            throw new NotFoundException(ServiceErrorMessage.PRODUCT_NOT_FOUND);
        }
        return product;
    }

    async findAll(query: ProductQueryDto): Promise<PaginatedResult<Product>> {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            categoryId,
            minPrice,
            maxPrice,
            search,
        } = query;

        const where: Prisma.ProductWhereInput = {
            deletedAt: null,
            ...(categoryId && { categoryId }),
            ...(minPrice !== undefined || maxPrice !== undefined
                ? {
                      price: {
                          ...(minPrice !== undefined && {
                              gte: new Prisma.Decimal(minPrice),
                          }),
                          ...(maxPrice !== undefined && {
                              lte: new Prisma.Decimal(maxPrice),
                          }),
                      },
                  }
                : {}),
            ...(search && {
                OR: [
                    {
                        name: {
                            contains: search,
                            mode: 'insensitive' as const,
                        },
                    },
                    {
                        description: {
                            contains: search,
                            mode: 'insensitive' as const,
                        },
                    },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                include: { category: true },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.product.count({ where }),
        ]);

        return {
            items,
            meta: buildPaginationMeta(total, page, limit),
        };
    }

    async update(
        id: string,
        dto: UpdateProductDto,
        currentUserId: string,
        currentUserRole: Role,
    ): Promise<Product> {
        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findFirst({
                where: { id, deletedAt: null },
            });

            if (!product) {
                throw new NotFoundException(
                    ServiceErrorMessage.PRODUCT_NOT_FOUND,
                );
            }

            const { price, imageUploadId, ...rest } = dto;
            const upload = imageUploadId
                ? await this.uploadService.consumePendingUpload({
                      uploadId: imageUploadId,
                      currentUserId,
                      currentUserRole,
                      tx,
                  })
                : null;

            return tx.product.update({
                where: { id },
                data: {
                    ...rest,
                    ...(price && { price: new Prisma.Decimal(price) }),
                    ...(upload && { imageUrl: upload.url }),
                },
                include: { category: true },
            });
        });
    }

    async remove(id: string): Promise<void> {
        const product = await this.prisma.product.findFirst({
            where: { id, deletedAt: null },
        });

        if (!product) {
            throw new NotFoundException(ServiceErrorMessage.PRODUCT_NOT_FOUND);
        }

        await this.prisma.product.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
}
