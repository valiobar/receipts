import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EnvConfig {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  webhookIps: string[];
  defaultUsername?: string;
  defaultEmail?: string;
  defaultPassword?: string;
}

const validateEnv = (): EnvConfig => {
  const requiredVars = {
    MONGODB_URI: process.env.MONGODB_URI,
  };

  const missing: string[] = [];
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  const webhookIps = process.env.WEBHOOK_IPS
    ? process.env.WEBHOOK_IPS.split(',').map((ip) => ip.trim())
    : [];
  const defaultUsername = process.env.DEFAULT_USER_USERNAME;
  const defaultEmail = process.env.DEFAULT_USER_EMAIL;
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD;

  return {
    nodeEnv,
    port,
    mongodbUri: process.env.MONGODB_URI!,
    jwtSecret,
    jwtExpiresIn,
    webhookIps,
    defaultUsername,
    defaultEmail,
    defaultPassword,
  };
};

export const env = validateEnv();

