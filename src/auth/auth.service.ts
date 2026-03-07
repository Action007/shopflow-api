import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import { createHash, randomUUID } from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    async validateUser(email: string, password: string): Promise<User> {
        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException(
                ServiceErrorMessage.INVALID_CREDENTIALS,
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException(
                ServiceErrorMessage.INVALID_CREDENTIALS,
            );
        }

        return user;
    }

    async register(
        dto: RegisterDto,
        userAgent?: string,
    ): Promise<AuthResponseDto> {
        const user = await this.userService.create(dto);
        return this.generateTokens(user, userAgent);
    }

    async login(user: User, userAgent?: string): Promise<AuthResponseDto> {
        return this.generateTokens(user, userAgent);
    }

    async refreshTokens(
        refreshToken: string,
        userAgent?: string,
    ): Promise<AuthResponseDto> {
        const hashedToken = this.hashToken(refreshToken);

        const tokenRecord = await this.prisma.refreshToken.findFirst({
            where: { tokenHash: hashedToken, revokedAt: null },
        });

        if (!tokenRecord) {
            throw new UnauthorizedException(
                ServiceErrorMessage.REFRESH_TOKEN_NOT_FOUND,
            );
        } else if (tokenRecord.expiresAt < new Date()) {
            await this.prisma.refreshToken.delete({
                where: { id: tokenRecord.id },
            });

            throw new UnauthorizedException(
                ServiceErrorMessage.REFRESH_TOKEN_NOT_FOUND,
            );
        }

        const user = await this.userService.findByIdInternal(tokenRecord.userId);

        if (!user) {
            throw new UnauthorizedException(
                ServiceErrorMessage.INVALID_CREDENTIALS,
            );
        }

        return this.generateTokens(user, userAgent);
    }

    async logout(userId: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }

    private async generateTokens(
        user: User,
        userAgent?: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const accessToken = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
        });
        const jti = randomUUID();
        const refreshToken = this.jwtService.sign(
            { sub: user.id, jti },
            {
                expiresIn: this.configService.getOrThrow<number>(
                    'JWT_REFRESH_EXPIRATION',
                ),
            },
        );

        const hashedToken = this.hashToken(refreshToken);

        await this.prisma.refreshToken.create({
            data: {
                jti,
                tokenHash: hashedToken,
                userId: user.id,
                expiresAt: new Date(
                    Date.now() +
                        this.configService.getOrThrow<number>(
                            'JWT_REFRESH_EXPIRATION',
                        ) *
                            1000,
                ),
                userAgent,
            },
        });

        return { accessToken, refreshToken };
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }
}
