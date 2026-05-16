import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { cacheDeletePattern } from '@/lib/redis';
import { generateSystemPrompt } from '@/services/systemPrompt';

const router = Router({ mergeParams: true });

/**
 * GET /api/personalities/:id
 * Get single personality
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    const personality = await prisma.personality.findFirst({
      where: {
        id,
        userId, // Ensure user owns this personality
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
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!personality) {
      res.status(404).json({ success: false, error: '人格不存在' });
      return;
    }
    
    res.json({ success: true, data: personality });
  } catch (error) {
    console.error('Get personality error:', error);
    res.status(500).json({ success: false, error: '获取人格失败' });
  }
});

/**
 * PUT /api/personalities/:id
 * Update personality
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    // Check ownership
    const existing = await prisma.personality.findFirst({
      where: { id, userId },
    });
    
    if (!existing) {
      res.status(404).json({ success: false, error: '人格不存在' });
      return;
    }
    
    // Validate
    const updateSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      identity: z.record(z.unknown()).optional(),
      soul: z.record(z.unknown()).optional(),
      agents: z.record(z.unknown()).optional(),
      memory: z.array(z.record(z.unknown())).optional(),
    }).safeParse(req.body);
    
    if (!updateSchema.success) {
      res.status(400).json({
        success: false,
        error: updateSchema.error.errors.map(e => e.message).join(', '),
      });
      return;
    }
    
    const data = updateSchema.data;
    
    // Rebuild system prompt if identity/soul/agents/memory changed
    let systemPrompt = existing.systemPrompt;
    if (data.identity || data.soul || data.agents || data.memory) {
      systemPrompt = generateSystemPrompt({
        name: data.name || existing.name,
        identity: data.identity || (existing.identity as Record<string, unknown>),
        soul: data.soul || (existing.soul as Record<string, unknown>),
        agents: data.agents || (existing.agents as Record<string, unknown>),
        memory: data.memory || (existing.memory as Array<Record<string, unknown>>),
      });
    }
    
    const updated = await prisma.personality.update({
      where: { id },
      data: {
        ...data,
        systemPrompt,
        version: { increment: 1 },
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
        updatedAt: true,
      },
    });
    
    // Invalidate cache
    await cacheDeletePattern(`personalities:${userId}:*`);
    
    res.json({
      success: true,
      message: '人格更新成功',
      data: updated,
    });
  } catch (error) {
    console.error('Update personality error:', error);
    res.status(500).json({ success: false, error: '更新人格失败' });
  }
});

/**
 * DELETE /api/personalities/:id
 * Delete personality
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    // Check ownership
    const existing = await prisma.personality.findFirst({
      where: { id, userId },
    });
    
    if (!existing) {
      res.status(404).json({ success: false, error: '人格不存在' });
      return;
    }
    
    await prisma.personality.delete({ where: { id } });
    
    // Invalidate cache
    await cacheDeletePattern(`personalities:${userId}:*`);
    await cacheDeletePattern(`conversations:${userId}:*`);
    
    res.json({
      success: true,
      message: '人格已删除',
    });
  } catch (error) {
    console.error('Delete personality error:', error);
    res.status(500).json({ success: false, error: '删除人格失败' });
  }
});

export default router;
