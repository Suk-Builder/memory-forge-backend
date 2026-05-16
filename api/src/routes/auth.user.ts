import { Router } from 'express';
import { prisma } from '@/lib/prisma';
import { cacheDelete } from '@/lib/redis';
import { requireAuth } from '@/middleware/auth';

const router = Router();

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Clear session cache
    await cacheDelete(`session:${req.user!.userId}`);
    
    res.json({
      success: true,
      message: '登出成功',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: '登出失败' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }
    
    // Get user's personality and conversation counts in a transaction
    const [personalityCount, conversationCount] = await prisma.$transaction([
      prisma.personality.count({ where: { userId: user.id } }),
      prisma.conversation.count({ where: { userId: user.id } }),
    ]);
    
    res.json({
      success: true,
      data: {
        ...user,
        stats: {
          personalityCount,
          conversationCount,
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

export default router;
