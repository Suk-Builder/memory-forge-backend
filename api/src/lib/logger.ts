import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function writeToFile(level: string, message: string, meta?: Record<string, unknown>): void {
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `${date}.log`);
  const entry = JSON.stringify({
    timestamp: getTimestamp(),
    level,
    message,
    ...(meta || {}),
  }) + '\n';
  
  fs.appendFileSync(logFile, entry);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(`[INFO] ${getTimestamp()} ${message}`);
    writeToFile('INFO', message, meta);
  },
  
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[WARN] ${getTimestamp()} ${message}`);
    writeToFile('WARN', message, meta);
  },
  
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(`[ERROR] ${getTimestamp()} ${message}`);
    writeToFile('ERROR', message, meta);
  },
  
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${getTimestamp()} ${message}`);
    }
  },
  
  request: (method: string, path: string, status: number, duration: number, ip?: string) => {
    const message = `${method} ${path} ${status} ${duration}ms`;
    logger.info(message, { method, path, status, duration, ip });
  },
};

export default logger;
