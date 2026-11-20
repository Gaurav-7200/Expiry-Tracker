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
Expiry-Tracker
│
├── backend/
│   ├── data/
│   │   └── stockwise-db.json
│   │
│   ├── src/
│   │   ├── db.js
│   │   └── server.js
│   │
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── index.html
│   └── package.json
│
├── package.json
└── README.md
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
