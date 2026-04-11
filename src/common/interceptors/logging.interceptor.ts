import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const method = req.method;
        const url = req.url;
        const start = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const res = context.switchToHttp().getResponse();
                    const duration = Date.now() - start;
                    this.logger.log(
                        `${method} ${url} -> ${res.statusCode} (${duration}ms)`,
                    );
                },
            }),
        );
    }
}
