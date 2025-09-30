import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiResponse } from '../types';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export function validateBody(rules: ValidationRule[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const errors: string[] = [];

    for (const rule of rules) {
      const value = body[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip validation if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (rule.type) {
        switch (rule.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`${rule.field} must be a string`);
            }
            break;
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors.push(`${rule.field} must be a number`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`${rule.field} must be a boolean`);
            }
            break;
          case 'email':
            if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push(`${rule.field} must be a valid email address`);
            }
            break;
          case 'array':
            if (!Array.isArray(value)) {
              errors.push(`${rule.field} must be an array`);
            }
            break;
        }
      }

      // Length validation for strings
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters long`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${rule.field} must be at most ${rule.maxLength} characters long`);
        }
      }

      // Number range validation
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${rule.field} must be at most ${rule.max}`);
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(`${rule.field} format is invalid`);
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (typeof result === 'string') {
          errors.push(result);
        } else if (!result) {
          errors.push(`${rule.field} is invalid`);
        }
      }
    }

    if (errors.length > 0) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        message: errors.join(', '),
      } as ApiResponse);
    }
  };
}

export const validateRegister = validateBody([
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'string', minLength: 8 },
  { field: 'organization_name', required: true, type: 'string', minLength: 2, maxLength: 255 },
]);

export const validateLogin = validateBody([
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'string' },
]);

export const validateGenerateCertificates = validateBody([
  { field: 'event_name', required: true, type: 'string', minLength: 3, maxLength: 255 },
  { field: 'participant_names', required: true, type: 'array' },
  { field: 'template_id', required: true, type: 'string' },
]);

export const validateTemplateCustomization = validateBody([
  { field: 'primary_color', required: true, type: 'string', pattern: /^#[0-9A-Fa-f]{6}$/ },
  { field: 'font_color', required: true, type: 'string', pattern: /^#[0-9A-Fa-f]{6}$/ },
  { field: 'font_family', required: true, type: 'string', minLength: 1, maxLength: 50 },
  { field: 'font_size', required: true, type: 'number', min: 12, max: 200 },
  { field: 'text_x_position', required: true, type: 'number', min: 0 },
  { field: 'text_y_position', required: true, type: 'number', min: 0 },
]);
