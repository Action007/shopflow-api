describe('request-context util', () => {
    const originalCfIpCountryTrusted = process.env.CF_IPCOUNTRY_TRUSTED;

    afterEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        if (originalCfIpCountryTrusted === undefined) {
            delete process.env.CF_IPCOUNTRY_TRUSTED;
            return;
        }

        process.env.CF_IPCOUNTRY_TRUSTED = originalCfIpCountryTrusted;
    });

    async function loadRequestContextUtil(options?: {
        cfIpCountryTrusted?: string;
        geoipCountry?: string;
    }) {
        if (options?.cfIpCountryTrusted === undefined) {
            delete process.env.CF_IPCOUNTRY_TRUSTED;
        } else {
            process.env.CF_IPCOUNTRY_TRUSTED = options.cfIpCountryTrusted;
        }

        const lookup = jest.fn();

        if (options?.geoipCountry) {
            lookup.mockReturnValue({ country: options.geoipCountry });
        }

        jest.doMock('geoip-lite', () => ({
            __esModule: true,
            default: {
                lookup,
            },
        }));

        const requestContextUtil = await import('./request-context.util');

        return {
            ...requestContextUtil,
            geoipLookup: lookup,
        };
    }

    describe('formatRequestLogLine', () => {
        it('should format a compact log line and truncate the request id and user agent', async () => {
            const { formatRequestLogLine } = await loadRequestContextUtil();

            const result = formatRequestLogLine({
                statusCode: 200,
                method: 'GET',
                url: '/api/v1/products/123',
                route: '/api/v1/products/:id',
                durationMs: 47,
                userId: 'usr_abc123',
                ip: '203.0.113.42',
                country: 'DE',
                deviceType: 'mobile',
                requestId: '8f3a2b1c1234567890abcdef',
                userAgent:
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
            });

            expect(result).toBe(
                '200 GET /api/v1/products/123 47ms route=/api/v1/products/:id user=usr_abc123 ip=203.0.113.42 country=DE device=mobile rid=8f3a2b1c ua="Mozilla/5.0 (iPhone; CPU iPhone OS 17..."',
            );
        });

        it('should omit empty or unknown fields', async () => {
            const { formatRequestLogLine } = await loadRequestContextUtil();

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
            const { formatRequestLogLine } = await loadRequestContextUtil();

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
        it('should include country from geoip lookup for non-loopback requests', async () => {
            const { getRequestContext, geoipLookup } =
                await loadRequestContextUtil({
                    geoipCountry: 'DE',
                });

            const context = getRequestContext(
                {
                    method: 'GET',
                    url: '/api/v1/products/123',
                    originalUrl: '/api/v1/products/123',
                    ip: '203.0.113.42',
                    headers: {
                        'user-agent': 'Mozilla/5.0',
                    },
                } as any,
                'request-id',
            );

            expect(context.country).toBe('DE');
            expect(geoipLookup).toHaveBeenCalledWith('203.0.113.42');
        });

        it('should omit country for loopback requests even when cf-ipcountry is present and trusted', async () => {
            const { getRequestContext, geoipLookup } =
                await loadRequestContextUtil({
                    cfIpCountryTrusted: 'true',
                });

            const context = getRequestContext(
                {
                    method: 'GET',
                    url: '/api/v1/health',
                    originalUrl: '/api/v1/health',
                    ip: '127.0.0.1',
                    headers: {
                        'user-agent': 'curl/8.0.0',
                        'cf-ipcountry': 'US',
                    },
                } as any,
                'request-id',
            );

            expect(context.country).toBeUndefined();
            expect(geoipLookup).not.toHaveBeenCalled();
        });

        it('should prefer cf-ipcountry over geoip lookup when trusted', async () => {
            const { getRequestContext, geoipLookup } =
                await loadRequestContextUtil({
                    cfIpCountryTrusted: 'true',
                    geoipCountry: 'DE',
                });

            const context = getRequestContext(
                {
                    method: 'GET',
                    url: '/api/v1/products/123',
                    originalUrl: '/api/v1/products/123',
                    ip: '203.0.113.42',
                    headers: {
                        'user-agent': 'Mozilla/5.0',
                        'cf-ipcountry': 'US',
                    },
                } as any,
                'request-id',
            );

            expect(context.country).toBe('US');
            expect(geoipLookup).not.toHaveBeenCalled();
        });

        it('should ignore cf-ipcountry and fall back to geoip lookup when not trusted', async () => {
            const { getRequestContext, geoipLookup } =
                await loadRequestContextUtil({
                    cfIpCountryTrusted: 'false',
                    geoipCountry: 'DE',
                });

            const context = getRequestContext(
                {
                    method: 'GET',
                    url: '/api/v1/products/123',
                    originalUrl: '/api/v1/products/123',
                    ip: '203.0.113.42',
                    headers: {
                        'user-agent': 'Mozilla/5.0',
                        'cf-ipcountry': 'US',
                    },
                } as any,
                'request-id',
            );

            expect(context.country).toBe('DE');
            expect(geoipLookup).toHaveBeenCalledWith('203.0.113.42');
        });
    });
});
