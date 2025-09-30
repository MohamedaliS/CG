-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with email auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    certificate_count INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Default templates (3 pre-designed: modern, classic, minimalist)
CREATE TABLE default_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    preview_image_path VARCHAR(500) NOT NULL,
    base_image_path VARCHAR(500) NOT NULL,
    default_text_x INTEGER NOT NULL,
    default_text_y INTEGER NOT NULL,
    default_font_size INTEGER DEFAULT 48,
    default_font_color VARCHAR(7) DEFAULT '#000000',
    default_primary_color VARCHAR(7) DEFAULT '#2563eb',
    is_active BOOLEAN DEFAULT TRUE
);

-- User templates (customized from defaults or uploaded)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_type VARCHAR(20) CHECK (template_type IN ('default', 'custom')),
    default_template_id UUID REFERENCES default_templates(id),
    custom_image_path VARCHAR(500),
    logo_path VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    text_x_position INTEGER NOT NULL,
    text_y_position INTEGER NOT NULL,
    font_size INTEGER DEFAULT 48,
    font_color VARCHAR(7) DEFAULT '#000000',
    font_family VARCHAR(50) DEFAULT 'Arial',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certificates with unique IDs for verification
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    participant_name VARCHAR(255) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    batch_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generation batches for bulk operations
CREATE TABLE generation_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    participant_count INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'processing',
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_batch_id ON certificates(batch_id);
CREATE INDEX idx_certificates_id_active ON certificates(id, is_active);
CREATE INDEX idx_generation_batches_user_id ON generation_batches(user_id);
