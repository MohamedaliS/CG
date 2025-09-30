import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiResponse } from '../types';

export async function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  console.error('Error:', error);

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return reply.status(400).send({
      success: false,
      error: 'Validation failed',
      message: error.message,
    } as ApiResponse);
  }

  // Handle authentication errors
  if (error.message.includes('Unauthorized') || error.message.includes('token')) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication failed',
      message: error.message,
    } as ApiResponse);
  }

  // Handle file upload errors
  if (error.message.includes('File too large')) {
    return reply.status(413).send({
      success: false,
      error: 'File too large',
      message: 'File size exceeds maximum allowed limit',
    } as ApiResponse);
  }

  // Handle database errors
  if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
    return reply.status(409).send({
      success: false,
      error: 'Conflict',
      message: 'Resource already exists',
    } as ApiResponse);
  }

  // Default server error
  return reply.status(500).send({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  } as ApiResponse);
}
