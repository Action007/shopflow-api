import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
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
    async register(
        @Body() dto: RegisterDto,
        @Request() req,
    ): Promise<AuthResponseDto> {
        return this.authService.register(dto, req.headers['user-agent']);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    @Public()
    async login(@Request() req): Promise<AuthResponseDto> {
        return this.authService.login(req.user, req.headers['user-agent']);
    }

    async refresh(@Request() req): Promise<AuthResponseDto> {
        return this.authService.refreshTokens(
            req.cookies['refresh_token'],
            req.headers['user-agent'],
        );
    }

    @Post('logout')
    async logout(@CurrentUser() user): Promise<void> {
        return this.authService.logout(user.id);
    }
}
