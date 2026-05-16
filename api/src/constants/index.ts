// Personality roles
export const ROLES = [
  'companion', 'mentor', 'assistant', 'guardian',
  'creator', 'analyst', 'custom',
] as const;

export const ROLE_LABELS: Record<string, string> = {
  companion: '伙伴',
  mentor: '导师',
  assistant: '助手',
  guardian: '守护者',
  creator: '创作者',
  analyst: '分析师',
  custom: '自定义',
};

// Tone styles
export const TONE_STYLES = [
  'warm', 'direct', 'humorous', 'formal',
  'gentle', 'lively', 'calm',
] as const;

export const TONE_LABELS: Record<string, string> = {
  warm: '温暖',
  direct: '直接',
  humorous: '幽默',
  formal: '正式',
  gentle: '温柔',
  lively: '活泼',
  calm: '冷静',
};

// Emotional modes
export const EMOTIONAL_MODES = [
  'empathetic', 'analytical', 'humorous', 'calm', 'enthusiastic',
] as const;

export const EMOTIONAL_LABELS: Record<string, string> = {
  empathetic: '共情型',
  analytical: '分析型',
  humorous: '幽默型',
  calm: '冷静型',
  enthusiastic: '热情型',
};

// Work modes
export const WORK_MODES = [
  'daily', 'focused', 'casual',
] as const;

export const WORK_MODE_LABELS: Record<string, string> = {
  daily: '日常',
  focused: '专注',
  casual: '休闲',
};

// Template categories
export const TEMPLATE_CATEGORIES = [
  'companion', 'mentor', 'assistant',
  'guardian', 'creator', 'entertainment',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  companion: '伙伴',
  mentor: '导师',
  assistant: '助手',
  guardian: '守护者',
  creator: '创作者',
  entertainment: '娱乐',
};

// Memory priority levels
export const PRIORITY_LEVELS = ['high', 'medium', 'low'] as const;

export const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

// Export formats
export const EXPORT_FORMATS = ['markdown', 'json', 'openai', 'claude'] as const;

export const EXPORT_FORMAT_LABELS: Record<string, { name: string; ext: string; mime: string }> = {
  markdown: { name: 'Markdown', ext: 'md', mime: 'text/markdown' },
  json: { name: 'JSON', ext: 'json', mime: 'application/json' },
  openai: { name: 'OpenAI', ext: 'txt', mime: 'text/plain' },
  claude: { name: 'Claude', ext: 'txt', mime: 'text/plain' },
};
