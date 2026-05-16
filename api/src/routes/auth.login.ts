import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/utils/password';
import { generateTokens } from '@/utils/jwt';
import { cacheSet } from '@/lib/redis';
import type { TokenPayload } from '@/utils/jwt';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      res.status(400).json({ success: false, error: errors });
      return;
    }
    
    const { email, password } = result.data;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' });
      return;
    }

    // Verify password — passwordHash is non-nullable in schema, but
    // guard against tampered DB to prevent bcrypt from throwing.
    const isValid = await comparePassword(password, user.passwordHash);
    
    if (!isValid) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' });
      return;
    }
    
    // Generate tokens
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    
    const tokens = generateTokens(payload);
    
    // Cache session
    await cacheSet(`session:${user.id}`, { ...payload, name: user.name }, 86400);
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: '登录失败，请稍后重试' });
  }
});

export default router;
