import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import { Security } from 'src/common/constants/security';
import { USER_SELECT } from 'src/common/constants/user-select';
import { UserResponse } from './types/user-response.type';
import { PaginatedResult } from 'src/common/types/paginated-result.type';
import { buildPaginationMeta } from 'src/common/utils/paginate';
import { UserQueryDto } from './dto/user-query.dto';
import { UploadService } from 'src/upload/upload.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly uploadService: UploadService,
    ) {}

    async create(dto: CreateUserDto): Promise<User> {
        const existingUser = await this.prisma.user.findFirst({
            where: { email: dto.email, deletedAt: null },
        });

        if (existingUser) {
            throw new ConflictException(ServiceErrorMessage.EMAIL_EXISTS);
        }

        const hashedPassword = await bcrypt.hash(
            dto.password,
            Security.BCRYPT_SALT_ROUNDS,
        );

        return this.prisma.user.create({
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                password: hashedPassword,
            },
        });
    }

    async findById(id: string): Promise<UserResponse> {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: USER_SELECT,
        });

        if (!user) {
            throw new NotFoundException(ServiceErrorMessage.USER_NOT_FOUND);
        }

        return user;
    }

    async findByIdInternal(id: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: { id, deletedAt: null },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: { email, deletedAt: null },
        });
    }

    async findAll(
        query: UserQueryDto = {},
    ): Promise<PaginatedResult<UserResponse>> {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = query;

        const where = { deletedAt: null };

        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: USER_SELECT,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    { [sortBy]: sortOrder } as Prisma.UserOrderByWithRelationInput,
                    { id: sortOrder },
                ],
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            items,
            meta: buildPaginationMeta(total, page, limit),
        };
    }

    async update(
        id: string,
        dto: UpdateUserDto,
        currentUserId: string,
        currentUserRole: Role,
    ) {
        if (currentUserId !== id && currentUserRole !== Role.ADMIN) {
            throw new ForbiddenException();
        }
        const updatedUser = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findFirst({
                where: { id, deletedAt: null },
            });

            if (!user) {
                throw new NotFoundException(ServiceErrorMessage.USER_NOT_FOUND);
            }

            const { firstName, lastName, imageUploadId } = dto;
            const upload = imageUploadId
                ? await this.uploadService.consumePendingUpload({
                      uploadId: imageUploadId,
                      currentUserId,
                      currentUserRole,
                      tx,
                  })
                : null;

            const updatedUser = await tx.user.update({
                where: { id },
                data: {
                    ...(firstName !== undefined && { firstName }),
                    ...(lastName !== undefined && { lastName }),
                    ...(upload && { profileImageUrl: upload.url }),
                },
                select: USER_SELECT,
            });

            if (
                imageUploadId &&
                user.profileImageUrl &&
                user.profileImageUrl !== updatedUser.profileImageUrl
            ) {
                await this.uploadService.removeStoredFileByUrl(
                    user.profileImageUrl,
                );
            }

            return updatedUser;
        });

        return updatedUser;
    }

    async changeOwnPassword(
        currentUserId: string,
        dto: ChangePasswordDto,
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findFirst({
                where: { id: currentUserId, deletedAt: null },
            });

            if (!user) {
                throw new NotFoundException(ServiceErrorMessage.USER_NOT_FOUND);
            }

            const isCurrentPasswordValid = await bcrypt.compare(
                dto.currentPassword,
                user.password,
            );

            if (!isCurrentPasswordValid) {
                throw new UnauthorizedException(
                    ServiceErrorMessage.INVALID_CURRENT_PASSWORD,
                );
            }

            const isSamePassword = await bcrypt.compare(
                dto.newPassword,
                user.password,
            );

            if (isSamePassword) {
                throw new BadRequestException(
                    ServiceErrorMessage.PASSWORD_MUST_BE_DIFFERENT,
                );
            }

            const hashedPassword = await bcrypt.hash(
                dto.newPassword,
                Security.BCRYPT_SALT_ROUNDS,
            );

            await tx.user.update({
                where: { id: currentUserId },
                data: { password: hashedPassword },
            });

            await tx.refreshToken.deleteMany({
                where: { userId: currentUserId },
            });
        });
    }

    async remove(id: string): Promise<void> {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
        });

        if (!user) {
            throw new NotFoundException(ServiceErrorMessage.USER_NOT_FOUND);
        }

        await this.prisma.user.update({
            where: { id, deletedAt: null },
            data: { deletedAt: new Date() },
        });
    }
}
