import { AppDataSource } from '../config/database';
import { migrate as templateMigration } from '../migrations/01_template_content_to_messages';

async function runMigrations() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    // Run migrations in sequence
    console.log('Starting migrations...');
    
    // Template content to messages migration
    console.log('\nRunning: Template content to messages migration');
    await templateMigration();
    
    console.log('\nAll migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
