import { DefaultTemplateQueries, TemplateQueries } from '../database/queries';
import { DefaultTemplate, Template, TemplateCustomization, TemplateWithDefault } from '../types/template';
import { CONSTANTS } from '../config/constants';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export class TemplateService {
  
  static async getDefaultTemplates(): Promise<DefaultTemplate[]> {
    return await DefaultTemplateQueries.findAll();
  }

  static async getDefaultTemplateById(id: string): Promise<DefaultTemplate | null> {
    return await DefaultTemplateQueries.findById(id);
  }

  static async getUserTemplates(userId: string): Promise<TemplateWithDefault[]> {
    const templates = await TemplateQueries.findByUserId(userId);
    
    return templates.map(template => ({
      ...template,
      default_template: template.default_template_name ? {
        id: template.default_template_id!,
        name: template.default_template_name,
        preview_image_path: '',
        base_image_path: template.default_base_image_path,
        default_text_x: template.text_x_position,
        default_text_y: template.text_y_position,
        default_font_size: template.font_size,
        default_font_color: template.font_color,
        default_primary_color: template.primary_color,
        is_active: true,
      } : undefined,
    }));
  }

  static async getTemplateById(id: string): Promise<TemplateWithDefault | null> {
    const template = await TemplateQueries.findById(id);
    if (!template) return null;

    return {
      ...template,
      default_template: template.default_template_name ? {
        id: template.default_template_id!,
        name: template.default_template_name,
        preview_image_path: '',
        base_image_path: template.default_base_image_path,
        default_text_x: template.text_x_position,
        default_text_y: template.text_y_position,
        default_font_size: template.font_size,
        default_font_color: template.font_color,
        default_primary_color: template.primary_color,
        is_active: true,
      } : undefined,
    };
  }

  static async createTemplateFromDefault(
    userId: string, 
    defaultTemplateId: string, 
    customization: TemplateCustomization
  ): Promise<Template> {
    // Verify default template exists
    const defaultTemplate = await DefaultTemplateQueries.findById(defaultTemplateId);
    if (!defaultTemplate) {
      throw new Error('Default template not found');
    }

    const templateData = {
      user_id: userId,
      template_type: 'default' as const,
      default_template_id: defaultTemplateId,
      custom_image_path: null,
      logo_path: customization.logo || null,
      primary_color: customization.primary_color,
      text_x_position: customization.text_x_position,
      text_y_position: customization.text_y_position,
      font_size: customization.font_size,
      font_color: customization.font_color,
      font_family: customization.font_family,
    };

    return await TemplateQueries.create(templateData);
  }

  static async createCustomTemplate(
    userId: string, 
    customImagePath: string, 
    customization: TemplateCustomization
  ): Promise<Template> {
    const templateData = {
      user_id: userId,
      template_type: 'custom' as const,
      default_template_id: null,
      custom_image_path: customImagePath,
      logo_path: customization.logo || null,
      primary_color: customization.primary_color,
      text_x_position: customization.text_x_position,
      text_y_position: customization.text_y_position,
      font_size: customization.font_size,
      font_color: customization.font_color,
      font_family: customization.font_family,
    };

    return await TemplateQueries.create(templateData);
  }

  static async saveUploadedFile(fileBuffer: Buffer, originalName: string, uploadDir: string): Promise<string> {
    // Create upload directory if it doesn't exist
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    await fs.writeFile(filePath, fileBuffer);

    return filePath;
  }

  static async validateImageFile(buffer: Buffer): Promise<void> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image format');
      }
      
      // Check dimensions (reasonable limits)
      if (metadata.width > 4096 || metadata.height > 4096) {
        throw new Error('Image dimensions too large');
      }
      
      if (metadata.width < 100 || metadata.height < 100) {
        throw new Error('Image dimensions too small');
      }
      
    } catch (error) {
      throw new Error('Invalid image file');
    }
  }

  static async generatePreviewImage(template: DefaultTemplate): Promise<Buffer> {
    try {
      // Create a base canvas
      const width = 800;
      const height = 600;
      
      // Get theme colors based on template name
      const themeConfig = this.getThemeConfig(template.name);
      
      // Create the base image with template styling
      const baseImage = sharp({
        create: {
          width,
          height,
          channels: 3,
          background: themeConfig.backgroundColor
        }
      });

      // Generate SVG content for the certificate preview
      const svgContent = this.generatePreviewSVG(template, themeConfig, width, height);
      
      // Composite the SVG onto the base image
      const previewImage = await baseImage
        .composite([
          {
            input: Buffer.from(svgContent),
            top: 0,
            left: 0
          }
        ])
        .png()
        .toBuffer();

      return previewImage;
    } catch (error) {
      console.error('Error generating preview image:', error);
      // Return a simple fallback image
      return await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: '#f7fafc'
        }
      }).png().toBuffer();
    }
  }

  private static getThemeConfig(templateName: string) {
    const themes: Record<string, any> = {
      'Golden Winner': {
        backgroundColor: '#fef5e7',
        borderColor: '#d69e2e',
        primaryColor: '#d69e2e',
        fontColor: '#744210',
        accentColor: '#f6ad55'
      },
      'Silver Achievement': {
        backgroundColor: '#f7fafc',
        borderColor: '#a0aec0',
        primaryColor: '#718096',
        fontColor: '#2d3748',
        accentColor: '#cbd5e0'
      },
      'Bronze Participation': {
        backgroundColor: '#faf5f0',
        borderColor: '#c05621',
        primaryColor: '#c05621',
        fontColor: '#7b341e',
        accentColor: '#ed8936'
      },
      'Academic Excellence': {
        backgroundColor: '#ebf8ff',
        borderColor: '#2b6cb0',
        primaryColor: '#2b6cb0',
        fontColor: '#1a365d',
        accentColor: '#4299e1'
      },
      'Corporate Blue': {
        backgroundColor: '#f0f9ff',
        borderColor: '#1e40af',
        primaryColor: '#1e40af',
        fontColor: '#1e3a8a',
        accentColor: '#3b82f6'
      },
      'Modern Elegant': {
        backgroundColor: '#faf5ff',
        borderColor: '#805ad5',
        primaryColor: '#805ad5',
        fontColor: '#553c9a',
        accentColor: '#9f7aea'
      },
      'Classic Professional': {
        backgroundColor: '#f7fafc',
        borderColor: '#2d3748',
        primaryColor: '#2d3748',
        fontColor: '#1a202c',
        accentColor: '#4a5568'
      },
      'Minimalist Clean': {
        backgroundColor: '#f0fff4',
        borderColor: '#38a169',
        primaryColor: '#38a169',
        fontColor: '#2f855a',
        accentColor: '#68d391'
      }
    };

    return themes[templateName] || themes['Classic Professional'];
  }

  private static generatePreviewSVG(template: DefaultTemplate, themeConfig: any, width: number, height: number): string {
    const certificateTitle = this.getCertificateTitle(template.name);
    const completionText = this.getCompletionText(template.name);
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="100%" height="100%" fill="${themeConfig.backgroundColor}"/>
        
        <!-- Border -->
        <rect x="30" y="30" width="${width - 60}" height="${height - 60}" 
              fill="none" stroke="${themeConfig.borderColor}" stroke-width="4" rx="10"/>
        
        <!-- Inner decorative border -->
        <rect x="50" y="50" width="${width - 100}" height="${height - 100}" 
              fill="none" stroke="${themeConfig.accentColor}" stroke-width="2" rx="5"/>
        
        <!-- Header decoration -->
        <rect x="100" y="80" width="${width - 200}" height="3" fill="${themeConfig.primaryColor}"/>
        
        <!-- Certificate Title -->
        <text x="50%" y="140" text-anchor="middle" 
              font-family="serif" font-size="36" font-weight="bold" 
              fill="${themeConfig.primaryColor}">${certificateTitle}</text>
        
        <!-- Subtitle -->
        <text x="50%" y="180" text-anchor="middle" 
              font-family="sans-serif" font-size="14" 
              fill="${themeConfig.fontColor}" opacity="0.8">This certifies that</text>
        
        <!-- Sample Name -->
        <text x="50%" y="240" text-anchor="middle" 
              font-family="serif" font-size="28" font-weight="bold" 
              fill="${themeConfig.fontColor}">John Doe</text>
        
        <!-- Completion Text -->
        <text x="50%" y="280" text-anchor="middle" 
              font-family="sans-serif" font-size="14" 
              fill="${themeConfig.fontColor}" opacity="0.8">${completionText}</text>
        
        <!-- Course Name -->
        <text x="50%" y="340" text-anchor="middle" 
              font-family="serif" font-size="20" font-weight="600" 
              fill="${themeConfig.fontColor}">Advanced Web Development</text>
        
        <!-- Recognition Text (for winner/achievement templates) -->
        ${template.name.includes('Winner') || template.name.includes('Achievement') ? `
        <text x="50%" y="380" text-anchor="middle" 
              font-family="sans-serif" font-size="12" font-style="italic" 
              fill="${themeConfig.primaryColor}">🏆 Outstanding Performance</text>
        ` : ''}
        
        <!-- Date -->
        <text x="50%" y="480" text-anchor="middle" 
              font-family="sans-serif" font-size="12" 
              fill="${themeConfig.fontColor}" opacity="0.7">October 1, 2025</text>
        
        <!-- Footer decoration -->
        <rect x="100" y="520" width="${width - 200}" height="2" fill="${themeConfig.primaryColor}"/>
        
        <!-- Template Name -->
        <text x="50%" y="550" text-anchor="middle" 
              font-family="sans-serif" font-size="10" 
              fill="${themeConfig.fontColor}" opacity="0.5">${template.name}</text>
      </svg>
    `;
  }

  private static getCertificateTitle(templateName: string): string {
    const titles: Record<string, string> = {
      'Golden Winner': 'Certificate of Excellence',
      'Silver Achievement': 'Achievement Award',
      'Bronze Participation': 'Certificate of Participation',
      'Academic Excellence': 'Academic Excellence Award',
      'Corporate Blue': 'Professional Achievement',
      'Modern Elegant': 'Certificate of Achievement',
      'Classic Professional': 'Certificate of Completion',
      'Minimalist Clean': 'Certificate of Merit'
    };
    
    return titles[templateName] || 'Certificate of Achievement';
  }

  private static getCompletionText(templateName: string): string {
    const texts: Record<string, string> = {
      'Golden Winner': 'has demonstrated exceptional excellence in',
      'Silver Achievement': 'has achieved outstanding performance in',
      'Bronze Participation': 'has successfully participated in',
      'Academic Excellence': 'has excelled academically in',
      'Corporate Blue': 'has successfully completed the professional program',
      'Modern Elegant': 'has successfully completed',
      'Classic Professional': 'has successfully completed',
      'Minimalist Clean': 'has demonstrated proficiency in'
    };
    
    return texts[templateName] || 'has successfully completed';
  }

  static getTemplateImagePath(template: TemplateWithDefault): string {
    let imagePath: string;
    
    if (template.template_type === 'custom' && template.custom_image_path) {
      imagePath = template.custom_image_path;
    } else if (template.default_template?.base_image_path) {
      imagePath = template.default_template.base_image_path;
    } else {
      throw new Error('Template image path not found');
    }

    // Convert web path to file system path
    if (imagePath.startsWith('/public/')) {
      return path.join(process.cwd(), imagePath.substring(1)); // Remove leading slash
    }
    
    return imagePath;
  }

  static getDefaultSettings(defaultTemplate: DefaultTemplate) {
    return {
      primary_color: defaultTemplate.default_primary_color,
      text_x_position: defaultTemplate.default_text_x,
      text_y_position: defaultTemplate.default_text_y,
      font_size: defaultTemplate.default_font_size,
      font_color: defaultTemplate.default_font_color,
      font_family: CONSTANTS.DEFAULT_FONT_FAMILY,
    };
  }
}
