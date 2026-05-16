import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { getExportContent } from '@/services/export';

const router = Router();

/**
 * GET /api/personalities/:id/export?format=markdown|json|openai|claude
 * Export personality in specified format
 */
router.get('/:id/export', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    // Validate format
    const formatSchema = z.enum(['markdown', 'json', 'openai', 'claude']).safeParse(
      req.query.format || 'markdown'
    );
    
    if (!formatSchema.success) {
      res.status(400).json({
        success: false,
        error: 'format参数必须是: markdown, json, openai, 或 claude',
      });
      return;
    }
    
    const format = formatSchema.data;
    
    // Get personality
    const personality = await prisma.personality.findFirst({
      where: { id, userId },
    });
    
    if (!personality) {
      res.status(404).json({ success: false, error: '人格不存在' });
      return;
    }
    
    // Generate export content
    const { content, mimeType, extension } = getExportContent(personality, format);
    
    const filename = `${personality.name.replace(/\s+/g, '-')}.${extension}`;
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: '导出失败' });
  }
});

/**
 * POST /api/personalities/:id/export
 * Preview export (returns content without download headers)
 */
router.post('/:id/export', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    const formatSchema = z.enum(['markdown', 'json', 'openai', 'claude']).safeParse(
      req.body.format || 'markdown'
    );
    
    if (!formatSchema.success) {
      res.status(400).json({ success: false, error: '格式参数不正确' });
      return;
    }
    
    const format = formatSchema.data;
    
    const personality = await prisma.personality.findFirst({
      where: { id, userId },
    });
    
    if (!personality) {
      res.status(404).json({ success: false, error: '人格不存在' });
      return;
    }
    
    const { content, extension } = getExportContent(personality, format);
    
    res.json({
      success: true,
      data: {
        format,
        content,
        filename: `${personality.name.replace(/\s+/g, '-')}.${extension}`,
        contentLength: content.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '预览导出失败' });
  }
});

export default router;
