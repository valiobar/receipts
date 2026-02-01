import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import logger from '../config/winston';
import { env } from './env';

/**
 * Seed default admin user if no users exist in the database
 * This should be called after database connection is established
 * 
 * Note: If you need to reset the admin user, simply delete it from the database
 * and restart the server - it will be recreated automatically.
 */
export const seedDefaultUser = async (): Promise<void> => {
  try {
    // Check if any users exist
    const userCount = await User.countDocuments().exec();

    if (userCount > 0) {
      logger.debug('Users already exist, skipping default user creation');
      return;
    }

    // Get default user credentials from environment variables
    const defaultUsername = env.defaultUsername || 'admin';
    const defaultEmail = env.defaultEmail || 'admin@example.com';
    const defaultPassword = env.defaultPassword || 'admin123';

    // Check if default password is still the default (security warning)
    if (defaultPassword === 'admin123') {
      logger.warn(
        'Using default password for admin user. Please change DEFAULT_USER_PASSWORD in production!'
      );
    }

    // Generate salt and hash password manually (same logic as pre-save hook)
    // This ensures both salt and hashedPass are valid before validation
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // Create default admin user with pre-hashed password
    // Use insertOne to bypass pre-save hook (which would double-hash the password)
    const result = await User.collection.insertOne({
      username: defaultUsername,
      email: defaultEmail,
      hashedPass: hashedPassword,
      salt: salt,
      roles: ['Admin'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Verify the user was created and can be found
    const createdUser = await User.findById(result.insertedId).exec();
    if (createdUser) {
      // Test password comparison to ensure it works
      const testPasswordMatch = await createdUser.comparePassword(defaultPassword);
      if (!testPasswordMatch) {
        logger.error('Password comparison test failed for seeded user!');
        throw new Error('Failed to verify seeded user password');
      }
      logger.debug('Seeded user password verification successful');
    }

    logger.info('Default admin user created successfully', {
      username: defaultUsername,
      email: defaultEmail,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error seeding default user', { error: errorMessage });
    // Don't throw - allow server to start even if seeding fails
    // This prevents blocking server startup if there's a transient issue
  }
};

