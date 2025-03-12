import { AppDataSource } from '../config/database';
import { MessageTemplate } from '../entities/MessageTemplate';

export async function migrate() {
  const templateRepo = AppDataSource.getRepository(MessageTemplate);
  
  // Get all existing templates
  const templates = await templateRepo.find();
  
  // Convert each template's content to messages array
  for (const template of templates) {
    // @ts-ignore - accessing old content field
    if (template.content && !template.messages) {
      // @ts-ignore - accessing old content field
      template.messages = [template.content];
      // @ts-ignore - accessing old content field
      delete template.content;
      await templateRepo.save(template);
    }
  }
  
  console.log(`[Migration] Successfully migrated ${templates.length} templates from content to messages`);
}
