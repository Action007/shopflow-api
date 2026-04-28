process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test-jwt-secret-with-at-least-32-characters';
process.env.JWT_ACCESS_EXPIRATION ??= '3600';
process.env.JWT_REFRESH_EXPIRATION ??= '604800';
process.env.APP_BASE_URL ??= 'http://localhost:3000';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
process.env.TRUST_PROXY ??= 'false';
process.env.UPLOAD_DIR ??= 'uploads-test';
