# Gaia Agro Industries — Backend

REST API powering the Gaia Agro Industries storefront and admin dashboard: an e‑commerce backend for a herbal/tea product catalog with orders, coupons, categories, customers, and sales analytics.

## Stack

| Concern       | Choice                                              |
|---------------|------------------------------------------------------|
| Runtime       | Node.js (ESM interop via `tsx`)                       |
| Language      | TypeScript 7 (strict mode)                            |
| HTTP          | Express 5                                             |
| Database      | PostgreSQL                                            |
| ORM           | Prisma 7 (`@prisma/client` + `@prisma/adapter-pg` driver adapter) |
| Auth          | JWT (`jsonwebtoken`) + `bcryptjs` password hashing     |
| File uploads  | `multer` (disk storage, served as static files)        |
| Dev loop      | `tsx watch`                                           |

Prisma 7 uses the **driver adapter** pattern (no more implicit `DATABASE_URL` binary engine) — the `pg` adapter is wired explicitly in [`src/db.ts`](src/db.ts), and schema/migration config lives in [`prisma.config.ts`](prisma.config.ts) rather than inline in `schema.prisma`.

## Project layout

```
prisma/
  schema.prisma        # data model (see below)
  migrations/           # generated SQL migrations
  seed.ts               # dev seed: admin user + sample product catalog
src/
  index.ts              # app entrypoint — middleware & route mounting
  db.ts                 # PrismaClient singleton (pg adapter)
  middleware/
    auth.ts              # requireAuth — verifies Bearer JWT, sets req.adminId
  routes/
    auth.ts               # admin login / session
    products.ts            # product catalog CRUD
    categories.ts          # category CRUD
    orders.ts               # checkout + order management
    coupons.ts               # discount codes + validation
    customers.ts              # derived customer list (aggregated from orders)
    dashboard.ts               # admin stats & analytics
    settings.ts                 # key/value store settings
    upload.ts                    # image upload endpoint
  generated/prisma/        # Prisma Client output (generated, not hand-edited)
uploads/                # multer upload destination, served at /uploads
```

There is a single Express app with no service/repository layer — routes talk to Prisma directly. This is intentional for a project of this size; if it grows, pull query logic out of routes before adding a second consumer of the same query.

## Data model

Defined in [`prisma/schema.prisma`](prisma/schema.prisma):

- **AdminUser** — dashboard operators. Email/password login only, no roles/permissions yet.
- **Category** ↔ **Product** — one-to-many. Products also carry a denormalized `category` string field alongside the FK `categoryId` (legacy/display field — be careful keeping the two in sync when editing product routes).
- **Product** — catalog item. Price is stored twice: `price` (formatted display string, e.g. `"GH₵ 25.00"`) and `priceValue` (float, used for all calculations). `stockQty` drives the dashboard's low-stock widget (< 20 units).
- **Order** → **OrderItem** → **Product** — order line items snapshot `unitPrice` at purchase time (decoupled from live product price). `OrderStatus` is an enum: `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`, or `CANCELLED`.
- **Coupon** — `PERCENTAGE` or `FIXED` discount, optional `minOrder`, `maxUses`, `expiresAt`.
- **StoreSetting** — generic `key`/`value` string store for storefront configuration.

No cart/session model — the storefront is expected to hold cart state client-side and post a fully-formed order.

## Auth model

Single-tier admin auth, no customer accounts:

1. `POST /api/auth/login` verifies email/password against `AdminUser` and returns a JWT (7-day expiry) signed with `JWT_SECRET`.
2. Protected routes use the `requireAuth` middleware ([`src/middleware/auth.ts`](src/middleware/auth.ts)), which expects `Authorization: Bearer <token>` and attaches `req.adminId`.
3. There's no refresh-token flow — clients re-login after expiry.

Public (no-auth) endpoints are the storefront-facing ones: browsing products/categories, placing an order, validating a coupon.

## API surface

Base path: `/api`. All bodies/responses are JSON unless noted.

| Method & Path | Auth | Notes |
|---|---|---|
| `POST /auth/login` | — | `{ email, password }` → `{ token, admin }` |
| `GET /auth/me` | ✓ | current admin profile |
| `GET /products` | — | list all |
| `GET /products/:idOrSlug` | — | lookup by id or slug |
| `POST /products` | ✓ | create |
| `PUT /products/:id` | ✓ | update |
| `DELETE /products/:id` | ✓ | delete |
| `GET /categories` | — | list, with product counts |
| `GET /categories/:idOrSlug` | — | lookup by id or slug |
| `POST /categories` | ✓ | create (slug auto-derived from name) |
| `PUT /categories/:id` | ✓ | update |
| `DELETE /categories/:id` | ✓ | delete |
| `POST /orders` | — | place an order; server recomputes `totalAmount` from live product prices |
| `GET /orders` | ✓ | list all, with items |
| `GET /orders/:id` | ✓ | single order |
| `PATCH /orders/:id/status` | ✓ | transition `OrderStatus` |
| `GET /coupons` | ✓ | list |
| `POST /coupons` | ✓ | create |
| `PUT /coupons/:id` | ✓ | update |
| `DELETE /coupons/:id` | ✓ | delete |
| `POST /coupons/validate` | — | `{ code, orderTotal }` → `{ coupon, discount }`, enforces expiry/usage/min-order |
| `GET /customers` | ✓ | derived list, aggregated by email from `Order` rows (no dedicated Customer table) |
| `GET /dashboard/stats` | ✓ | totals, revenue, status breakdown, recent orders, low-stock products |
| `GET /dashboard/analytics` | ✓ | revenue/orders by month, top products, orders by region |
| `GET /settings` | ✓ | all store settings as `{ key: value }` |
| `PUT /settings` | ✓ | upserts each key in the request body |
| `POST /upload` | ✓ | multipart `image` field → `{ url }`; 5MB limit, jpeg/png/webp/gif only |
| `GET /health` | — | liveness probe |

Error conventions: `400` for bad input, `401` for auth failures, `404` when a record isn't found (Prisma `P2025`), `409` on unique constraint violations (Prisma `P2002`). Uncaught errors currently fall through to Express's default handler — there is no centralized error middleware.

## Getting started

### Prerequisites
- Node.js
- A PostgreSQL database

### Environment variables

Create a `.env` in the project root (already gitignored):

```
DATABASE_URL="postgresql://user:password@localhost:5432/gaia_agro"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=4000
```

### Install & run

```bash
npm install
npm run db:migrate   # apply Prisma migrations
npm run seed          # optional: seed an admin user + sample catalog
npm run dev            # tsx watch — starts on PORT (default 4000)
```

Seeded admin credentials (dev only, from `prisma/seed.ts`): `admin@gaiaagro.com` / `admin123`. **Rotate or remove before any shared/staging deployment.**

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Watch mode via `tsx` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output (`dist/index.js`) |
| `npm run seed` | Run `prisma/seed.ts` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:generate` | Regenerate Prisma Client into `src/generated/prisma` |

## CORS

Currently hardcoded in `src/index.ts` to `http://localhost:3000` / `:3001` for local frontend dev. **Update this allowlist before deploying** — it will silently block any other origin, including your production frontend domain.

## Known rough edges / things to watch

- `Product.category` (string) and `Product.categoryId` (FK) are both writable independently via the product routes — nothing enforces they stay consistent.
- `requireAuth` has no role/permission granularity — any valid admin token can hit every protected route.
- Static uploads are served directly from disk (`/uploads`) with no auth or CDN — fine for a small admin-managed catalog, worth revisiting if uploads scale or need access control.
- No rate limiting on `/auth/login` or `/coupons/validate`.
- No automated test suite yet.
