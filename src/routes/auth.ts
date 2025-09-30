import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/authService';
import { authenticateToken } from '../middleware/auth';
import { validateRegister, validateLogin } from '../middleware/validation';
import { ApiResponse, CreateUserRequest, LoginRequest } from '../types';
import { CONSTANTS } from '../config/constants';

export default async function authRoutes(fastify: FastifyInstance) {
  
  // Register new user
  fastify.post('/register', {
    preHandler: [validateRegister],
    handler: async (request, reply) => {
      try {
        const userData = request.body as CreateUserRequest;

        // Validate password strength
        const passwordValidation = AuthService.validatePassword(userData.password);
        if (!passwordValidation.valid) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid password',
            message: passwordValidation.message,
          } as ApiResponse);
        }

        // Create user
        const user = await AuthService.register(userData);

        // Generate JWT token
        const token = fastify.jwt.sign(user);

        return reply.status(201).send({
          success: true,
          data: {
            user,
            token,
          },
          message: 'User registered successfully',
        } as ApiResponse);

      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({
            success: false,
            error: 'Registration failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Login user
  fastify.post('/login', {
    preHandler: [validateLogin],
    handler: async (request, reply) => {
      try {
        const loginData = request.body as LoginRequest;

        // Authenticate user
        const user = await AuthService.login(loginData);

        // Generate JWT token
        const token = fastify.jwt.sign(user);

        return reply.send({
          success: true,
          data: {
            user,
            token,
          },
          message: 'Login successful',
        } as ApiResponse);

      } catch (error) {
        if (error instanceof Error) {
          return reply.status(401).send({
            success: false,
            error: 'Authentication failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Get current user profile
  fastify.get('/profile', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      return reply.send({
        success: true,
        data: request.user,
        message: 'Profile retrieved successfully',
      } as ApiResponse);
    }
  });

  // Logout (client-side token removal)
  fastify.post('/logout', {
    handler: async (request, reply) => {
      return reply.send({
        success: true,
        message: 'Logout successful',
      } as ApiResponse);
    }
  });

  // Verify token
  fastify.post('/verify-token', {
    handler: async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

        if (!token) {
          return reply.status(401).send({
            success: false,
            error: 'No token provided',
          } as ApiResponse);
        }

        const decoded = fastify.jwt.verify(token);
        
        return reply.send({
          success: true,
          data: decoded,
          message: 'Token is valid',
        } as ApiResponse);

      } catch (error) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid token',
        } as ApiResponse);
      }
    }
  });
}
