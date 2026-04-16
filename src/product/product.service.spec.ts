import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';
import { NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { UploadService } from 'src/upload/upload.service';

describe('ProductService', () => {
    let service: ProductService;
    let prisma: MockPrismaService;
    let uploadService: {
        consumePendingUpload: jest.Mock;
        removeStoredFileByUrl: jest.Mock;
    };

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
        imageUploadId: '',
    };

    beforeEach(async () => {
        prisma = createMockPrismaService();
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
        uploadService = {
            consumePendingUpload: jest.fn(),
            removeStoredFileByUrl: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductService,
                { provide: PrismaService, useValue: prisma },
                { provide: UploadService, useValue: uploadService },
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

            const result = await service.create(
                createProductDto,
                'admin-1',
                Role.ADMIN,
            );

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

            await expect(
                service.create(createProductDto, 'admin-1', Role.ADMIN),
            ).rejects.toThrow(NotFoundException);
            expect(prisma.product.create).not.toHaveBeenCalled();
        });

        it('should use uploaded image when imageUploadId is provided', async () => {
            prisma.category.findFirst.mockResolvedValue(mockCategory);
            prisma.product.create.mockResolvedValue({
                ...mockProduct,
                imageUrl: 'http://localhost:3000/uploads/file.webp',
            });
            uploadService.consumePendingUpload.mockResolvedValue({
                id: 'upload-1',
                url: 'http://localhost:3000/uploads/file.webp',
            });

            await service.create(
                {
                    ...createProductDto,
                    imageUploadId: 'upload-1',
                },
                'admin-1',
                Role.ADMIN,
            );

            expect(uploadService.consumePendingUpload).toHaveBeenCalledWith({
                uploadId: 'upload-1',
                currentUserId: 'admin-1',
                currentUserRole: Role.ADMIN,
                tx: prisma,
            });
            expect(prisma.product.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    imageUrl: 'http://localhost:3000/uploads/file.webp',
                }),
                include: { category: true },
            });
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
            prisma.category.findMany.mockResolvedValue([]);
            prisma.product.findMany.mockResolvedValue([]);
            prisma.product.count.mockResolvedValue(0);

            await service.findAll({ page: 1, limit: 10, categoryId: 'cat-1' });

            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        categoryId: { in: ['cat-1'] },
                    }),
                }),
            );
        });

        it('should include descendant categories when parent category filter is provided', async () => {
            prisma.category.findMany
                .mockResolvedValueOnce([{ id: 'cat-2' }, { id: 'cat-3' }])
                .mockResolvedValueOnce([{ id: 'cat-4' }])
                .mockResolvedValueOnce([]);
            prisma.product.findMany.mockResolvedValue([]);
            prisma.product.count.mockResolvedValue(0);

            await service.findAll({ page: 1, limit: 10, categoryId: 'cat-1' });

            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        categoryId: {
                            in: ['cat-1', 'cat-2', 'cat-3', 'cat-4'],
                        },
                    }),
                }),
            );
        });

        it('should use a stable secondary id sort for pagination', async () => {
            prisma.product.findMany.mockResolvedValue([]);
            prisma.product.count.mockResolvedValue(0);

            await service.findAll({ page: 2, limit: 10 });

            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 10,
                    take: 10,
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

            const result = await service.update(
                'prod-1',
                { name: 'Updated' },
                'admin-1',
                Role.ADMIN,
            );

            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: { name: 'Updated' },
                include: { category: true },
            });
        });

        it('should convert price string to Decimal on update', async () => {
            prisma.product.findFirst.mockResolvedValue(mockProduct);
            const updatedPrice = new Prisma.Decimal('1299.99');
            prisma.product.update.mockResolvedValue({
                ...mockProduct,
                price: updatedPrice,
            });

            await service.update(
                'prod-1',
                { price: '1299.99' },
                'admin-1',
                Role.ADMIN,
            );

            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: expect.objectContaining({
                    price: expect.any(Prisma.Decimal),
                }),
                include: { category: true },
            });
        });

        it('should replace product image when a new upload is provided', async () => {
            prisma.product.findFirst.mockResolvedValue({
                ...mockProduct,
                imageUrl: 'http://localhost:3000/uploads/old.webp',
            });
            prisma.product.update.mockResolvedValue({
                ...mockProduct,
                imageUrl: 'http://localhost:3000/uploads/updated.webp',
            });
            uploadService.consumePendingUpload.mockResolvedValue({
                id: 'upload-2',
                url: 'http://localhost:3000/uploads/updated.webp',
            });

            await service.update(
                'prod-1',
                { imageUploadId: 'upload-2' },
                'admin-1',
                Role.ADMIN,
            );

            expect(uploadService.consumePendingUpload).toHaveBeenCalledWith({
                uploadId: 'upload-2',
                currentUserId: 'admin-1',
                currentUserRole: Role.ADMIN,
                tx: prisma,
            });
            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: expect.objectContaining({
                    imageUrl: 'http://localhost:3000/uploads/updated.webp',
                }),
                include: { category: true },
            });
            expect(uploadService.removeStoredFileByUrl).toHaveBeenCalledWith(
                'http://localhost:3000/uploads/old.webp',
            );
        });

        it('should throw NotFoundException when product not found', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(
                service.update(
                    'nonexistent',
                    { name: 'X' },
                    'admin-1',
                    Role.ADMIN,
                ),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ===== REMOVE =====

    describe('remove', () => {
        it('should soft delete product', async () => {
            prisma.product.findFirst.mockResolvedValue({
                ...mockProduct,
                imageUrl: 'http://localhost:3000/uploads/product.webp',
            });
            prisma.product.update.mockResolvedValue({
                ...mockProduct,
                deletedAt: new Date(),
            });

            await service.remove('prod-1');

            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: { deletedAt: expect.any(Date) },
            });
            expect(uploadService.removeStoredFileByUrl).toHaveBeenCalledWith(
                'http://localhost:3000/uploads/product.webp',
            );
        });

        it('should throw NotFoundException when product not found', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(service.remove('nonexistent')).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
