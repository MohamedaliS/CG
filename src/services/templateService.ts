import { DefaultTemplateQueries, TemplateQueries } from '../database/queries';
import { DefaultTemplate, Template, TemplateCustomization, TemplateWithDefault } from '../types/template';
import { CONSTANTS } from '../config/constants';
import fs from 'fs/promises';
import path from 'path';

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

  static async validateImageFile(fileBuffer: Buffer, maxSize: number = 10 * 1024 * 1024): Promise<boolean> {
    // Check file size
    if (fileBuffer.length > maxSize) {
      throw new Error('File size exceeds maximum allowed limit');
    }

    // Check if it's a valid image (basic check by looking at file headers)
    const imageSignatures = [
      [0xFF, 0xD8, 0xFF], // JPEG
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0x47, 0x49, 0x46], // GIF
      [0x42, 0x4D], // BMP
    ];

    const isValidImage = imageSignatures.some(signature => {
      return signature.every((byte, index) => fileBuffer[index] === byte);
    });

    if (!isValidImage) {
      throw new Error('Invalid image file format. Only JPEG, PNG, GIF, and BMP are allowed.');
    }

    return true;
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
