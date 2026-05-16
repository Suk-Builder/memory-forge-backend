import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { cacheGet, cacheSet, cacheDeletePattern } from '@/lib/redis';

const router = Router();

/**
 * GET /api/conversations
 * List user's conversations
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const cacheKey = `conversations:${userId}:${page}:${limit}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          personality: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.conversation.count({ where: { userId } }),
    ]);

    const result = { conversations, total, page, limit, totalPages: Math.ceil(total / limit) };
    await cacheSet(cacheKey, result, 300);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ success: false, error: '获取对话列表失败' });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      personalityId: z.string().uuid(),
      title: z.string().max(100).optional(),
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string().optional(),
      })),
    }).safeParse(req.body);

    if (!schema.success) {
      res.status(400).json({ success: false, error: '参数格式不正确' });
      return;
    }

    const { personalityId, title, messages } = schema.data;
    const userId = req.user!.userId;

    // Verify personality ownership
    const personality = await prisma.personality.findFirst({
      where: { id: personalityId, userId },
    });

    if (!personality) {
      res.status(404).json({ success: false, error: '人格不存在' });
      return;
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        personalityId,
        title: title || `${personality.name}的对话`,
        messages: messages as unknown[],
      },
      include: {
        personality: { select: { id: true, name: true } },
      },
    });

    await cacheDeletePattern(`conversations:${userId}:*`);

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ success: false, error: '创建对话失败' });
  }
});

/**
 * GET /api/conversations/:id
 * Get single conversation
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        personality: { select: { id: true, name: true, systemPrompt: true } },
      },
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: '对话不存在' });
      return;
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, error: '获取对话失败' });
  }
});

/**
 * DELETE /api/conversations/:id
 * Delete conversation
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: '对话不存在' });
      return;
    }

    await prisma.conversation.delete({ where: { id } });
    await cacheDeletePattern(`conversations:${userId}:*`);

    res.json({ success: true, message: '对话已删除' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ success: false, error: '删除对话失败' });
  }
});

export default router;
