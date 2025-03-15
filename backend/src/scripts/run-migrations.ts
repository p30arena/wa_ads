import { AppDataSource } from '../config/database';
import { migrate as templateMigration } from '../migrations/01_template_content_to_messages';
import { migrate as audienceGroupsMigration } from '../migrations/02_create_audience_groups';

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
    
    // Audience groups table migration
    console.log('\nRunning: Create audience groups table migration');
    await audienceGroupsMigration();
    
    console.log('\nAll migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
