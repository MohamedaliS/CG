import { DefaultTemplateQueries, TemplateQueries } from '../database/queries';
import { DefaultTemplate, Template, TemplateCustomization, TemplateWithDefault } from '../types/template';
import { CONSTANTS } from '../config/constants';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// Enhanced template configuration interface
interface EnhancedTemplateConfig {
  template: string;
  recipientName: string;
  title: string;
  subtitle: string;
  description: string;
  date: string;
  signature: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  showBadge: boolean;
  badgeText: string;
  badgeIcon: string;
  borderStyle: string;
  logoText: string;
  showLogo: boolean;
  logoPosition: string;
  logoImage?: string;
  logoSize: string;
}

// Certificate session interface
interface CertificateSession {
  id: string;
  user_id: string;
  session_data: EnhancedTemplateConfig;
  template_id?: string;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

// Template preset interface
interface TemplatePreset {
  id: string;
  name: string;
  category: string;
  config: Record<string, any>;
  is_active: boolean;
  created_at: Date;
}

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

  // Enhanced certificate builder methods
  static getTemplatePresets(): TemplatePreset[] {
    return [
      {
        id: 'modern',
        name: 'Modern Wave',
        category: 'theme',
        config: {
          primaryColor: '#0891b2',
          secondaryColor: '#fbbf24',
          accentColor: '#1e293b',
          borderStyle: 'modern',
          badgeIcon: 'award',
          fontFamily: 'serif'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'elegant',
        name: 'Elegant Purple',
        category: 'theme',
        config: {
          primaryColor: '#7c3aed',
          secondaryColor: '#f97316',
          accentColor: '#1e293b',
          borderStyle: 'ornate',
          badgeIcon: 'crown',
          fontFamily: 'serif'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'professional',
        name: 'Professional Blue',
        category: 'theme',
        config: {
          primaryColor: '#0284c7',
          secondaryColor: '#eab308',
          accentColor: '#1e293b',
          borderStyle: 'minimal',
          badgeIcon: 'shield',
          fontFamily: 'sans'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'classic',
        name: 'Classic Gold',
        category: 'theme',
        config: {
          primaryColor: '#ca8a04',
          secondaryColor: '#dc2626',
          accentColor: '#1e293b',
          borderStyle: 'ornate',
          badgeIcon: 'trophy',
          fontFamily: 'serif'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'bold',
        name: 'Bold Dark',
        category: 'theme',
        config: {
          primaryColor: '#0d9488',
          secondaryColor: '#fbbf24',
          accentColor: '#1e293b',
          borderStyle: 'modern',
          badgeIcon: 'star',
          fontFamily: 'sans'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'vibrant',
        name: 'Vibrant Multi',
        category: 'theme',
        config: {
          primaryColor: '#059669',
          secondaryColor: '#dc2626',
          accentColor: '#1e293b',
          borderStyle: 'modern',
          badgeIcon: 'hexagon',
          fontFamily: 'sans'
        },
        is_active: true,
        created_at: new Date()
      }
    ];
  }

  static getColorPresets(): TemplatePreset[] {
    return [
      {
        id: 'blue',
        name: 'Blue Professional',
        category: 'color',
        config: {
          primaryColor: '#3b82f6',
          secondaryColor: '#1e40af',
          accentColor: '#1e293b'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'red',
        name: 'Red Energy',
        category: 'color',
        config: {
          primaryColor: '#ef4444',
          secondaryColor: '#dc2626',
          accentColor: '#1e293b'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'green',
        name: 'Green Growth',
        category: 'color',
        config: {
          primaryColor: '#10b981',
          secondaryColor: '#059669',
          accentColor: '#1e293b'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'purple',
        name: 'Purple Elegance',
        category: 'color',
        config: {
          primaryColor: '#8b5cf6',
          secondaryColor: '#7c3aed',
          accentColor: '#1e293b'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'orange',
        name: 'Orange Warmth',
        category: 'color',
        config: {
          primaryColor: '#f59e0b',
          secondaryColor: '#d97706',
          accentColor: '#1e293b'
        },
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'teal',
        name: 'Teal Modern',
        category: 'color',
        config: {
          primaryColor: '#14b8a6',
          secondaryColor: '#0d9488',
          accentColor: '#1e293b'
        },
        is_active: true,
        created_at: new Date()
      }
    ];
  }

  static getBadgeIcons(): Record<string, { icon: string; label: string }> {
    return {
      award: { icon: 'award', label: 'Award' },
      star: { icon: 'star', label: 'Star' },
      shield: { icon: 'shield', label: 'Shield' },
      trophy: { icon: 'trophy', label: 'Trophy' },
      medal: { icon: 'medal', label: 'Medal' },
      crown: { icon: 'crown', label: 'Crown' },
      sparkles: { icon: 'sparkles', label: 'Sparkles' },
      check: { icon: 'check-circle', label: 'Check' },
      hexagon: { icon: 'hexagon', label: 'Hexagon' }
    };
  }

  static renderCertificateHTML(config: EnhancedTemplateConfig): string {
    const {
      template,
      primaryColor,
      secondaryColor,
      accentColor,
      borderStyle,
      fontFamily,
      showBadge,
      badgeText,
      badgeIcon,
      title,
      subtitle,
      recipientName,
      description,
      date,
      signature,
      showLogo,
      logoText,
      logoPosition,
      logoSize,
      logoImage
    } = config;

    const borderDesign = this.getBorderDesign(template, borderStyle, primaryColor, secondaryColor, accentColor);
    const logoComponent = this.getLogoComponent(showLogo, logoImage, logoText, logoPosition, logoSize, primaryColor);
    const badgeComponent = this.getBadgeComponent(showBadge, badgeIcon, badgeText, secondaryColor);

    return `
      <div class="certificate-container" style="
        position: relative;
        width: 800px;
        height: 600px;
        background: white;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        border-radius: 8px;
      ">
        ${borderDesign}
        ${logoComponent}
        
        <div style="
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px;
          text-align: center;
        ">
          <div style="margin-bottom: 24px;">
            <h2 style="
              font-family: ${fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif'};
              font-size: 14px;
              letter-spacing: 0.1em;
              margin-bottom: 8px;
              text-transform: uppercase;
              opacity: 0.7;
              color: ${accentColor};
            ">${title}</h2>
            <div style="
              width: 128px;
              height: 4px;
              margin: 0 auto 16px auto;
              background-color: ${primaryColor};
            "></div>
          </div>

          <p style="
            font-family: ${fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif'};
            font-size: 12px;
            margin-bottom: 12px;
            opacity: 0.6;
            color: ${accentColor};
          ">${subtitle}</p>

          <h1 style="
            font-family: ${fontFamily === 'serif' ? 'Brush Script MT, cursive' : 'Arial, sans-serif'};
            font-size: 48px;
            margin-bottom: 24px;
            color: ${accentColor};
            font-weight: ${fontFamily === 'serif' ? 'normal' : 'bold'};
          ">${recipientName}</h1>

          <p style="
            font-family: ${fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif'};
            font-size: 14px;
            max-width: 500px;
            margin-bottom: 32px;
            line-height: 1.6;
            opacity: 0.7;
            color: ${accentColor};
          ">${description}</p>

          <div style="
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            width: 100%;
            max-width: 500px;
            margin-top: 32px;
          ">
            <div style="text-align: left;">
              <div style="
                width: 128px;
                height: 1px;
                margin-bottom: 8px;
                background-color: ${accentColor};
                opacity: 0.3;
              "></div>
              <p style="
                font-size: 10px;
                opacity: 0.5;
                color: ${accentColor};
              ">DATE</p>
              <p style="
                font-size: 14px;
                color: ${accentColor};
              ">${date}</p>
            </div>
            
            <div style="text-align: right;">
              <div style="
                width: 128px;
                height: 1px;
                margin-bottom: 8px;
                margin-left: auto;
                background-color: ${accentColor};
                opacity: 0.3;
              "></div>
              <p style="
                font-size: 10px;
                opacity: 0.5;
                color: ${accentColor};
              ">SIGNATURE</p>
              <p style="
                font-family: ${fontFamily === 'serif' ? 'Brush Script MT, cursive' : 'Arial, sans-serif'};
                font-size: 14px;
                color: ${accentColor};
              ">${signature}</p>
            </div>
          </div>
        </div>

        ${badgeComponent}
      </div>
    `;
  }

  private static getBorderDesign(template: string, borderStyle: string, primaryColor: string, secondaryColor: string, accentColor: string): string {
    if (borderStyle === 'modern' && template === 'modern') {
      return `
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 256px;
          height: 256px;
          overflow: hidden;
        ">
          <div style="
            position: absolute;
            top: -128px;
            left: -128px;
            width: 384px;
            height: 384px;
            border-radius: 50%;
            opacity: 0.2;
            background-color: ${primaryColor};
          "></div>
        </div>
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 8px;
          height: 100%;
          background-color: ${primaryColor};
        "></div>
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 96px;
          background: linear-gradient(90deg, ${primaryColor}40 0%, transparent 100%);
        "></div>
      `;
    } else if (borderStyle === 'ornate') {
      return `
        <div style="
          position: absolute;
          top: 16px;
          left: 16px;
          right: 16px;
          bottom: 16px;
          border: 2px solid ${primaryColor};
          opacity: 0.3;
        ">
          <div style="
            position: absolute;
            top: -4px;
            left: -4px;
            width: 32px;
            height: 32px;
            border-top: 2px solid ${primaryColor};
            border-left: 2px solid ${primaryColor};
          "></div>
          <div style="
            position: absolute;
            top: -4px;
            right: -4px;
            width: 32px;
            height: 32px;
            border-top: 2px solid ${primaryColor};
            border-right: 2px solid ${primaryColor};
          "></div>
          <div style="
            position: absolute;
            bottom: -4px;
            left: -4px;
            width: 32px;
            height: 32px;
            border-bottom: 2px solid ${primaryColor};
            border-left: 2px solid ${primaryColor};
          "></div>
          <div style="
            position: absolute;
            bottom: -4px;
            right: -4px;
            width: 32px;
            height: 32px;
            border-bottom: 2px solid ${primaryColor};
            border-right: 2px solid ${primaryColor};
          "></div>
        </div>
        <div style="
          position: absolute;
          top: 32px;
          left: 32px;
          right: 32px;
          bottom: 32px;
          border: 1px solid ${secondaryColor};
          opacity: 0.2;
        "></div>
      `;
    }
    return '';
  }

  private static getLogoComponent(showLogo: boolean, logoImage: string | undefined, logoText: string, logoPosition: string, logoSize: string, primaryColor: string): string {
    if (!showLogo) return '';

    const logoPositions: Record<string, string> = {
      'top-left': 'top: 24px; left: 24px;',
      'top-center': 'top: 24px; left: 50%; transform: translateX(-50%);',
      'top-right': 'top: 24px; right: 24px;'
    };

    const logoSizes: Record<string, { width: string; height: string }> = {
      small: { width: '48px', height: '48px' },
      medium: { width: '64px', height: '64px' },
      large: { width: '80px', height: '80px' }
    };

    const sizeClasses = logoSizes[logoSize] || logoSizes.medium;

    if (logoImage) {
      return `
        <div style="
          position: absolute;
          ${logoPositions[logoPosition] || logoPositions['top-left']}
          z-index: 20;
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <div style="
            ${sizeClasses.width && sizeClasses.height ? `width: ${sizeClasses.width}; height: ${sizeClasses.height};` : ''}
            border-radius: 8px;
            overflow: hidden;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 2px solid white;
          ">
            <img src="${logoImage}" alt="Logo" style="
              width: 100%;
              height: 100%;
              object-fit: contain;
            "/>
          </div>
          ${logoText ? `
          <div style="
            margin-top: 8px;
            font-size: 10px;
            font-weight: 600;
            color: ${primaryColor};
          ">${logoText}</div>
          ` : ''}
        </div>
      `;
    } else {
      return `
        <div style="
          position: absolute;
          ${logoPositions[logoPosition] || logoPositions['top-left']}
          z-index: 20;
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <div style="
            ${sizeClasses.width && sizeClasses.height ? `width: ${sizeClasses.width}; height: ${sizeClasses.height};` : ''}
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 4px solid white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            background-color: ${primaryColor};
          ">
            <span style="
              color: white;
              font-weight: bold;
              font-size: 18px;
            ">${logoText.slice(0, 2)}</span>
          </div>
          <div style="
            margin-top: 8px;
            font-size: 10px;
            font-weight: 600;
            color: ${primaryColor};
          ">${logoText}</div>
        </div>
      `;
    }
  }

  private static getBadgeComponent(showBadge: boolean, badgeIcon: string, badgeText: string, secondaryColor: string): string {
    if (!showBadge) return '';

    // Simple icon representation
    const iconSymbols: Record<string, string> = {
      award: '🏆',
      star: '⭐',
      shield: '🛡️',
      trophy: '🏆',
      medal: '🥇',
      crown: '👑',
      sparkles: '✨',
      'check-circle': '✅',
      hexagon: '⬡'
    };

    const iconSymbol = iconSymbols[badgeIcon] || '🏆';

    return `
      <div style="
        position: absolute;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%);
      ">
        <div style="position: relative;">
          <div style="
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 4px solid white;
            background-color: ${secondaryColor};
            font-size: 32px;
          ">${iconSymbol}</div>
          <div style="
            position: absolute;
            bottom: -24px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
          ">
            <div style="
              padding: 4px 12px;
              font-size: 10px;
              font-weight: bold;
              color: white;
              border-radius: 4px;
              background-color: ${secondaryColor};
            ">${badgeText}</div>
          </div>
        </div>
      </div>
    `;
  }

  static getDefaultConfig(): EnhancedTemplateConfig {
    return {
      template: 'modern',
      recipientName: 'John Doe',
      title: 'Certificate of Achievement',
      subtitle: 'This certificate is proudly presented to',
      description: 'For outstanding performance and dedication in completing the advanced training program with exceptional results.',
      date: new Date().toLocaleDateString(),
      signature: 'Director Signature',
      primaryColor: '#0891b2',
      secondaryColor: '#fbbf24',
      accentColor: '#1e293b',
      fontFamily: 'serif',
      showBadge: true,
      badgeText: 'AWARD',
      badgeIcon: 'award',
      borderStyle: 'modern',
      logoText: 'COMPANY',
      showLogo: true,
      logoPosition: 'top-left',
      logoSize: 'medium'
    };
  }
}
