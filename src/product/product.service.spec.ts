import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ProductService', () => {
    let service: ProductService;
    let prisma: MockPrismaService;

    const mockCategory = {
        id: 'cat-1',
        name: 'Electronics',
        description: 'Gadgets',
        parentId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockProduct = {
        id: 'prod-1',
        name: 'iPhone 15',
        description: 'Latest iPhone',
        price: new Prisma.Decimal('999.99'),
        stockQuantity: 50,
        imageUrl: null,
        categoryId: 'cat-1',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: mockCategory,
    };

    const createProductDto = {
        name: 'iPhone 15',
        description: 'Latest iPhone',
        price: '999.99',
        stockQuantity: 50,
        categoryId: 'cat-1',
    };

    beforeEach(async () => {
        prisma = createMockPrismaService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<ProductService>(ProductService);
    });

    afterEach(() => jest.clearAllMocks());

    // ===== CREATE =====

    describe('create', () => {
        it('should create product when category exists', async () => {
            prisma.category.findFirst.mockResolvedValue(mockCategory);
            prisma.product.create.mockResolvedValue(mockProduct);

            const result = await service.create(createProductDto);

            expect(result).toEqual(mockProduct);
            expect(prisma.category.findFirst).toHaveBeenCalledWith({
                where: { id: 'cat-1', deletedAt: null },
            });
            expect(prisma.product.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'iPhone 15',
                    categoryId: 'cat-1',
                }),
                include: { category: true },
            });
        });

        it('should throw NotFoundException when category not found', async () => {
            prisma.category.findFirst.mockResolvedValue(null);

            await expect(service.create(createProductDto)).rejects.toThrow(
                NotFoundException,
            );
            expect(prisma.product.create).not.toHaveBeenCalled();
        });
    });

    // ===== FIND BY ID =====

    describe('findById', () => {
        it('should return product with category when found', async () => {
            prisma.product.findFirst.mockResolvedValue(mockProduct);

            const result = await service.findById('prod-1');

            expect(result).toEqual(mockProduct);
            expect(prisma.product.findFirst).toHaveBeenCalledWith({
                where: { id: 'prod-1', deletedAt: null },
                include: { category: true },
            });
        });

        it('should throw NotFoundException when product not found', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(service.findById('nonexistent')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    // ===== FIND ALL (PAGINATION) =====

    describe('findAll', () => {
        it('should return paginated products with correct meta', async () => {
            const products = [mockProduct];
            prisma.product.findMany.mockResolvedValue(products);
            prisma.product.count.mockResolvedValue(1);

            const result = await service.findAll({ page: 1, limit: 10 });

            expect(result.items).toEqual(products);
            expect(result.meta).toEqual({
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
                hasNext: false,
                hasPrevious: false,
            });
        });

        it('should apply category filter when provided', async () => {
            prisma.product.findMany.mockResolvedValue([]);
            prisma.product.count.mockResolvedValue(0);

            await service.findAll({ page: 1, limit: 10, categoryId: 'cat-1' });

            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ categoryId: 'cat-1' }),
                }),
            );
        });

        it('should apply search filter when provided', async () => {
            prisma.product.findMany.mockResolvedValue([]);
            prisma.product.count.mockResolvedValue(0);

            await service.findAll({ page: 1, limit: 10, search: 'iPhone' });

            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            expect.objectContaining({
                                name: expect.objectContaining({
                                    contains: 'iPhone',
                                }),
                            }),
                        ]),
                    }),
                }),
            );
        });
    });

    // ===== UPDATE =====

    describe('update', () => {
        it('should update product when found', async () => {
            prisma.product.findFirst.mockResolvedValue(mockProduct);
            prisma.product.update.mockResolvedValue({
                ...mockProduct,
                name: 'Updated',
            });

            const result = await service.update('prod-1', { name: 'Updated' });

            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: { name: 'Updated' },
            });
        });

        it('should convert price string to Decimal on update', async () => {
            prisma.product.findFirst.mockResolvedValue(mockProduct);
            const updatedPrice = new Prisma.Decimal('1299.99');
            prisma.product.update.mockResolvedValue({
                ...mockProduct,
                price: updatedPrice,
            });

            await service.update('prod-1', { price: '1299.99' });

            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: expect.objectContaining({
                    price: expect.any(Prisma.Decimal),
                }),
            });
        });

        it('should throw NotFoundException when product not found', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(
                service.update('nonexistent', { name: 'X' }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ===== REMOVE =====

    describe('remove', () => {
        it('should soft delete product', async () => {
            prisma.product.findFirst.mockResolvedValue(mockProduct);
            prisma.product.update.mockResolvedValue({
                ...mockProduct,
                deletedAt: new Date(),
            });

            await service.remove('prod-1');

            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: { deletedAt: expect.any(Date) },
            });
        });

        it('should throw NotFoundException when product not found', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(service.remove('nonexistent')).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
