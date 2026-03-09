import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from 'src/prisma/prisma.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';

@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly prisma: PrismaService,
    ) {}

    @Get()
    @Public()
    @SkipTransform()
    @HealthCheck()
    check() {
        return this.health.check([() => this.dbCheck()]);
    }

    private async dbCheck(): Promise<HealthIndicatorResult> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return { database: { status: 'up' } };
        } catch {
            return { database: { status: 'down' } };
        }
    }
}