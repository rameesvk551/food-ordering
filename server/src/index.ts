import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db';
import { env } from './config/env';

import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import customerRoutes from './routes/customer.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import publicRoutes from './routes/public.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// CORS configuration
app.use(cors({
  origin: true, // Echoes the Origin header (required for credentials: true)
  credentials: true,
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);


// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`🚀 Server running on port ${env.port}`);
    console.log(`📡 Environment: ${env.nodeEnv}`);
  });
};

startServer().catch(console.error);

export default app;
