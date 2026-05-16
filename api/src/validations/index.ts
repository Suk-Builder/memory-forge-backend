import { z } from 'zod';

// Auth validations
export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6个字符').max(128, '密码最多128个字符'),
  name: z.string().min(1, '用户名不能为空').max(50, '用户名最多50个字符').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
});

// Personality validations
export const createPersonalitySchema = z.object({
  name: z.string().min(1, '人格名字不能为空').max(100, '人格名字最多100个字符'),
  description: z.string().max(500, '描述最多500个字符').optional(),
  identity: z.object({
    role: z.string().min(1, '请选择角色'),
    customRole: z.string().optional(),
    toneStyles: z.array(z.string()).optional(),
    catchphrase: z.string().max(200).optional(),
    intimacy: z.number().min(1).max(10).optional(),
  }).optional(),
  soul: z.object({
    coreDrive: z.string().max(500).optional(),
    emotionalMode: z.string().optional(),
    humorTypes: z.array(z.string()).optional(),
    stressResponse: z.string().max(500).optional(),
    coreValues: z.string().max(500).optional(),
  }).optional(),
  agents: z.object({
    conversationRules: z.array(z.string()).optional(),
    workMode: z.string().optional(),
    prohibitions: z.array(z.string()).optional(),
  }).optional(),
  memory: z.array(z.object({
    content: z.string().min(1, '记忆内容不能为空'),
    tags: z.array(z.string()).optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
  })).optional(),
});

export const updatePersonalitySchema = createPersonalitySchema.partial();

// Chat validations
export const chatMessageSchema = z.object({
  message: z.string().min(1, '消息不能为空').max(4000, '消息最多4000个字符'),
  conversationId: z.string().uuid().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

// Template validations
export const useTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  customizations: z.record(z.unknown()).optional(),
});

// Export validations
export const exportFormatSchema = z.enum(['markdown', 'json', 'openai', 'claude']);

// Pagination validation
export const paginationSchema = z.object({
  page: z.string().optional().transform(Number).pipe(z.number().min(1).default(1)),
  limit: z.string().optional().transform(Number).pipe(z.number().min(1).max(100).default(20)),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Helper: format Zod errors
export function formatZodError(error: z.ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
}
