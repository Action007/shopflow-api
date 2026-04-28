describe('request-context util', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('formatRequestLogLine', () => {
        it('should format a compact log line and truncate the request id and user agent', async () => {
            const { formatRequestLogLine } = await import('./request-context.util');

            const result = formatRequestLogLine({
                statusCode: 200,
                method: 'GET',
                url: '/api/v1/products/123',
                route: '/api/v1/products/:id',
                durationMs: 47,
                userId: 'usr_abc123',
                ip: '203.0.113.42',
                deviceType: 'mobile',
                requestId: '8f3a2b1c1234567890abcdef',
                userAgent:
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
            });

            expect(result).toBe(
                '200 GET /api/v1/products/123 47ms route=/api/v1/products/:id user=usr_abc123 ip=203.0.113.42 device=mobile rid=8f3a2b1c ua="Mozilla/5.0 (iPhone; CPU iPhone OS 17..."',
            );
        });

        it('should omit empty or unknown fields', async () => {
            const { formatRequestLogLine } = await import('./request-context.util');

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

        it('should omit the route field when no matched route is available', async () => {
            const { formatRequestLogLine } = await import('./request-context.util');

            const result = formatRequestLogLine({
                statusCode: 404,
                method: 'GET',
                url: '/api/v1/missing',
                durationMs: 9,
                requestId: '12345678-1234-1234-1234-123456789abc',
                userAgent: 'unknown',
            });

            expect(result).not.toContain('route=');
        });
    });

    describe('getRequestContext', () => {
        it('should include ip-related request metadata without country', async () => {
            const { getRequestContext } = await import('./request-context.util');

            const context = getRequestContext(
                {
                    method: 'GET',
                    url: '/api/v1/products/123',
                    originalUrl: '/api/v1/products/123',
                    ip: '::1',
                    headers: {
                        'user-agent': 'Mozilla/5.0',
                        'x-forwarded-for': '54.164.169.87, 172.70.38.210',
                        'x-real-ip': '54.164.169.87',
                    },
                } as any,
                'request-id',
            );

            expect(context.ip).toBe('::1');
            expect(context.forwardedFor).toBe('54.164.169.87, 172.70.38.210');
            expect(context.realIp).toBe('54.164.169.87');
            expect(context).not.toHaveProperty('country');
        });
    });
});
