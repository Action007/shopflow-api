import { formatRequestLogLine } from './request-context.util';

describe('request-context util', () => {
    describe('formatRequestLogLine', () => {
        it('should format a compact log line and truncate the request id and user agent', () => {
            const result = formatRequestLogLine({
                statusCode: 200,
                method: 'GET',
                url: '/api/v1/products/123',
                durationMs: 47,
                userId: 'usr_abc123',
                ip: '203.0.113.42',
                deviceType: 'mobile',
                requestId: '8f3a2b1c1234567890abcdef',
                userAgent:
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
            });

            expect(result).toBe(
                '200 GET /api/v1/products/123 47ms user=usr_abc123 ip=203.0.113.42 device=mobile rid=8f3a2b1c ua="Mozilla/5.0 (iPhone; CPU iPhone OS 17..."',
            );
        });

        it('should omit empty or unknown fields', () => {
            const result = formatRequestLogLine({
                statusCode: 404,
                method: 'GET',
                url: '/api/v1/missing',
                durationMs: 9,
                requestId: '12345678-1234-1234-1234-123456789abc',
                userAgent: 'unknown',
            });

            expect(result).toBe('404 GET /api/v1/missing 9ms rid=12345678');
        });
    });
});
