import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';
import {
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt so we don't actually hash in tests — fast + predictable
jest.mock('bcrypt');

describe('UserService', () => {
    let service: UserService;
    let prisma: MockPrismaService;

    // Factory for a fake user object — reuse across tests
    const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'hashed-password',
        role: Role.CUSTOMER,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const createUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
    };

    beforeEach(async () => {
        prisma = createMockPrismaService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
    });

    afterEach(() => jest.clearAllMocks());

    // ===== CREATE =====

    describe('create', () => {
        it('should hash password and create user', async () => {
            // Arrange: no existing user with this email
            prisma.user.findFirst.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            prisma.user.create.mockResolvedValue(mockUser);

            // Act
            const result = await service.create(createUserDto);

            // Assert
            expect(prisma.user.findFirst).toHaveBeenCalledWith({
                where: { email: 'john@example.com', deletedAt: null },
            });
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(prisma.user.create).toHaveBeenCalledWith({
                data: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'hashed-password',
                },
            });
            expect(result).toEqual(mockUser);
        });

        it('should throw ConflictException on duplicate email', async () => {
            // Arrange: email already exists
            prisma.user.findFirst.mockResolvedValue(mockUser);

            // Act & Assert
            await expect(service.create(createUserDto)).rejects.toThrow(
                ConflictException,
            );
            expect(prisma.user.create).not.toHaveBeenCalled();
        });
    });

    // ===== FIND BY ID =====

    describe('findById', () => {
        it('should return user without password when found', async () => {
            const userResponse = {
                id: 'user-1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                role: Role.CUSTOMER,
                createdAt: new Date(),
            };
            prisma.user.findFirst.mockResolvedValue(userResponse);

            const result = await service.findById('user-1');

            expect(result).toEqual(userResponse);
            expect(prisma.user.findFirst).toHaveBeenCalledWith({
                where: { id: 'user-1', deletedAt: null },
                select: expect.objectContaining({ id: true, email: true }),
            });
        });

        it('should throw NotFoundException when user not found', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            await expect(service.findById('nonexistent')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    // ===== FIND BY EMAIL =====

    describe('findByEmail', () => {
        it('should return user when found', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);

            const result = await service.findByEmail('john@example.com');

            expect(result).toEqual(mockUser);
        });

        it('should return null when not found', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            const result = await service.findByEmail('nobody@example.com');

            expect(result).toBeNull();
        });
    });

    // ===== FIND ALL =====

    describe('findAll', () => {
        it('should return array of users without passwords', async () => {
            const users = [
                {
                    id: 'user-1',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    role: Role.CUSTOMER,
                    createdAt: new Date(),
                },
                {
                    id: 'user-2',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane@example.com',
                    role: Role.ADMIN,
                    createdAt: new Date(),
                },
            ];
            prisma.user.findMany.mockResolvedValue(users);
            prisma.user.count = jest.fn().mockResolvedValue(users.length);

            const result = await service.findAll();

            expect(result).toEqual({
                items: users,
                meta: expect.objectContaining({
                    total: users.length,
                    page: 1,
                    limit: 10,
                }),
            });
            expect(prisma.user.findMany).toHaveBeenCalledWith({
                where: { deletedAt: null },
                select: expect.objectContaining({ id: true, email: true }),
                skip: 0,
                take: 10,
                orderBy: { createdAt: 'desc' },
            });
        });
    });

    // ===== UPDATE =====

    describe('update', () => {
        it('should update user when owner', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);
            const updatedUser = { ...mockUser, firstName: 'Updated' };
            prisma.user.update.mockResolvedValue(updatedUser);

            const result = await service.update(
                'user-1',
                { firstName: 'Updated' },
                'user-1', // currentUserId matches target
                Role.CUSTOMER,
            );

            expect(prisma.user.update).toHaveBeenCalled();
            expect(result.firstName).toBe('Updated');
        });

        it('should update user when admin', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);
            prisma.user.update.mockResolvedValue({
                ...mockUser,
                firstName: 'AdminEdit',
            });

            const result = await service.update(
                'user-1',
                { firstName: 'AdminEdit' },
                'admin-id', // different user
                Role.ADMIN, // but is admin
            );

            expect(prisma.user.update).toHaveBeenCalled();
        });

        it('should throw ForbiddenException when non-owner non-admin', async () => {
            await expect(
                service.update(
                    'user-1',
                    { firstName: 'Hacker' },
                    'other-user',
                    Role.CUSTOMER,
                ),
            ).rejects.toThrow(ForbiddenException);

            expect(prisma.user.findFirst).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when user not found', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            await expect(
                service.update(
                    'nonexistent',
                    { firstName: 'X' },
                    'nonexistent',
                    Role.CUSTOMER,
                ),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ===== REMOVE =====

    describe('remove', () => {
        it('should soft delete by setting deletedAt', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);
            prisma.user.update.mockResolvedValue({
                ...mockUser,
                deletedAt: new Date(),
            });

            await service.remove('user-1');

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1', deletedAt: null },
                data: { deletedAt: expect.any(Date) },
            });
        });

        it('should throw NotFoundException when user not found', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            await expect(service.remove('nonexistent')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    // ===== FIND BY ID INTERNAL =====

    describe('findByIdInternal', () => {
        it('should return full user object when found', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);

            const result = await service.findByIdInternal('user-1');

            expect(result).toEqual(mockUser);
            expect(prisma.user.findFirst).toHaveBeenCalledWith({
                where: { id: 'user-1', deletedAt: null },
            });
        });

        it('should return null when not found', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            const result = await service.findByIdInternal('nonexistent');

            expect(result).toBeNull();
        });
    });
});
