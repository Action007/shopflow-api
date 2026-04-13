# E-Commerce NestJS API

A production-oriented e-commerce REST API built with NestJS, Prisma, and PostgreSQL.

## Tech Stack

- Runtime: NestJS 11, TypeScript, Node.js 20
- Database: PostgreSQL 15, Prisma ORM
- Auth: JWT access/refresh tokens, Passport.js, bcrypt
- Security: Helmet, CORS, throttling via `@nestjs/throttler`
- Docs: Swagger / OpenAPI
- Testing: Jest, Supertest
- DevOps: Docker, Docker Compose, GitHub Actions

## Features

- JWT authentication with refresh token rotation
- Role-based access control (`ADMIN`, `CUSTOMER`)
- Product catalog with categories
- Upload-backed product and profile images
- Pagination, sorting, filtering, and search
- Shopping cart and order placement
- Per-user wishlist with duplicate protection
- Transactional stock deduction on order creation
- Validated order status transitions
- Soft delete support
- Global response wrapper for most endpoints
- Health check endpoint with raw Terminus response
- Swagger UI at `/api/docs`

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL 15+ or Docker

### Local Development

```bash
git clone https://github.com/your-username/ecommerce-nestjs-api.git
cd ecommerce-nestjs-api
npm install
cp .env.example .env
```

Edit `.env` with your local values, then run:

```bash
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Useful URLs:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/api/v1/health`

## Docker

This project includes a production-style Docker setup for the backend and PostgreSQL.

### Run with Docker Compose

Before starting, make sure `JWT_SECRET` exists in your local `.env`.

Example:

```env
JWT_SECRET=replace-with-a-long-random-secret
DB_PASSWORD=changeme
```

Then run:

```bash
docker-compose up --build
```

Useful URLs:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/api/v1/health`
- PostgreSQL from host: `localhost:5433`

Notes:

- The app container connects to Postgres internally on `postgres:5432`.
- The host port is `5433` to avoid conflicts with a local PostgreSQL instance.

## Swagger / OpenAPI

Swagger is enabled by default.

- Swagger UI: `/api/docs`

It is useful for:
- browsing endpoints
- trying requests manually
- checking DTO schemas
- sharing API docs with frontend or QA

## API Overview

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | None | Health check in raw Terminus format |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | None | Register new user |
| POST | `/api/v1/auth/login` | None | Login with email and password |
| POST | `/api/v1/auth/refresh` | None | Refresh token pair |
| POST | `/api/v1/auth/logout` | JWT | Logout and revoke refresh tokens |

Notes:

- Auth endpoints are rate-limited.
- Passwords must meet complexity requirements.

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/users/me` | JWT | Get current user |
| GET | `/api/v1/users` | JWT + ADMIN | Get paginated user list |
| PATCH | `/api/v1/users/:id` | JWT (owner/admin) | Update user profile |
| DELETE | `/api/v1/users/:id` | JWT + ADMIN | Soft delete user |

Notes:

- `GET /users` is paginated.
- `PATCH /users/:id` accepts `imageUploadId` to attach a previously uploaded profile image.
- `UpdateUserDto` does not allow password updates.
- Password changes should be handled through a dedicated endpoint in the future.

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/categories` | None | List root categories |
| GET | `/api/v1/categories/:id` | None | Get category by ID |
| POST | `/api/v1/categories` | JWT + ADMIN | Create category |
| PATCH | `/api/v1/categories/:id` | JWT + ADMIN | Update category |
| DELETE | `/api/v1/categories/:id` | JWT + ADMIN | Soft delete category |

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/products` | None | Get paginated products |
| GET | `/api/v1/products/:id` | None | Get product by ID |
| POST | `/api/v1/products` | JWT + ADMIN | Create product |
| PATCH | `/api/v1/products/:id` | JWT + ADMIN | Update product |
| DELETE | `/api/v1/products/:id` | JWT + ADMIN | Soft delete product |

Product query params:

```text
page, limit, sortBy, sortOrder, categoryId, minPrice, maxPrice, search
```

Notes:

- Product creation currently uses `imageUploadId` rather than raw `imageUrl`.
- Product updates can also accept `imageUploadId` to replace the stored image.

### Cart

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/cart` | JWT | Get cart |
| POST | `/api/v1/cart` | JWT | Add item to cart |
| PATCH | `/api/v1/cart/:productId` | JWT | Change item quantity |
| DELETE | `/api/v1/cart/:productId` | JWT | Remove item |
| DELETE | `/api/v1/cart` | JWT | Clear cart |

Notes:

- `clearCart` is idempotent.

### Wishlist

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/wishlist` | JWT | Get or create my wishlist |
| POST | `/api/v1/wishlist` | JWT | Add a product to my wishlist |
| DELETE | `/api/v1/wishlist/:productId` | JWT | Remove a product from my wishlist |

Notes:

- Each user has exactly one wishlist.
- Duplicate wishlist entries are prevented at both service and database level.

### Uploads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/uploads/images` | JWT | Upload a pending image for later use |
| DELETE | `/api/v1/uploads/:id` | JWT (owner/admin) | Delete a pending upload |

Notes:

- Accepted image types: `jpeg`, `png`, `webp`
- Max file size: `5MB`
- Uploads start in `PENDING` status and become `USED` when attached to a product or user profile.
- Static files are served from `/uploads/:fileName`.

Example upload flow:

```text
1. POST /api/v1/uploads/images
2. Take the returned upload id
3. Send that id as imageUploadId when creating/updating a product or user profile
```

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/orders` | JWT | Place order from cart |
| GET | `/api/v1/orders` | JWT | Get my paginated orders |
| GET | `/api/v1/orders/:id` | JWT (owner/admin) | Get order by ID |
| POST | `/api/v1/orders/:id/cancel` | JWT (owner) | Cancel pending order |
| PATCH | `/api/v1/orders/:id/status` | JWT + ADMIN | Update order status |

Notes:

- Order status updates are restricted to valid transitions.

## Validation and Security

### Password Rules

Passwords must:

- be at least 8 characters
- be at most 128 characters
- contain at least 1 uppercase letter
- contain at least 1 lowercase letter
- contain at least 1 number
- contain at least 1 special character from `!@#$%^&*`

### UUID Validation

UUID route params are validated before reaching Prisma for most ID-based endpoints.

### Rate Limiting

Stricter throttling is applied to auth endpoints to reduce abuse and brute-force attempts.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret, minimum 32 characters |
| `JWT_ACCESS_EXPIRATION` | No | `3600` | Access token TTL in seconds |
| `JWT_REFRESH_EXPIRATION` | No | `604800` | Refresh token TTL in seconds |
| `APP_BASE_URL` | Yes | — | Base URL used to build public upload URLs |
| `PORT` | No | `3000` | App port |
| `NODE_ENV` | No | `development` | Runtime environment |
| `CORS_ORIGINS` | Yes | — | Comma-separated list of allowed frontend origins |
| `DB_PASSWORD` | Docker only | `changeme` | Password used by local Docker Compose Postgres |

### `.env.example`

Example:

```env
DATABASE_URL=postgresql://ecommerce_user:changeme@localhost:5432/ecommerce-nestjs
JWT_SECRET=your-secret-minimum-32-characters-long-here
JWT_ACCESS_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800
APP_BASE_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
PORT=3000
NODE_ENV=development
```

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

Notes:

- E2E tests require a reachable PostgreSQL database.
- CI runs PostgreSQL as a service container in GitHub Actions.

## Seed Data

```bash
npx prisma db seed
```

Default accounts:

- Admin: `admin@example.com` / `Password123!`
- Customer: `john@example.com` / `Password123!`
- Customer 2: `jane@example.com` / `Password123!`

## Deployment Notes

Recommended low-cost setup for a pet project:

- frontend: Vercel
- backend: Render
- database: Neon

Deployment rule:

- local development: use `.env`
- deployed environments: use environment variables in the platform dashboard

Do not commit real secrets to Git.
