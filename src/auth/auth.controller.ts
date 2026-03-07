import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    async register(
        @Body() dto: RegisterDto,
        @Request() req,
    ): Promise<AuthResponseDto> {
        return this.authService.register(dto, req.headers['user-agent']);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req): Promise<AuthResponseDto> {
        return this.authService.login(req.user, req.headers['user-agent']);
    }

    @Post('refresh')
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Request() req,
    ): Promise<AuthResponseDto> {
        return this.authService.refreshTokens(
            dto.refreshToken,
            req.headers['user-agent'],
        );
    }

    @Post('logout')
    async logout(@CurrentUser() user): Promise<void> {
        return this.authService.logout(user.id);
    }
}
