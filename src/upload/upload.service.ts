import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, UploadStatus, Role } from '@prisma/client';
import { promises as fs } from 'fs';
import { join } from 'path';

type StoredUpload = Prisma.UploadGetPayload<Record<string, never>>;
type UploadedImageFile = {
    originalname: string;
    filename: string;
    mimetype: string;
    size: number;
};

@Injectable()
export class UploadService {
    private readonly uploadDir = join(process.cwd(), 'uploads');

    constructor(private readonly prisma: PrismaService) {}

    private getUploadRepository(tx?: Prisma.TransactionClient | PrismaService) {
        return (tx ?? this.prisma).upload;
    }

    async createImageUpload(params: {
        file: UploadedImageFile;
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
    }): Promise<StoredUpload> {
        const { uploadId, currentUserId, currentUserRole, tx } = params;
        const uploadRepository = this.getUploadRepository(tx);

        const upload = await uploadRepository.findUnique({
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

        return uploadRepository.update({
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
            throw new ForbiddenException(
                ServiceErrorMessage.ONLY_PENDING_UPLOADS_CAN_BE_DELETED,
            );
        }

        await fs.rm(join(this.uploadDir, upload.fileName), { force: true });
        await this.prisma.upload.delete({
            where: { id: upload.id },
        });
    }
}
