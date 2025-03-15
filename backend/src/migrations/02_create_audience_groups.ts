import { AppDataSource } from '../config/database';
import { Table } from 'typeorm';

export async function migrate() {
    const queryRunner = AppDataSource.createQueryRunner();
    
    console.log('[Migration] Creating audience_groups table');
    
    try {
        await queryRunner.createTable(
            new Table({
                name: "audience_groups",
                columns: [
                    {
                        name: "id",
                        type: "integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "name",
                        type: "varchar",
                    },
                    {
                        name: "contacts",
                        type: "text",
                    },
                    {
                        name: "groups",
                        type: "text",
                    },
                    {
                        name: "created_at",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );
        
        console.log('[Migration] Successfully created audience_groups table');
    } catch (error) {
        console.error('[Migration] Failed to create audience_groups table:', error);
        throw error;
    } finally {
        await queryRunner.release();
    }
}
