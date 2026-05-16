import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { chatRateLimit } from '@/middleware/rateLimit';
import { chatCompletionStream } from '@/services/deepseek';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1, '消息不能为空').max(4000, '消息最多4000字符'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
});

/**
 * POST /api/chat/:personalityId
 * Send message to personality (SSE streaming)
 */
router.post('/:personalityId', chatRateLimit, requireAuth, async (req, res) => {
  try {
    const { personalityId } = req.params;
    const userId = req.user!.userId;
    
    // Validate
    const result = chatSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error.errors.map(e => e.message).join(', '),
      });
      return;
    }
    
    const { message, history } = result.data;
    
    // Get personality
    const personality = await prisma.personality.findFirst({
      where: { id: personalityId, userId },
      select: { id: true, name: true, systemPrompt: true },
    });
    
    if (!personality) {
      res.status(404).json({ success: false, error: '人格不存在' });
      return;
    }
    
    // Check DeepSeek API key
    if (!process.env.DEEPSEEK_API_KEY) {
      // Fallback: return mock response
      const mockResponse = `你好！我是${personality.name}。${process.env.DEEPSEEK_API_KEY ? '' : '（注意：当前使用模拟响应，请配置 DEEPSEEK_API_KEY 环境变量以启用真实 AI 对话）'}`;
      res.json({ success: true, data: { response: mockResponse, streamed: false } });
      return;
    }
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Build messages
    const messages = [
      ...history.slice(-10), // Keep last 10 messages for context
      { role: 'user' as const, content: message },
    ];
    
    // Stream response
    try {
      for await (const chunk of chatCompletionStream({
        systemPrompt: personality.systemPrompt || '',
        messages,
        temperature: 0.7,
        maxTokens: 2048,
      })) {
        res.write(`data: ${JSON.stringify({ content: chunk }) }\n\n`);
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamError) {
      console.error('Stream error:', streamError);
      res.write(`data: ${JSON.stringify({ error: 'AI 响应失败' }) }\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: '对话失败' });
  }
});

export default router;
