import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, UploadStatus, Role } from '@prisma/client';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import { getUploadDirPath } from './constants/upload.constants';

type StoredUpload = Prisma.UploadGetPayload<Record<string, never>>;

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    async createImageUpload(params: {
        file: any;
        uploadedById: string;
        publicUrl: string;
    }): Promise<StoredUpload> {
        const { file, uploadedById, publicUrl } = params;

        return this.prisma.upload.create({
            data: {
                originalName: file.originalname,
                fileName: file.filename,
                mimeType: file.mimetype,
                size: file.size,
                url: publicUrl,
                uploadedById,
            },
        });
    }

    async consumePendingUpload(params: {
        uploadId: string;
        currentUserId: string;
        currentUserRole: Role;
        tx?: Prisma.TransactionClient | PrismaService;
    }) {
        const { uploadId, currentUserId, currentUserRole, tx } = params;

        const repo = (tx ?? this.prisma).upload;

        const upload = await repo.findUnique({
            where: { id: uploadId },
        });

        if (!upload) {
            throw new NotFoundException(ServiceErrorMessage.UPLOAD_NOT_FOUND);
        }

        if (
            upload.uploadedById !== currentUserId &&
            currentUserRole !== Role.ADMIN
        ) {
            throw new ForbiddenException();
        }

        if (upload.status !== UploadStatus.PENDING) {
            throw new BadRequestException(
                ServiceErrorMessage.UPLOAD_ALREADY_USED,
            );
        }

        return repo.update({
            where: { id: upload.id },
            data: { status: UploadStatus.USED },
        });
    }

    async removePendingUpload(
        uploadId: string,
        currentUserId: string,
        currentUserRole: Role,
    ): Promise<void> {
        const upload = await this.prisma.upload.findUnique({
            where: { id: uploadId },
        });

        if (!upload) {
            throw new NotFoundException(ServiceErrorMessage.UPLOAD_NOT_FOUND);
        }

        if (
            upload.uploadedById !== currentUserId &&
            currentUserRole !== Role.ADMIN
        ) {
            throw new ForbiddenException();
        }

        if (upload.status !== UploadStatus.PENDING) {
            throw new BadRequestException(
                ServiceErrorMessage.ONLY_PENDING_UPLOADS_CAN_BE_DELETED,
            );
        }

        const filePath = join(this.getUploadDir(), upload.fileName);

        try {
            await fs.access(filePath);
            await fs.unlink(filePath);
        } catch {
            this.logger.warn(`File not found or already deleted: ${filePath}`);
        }

        await this.prisma.upload.delete({
            where: { id: upload.id },
        });
    }

    async removeStoredFileByUrl(fileUrl?: string | null): Promise<void> {
        const fileName = this.getStoredFileName(fileUrl);
        if (!fileName) return;

        const filePath = join(this.getUploadDir(), fileName);

        try {
            await fs.access(filePath);
            await fs.unlink(filePath);
        } catch {
            this.logger.warn(`File not found: ${filePath}`);
        }
    }

    private getStoredFileName(fileUrl?: string | null): string | null {
        if (!fileUrl) return null;

        try {
            const parsedUrl = new URL(fileUrl);
            if (!parsedUrl.pathname.startsWith('/uploads/')) return null;

            return basename(parsedUrl.pathname);
        } catch {
            return null;
        }
    }

    private getUploadDir(): string {
        return getUploadDirPath(
            this.configService.getOrThrow<string>('UPLOAD_DIR'),
        );
    }
}
