import db from './pool';

export class UserQueries {
  static async create(email: string, passwordHash: string, organizationName: string) {
    const query = `
      INSERT INTO users (email, password_hash, organization_name)
      VALUES ($1, $2, $3)
      RETURNING id, email, organization_name, certificate_count, is_premium, created_at
    `;
    const result = await db.query(query, [email, passwordHash, organizationName]);
    return result.rows[0];
  }

  static async findByEmail(email: string) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id: string) {
    const query = 'SELECT id, email, organization_name, certificate_count, is_premium, created_at, last_login FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async updateCertificateCount(userId: string, count: number) {
    const query = 'UPDATE users SET certificate_count = certificate_count + $2 WHERE id = $1';
    await db.query(query, [userId, count]);
  }

  static async updateLastLogin(userId: string) {
    const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
    await db.query(query, [userId]);
  }
}

export class DefaultTemplateQueries {
  static async findAll() {
    const query = 'SELECT * FROM default_templates WHERE is_active = true ORDER BY name';
    const result = await db.query(query);
    return result.rows;
  }

  static async findById(id: string) {
    const query = 'SELECT * FROM default_templates WHERE id = $1 AND is_active = true';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async create(template: any) {
    const query = `
      INSERT INTO default_templates (name, preview_image_path, base_image_path, default_text_x, default_text_y, default_font_size, default_font_color, default_primary_color)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await db.query(query, [
      template.name,
      template.preview_image_path,
      template.base_image_path,
      template.default_text_x,
      template.default_text_y,
      template.default_font_size || 48,
      template.default_font_color || '#000000',
      template.default_primary_color || '#2563eb'
    ]);
    return result.rows[0];
  }
}

export class TemplateQueries {
  static async create(template: any) {
    const query = `
      INSERT INTO templates (user_id, template_type, default_template_id, custom_image_path, logo_path, primary_color, text_x_position, text_y_position, font_size, font_color, font_family)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await db.query(query, [
      template.user_id,
      template.template_type,
      template.default_template_id,
      template.custom_image_path,
      template.logo_path,
      template.primary_color,
      template.text_x_position,
      template.text_y_position,
      template.font_size,
      template.font_color,
      template.font_family
    ]);
    return result.rows[0];
  }

  static async findByUserId(userId: string) {
    const query = `
      SELECT t.*, dt.name as default_template_name, dt.base_image_path as default_base_image_path
      FROM templates t
      LEFT JOIN default_templates dt ON t.default_template_id = dt.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async findById(id: string) {
    const query = `
      SELECT t.*, dt.name as default_template_name, dt.base_image_path as default_base_image_path
      FROM templates t
      LEFT JOIN default_templates dt ON t.default_template_id = dt.id
      WHERE t.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

export class CertificateQueries {
  static async create(certificate: any) {
    const query = `
      INSERT INTO certificates (user_id, participant_name, event_name, batch_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(query, [
      certificate.user_id,
      certificate.participant_name,
      certificate.event_name,
      certificate.batch_id
    ]);
    return result.rows[0];
  }

  static async findById(id: string) {
    const query = `
      SELECT c.*, u.organization_name
      FROM certificates c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1 AND c.is_active = true
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByUserId(userId: string, limit: number = 50, offset: number = 0) {
    const query = `
      SELECT * FROM certificates
      WHERE user_id = $1 AND is_active = true
      ORDER BY generated_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [userId, limit, offset]);
    return result.rows;
  }

  static async findByBatchId(batchId: string) {
    const query = 'SELECT * FROM certificates WHERE batch_id = $1 AND is_active = true';
    const result = await db.query(query, [batchId]);
    return result.rows;
  }
}

export class GenerationBatchQueries {
  static async create(batch: any) {
    const query = `
      INSERT INTO generation_batches (user_id, event_name, participant_count, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(query, [
      batch.user_id,
      batch.event_name,
      batch.participant_count,
      batch.status || 'processing'
    ]);
    return result.rows[0];
  }

  static async updateStatus(id: string, status: string, filePath?: string | null) {
    const query = `
      UPDATE generation_batches
      SET status = $2::varchar, 
          file_path = $3, 
          completed_at = CASE WHEN $2::varchar = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, status, filePath || null]);
    return result.rows[0];
  }

  static async findByUserId(userId: string) {
    const query = `
      SELECT * FROM generation_batches
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async findById(id: string) {
    const query = 'SELECT * FROM generation_batches WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}
