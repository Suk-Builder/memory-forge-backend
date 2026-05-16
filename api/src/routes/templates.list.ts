import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { optionalAuth } from '@/middleware/auth';
import { cacheGet, cacheSet } from '@/lib/redis';

const router = Router();

/**
 * GET /api/templates
 * List templates with filters
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string)?.trim() || '';
    const category = (req.query.category as string) || '';
    const sort = (req.query.sort as string) || 'downloadCount';
    
    const cacheKey = `templates:${page}:${limit}:${search}:${category}:${sort}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
    
    // Build where
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    // Build orderBy
    const orderBy: Record<string, string> = {};
    if (sort === 'rating') orderBy.rating = 'desc';
    else if (sort === 'newest') orderBy.createdAt = 'desc';
    else orderBy.downloadCount = 'desc';
    
    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          personality: {
            select: {
              id: true,
              identity: true,
              memory: true,
            },
          },
        },
      }),
      prisma.template.count({ where }),
    ]);
    
    const result = {
      templates: templates.map(t => ({
        id: t.id,
        personalityId: t.personalityId,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        downloadCount: t.downloadCount,
        rating: t.rating,
        ratingCount: t.ratingCount,
        createdAt: t.createdAt,
        identity: t.personality.identity,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
    
    await cacheSet(cacheKey, result, 600);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ success: false, error: '获取模板列表失败' });
  }
});

export default router;
