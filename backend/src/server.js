import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './db.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 5000;
// Body parsing
app.use(express.json());
// CORS headers for decoupled frontend client
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
// Request logger
app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
        console.log(`[API] ${req.method} ${req.url}`);
    }
    next();
});
// --- API Routes ---
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'StockWise Backend API', timestamp: new Date().toISOString() });
});
// Dashboard Stats
app.get('/api/dashboard/stats', (_req, res) => {
    try {
        const stats = db.getDashboardStats();
        res.json({ success: true, data: stats });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Products
app.get('/api/products', (_req, res) => {
    try {
        const products = db.getProducts();
        res.json({ success: true, data: products });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.get('/api/products/barcode/:barcode', (req, res) => {
    try {
        let rawBarcode = req.params.barcode || '';
        try {
            rawBarcode = decodeURIComponent(rawBarcode);
        } catch (e) {}
        const cleanBarcode = String(rawBarcode).trim();
        const product = db.getProductByBarcode(cleanBarcode);
        if (!product) {
            return res.status(404).json({ success: false, error: `Product not found with barcode "${cleanBarcode}"` });
        }
        res.json({ success: true, data: product });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/products', (req, res) => {
    try {
        const product = db.createProduct(req.body);
        res.status(201).json({ success: true, data: product });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.put('/api/products/:id', (req, res) => {
    try {
        const product = db.updateProduct(req.params.id, req.body);
        res.json({ success: true, data: product });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.delete('/api/products/:id', (req, res) => {
    try {
        db.deleteProduct(req.params.id);
        res.json({ success: true, message: 'Product deleted successfully' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// Batches
app.get('/api/batches', (_req, res) => {
    try {
        const batches = db.getBatches();
        res.json({ success: true, data: batches });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/batches', (req, res) => {
    try {
        const batch = db.createBatch(req.body);
        res.status(201).json({ success: true, data: batch });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.put('/api/batches/:id', (req, res) => {
    try {
        const batch = db.updateBatch(req.params.id, req.body);
        res.json({ success: true, data: batch });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.delete('/api/batches/:id', (req, res) => {
    try {
        db.deleteBatch(req.params.id);
        res.json({ success: true, message: 'Batch deleted successfully' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// Stock Receiving Endpoint
app.post('/api/batches/receive', (req, res) => {
    try {
        const result = db.receiveStock(req.body);
        res.status(201).json({
            success: true,
            message: result.isNewProduct
                ? 'New product and batch created successfully!'
                : `Stock added to existing product "${result.product.name}"!`,
            data: result,
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// Sales / POS Checkout
app.get('/api/sales', (_req, res) => {
    try {
        const sales = db.getSales();
        res.json({ success: true, data: sales });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.get('/api/sales/:id', (req, res) => {
    try {
        const sale = db.getSaleById(req.params.id);
        if (!sale) {
            return res.status(404).json({ success: false, error: 'Sale not found' });
        }
        res.json({ success: true, data: sale });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/sales/checkout', (req, res) => {
    try {
        const sale = db.checkoutSale(req.body);
        res.status(201).json({ success: true, data: sale });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// Store Settings
app.get('/api/settings', (_req, res) => {
    try {
        const settings = db.getSettings();
        res.json({ success: true, data: settings });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.put('/api/settings', (req, res) => {
    try {
        const settings = db.updateSettings(req.body);
        res.json({ success: true, data: settings });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// Reset sample data
app.post('/api/reset-data', (_req, res) => {
    try {
        db.resetToDefault();
        res.json({ success: true, message: 'Sample grocery inventory reset successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Optional static serve for frontend production build
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api'))
            return next();
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StockWise Backend running at http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api/`);
});
