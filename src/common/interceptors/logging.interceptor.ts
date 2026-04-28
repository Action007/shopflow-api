import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
    ensureRequestId,
    formatRequestLogLine,
    getRequestContext,
    setRequestStartTime,
} from '../utils/request-context.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
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
                    const duration = Date.now() - start;
                    const requestContext = getRequestContext(req, requestId);
                    this.logger.log(
                        formatRequestLogLine({
                            statusCode: res.statusCode,
                            method,
                            url,
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
}
