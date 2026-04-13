import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, UploadStatus } from '@prisma/client';
import { promises as fs } from 'fs';
import { UploadService } from './upload.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    createMockPrismaService,
    MockPrismaService,
} from 'src/common/test/prisma-mock.factory';

describe('UploadService', () => {
    let service: UploadService;
    let prisma: MockPrismaService;
    let rmSpy: jest.SpiedFunction<typeof fs.rm>;

    const mockUpload = {
        id: 'upload-1',
        originalName: 'avatar.png',
        fileName: 'stored-avatar.png',
        mimeType: 'image/png',
        size: 1024,
        url: 'http://localhost:3000/uploads/stored-avatar.png',
        status: UploadStatus.PENDING,
        uploadedById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        prisma = createMockPrismaService();
        rmSpy = jest.spyOn(fs, 'rm').mockResolvedValue();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UploadService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<UploadService>(UploadService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    describe('createImageUpload', () => {
        it('should persist a pending upload record', async () => {
            prisma.upload.create.mockResolvedValue(mockUpload);

            const result = await service.createImageUpload({
                file: {
                    originalname: 'avatar.png',
                    filename: 'stored-avatar.png',
                    mimetype: 'image/png',
                    size: 1024,
                },
                uploadedById: 'user-1',
                publicUrl: 'http://localhost:3000/uploads/stored-avatar.png',
            });

            expect(prisma.upload.create).toHaveBeenCalledWith({
                data: {
                    originalName: 'avatar.png',
                    fileName: 'stored-avatar.png',
                    mimeType: 'image/png',
                    size: 1024,
                    url: 'http://localhost:3000/uploads/stored-avatar.png',
                    uploadedById: 'user-1',
                },
            });
            expect(result).toEqual(mockUpload);
        });
    });

    describe('consumePendingUpload', () => {
        it('should mark a pending upload as used', async () => {
            prisma.upload.findUnique.mockResolvedValue(mockUpload);
            prisma.upload.update.mockResolvedValue({
                ...mockUpload,
                status: UploadStatus.USED,
            });

            const result = await service.consumePendingUpload({
                uploadId: 'upload-1',
                currentUserId: 'user-1',
                currentUserRole: Role.CUSTOMER,
            });

            expect(prisma.upload.update).toHaveBeenCalledWith({
                where: { id: 'upload-1' },
                data: { status: UploadStatus.USED },
            });
            expect(result.status).toBe(UploadStatus.USED);
        });

        it('should allow admins to consume another users pending upload', async () => {
            prisma.upload.findUnique.mockResolvedValue(mockUpload);
            prisma.upload.update.mockResolvedValue({
                ...mockUpload,
                status: UploadStatus.USED,
            });

            await service.consumePendingUpload({
                uploadId: 'upload-1',
                currentUserId: 'admin-1',
                currentUserRole: Role.ADMIN,
            });

            expect(prisma.upload.update).toHaveBeenCalled();
        });

        it('should throw when upload does not exist', async () => {
            prisma.upload.findUnique.mockResolvedValue(null);

            await expect(
                service.consumePendingUpload({
                    uploadId: 'missing',
                    currentUserId: 'user-1',
                    currentUserRole: Role.CUSTOMER,
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw when upload belongs to another customer', async () => {
            prisma.upload.findUnique.mockResolvedValue(mockUpload);

            await expect(
                service.consumePendingUpload({
                    uploadId: 'upload-1',
                    currentUserId: 'user-2',
                    currentUserRole: Role.CUSTOMER,
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('should throw when upload is already used', async () => {
            prisma.upload.findUnique.mockResolvedValue({
                ...mockUpload,
                status: UploadStatus.USED,
            });

            await expect(
                service.consumePendingUpload({
                    uploadId: 'upload-1',
                    currentUserId: 'user-1',
                    currentUserRole: Role.CUSTOMER,
                }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('removePendingUpload', () => {
        it('should delete the file and database record for a pending upload', async () => {
            prisma.upload.findUnique.mockResolvedValue(mockUpload);
            prisma.upload.delete.mockResolvedValue(mockUpload);

            await service.removePendingUpload(
                'upload-1',
                'user-1',
                Role.CUSTOMER,
            );

            expect(rmSpy).toHaveBeenCalledWith(
                expect.stringContaining('/uploads/stored-avatar.png'),
                { force: true },
            );
            expect(prisma.upload.delete).toHaveBeenCalledWith({
                where: { id: 'upload-1' },
            });
        });

        it('should throw when deleting a non-pending upload', async () => {
            prisma.upload.findUnique.mockResolvedValue({
                ...mockUpload,
                status: UploadStatus.USED,
            });

            await expect(
                service.removePendingUpload(
                    'upload-1',
                    'user-1',
                    Role.CUSTOMER,
                ),
            ).rejects.toThrow(ForbiddenException);

            expect(prisma.upload.delete).not.toHaveBeenCalled();
        });
    });
});
