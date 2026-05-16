import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log error
  logger.error(err.message, {
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({
      success: false,
      error: `验证失败: ${messages}`,
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ') || '字段';
      res.status(409).json({
        success: false,
        error: `${field} 已存在`,
      });
      return;
    }
    
    // Record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: '记录不存在',
      });
      return;
    }
    
    // Foreign key constraint
    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: '关联记录不存在',
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: '数据格式不正确',
    });
    return;
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

// 404 handler
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `接口不存在: ${req.method} ${req.path}`,
  });
}
