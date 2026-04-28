import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiCookieAuth,
    ApiCreatedResponse,
    ApiOperation,
    ApiTags,
    ApiTooManyRequestsResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { ApiEnvelopeResponse } from 'src/common/swagger/api-response.decorators';
import {
    AuthTokensDto,
    ErrorResponseDto,
} from 'src/common/swagger/api-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Register a new customer account' })
    @ApiCreatedResponse({ description: 'Account created' })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Account created and tokens issued',
        type: AuthTokensDto,
    })
    @ApiBadRequestResponse({
        description: 'Invalid payload',
        type: ErrorResponseDto,
    })
    @ApiTooManyRequestsResponse({
        description: 'Too many registration attempts',
        type: ErrorResponseDto,
    })
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
    @ApiOperation({ summary: 'Log in with email and password' })
    @ApiBody({ type: LoginDto })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Login successful and tokens issued',
        type: AuthTokensDto,
    })
    @ApiUnauthorizedResponse({
        description: 'Invalid credentials',
        type: ErrorResponseDto,
    })
    @ApiTooManyRequestsResponse({
        description: 'Too many login attempts',
        type: ErrorResponseDto,
    })
    async login(@Request() req): Promise<AuthResponseDto> {
        return this.authService.login(req.user, req.headers['user-agent']);
    }

    @Post('refresh')
    @Public()
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({
        summary: 'Issue a new access token pair using the refresh token cookie',
        description:
            'This endpoint reads the refresh token from a client-managed cookie named refresh_token. The token itself is returned in the JSON response from register/login.',
    })
    @ApiCookieAuth('refresh-token')
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Tokens refreshed',
        type: AuthTokensDto,
    })
    @ApiUnauthorizedResponse({
        description: 'Refresh token is missing, invalid, or expired',
        type: ErrorResponseDto,
    })
    @ApiTooManyRequestsResponse({
        description: 'Too many refresh attempts',
        type: ErrorResponseDto,
    })
    async refresh(@Request() req): Promise<AuthResponseDto> {
        return this.authService.refreshTokens(
            req.cookies['refresh_token'],
            req.headers['user-agent'],
        );
    }

    @Post('logout')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({
        summary: 'Log out the current user and revoke refresh tokens',
    })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'User logged out',
    })
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @ApiTooManyRequestsResponse({
        description: 'Too many logout attempts',
        type: ErrorResponseDto,
    })
    async logout(@CurrentUser() user): Promise<void> {
        return this.authService.logout(user.id);
    }
}
