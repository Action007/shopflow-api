import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
    ensureRequestId,
    formatRequestLogLine,
    getMatchedRoute,
    getRequestContext,
    setRequestStartTime,
} from '../utils/request-context.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private static readonly SUCCESS_SKIP_PATH_PATTERNS = [
        /^\/api\/v1\/health(?:\/.*)?$/,
    ];

    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        const method = req.method;
        const url = req.originalUrl || req.url;
        const start = Date.now();
        const requestId = ensureRequestId(req, res);
        setRequestStartTime(req, start);

        return next.handle().pipe(
            tap({
                next: () => {
                    if (this.shouldSkipLog(res.statusCode, url)) {
                        return;
                    }

                    const duration = Date.now() - start;
                    const requestContext = getRequestContext(req, requestId);
                    this.logger.log(
                        formatRequestLogLine({
                            statusCode: res.statusCode,
                            method,
                            url,
                            route: getMatchedRoute(
                                req,
                                Reflect.getMetadata(PATH_METADATA, context.getClass()) as
                                    | string
                                    | string[]
                                    | undefined,
                            ),
                            durationMs: duration,
                            userId: requestContext.userId,
                            ip: requestContext.ip,
                            deviceType: requestContext.deviceType,
                            requestId,
                            userAgent: requestContext.userAgent,
                        }),
                    );
                },
            }),
        );
    }

    private shouldSkipLog(statusCode: number, url: string): boolean {
        const path = this.getPathname(url);

        return (
            statusCode < 400 &&
            LoggingInterceptor.SUCCESS_SKIP_PATH_PATTERNS.some((pattern) =>
                pattern.test(path),
            )
        );
    }

    private getPathname(url: string): string {
        return url.split('?')[0];
    }
}
