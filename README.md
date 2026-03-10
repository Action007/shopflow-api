# E-Commerce NestJS API

A production-ready e-commerce REST API built with NestJS, Prisma, and PostgreSQL.

## Tech Stack

- **Runtime:** NestJS 11, TypeScript, Node.js 20
- **Database:** PostgreSQL 15, Prisma ORM
- **Auth:** JWT (access + refresh tokens), Passport.js, bcrypt
- **Security:** Helmet, CORS, rate limiting (Throttler)
- **Testing:** Jest (unit + E2E), Supertest
- **DevOps:** Docker, Docker Compose, GitHub Actions CI

## Features

- User management with JWT authentication (access + refresh token rotation)
- Role-based access control (ADMIN / CUSTOMER)
- Product catalog with categories (self-referencing hierarchy)
- Pagination, filtering, and search
- Shopping cart
- Order placement with transactional stock deduction and race condition prevention
- Soft delete across all entities
- Consistent response wrapper (`{ success, data, timestamp }`)
- Global exception filter with Prisma error mapping
- Health check endpoint (Terminus)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm

### Local Setup

```bash
git clone https://github.com/your-username/ecommerce-nestjs-api.git
cd ecommerce-nestjs-api
npm install
cp .env.example .env   # Edit with your DB credentials
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Docker Setup

```bash
docker-compose up -d
curl http://localhost:3000/api/v1/health
```

## API Endpoints

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/health | None | Health check (Terminus format) |

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | None | Register new user |
| POST | /api/v1/auth/login | None | Login (email + password) |
| POST | /api/v1/auth/refresh | None | Refresh token pair |
| POST | /api/v1/auth/logout | JWT | Logout (invalidate all refresh tokens) |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/users/me | JWT | Get current user |
| GET | /api/v1/users | JWT + ADMIN | List all users |
| PATCH | /api/v1/users/:id | JWT (owner/admin) | Update user |
| DELETE | /api/v1/users/:id | JWT + ADMIN | Soft delete user |

### Categories
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/categories | None | List root categories |
| GET | /api/v1/categories/:id | None | Get category by ID |
| POST | /api/v1/categories | JWT + ADMIN | Create category |
| PATCH | /api/v1/categories/:id | JWT + ADMIN | Update category |
| DELETE | /api/v1/categories/:id | JWT + ADMIN | Soft delete category |

### Products
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/products | None | List products (paginated, filterable) |
| GET | /api/v1/products/:id | None | Get product by ID |
| POST | /api/v1/products | JWT + ADMIN | Create product |
| PATCH | /api/v1/products/:id | JWT + ADMIN | Update product |
| DELETE | /api/v1/products/:id | JWT + ADMIN | Soft delete product |

**Product query params:** `?page=1&limit=10&sortBy=createdAt&sortOrder=desc&categoryId=...&minPrice=10&maxPrice=100&search=keyword`

### Cart
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/cart | JWT | Get cart |
| POST | /api/v1/cart | JWT | Add item to cart |
| PATCH | /api/v1/cart/:productId | JWT | Adjust item quantity |
| DELETE | /api/v1/cart/:productId | JWT | Remove item |
| DELETE | /api/v1/cart | JWT | Clear cart |

### Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/orders | JWT | Place order (from cart) |
| GET | /api/v1/orders | JWT | Get my orders (paginated) |
| GET | /api/v1/orders/:id | JWT (owner/admin) | Get order by ID |
| POST | /api/v1/orders/:id/cancel | JWT (owner) | Cancel pending order |
| PATCH | /api/v1/orders/:id/status | JWT + ADMIN | Update order status |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| JWT_SECRET | Yes | — | JWT signing secret (min 32 chars) |
| JWT_ACCESS_EXPIRATION | No | 3600 | Access token TTL in seconds |
| JWT_REFRESH_EXPIRATION | No | 604800 | Refresh token TTL in seconds |
| PORT | No | 3000 | Server port |
| NODE_ENV | No | development | Environment |

## Testing

```bash
# Unit tests
npm test

# E2E tests (requires running PostgreSQL)
npm run test:e2e

# Coverage
npm run test:cov
```

## Seed Data

```bash
npx prisma db seed
```

Default accounts:
- **Admin:** admin@example.com / Password123!
- **Customer:** john@example.com / Password123!
- **Customer 2:** jane@example.com / Password123!