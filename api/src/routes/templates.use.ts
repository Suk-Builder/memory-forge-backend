import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { cacheDeletePattern } from '@/lib/redis';
import { generateSystemPrompt } from '@/services/systemPrompt';

const router = Router();

/**
 * GET /api/templates/:id
 * Get template detail
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        personality: {
          select: {
            id: true,
            name: true,
            description: true,
            identity: true,
            soul: true,
            agents: true,
            memory: true,
            systemPrompt: true,
          },
        },
      },
    });
    
    if (!template) {
      res.status(404).json({ success: false, error: '模板不存在' });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: template.id,
        personalityId: template.personalityId,
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
        downloadCount: template.downloadCount,
        rating: template.rating,
        ratingCount: template.ratingCount,
        createdAt: template.createdAt,
        personality: template.personality,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取模板详情失败' });
  }
});

/**
 * POST /api/templates/:id/use
 * Use template to create a new personality
 */
router.post('/:id/use', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    // Optional customizations
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
    }).safeParse(req.body);
    
    const customizations = schema.success ? schema.data : {};
    
    // Get template
    const template = await prisma.template.findUnique({
      where: { id },
      include: { personality: true },
    });
    
    if (!template) {
      res.status(404).json({ success: false, error: '模板不存在' });
      return;
    }
    
    const sourcePersonality = template.personality;
    
    // Create new personality from template
    const systemPrompt = generateSystemPrompt({
      name: customizations.name || sourcePersonality.name,
      identity: sourcePersonality.identity as Record<string, unknown>,
      soul: sourcePersonality.soul as Record<string, unknown>,
      agents: sourcePersonality.agents as Record<string, unknown>,
      memory: sourcePersonality.memory as Array<Record<string, unknown>>,
    });
    
    const newPersonality = await prisma.personality.create({
      data: {
        userId,
        name: customizations.name || `${sourcePersonality.name} (副本)`,
        description: customizations.description || sourcePersonality.description,
        identity: sourcePersonality.identity as unknown[],
        soul: sourcePersonality.soul as unknown[],
        agents: sourcePersonality.agents as unknown[],
        memory: sourcePersonality.memory as unknown[],
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
      },
    });
    
    // Increment download count
    await prisma.template.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
    
    // Invalidate cache
    await cacheDeletePattern(`personalities:${userId}:*`);
    await cacheDeletePattern(`templates:*`);
    
    res.status(201).json({
      success: true,
      message: '模板使用成功',
      data: newPersonality,
    });
  } catch (error) {
    console.error('Use template error:', error);
    res.status(500).json({ success: false, error: '使用模板失败' });
  }
});

export default router;
