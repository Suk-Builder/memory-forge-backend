import type { Personality, User, Conversation, Template } from '@prisma/client';

export type { Personality, User, Conversation, Template };

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string | null;
    role: string;
  };
}
