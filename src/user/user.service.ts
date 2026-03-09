import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, User } from '@prisma/client';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import { USER_SELECT } from 'src/common/constants/user-select';
import { UserResponse } from './types/user-response.type';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateUserDto): Promise<User> {
        const existingUser = await this.prisma.user.findFirst({
            where: { email: dto.email, deletedAt: null },
        });

        if (existingUser) {
            throw new ConflictException(ServiceErrorMessage.EMAIL_EXISTS);
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

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

    async findAll() {
        return await this.prisma.user.findMany({
            where: { deletedAt: null },
            select: USER_SELECT,
        });
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
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
        });

        if (!user) {
            throw new NotFoundException(ServiceErrorMessage.USER_NOT_FOUND);
        }

        return this.prisma.user.update({
            where: { id },
            data: { ...dto },
            select: USER_SELECT,
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
