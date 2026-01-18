import winston from 'winston';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from '../utils/env';

const logsDir = path.join(__dirname, '../../logs');

// Create logger instance
const logger = winston.createLogger({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'receipts-server' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
          }
        )
      ),
    }),
    // File transport with daily rotation - error logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      level: 'error',
      maxSize: '5m',
      maxFiles: 5,
      datePattern: 'YYYY-MM-DD',
    }),
    // File transport with daily rotation - combined logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      maxSize: '5m',
      maxFiles: 5,
      datePattern: 'YYYY-MM-DD',
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
    }),
  ],
});

export default logger;

