export const CONSTANTS = {
  // Certificate limits
  FREE_TIER_LIMIT: 10,
  
  // File paths
  UPLOAD_DIR: 'uploads',
  CERTIFICATES_DIR: 'certificates',
  TEMPLATES_DIR: 'public/images/default-templates',
  
  // Template defaults
  DEFAULT_FONT_SIZE: 48,
  DEFAULT_FONT_COLOR: '#000000',
  DEFAULT_PRIMARY_COLOR: '#2563eb',
  DEFAULT_FONT_FAMILY: 'Arial',
  
  // Image dimensions
  CERTIFICATE_WIDTH: 1024,
  CERTIFICATE_HEIGHT: 768,
  QR_CODE_SIZE: 100,
  
  // Default templates
  DEFAULT_TEMPLATES: [
    {
      name: 'Modern',
      preview_image_path: '/public/images/default-templates/modern-preview.png',
      base_image_path: '/public/images/default-templates/modern.png',
      default_text_x: 512,
      default_text_y: 400,
    },
    {
      name: 'Classic',
      preview_image_path: '/public/images/default-templates/classic-preview.png',
      base_image_path: '/public/images/default-templates/classic.png',
      default_text_x: 512,
      default_text_y: 380,
    },
    {
      name: 'Minimalist',
      preview_image_path: '/public/images/default-templates/minimalist-preview.png',
      base_image_path: '/public/images/default-templates/minimalist.png',
      default_text_x: 512,
      default_text_y: 350,
    },
  ],
  
  // HTTP Status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
  
  // JWT
  JWT_EXPIRY: '7d',
  
  // Batch status
  BATCH_STATUS: {
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  } as const,
} as const;
