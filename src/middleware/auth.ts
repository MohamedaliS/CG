import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthUser } from '../types/user';

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return reply.status(401).send({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    const decoded = request.server.jwt.verify(token) as AuthUser;
    request.user = decoded;
  } catch (error) {
    return reply.status(401).send({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
}

export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      const decoded = request.server.jwt.verify(token) as AuthUser;
      request.user = decoded;
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
    (request as any).user = undefined;
  }
}
