import 'reflect-metadata';
import { validate } from './env.validation';

describe('env.validation', () => {
    function createConfig(overrides: Record<string, unknown> = {}) {
        return {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/shopflow',
            JWT_SECRET: '12345678901234567890123456789012',
            APP_BASE_URL: 'http://localhost:3000',
            JWT_ACCESS_EXPIRATION: '3600',
            JWT_REFRESH_EXPIRATION: '604800',
            PORT: '3000',
            CORS_ORIGINS: 'http://localhost:3000',
            TRUST_PROXY: 'false',
            UPLOAD_DIR: 'uploads',
            ...overrides,
        };
    }

    it('should transform TRUST_PROXY string values to booleans', () => {
        const validated = validate(
            createConfig({
                TRUST_PROXY: 'true',
            }),
        );

        expect(validated.TRUST_PROXY).toBe(true);
        expect(typeof validated.TRUST_PROXY).toBe('boolean');
    });
});
