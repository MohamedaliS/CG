export interface DefaultTemplate {
  id: string;
  name: string;
  preview_image_path: string;
  base_image_path: string;
  default_text_x: number;
  default_text_y: number;
  default_font_size: number;
  default_font_color: string;
  default_primary_color: string;
  is_active: boolean;
}

export interface Template {
  id: string;
  user_id: string;
  template_type: 'default' | 'custom';
  default_template_id?: string;
  custom_image_path?: string;
  logo_path?: string;
  primary_color: string;
  text_x_position: number;
  text_y_position: number;
  font_size: number;
  font_color: string;
  font_family: string;
  created_at: Date;
}

export interface TemplateCustomization {
  default_template_id?: string;
  custom_image?: string;
  logo?: string;
  primary_color: string;
  text_x_position: number;
  text_y_position: number;
  font_size: number;
  font_color: string;
  font_family: string;
}

export interface TemplateWithDefault extends Template {
  default_template?: DefaultTemplate;
}
