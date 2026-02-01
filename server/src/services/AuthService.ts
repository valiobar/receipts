import jwt from 'jsonwebtoken';
import { User, IUserDocument } from '../models';
import logger from '../config/winston';
import { env } from '../utils/env';

// JWT payload interface
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

// Login result
export interface LoginResult {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    email: string;
    roles: string[];
  };
}

// Token validation result
export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * AuthService - Manages user authentication and JWT tokens
 */
class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = env.jwtSecret || 'default-secret-change-in-production';
    this.jwtExpiresIn = env.jwtExpiresIn || '24h';
    
    if (!env.jwtSecret) {
      logger.warn('JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)');
    }
  }

  /**
   * Authenticate user and generate JWT token
   */
  async login(username: string, password: string): Promise<LoginResult> {
    // Find user by username (case-insensitive search)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).exec();

    if (!user) {
      logger.warn('Login attempt with invalid username', { 
        username,
        availableUsers: await User.find({}).select('username').lean().exec().then(users => users.map(u => u.username))
      });
      throw new Error('Invalid username or password');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      logger.warn('Login attempt with invalid password', { 
        username: user.username,
        userId: user._id.toString()
      });
      throw new Error('Invalid username or password');
    }

    // Generate JWT token
    const payload: JWTPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      roles: user.roles,
    };

    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    });

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpiresIn(this.jwtExpiresIn);

    logger.info('User logged in successfully', {
      userId: user._id,
      username: user.username,
    });

    return {
      token,
      expiresIn,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): TokenValidationResult {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      return {
        valid: true,
        payload,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid token';
      logger.debug('Token validation failed', { error: errorMessage });
      
      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Refresh JWT token (generate new token with same payload)
   */
  async refreshToken(token: string): Promise<{ token: string; expiresIn: number }> {
    const validation = this.validateToken(token);

    if (!validation.valid || !validation.payload) {
      throw new Error('Invalid or expired token');
    }

    const payload: JWTPayload = {
      userId: validation.payload.userId,
      username: validation.payload.username,
      email: validation.payload.email,
      roles: validation.payload.roles,
    };

    const newToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    });

    const expiresIn = this.parseExpiresIn(this.jwtExpiresIn);

    logger.debug('Token refreshed', {
      userId: payload.userId,
      username: payload.username,
    });

    return {
      token: newToken,
      expiresIn,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUserDocument | null> {
    return User.findById(userId).exec();
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<IUserDocument | null> {
    return User.findOne({ username }).exec();
  }

  /**
   * Parse expiresIn string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 86400; // Default to 24 hours
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 86400;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export { AuthService };
export default authService;

