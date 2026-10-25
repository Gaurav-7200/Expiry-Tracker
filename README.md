# StockWise — Expiry Tracker & Grocery POS

A modern Grocery Inventory Management and Point of Sale (POS) system with batch-wise tracking, barcode stock receiving, expiry alerts, and receipt printing.

---

## 📌 Clarification: Is this website made of "Lucid React"?

**No.**
- **`lucide-react` is not a web framework.** It is an open-source **icon pack library** for React (providing vector icons like `LayoutDashboard`, `ShoppingCart`, `Calendar`, `Barcode`, etc.).
- The frontend is built with **standard React 19** bundled using **Vite** and styled with **Tailwind CSS**.
- The backend is a lightweight, standalone **Node.js Express** REST API server.

---

## 📁 Project Structure

The project has been separated into clean, independent **frontend** and **backend** folders:

```text
Expiry-Tracker/
├── backend/                  # Standalone Express REST API server
│   ├── data/                 # JSON file-based database (stockwise-db.json)
│   ├── src/
│   │   ├── server.ts         # Express server with REST API routes & CORS
│   │   ├── db.ts             # Database layer (products, batches, sales, settings)
│   │   └── types.ts          # Backend TypeScript interfaces
│   ├── package.json          # Express, dotenv, tsx dependencies
│   ├── tsconfig.json         # NodeNext TypeScript configuration
│   └── .env.example          # Environment template (PORT=5000)
│
├── frontend/                 # Standard React (Vite) Single Page App
│   ├── index.html            # Entry HTML document
│   ├── vite.config.ts        # Vite config with API proxy to http://localhost:5000
│   ├── tsconfig.json         # React JSX TypeScript configuration
│   ├── package.json          # React, Tailwind, Lucide React (icons)
│   └── src/
│       ├── main.tsx          # React application root mount
│       ├── App.tsx           # Main application shell & tab navigation
│       ├── index.css         # Tailwind styles & theme tokens
│       ├── components/       # POS, Dashboard, Inventory, Expiry Tracker, etc.
│       ├── services/         # api.ts (REST client configured with proxy)
│       ├── types/            # Frontend TypeScript types
│       └── utils/            # Audio effects & helpers
│
├── package.json              # Root orchestration scripts (runs both services)
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### 1. Install All Dependencies

From the root directory:
```bash
npm run install:all
```
*(Or install in each directory individually: `cd backend && npm install`, then `cd ../frontend && npm install`)*

---

### 2. Run Both Frontend and Backend Concurrently (Recommended)

From the root directory, simply run:
```bash
npm run dev
```

This starts:
- 📡 **Backend API Server**: `http://localhost:5000`
- 💻 **Frontend Web App**: `http://localhost:5173`

The frontend automatically proxies all `/api/*` calls to `http://localhost:5000`.

---

### 3. Or Run Independently

#### Run Backend Only
```bash
npm run dev:backend
# or
cd backend
npm run dev
```

#### Run Frontend Only
```bash
npm run dev:frontend
# or
cd frontend
npm run dev
```

---

## 🛠️ Build for Production

```bash
# Build both
npm run build

# Or build frontend only
npm run build:frontend
```
The production bundle will be output to [frontend/dist](file:///c:/Users/goura/Downloads/Expiry-Tracker/frontend/dist).
