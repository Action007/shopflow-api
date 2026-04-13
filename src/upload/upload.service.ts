import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
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

    async removePendingUpload(
        uploadId: string,
        currentUserId: string,
        currentUserRole: Role,
    ): Promise<void> {
        const upload = await this.prisma.upload.findUnique({
            where: { id: uploadId },
        });

        if (!upload) {
            throw new NotFoundException('Upload not found');
        }

        if (
            upload.uploadedById !== currentUserId &&
            currentUserRole !== Role.ADMIN
        ) {
            throw new ForbiddenException();
        }

        if (upload.status !== UploadStatus.PENDING) {
            throw new ForbiddenException(
                'Only pending uploads can be deleted directly',
            );
        }

        await fs.rm(join(this.uploadDir, upload.fileName), { force: true });
        await this.prisma.upload.delete({
            where: { id: upload.id },
        });
    }
}
