import { CONSTANTS } from '../config/constants';
import db from './pool';

const defaultTemplates = [
  {
    name: 'Modern',
    preview_image_path: '/templates/modern-preview.png',
    base_image_path: '/templates/modern-base.png',
    default_text_x: 400,
    default_text_y: 300,
  },
  {
    name: 'Classic',
    preview_image_path: '/templates/classic-preview.png',
    base_image_path: '/templates/classic-base.png',
    default_text_x: 350,
    default_text_y: 280,
  },
  {
    name: 'Minimalist',
    preview_image_path: '/templates/minimalist-preview.png',
    base_image_path: '/templates/minimalist-base.png',
    default_text_x: 512,
    default_text_y: 384,
  }
];

export async function seedDefaultTemplates() {
  try {
    console.log('Seeding default templates...');
    
    for (const template of defaultTemplates) {
      // First check if template already exists
      const existingQuery = `SELECT name FROM default_templates WHERE name = $1`;
      const existingResult = await db.query(existingQuery, [template.name]);
      
      if (existingResult.rows.length > 0) {
        console.log(`- Template already exists: ${template.name}`);
        continue;
      }

      const query = `
        INSERT INTO default_templates (name, preview_image_path, base_image_path, default_text_x, default_text_y, default_font_size, default_font_color, default_primary_color)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name
      `;
      
      const result = await db.query(query, [
        template.name,
        template.preview_image_path,
        template.base_image_path,
        template.default_text_x,
        template.default_text_y,
        CONSTANTS.DEFAULT_FONT_SIZE,
        CONSTANTS.DEFAULT_FONT_COLOR,
        CONSTANTS.DEFAULT_PRIMARY_COLOR
      ]);
      
      if (result.rows.length > 0) {
        console.log(`✓ Created template: ${result.rows[0].name}`);
      } else {
        console.log(`- Template already exists: ${template.name}`);
      }
    }
    
    console.log('Default templates seeded successfully!');
  } catch (error) {
    console.error('Error seeding default templates:', error);
    throw error;
  }
}

export async function runSeed() {
  try {
    await seedDefaultTemplates();
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runSeed().then(() => process.exit(0));
}
