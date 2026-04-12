import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async register(
        @Body() dto: RegisterDto,
        @Request() req,
    ): Promise<AuthResponseDto> {
        return this.authService.register(dto, req.headers['user-agent']);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async login(@Request() req): Promise<AuthResponseDto> {
        return this.authService.login(req.user, req.headers['user-agent']);
    }

    @Post('refresh')
    @Public()
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async refresh(@Request() req): Promise<AuthResponseDto> {
        return this.authService.refreshTokens(
            req.cookies['refresh_token'],
            req.headers['user-agent'],
        );
    }

    @Post('logout')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async logout(@CurrentUser() user): Promise<void> {
        return this.authService.logout(user.id);
    }
}
