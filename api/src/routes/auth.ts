import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/utils/password';
import { generateTokens } from '@/utils/jwt';
import { cacheSet } from '@/lib/redis';
import type { TokenPayload } from '@/utils/jwt';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6个字符').max(128, '密码最多128个字符'),
  name: z.string().min(1, '用户名不能为空').max(50, '用户名最多50个字符').optional(),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      res.status(400).json({ success: false, error: errors });
      return;
    }
    
    const { email, password, name } = result.data;
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      res.status(409).json({ success: false, error: '该邮箱已被注册' });
      return;
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || (email.includes('@') ? email.split('@')[0] : email),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    
    // Generate tokens
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    
    const { accessToken } = generateTokens(payload);

    // Cache user session
    await cacheSet(`session:${user.id}`, { ...payload, name: user.name }, 86400);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: '注册失败，请稍后重试' });
  }
});

export default router;
