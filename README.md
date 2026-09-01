# Farm2Home 🌾

Farm2Home is a simple farm-to-home marketplace built with Node.js, Express, EJS and MongoDB.

## Main features

- Farmer registration and product management
- Customer product search and ordering
- Order status tracking
- Delivery partner order claiming and delivery confirmation
- MongoDB persistence
- Docker support
- Automated GitHub Actions CI

## Roles

- **Farmer:** add products, manage stock visibility, confirm/pack orders and send orders for delivery.
- **Customer:** browse/search products, place orders, view and cancel eligible orders.
- **Delivery Partner:** claim orders that are out for delivery and mark them delivered.

## Local setup

1. Install Node.js 22.
2. Create a `.env` file from `.env.example`.
3. Set `MONGODB_URI` to a local MongoDB or MongoDB Atlas connection string.
4. Run:

```powershell
npm install
npm start
```

Open `http://localhost:3000`.

For development:

```powershell
npm run dev
```

## Docker

Build:

```powershell
docker build -t farm2home .
```

Run:

```powershell
docker run --env-file .env -p 3000:3000 farm2home
```

The container needs a reachable MongoDB database. For MongoDB Atlas, put the Atlas URI in `.env`.

Health check:

`http://localhost:3000/health`

## Important security note

Do not commit `.env` or database passwords to GitHub. Use `.env.example` as the safe template.
