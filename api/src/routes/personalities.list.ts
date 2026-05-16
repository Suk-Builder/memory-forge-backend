import { Router } from 'express';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { cacheGet, cacheSet } from '@/lib/redis';
import { config } from '@/config';
import { createHash } from 'crypto';

const router = Router();

/**
 * Safely parse an integer from a query parameter.
 * Returns fallback if the value is not a valid integer or is empty.
 */
function safeParseInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }
  const parsed = parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * GET /api/personalities
 * List user's personalities with pagination and search
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Parse query params with safe integer parsing
    const page = Math.max(1, safeParseInt(req.query.page, config.pagination.defaultPage));
    const limit = Math.min(
      config.pagination.maxLimit,
      Math.max(1, safeParseInt(req.query.limit, config.pagination.defaultLimit))
    );
    const rawSearch = typeof req.query.search === 'string' ? req.query.search : '';
    const search = rawSearch.trim();
    const rawSort = typeof req.query.sort === 'string' ? req.query.sort : 'updatedAt';
    const rawOrder = typeof req.query.order === 'string' ? req.query.order : 'desc';

    // Validate sort field
    const allowedSortFields = ['name', 'createdAt', 'updatedAt', 'version'];
    const sortField = allowedSortFields.includes(rawSort) ? rawSort : 'updatedAt';
    const sortOrder = rawOrder === 'asc' ? 'asc' : 'desc';

    // Cache key — hash search to avoid extremely long Redis keys
    const searchHash = search ? createHash('sha256').update(search).digest('hex').slice(0, 12) : '';
    const cacheKey = `personalities:${userId}:${page}:${limit}:${searchHash}:${sortField}:${sortOrder}`;
    
    // Try cache
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
    
    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Get total count
    const total = await prisma.personality.count({ where });
    
    // Get paginated results
    const personalities = await prisma.personality.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        identity: true,
        systemPrompt: true,
        version: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    const result = {
      personalities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
    
    // Cache for 5 minutes
    await cacheSet(cacheKey, result, 300);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('List personalities error:', error);
    res.status(500).json({ success: false, error: '获取人格列表失败' });
  }
});

export default router;
