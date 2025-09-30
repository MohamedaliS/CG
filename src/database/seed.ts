import { CONSTANTS } from '../config/constants';
import db from './pool';

const defaultTemplates = [
  {
    name: 'Classic Professional',
    preview_image_path: '/public/images/default-templates/classic.png',
    base_image_path: '/public/images/default-templates/classic.png',
    default_text_x: 400,
    default_text_y: 300,
    default_font_size: 48,
    default_font_color: '#1a365d',
    default_primary_color: '#2b6cb0',
  },
  {
    name: 'Modern Elegant',
    preview_image_path: '/public/images/default-templates/modern.png',
    base_image_path: '/public/images/default-templates/modern.png',
    default_text_x: 350,
    default_text_y: 280,
    default_font_size: 52,
    default_font_color: '#2d3748',
    default_primary_color: '#805ad5',
  },
  {
    name: 'Minimalist Clean',
    preview_image_path: '/public/images/default-templates/minimalist.png',
    base_image_path: '/public/images/default-templates/minimalist.png',
    default_text_x: 512,
    default_text_y: 384,
    default_font_size: 44,
    default_font_color: '#2f855a',
    default_primary_color: '#38a169',
  },
  {
    name: 'Golden Winner',
    preview_image_path: '/public/images/default-templates/golden.png',
    base_image_path: '/public/images/default-templates/golden.png',
    default_text_x: 400,
    default_text_y: 300,
    default_font_size: 56,
    default_font_color: '#744210',
    default_primary_color: '#d69e2e',
  },
  {
    name: 'Silver Achievement',
    preview_image_path: '/public/images/default-templates/silver.png',
    base_image_path: '/public/images/default-templates/silver.png',
    default_text_x: 400,
    default_text_y: 300,
    default_font_size: 50,
    default_font_color: '#4a5568',
    default_primary_color: '#a0aec0',
  },
  {
    name: 'Bronze Participation',
    preview_image_path: '/public/images/default-templates/bronze.png',
    base_image_path: '/public/images/default-templates/bronze.png',
    default_text_x: 400,
    default_text_y: 300,
    default_font_size: 46,
    default_font_color: '#7b341e',
    default_primary_color: '#c05621',
  },
  {
    name: 'Corporate Blue',
    preview_image_path: '/public/images/default-templates/corporate.png',
    base_image_path: '/public/images/default-templates/corporate.png',
    default_text_x: 400,
    default_text_y: 320,
    default_font_size: 48,
    default_font_color: '#1e3a8a',
    default_primary_color: '#3b82f6',
  },
  {
    name: 'Academic Excellence',
    preview_image_path: '/public/images/default-templates/academic.png',
    base_image_path: '/public/images/default-templates/academic.png',
    default_text_x: 400,
    default_text_y: 300,
    default_font_size: 50,
    default_font_color: '#7c2d12',
    default_primary_color: '#dc2626',
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
        template.default_font_size,
        template.default_font_color,
        template.default_primary_color
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
