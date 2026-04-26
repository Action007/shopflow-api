import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    HealthCheck,
    HealthCheckService,
    HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from 'src/prisma/prisma.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';

@ApiTags('Health')
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
    @ApiOperation({ summary: 'Health check endpoint for the API and database' })
    @ApiOkResponse({
        description: 'Application health status',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ok' },
                info: {
                    type: 'object',
                    properties: {
                        database: {
                            type: 'object',
                            properties: {
                                status: { type: 'string', example: 'up' },
                            },
                        },
                    },
                },
                error: {
                    type: 'object',
                    example: {},
                },
                details: {
                    type: 'object',
                    properties: {
                        database: {
                            type: 'object',
                            properties: {
                                status: { type: 'string', example: 'up' },
                            },
                        },
                    },
                },
            },
        },
    })
    check() {
        return this.health.check([() => this.dbCheck()]);
    }

    private async dbCheck(): Promise<HealthIndicatorResult> {
        await this.prisma.$queryRaw`SELECT 1`;
        return { database: { status: 'up' } };
    }
}
