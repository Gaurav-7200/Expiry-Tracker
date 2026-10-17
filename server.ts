import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // --- API Routes ---

  // Dashboard Stats
  app.get('/api/dashboard/stats', (_req: Request, res: Response) => {
    try {
      const stats = db.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Products
  app.get('/api/products', (_req: Request, res: Response) => {
    try {
      const products = db.getProducts();
      res.json({ success: true, data: products });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/products/barcode/:barcode', (req: Request, res: Response) => {
    try {
      const product = db.getProductByBarcode(req.params.barcode);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found with this barcode' });
      }
      res.json({ success: true, data: product });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/products', (req: Request, res: Response) => {
    try {
      const product = db.createProduct(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.put('/api/products/:id', (req: Request, res: Response) => {
    try {
      const product = db.updateProduct(req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/products/:id', (req: Request, res: Response) => {
    try {
      db.deleteProduct(req.params.id);
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Batches
  app.get('/api/batches', (_req: Request, res: Response) => {
    try {
      const batches = db.getBatches();
      res.json({ success: true, data: batches });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/batches', (req: Request, res: Response) => {
    try {
      const batch = db.createBatch(req.body);
      res.status(201).json({ success: true, data: batch });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.put('/api/batches/:id', (req: Request, res: Response) => {
    try {
      const batch = db.updateBatch(req.params.id, req.body);
      res.json({ success: true, data: batch });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/batches/:id', (req: Request, res: Response) => {
    try {
      db.deleteBatch(req.params.id);
      res.json({ success: true, message: 'Batch deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Stock Receiving Endpoint
  app.post('/api/batches/receive', (req: Request, res: Response) => {
    try {
      const result = db.receiveStock(req.body);
      res.status(201).json({
        success: true,
        message: result.isNewProduct
          ? 'New product and batch created successfully!'
          : `Stock added to existing product "${result.product.name}"!`,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Sales / POS Checkout
  app.get('/api/sales', (_req: Request, res: Response) => {
    try {
      const sales = db.getSales();
      res.json({ success: true, data: sales });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/sales/:id', (req: Request, res: Response) => {
    try {
      const sale = db.getSaleById(req.params.id);
      if (!sale) {
        return res.status(404).json({ success: false, error: 'Sale not found' });
      }
      res.json({ success: true, data: sale });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sales/checkout', (req: Request, res: Response) => {
    try {
      const sale = db.checkoutSale(req.body);
      res.status(201).json({ success: true, data: sale });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Store Settings
  app.get('/api/settings', (_req: Request, res: Response) => {
    try {
      const settings = db.getSettings();
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    try {
      const settings = db.updateSettings(req.body);
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Reset sample data
  app.post('/api/reset-data', (_req: Request, res: Response) => {
    try {
      db.resetToDefault();
      res.json({ success: true, message: 'Sample grocery inventory reset successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Vite / Frontend Serving ---
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: {
          ignored: ['**/data/**', '**/stockwise-db.json', '**/*.json', '**/.git/**'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StockWise Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server error:', err);
  process.exit(1);
});
