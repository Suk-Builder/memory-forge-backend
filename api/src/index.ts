import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { config, validateConfig } from '@/config';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { globalRateLimit } from '@/middleware/rateLimit';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { authRateLimit } from '@/middleware/rateLimit';

// Route imports
import authRegisterRoutes from '@/routes/auth';
import authLoginRoutes from '@/routes/auth.login';
import authUserRoutes from '@/routes/auth.user';
import personalityCreateRoutes from '@/routes/personalities.create';
import personalityListRoutes from '@/routes/personalities.list';
import personalityDetailRoutes from '@/routes/personalities.detail';
import exportRoutes from '@/routes/export';
import chatRoutes from '@/routes/chat';
import chatCompleteRoutes from '@/routes/chat.complete';
import conversationRoutes from '@/routes/conversations';
import templateListRoutes from '@/routes/templates.list';
import templateUseRoutes from '@/routes/templates.use';

dotenv.config();
validateConfig();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
}));

// Rate limiting
app.use(globalRateLimit);

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

// Auth routes — mount at /api/auth so internal /register, /login paths resolve correctly
app.use('/api/auth', authRateLimit, authRegisterRoutes);
app.use('/api/auth', authRateLimit, authLoginRoutes);
app.use('/api/auth', authUserRoutes);

// Personality routes — order matters: more-specific paths (export) before generic :id
app.use('/api/personalities', personalityCreateRoutes);
app.use('/api/personalities', personalityListRoutes);
app.use('/api/personalities', exportRoutes);
app.use('/api/personalities', personalityDetailRoutes);

// Chat routes — order matters: more-specific /:personalityId/complete before generic /:personalityId
app.use('/api/chat', chatCompleteRoutes);
app.use('/api/chat', chatRoutes);

// Conversation routes
app.use('/api/conversations', conversationRoutes);

// Template routes
app.use('/api/templates', templateListRoutes);
app.use('/api/templates', templateUseRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(config.port, () => {
  logger.info(`Memory Forge API running on port ${config.port}`, {
    environment: config.nodeEnv,
    port: config.port,
  });
});
