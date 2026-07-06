# Crypto Trading Simulator

A real-time cryptocurrency paper trading platform. Users get a virtual USD balance
and trade against live prices streamed from Binance, with real-time updates
delivered over Socket.IO.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-Time:** Socket.IO + Binance WebSocket API
- **Auth:** JWT + Refresh Token Rotation
- **Database:** PostgreSQL + Prisma
- **Cache / Pub-Sub:** Redis (ioredis)
- **Validation:** Zod
- **Financial Math:** Decimal.js
- **Security:** Helmet, express-rate-limit, bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (optional, for one-command setup)

### Local Setup

```bash
npm install
cp .env.example .env   # edit values as needed
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Verify it's running:

```bash
curl http://localhost:5000/health
```

### Docker Setup

```bash
docker-compose up -d
```

This spins up Postgres, Redis, and the app, running migrations automatically.

## API Overview

| Area        | Base Path             |
|-------------|------------------------|
| Auth        | `/api/auth`            |
| Trading     | `/api/trade`           |
| Portfolio   | `/api/portfolio`       |
| Watchlist   | `/api/watchlist`       |
| Market Data | `/api/prices`          |
| Leaderboard | `/api/leaderboard`     |
| Admin       | `/api/admin`           |

See the original build documentation for full endpoint details, request/response
shapes, and architectural rationale.

## Example Requests

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "email": "trader@example.com", "password": "securepass123" }'

# Buy
curl -X POST http://localhost:5000/api/trade/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "symbol": "BTCUSDT", "quantity": 0.01 }'
```

## WebSocket Client

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_ACCESS_TOKEN' }
});

socket.on('connected', console.log);
socket.emit('subscribe:symbol', 'BTCUSDT');
socket.on('price:update', (data) => console.log(data));
```

## Notes

- The first admin user must currently be promoted manually in the database
  (e.g. via `npx prisma studio`, setting `role` to `ADMIN`), since there is no
  public "make me admin" endpoint by design.
- All monetary values are stored as `DECIMAL(18,8)` and computed with
  Decimal.js to avoid floating-point rounding errors.
- The in-memory price registry means each running instance needs the Binance
  feed connected; Redis Pub/Sub is used so multiple instances can share
  consistent broadcasts to clients.
