import 'fastify';
import '@fastify/jwt';
import '@fastify/multipart';
import { AuthUser } from './index';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser | undefined;
    jwtVerify(): Promise<void>;
    file(): Promise<import('@fastify/multipart').MultipartFile | undefined>;
  }

  interface FastifyInstance {
    jwt: {
      sign: (payload: any) => string;
      verify: (token: string) => any;
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthUser;
  }
}
