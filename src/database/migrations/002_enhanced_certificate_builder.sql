-- Enhanced Certificate Builder Schema
-- Add advanced customization features

-- Add new columns to default_templates for enhanced features
ALTER TABLE default_templates ADD COLUMN IF NOT EXISTS template_style VARCHAR(50) DEFAULT 'modern';
ALTER TABLE default_templates ADD COLUMN IF NOT EXISTS badge_config JSONB DEFAULT '{"show": false, "icon": "award", "text": "AWARD", "color": "#fbbf24"}';
ALTER TABLE default_templates ADD COLUMN IF NOT EXISTS border_style VARCHAR(50) DEFAULT 'modern';
ALTER TABLE default_templates ADD COLUMN IF NOT EXISTS description TEXT;

-- Add new columns to templates for enhanced customization
ALTER TABLE templates ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#fbbf24';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#1e293b';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS font_style VARCHAR(50) DEFAULT 'serif';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS show_badge BOOLEAN DEFAULT TRUE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS badge_icon VARCHAR(50) DEFAULT 'award';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS badge_text VARCHAR(50) DEFAULT 'AWARD';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS border_style VARCHAR(50) DEFAULT 'modern';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS logo_text VARCHAR(100);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT TRUE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS logo_position VARCHAR(50) DEFAULT 'top-left';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS logo_size VARCHAR(20) DEFAULT 'medium';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS certificate_title VARCHAR(255) DEFAULT 'Certificate of Achievement';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255) DEFAULT 'This certificate is proudly presented to';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'For outstanding performance and dedication in completing the advanced training program with exceptional results.';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS signature_text VARCHAR(255) DEFAULT 'Director Signature';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}';

-- Certificate customization sessions (for real-time preview)
CREATE TABLE IF NOT EXISTS certificate_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_data JSONB NOT NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- Template presets for quick application
CREATE TABLE IF NOT EXISTS template_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'theme', 'color', 'style'
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User template favorites
CREATE TABLE IF NOT EXISTS template_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, template_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_certificate_sessions_user_id ON certificate_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_certificate_sessions_expires_at ON certificate_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_template_presets_category ON template_presets(category);
CREATE INDEX IF NOT EXISTS idx_template_favorites_user_id ON template_favorites(user_id);

-- Insert default template presets
INSERT INTO template_presets (name, category, config) VALUES
('Modern Wave', 'theme', '{"primaryColor": "#0891b2", "secondaryColor": "#fbbf24", "borderStyle": "modern", "badgeIcon": "award"}'),
('Elegant Purple', 'theme', '{"primaryColor": "#7c3aed", "secondaryColor": "#f97316", "borderStyle": "ornate", "badgeIcon": "crown"}'),
('Professional Blue', 'theme', '{"primaryColor": "#0284c7", "secondaryColor": "#eab308", "borderStyle": "minimal", "badgeIcon": "shield"}'),
('Classic Gold', 'theme', '{"primaryColor": "#ca8a04", "secondaryColor": "#dc2626", "borderStyle": "ornate", "badgeIcon": "trophy"}'),
('Bold Dark', 'theme', '{"primaryColor": "#0d9488", "secondaryColor": "#fbbf24", "borderStyle": "modern", "badgeIcon": "star"}'),
('Vibrant Multi', 'theme', '{"primaryColor": "#059669", "secondaryColor": "#dc2626", "borderStyle": "modern", "badgeIcon": "hexagon"}');

-- Insert color presets
INSERT INTO template_presets (name, category, config) VALUES
('Blue Professional', 'color', '{"primaryColor": "#3b82f6", "secondaryColor": "#1e40af", "accentColor": "#1e293b"}'),
('Red Energy', 'color', '{"primaryColor": "#ef4444", "secondaryColor": "#dc2626", "accentColor": "#1e293b"}'),
('Green Growth', 'color', '{"primaryColor": "#10b981", "secondaryColor": "#059669", "accentColor": "#1e293b"}'),
('Purple Elegance', 'color', '{"primaryColor": "#8b5cf6", "secondaryColor": "#7c3aed", "accentColor": "#1e293b"}'),
('Orange Warmth', 'color', '{"primaryColor": "#f59e0b", "secondaryColor": "#d97706", "accentColor": "#1e293b"}'),
('Teal Modern', 'color', '{"primaryColor": "#14b8a6", "secondaryColor": "#0d9488", "accentColor": "#1e293b"}');

-- Update existing default templates with enhanced features
UPDATE default_templates SET 
    template_style = 'modern',
    badge_config = '{"show": true, "icon": "award", "text": "AWARD", "color": "#fbbf24"}',
    border_style = 'modern',
    description = 'Professional certificate template with modern design elements'
WHERE template_style IS NULL;

-- Create a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_certificate_sessions_updated_at BEFORE UPDATE ON certificate_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM certificate_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;