import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { chatCompletion } from '@/services/deepseek';
import { chatRateLimit } from '@/middleware/rateLimit';

const router = Router();

const completeSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
});

/**
 * POST /api/chat/:personalityId/complete
 * Non-streaming chat (for testing/simple use)
 */
router.post('/:personalityId/complete', chatRateLimit, requireAuth, async (req, res) => {
  try {
    const { personalityId } = req.params;
    const userId = req.user!.userId;
    
    const result = completeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ success: false, error: '消息格式不正确' });
      return;
    }
    
    const { message, history } = result.data;
    
    const personality = await prisma.personality.findFirst({
      where: { id: personalityId, userId },
      select: { name: true, systemPrompt: true },
    });
    
    if (!personality) {
      res.status(404).json({ success: false, error: '人格不存在' });
      return;
    }
    
    // Fallback without API key
    if (!process.env.DEEPSEEK_API_KEY) {
      res.json({
        success: true,
        data: {
          response: `你好！我是${personality.name}。我收到了你的消息：「${message}」\n\n（当前使用模拟响应，请配置 DEEPSEEK_API_KEY 环境变量以启用真实 AI 对话）`,
        },
      });
      return;
    }
    
    const response = await chatCompletion({
      systemPrompt: personality.systemPrompt || '',
      messages: [...history.slice(-10), { role: 'user', content: message }],
      temperature: 0.7,
      maxTokens: 2048,
    });
    
    res.json({ success: true, data: { response } });
  } catch (error) {
    console.error('Chat complete error:', error);
    res.status(500).json({ success: false, error: '对话失败' });
  }
});

export default router;
