import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UploadService } from 'src/upload/upload.service';
import { Security } from 'src/common/constants/security';

// Mock bcrypt so we don't actually hash in tests — fast + predictable
jest.mock('bcrypt');

describe('UserService', () => {
    let service: UserService;
    let prisma: MockPrismaService;
    let uploadService: {
        consumePendingUpload: jest.Mock;
        removeStoredFileByUrl: jest.Mock;
    };

    // Factory for a fake user object — reuse across tests
    const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'hashed-password',
        profileImageUrl: null,
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
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
        uploadService = {
            consumePendingUpload: jest.fn(),
            removeStoredFileByUrl: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: PrismaService, useValue: prisma },
                { provide: UploadService, useValue: uploadService },
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
            expect(bcrypt.hash).toHaveBeenCalledWith(
                'password123',
                Security.BCRYPT_SALT_ROUNDS,
            );
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
                profileImageUrl: null,
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
                    profileImageUrl: null,
                    role: Role.CUSTOMER,
                    createdAt: new Date(),
                },
                {
                    id: 'user-2',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane@example.com',
                    profileImageUrl: null,
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

            await service.update(
                'user-1',
                { firstName: 'AdminEdit' },
                'admin-id', // different user
                Role.ADMIN, // but is admin
            );

            expect(prisma.user.update).toHaveBeenCalled();
        });

        it('should attach uploaded profile image when imageUploadId is provided', async () => {
            prisma.user.findFirst.mockResolvedValue({
                ...mockUser,
                profileImageUrl: 'http://localhost:3000/uploads/old-avatar.webp',
            });
            prisma.user.update.mockResolvedValue({
                ...mockUser,
                profileImageUrl: 'http://localhost:3000/uploads/avatar.webp',
            });
            uploadService.consumePendingUpload.mockResolvedValue({
                id: 'upload-1',
                url: 'http://localhost:3000/uploads/avatar.webp',
            });

            await service.update(
                'user-1',
                { imageUploadId: 'upload-1' },
                'user-1',
                Role.CUSTOMER,
            );

            expect(uploadService.consumePendingUpload).toHaveBeenCalledWith({
                uploadId: 'upload-1',
                currentUserId: 'user-1',
                currentUserRole: Role.CUSTOMER,
                tx: prisma,
            });
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: expect.objectContaining({
                    profileImageUrl:
                        'http://localhost:3000/uploads/avatar.webp',
                }),
                select: expect.objectContaining({ profileImageUrl: true }),
            });
            expect(uploadService.removeStoredFileByUrl).toHaveBeenCalledWith(
                'http://localhost:3000/uploads/old-avatar.webp',
            );
        });

        it('should ignore email updates even if email is passed directly to the service', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);
            prisma.user.update.mockResolvedValue({
                ...mockUser,
                firstName: 'Updated',
            });

            await service.update(
                'user-1',
                {
                    firstName: 'Updated',
                    email: 'new@example.com',
                } as any,
                'user-1',
                Role.CUSTOMER,
            );

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: {
                    firstName: 'Updated',
                },
                select: expect.any(Object),
            });
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

    describe('changeOwnPassword', () => {
        it('should change password and revoke refresh tokens', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);
            prisma.user.update.mockResolvedValue({
                ...mockUser,
                password: 'new-hashed-password',
            });
            prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
            (bcrypt.compare as jest.Mock)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

            await service.changeOwnPassword('user-1', {
                currentPassword: 'Current123!',
                newPassword: 'NewPassword123!',
            });

            expect(bcrypt.compare).toHaveBeenNthCalledWith(
                1,
                'Current123!',
                'hashed-password',
            );
            expect(bcrypt.compare).toHaveBeenNthCalledWith(
                2,
                'NewPassword123!',
                'hashed-password',
            );
            expect(bcrypt.hash).toHaveBeenCalledWith(
                'NewPassword123!',
                Security.BCRYPT_SALT_ROUNDS,
            );
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: { password: 'new-hashed-password' },
            });
            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
            });
        });

        it('should throw NotFoundException when user does not exist', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            await expect(
                service.changeOwnPassword('missing-user', {
                    currentPassword: 'Current123!',
                    newPassword: 'NewPassword123!',
                }),
            ).rejects.toThrow(NotFoundException);

            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException when current password is incorrect', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.changeOwnPassword('user-1', {
                    currentPassword: 'Wrong123!',
                    newPassword: 'NewPassword123!',
                }),
            ).rejects.toThrow(UnauthorizedException);

            expect(prisma.user.update).not.toHaveBeenCalled();
            expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException when new password matches current password', async () => {
            prisma.user.findFirst.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true);

            await expect(
                service.changeOwnPassword('user-1', {
                    currentPassword: 'Current123!',
                    newPassword: 'Current123!',
                }),
            ).rejects.toThrow(BadRequestException);

            expect(bcrypt.hash).not.toHaveBeenCalled();
            expect(prisma.user.update).not.toHaveBeenCalled();
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
