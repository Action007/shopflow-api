export const configuration = () => ({
    port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        url: process.env.DATABASE_URL,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        accessExpiration:
            parseInt(process.env.JWT_ACCESS_EXPIRATION ?? '', 10) || 3600,
        refreshExpiration:
            parseInt(process.env.JWT_REFRESH_EXPIRATION ?? '', 10) || 604800,
    },
    trustProxy: process.env.TRUST_PROXY === 'true',
});
