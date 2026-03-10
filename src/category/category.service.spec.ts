import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CategoryService', () => {
    let service: CategoryService;
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

    beforeEach(async () => {
        prisma = createMockPrismaService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CategoryService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<CategoryService>(CategoryService);
    });

    afterEach(() => jest.clearAllMocks());

    // ===== CREATE =====

    describe('create', () => {
        it('should create category without parent', async () => {
            prisma.category.create.mockResolvedValue({
                ...mockCategory,
                parent: null,
            });

            const result = await service.create({
                name: 'Electronics',
                description: 'Gadgets',
            });

            expect(prisma.category.create).toHaveBeenCalledWith({
                data: {
                    name: 'Electronics',
                    description: 'Gadgets',
                    parentId: undefined,
                },
                include: { parent: true },
            });
        });

        it('should create category with valid parent', async () => {
            prisma.category.findFirst.mockResolvedValue(mockCategory); // parent exists
            prisma.category.create.mockResolvedValue({
                ...mockCategory,
                id: 'cat-2',
                parentId: 'cat-1',
            });

            await service.create({ name: 'Laptops', parentId: 'cat-1' });

            expect(prisma.category.findFirst).toHaveBeenCalledWith({
                where: { id: 'cat-1', deletedAt: null },
            });
            expect(prisma.category.create).toHaveBeenCalled();
        });

        it('should throw NotFoundException when parent does not exist', async () => {
            prisma.category.findFirst.mockResolvedValue(null);

            await expect(
                service.create({ name: 'Orphan', parentId: 'nonexistent' }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ===== FIND ALL =====

    describe('findAll', () => {
        it('should return root categories with children', async () => {
            prisma.category.findMany.mockResolvedValue([mockCategory]);

            const result = await service.findAll();

            expect(result).toEqual([mockCategory]);
            expect(prisma.category.findMany).toHaveBeenCalledWith({
                where: { parentId: null, deletedAt: null },
                include: { children: true },
            });
        });
    });

    // ===== FIND BY ID =====

    describe('findById', () => {
        it('should return category with children and parent', async () => {
            prisma.category.findFirst.mockResolvedValue(mockCategory);

            const result = await service.findById('cat-1');

            expect(result).toEqual(mockCategory);
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.category.findFirst.mockResolvedValue(null);

            await expect(service.findById('nonexistent')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    // ===== UPDATE =====

    describe('update', () => {
        it('should update category when found', async () => {
            prisma.category.findFirst.mockResolvedValue(mockCategory);
            prisma.category.update.mockResolvedValue({
                ...mockCategory,
                name: 'Updated',
            });

            const result = await service.update('cat-1', { name: 'Updated' });

            expect(prisma.category.update).toHaveBeenCalled();
        });

        it('should throw BadRequestException when setting self as parent', async () => {
            prisma.category.findFirst.mockResolvedValue(mockCategory);

            await expect(
                service.update('cat-1', { parentId: 'cat-1' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException when category not found', async () => {
            prisma.category.findFirst.mockResolvedValue(null);

            await expect(
                service.update('nonexistent', { name: 'X' }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ===== REMOVE =====

    describe('remove', () => {
        it('should soft delete category', async () => {
            prisma.category.findFirst.mockResolvedValue(mockCategory);
            prisma.category.update.mockResolvedValue({
                ...mockCategory,
                deletedAt: new Date(),
            });

            await service.remove('cat-1');

            expect(prisma.category.update).toHaveBeenCalledWith({
                where: { id: 'cat-1' },
                data: { deletedAt: expect.any(Date) },
            });
        });

        it('should throw NotFoundException when category not found', async () => {
            prisma.category.findFirst.mockResolvedValue(null);

            await expect(service.remove('nonexistent')).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
