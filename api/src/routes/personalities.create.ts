import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { cacheDeletePattern } from '@/lib/redis';
import { generateSystemPrompt } from '@/services/systemPrompt';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1, '人格名字不能为空').max(100),
  description: z.string().max(500).optional(),
  identity: z.record(z.unknown()).optional(),
  soul: z.record(z.unknown()).optional(),
  agents: z.record(z.unknown()).optional(),
  memory: z.array(z.record(z.unknown())).optional().default([]),
});

/**
 * POST /api/personalities
 * Create a new personality
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const result = createSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { name, description, identity, soul, agents, memory } = result.data;
    const userId = req.user!.userId;

    // Sanitize name to prevent prompt injection / format breakage
    const sanitizedName = name.replace(/[\r\n\t]/g, ' ').trim();

    // Generate system prompt from personality data
    const systemPrompt = generateSystemPrompt({
      name: sanitizedName,
      identity: identity || undefined,
      soul: soul || undefined,
      agents: agents || undefined,
      memory: memory || undefined,
    });

    const personality = await prisma.personality.create({
      data: {
        userId,
        name: sanitizedName,
        description: description || null,
        identity: identity || undefined,
        soul: soul || undefined,
        agents: agents || undefined,
        memory: memory || undefined,
        systemPrompt,
        version: 1,
      },
      select: {
        id: true,
        name: true,
        description: true,
        identity: true,
        soul: true,
        agents: true,
        memory: true,
        systemPrompt: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Invalidate cache — best-effort; log warning on failure so stale data can be detected
    try {
      await cacheDeletePattern(`personalities:${userId}:*`);
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after personality creation:', cacheErr);
    }

    res.status(201).json({
      success: true,
      message: '人格创建成功',
      data: personality,
    });
  } catch (error) {
    console.error('Create personality error:', error);
    res.status(500).json({ success: false, error: '创建人格失败' });
  }
});

export default router;
