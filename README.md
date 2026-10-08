Inventory Admin (Vite + React)

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

Features included:
- Login / create admin password stored in localStorage
- Records login time
- Admin dashboard with inventory table pre-populated with 65 rows
- Add product modal with image placeholder
- Quantity controls (+ / -) and status indicators

Notes:
- This is a minimal local implementation suitable for prototyping. For production, replace localStorage auth with a secure backend and persistent database.

Server (optional):

1. Install server deps and start:

```bash
cd server
npm install
npm start
```

2. The server runs on port 4000 by default and exposes simple endpoints:
- `POST /api/admin/set` — set admin password
- `POST /api/admin/login` — verify password
- `GET /api/products` — list products
- `POST /api/products` — add product
- `PUT /api/products/:id` — update product sizes

Integrate the frontend to call these endpoints instead of localStorage for persistence.
