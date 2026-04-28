import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import geoip from 'geoip-lite';

type HeaderValue = string | string[] | undefined;
const REQUEST_START_TIME_KEY = Symbol.for('shopflow.requestStartTime');
const REQUEST_ID_REGEX = /^[A-Za-z0-9._:-]{8,128}$/;
const USER_AGENT_MAX_LENGTH = 40;

type RequestWithUser = Request & {
    [REQUEST_START_TIME_KEY]?: number;
    user?: {
        id?: string;
        sub?: string;
    };
};

export function ensureRequestId(
    request: Request,
    response?: Response,
): string {
    const existingRequestId = normalizeHeaderValue(request.headers['x-request-id']);
    const requestId =
        existingRequestId && REQUEST_ID_REGEX.test(existingRequestId)
            ? existingRequestId
            : randomUUID();
    request.headers['x-request-id'] = requestId;

    if (response) {
        response.setHeader('x-request-id', requestId);
    }

    return requestId;
}

export function setRequestStartTime(request: RequestWithUser, startTime = Date.now()): void {
    request[REQUEST_START_TIME_KEY] = startTime;
}

export function getRequestDurationMs(request: RequestWithUser): number | undefined {
    const startTime = request[REQUEST_START_TIME_KEY];

    if (typeof startTime !== 'number') {
        return undefined;
    }

    return Date.now() - startTime;
}

export function getRequestContext(
    request: RequestWithUser,
    requestId: string,
) {
    const userAgent = getUserAgent(request.headers['user-agent']);
    const forwardedFor = normalizeHeaderValue(request.headers['x-forwarded-for']);
    const realIp = normalizeHeaderValue(request.headers['x-real-ip']);

    return {
        method: request.method,
        url: request.originalUrl || request.url,
        ip: request.ip,
        forwardedFor,
        realIp,
        country: getCountry(request),
        userAgent,
        deviceType: detectDeviceType(userAgent),
        userId: request.user?.id || request.user?.sub,
        requestId,
    };
}

export function getMatchedRoute(
    request: { route?: { path?: string | string[] } },
    controllerPath?: string | string[],
): string | undefined {
    const routePath = normalizeRouteSegment(request.route?.path);

    if (routePath === undefined) {
        return undefined;
    }

    const normalizedControllerPath = normalizeRouteSegment(controllerPath);

    return joinRouteSegments('api/v1', normalizedControllerPath, routePath);
}

export function formatRequestLogLine(params: {
    statusCode: number;
    method: string;
    url: string;
    route?: string;
    durationMs: number;
    userId?: string;
    ip?: string;
    country?: string;
    deviceType?: string;
    requestId: string;
    userAgent: string;
}): string {
    const {
        statusCode,
        method,
        url,
        route,
        durationMs,
        userId,
        ip,
        country,
        deviceType,
        requestId,
        userAgent,
    } = params;

    const parts = [
        `${statusCode} ${method} ${url} ${durationMs}ms`,
        route ? `route=${route}` : undefined,
        userId ? `user=${userId}` : undefined,
        ip ? `ip=${ip}` : undefined,
        country ? `country=${country}` : undefined,
        deviceType && deviceType !== 'unknown'
            ? `device=${deviceType}`
            : undefined,
        `rid=${requestId.slice(0, 8)}`,
        userAgent !== 'unknown'
            ? `ua="${truncateUserAgent(userAgent)}"`
            : undefined,
    ].filter((part): part is string => Boolean(part));

    return parts.join(' ');
}

function getUserAgent(userAgent: HeaderValue): string {
    return normalizeHeaderValue(userAgent) || 'unknown';
}

function detectDeviceType(userAgent: string): string {
    const normalized = userAgent.toLowerCase();

    if (!normalized || normalized === 'unknown') {
        return 'unknown';
    }

    if (normalized.includes('bot') || normalized.includes('crawler')) {
        return 'bot';
    }

    if (
        normalized.includes('ipad') ||
        normalized.includes('tablet') ||
        (normalized.includes('android') && !normalized.includes('mobile'))
    ) {
        return 'tablet';
    }

    if (
        normalized.includes('mobile') ||
        normalized.includes('android') ||
        normalized.includes('iphone')
    ) {
        return 'mobile';
    }

    return 'desktop';
}

function normalizeHeaderValue(value: HeaderValue): string | undefined {
    if (Array.isArray(value)) {
        return value[0];
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
    }

    return undefined;
}

function normalizeRouteSegment(
    path?: string | string[],
): string | undefined {
    if (Array.isArray(path)) {
        return normalizeRouteSegment(path[0]);
    }

    if (!path) {
        return undefined;
    }

    const trimmedPath = path.trim();

    if (!trimmedPath) {
        return undefined;
    }

    if (trimmedPath === '/') {
        return '';
    }

    return trimmedPath.replace(/^\/+|\/+$/g, '');
}

function joinRouteSegments(...segments: Array<string | undefined>): string {
    return `/${segments.filter(Boolean).join('/')}`;
}

function getCountry(request: RequestWithUser): string | undefined {
    const normalizedIp = normalizeLookupIp(request.ip);
    const forwardedFor = normalizeHeaderValue(
        request.headers['x-forwarded-for'],
    );

    console.log('[request-context] getCountry debug', {
        requestIp: request.ip,
        normalizedIp,
        forwardedFor,
    });

    const cfIpCountry = normalizeCountryCode(
        normalizeHeaderValue(request.headers['cf-ipcountry']),
    );

    if (cfIpCountry) {
        return cfIpCountry;
    }

    if (!normalizedIp || isLoopbackIp(normalizedIp)) {
        return undefined;
    }

    return normalizeCountryCode(geoip.lookup(normalizedIp)?.country);
}

function normalizeLookupIp(ip?: string): string | undefined {
    if (!ip) {
        return undefined;
    }

    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function isLoopbackIp(ip: string): boolean {
    return ip === '127.0.0.1' || ip === '::1';
}

function normalizeCountryCode(country?: string): string | undefined {
    if (!country) {
        return undefined;
    }

    const normalizedCountry = country.trim().toUpperCase();

    return /^[A-Z]{2}$/.test(normalizedCountry)
        ? normalizedCountry
        : undefined;
}

function truncateUserAgent(userAgent: string): string {
    if (userAgent.length <= USER_AGENT_MAX_LENGTH) {
        return userAgent;
    }

    return `${userAgent.slice(0, USER_AGENT_MAX_LENGTH - 3)}...`;
}
