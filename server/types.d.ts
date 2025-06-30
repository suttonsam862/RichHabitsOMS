// Extend Express types for proper authentication
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    token?: string;
    user?: {
      id: string;
      email?: string;
      role?: string;
      expires?: string;
    };
    expires?: string;
    auth?: {
      token?: string;
      user?: {
        id: string;
        email?: string;
        role?: string;
        expires?: string;
      };
    };
  }
}

// Add other custom type declarations as needed