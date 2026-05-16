import OpenAI from 'openai';
import { config } from '@/config';

const client = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseUrl,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  systemPrompt?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Send a chat completion request to DeepSeek
 */
export async function chatCompletion(options: ChatOptions): Promise<string> {
  const {
    systemPrompt,
    messages,
    temperature = config.deepseek.temperature,
    maxTokens = config.deepseek.maxTokens,
  } = options;
  
  const apiMessages: ChatMessage[] = [];
  
  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }
  
  apiMessages.push(...messages);
  
  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: apiMessages,
    temperature,
    max_tokens: maxTokens,
  });
  
  return response.choices[0]?.message?.content || '';
}

/**
 * Send a streaming chat completion request
 */
export async function* chatCompletionStream(options: ChatOptions): AsyncGenerator<string> {
  const {
    systemPrompt,
    messages,
    temperature = config.deepseek.temperature,
    maxTokens = config.deepseek.maxTokens,
  } = options;
  
  const apiMessages: ChatMessage[] = [];
  
  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }
  
  apiMessages.push(...messages);
  
  const stream = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: apiMessages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

/**
 * Get DeepSeek model info
 */
export async function getModelInfo(): Promise<{ model: string; status: string }> {
  return {
    model: config.deepseek.model,
    status: config.deepseek.apiKey ? 'configured' : 'not_configured',
  };
}
