// Extend Express types for proper authentication
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    auth?: {
      token?: string;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    };
  }
}

// Add other custom type declarations as needed