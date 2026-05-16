import type { Personality } from '@/types';

interface ExportData {
  name: string;
  description: string | null;
  identity: Record<string, unknown>;
  soul: Record<string, unknown>;
  agents: Record<string, unknown>;
  memory: Array<Record<string, unknown>>;
  systemPrompt: string | null;
  version: number;
  createdAt: Date;
}

function buildExportData(personality: Personality): ExportData {
  return {
    name: personality.name,
    description: personality.description,
    identity: personality.identity as Record<string, unknown>,
    soul: personality.soul as Record<string, unknown>,
    agents: personality.agents as Record<string, unknown>,
    memory: personality.memory as Array<Record<string, unknown>>,
    systemPrompt: personality.systemPrompt,
    version: personality.version,
    createdAt: personality.createdAt,
  };
}

export function exportToMarkdown(personality: Personality): string {
  const data = buildExportData(personality);
  const parts: string[] = [];
  
  parts.push(`# ${data.name} — 人格档案`);
  parts.push('');
  
  if (data.description) {
    parts.push(`> ${data.description}`);
    parts.push('');
  }
  
  parts.push(`**版本**: v${data.version}`);
  parts.push(`**创建时间**: ${data.createdAt.toISOString()}`);
  parts.push('');
  
  // Identity
  parts.push('## 身份 (IDENTITY)');
  parts.push('');
  if (data.identity.role) parts.push(`- **角色**: ${data.identity.role}`);
  if (data.identity.toneStyles && Array.isArray(data.identity.toneStyles)) {
    parts.push(`- **语气风格**: ${data.identity.toneStyles.join('、')}`);
  }
  if (data.identity.catchphrase) parts.push(`- **口头禅**: ${data.identity.catchphrase}`);
  if (typeof data.identity.intimacy === 'number') {
    parts.push(`- **亲密度**: ${data.identity.intimacy}/10`);
  }
  parts.push('');
  
  // Soul
  parts.push('## 灵魂 (SOUL)');
  parts.push('');
  if (data.soul.coreDrive) parts.push(`- **核心驱动力**: ${data.soul.coreDrive}`);
  if (data.soul.emotionalMode) parts.push(`- **情感模式**: ${data.soul.emotionalMode}`);
  if (data.soul.humorTypes && Array.isArray(data.soul.humorTypes)) {
    parts.push(`- **幽默类型**: ${data.soul.humorTypes.join('、')}`);
  }
  if (data.soul.coreValues) parts.push(`- **核心价值观**: ${data.soul.coreValues}`);
  parts.push('');
  
  // Agents
  parts.push('## 行为规则 (AGENTS)');
  parts.push('');
  if (data.agents.workMode) parts.push(`- **工作模式**: ${data.agents.workMode}`);
  if (data.agents.conversationRules && Array.isArray(data.agents.conversationRules)) {
    parts.push('- **会话礼仪**:');
    for (const rule of data.agents.conversationRules) {
      parts.push(`  - ${rule}`);
    }
  }
  if (data.agents.prohibitions && Array.isArray(data.agents.prohibitions)) {
    parts.push('- **禁止事项**:');
    for (const p of data.agents.prohibitions) {
      parts.push(`  - ${p}`);
    }
  }
  parts.push('');
  
  // Memory
  parts.push('## 记忆 (MEMORY)');
  parts.push('');
  if (data.memory && data.memory.length > 0) {
    for (const m of data.memory) {
      const tags = m.tags && Array.isArray(m.tags) ? ` [${m.tags.join(', ')}]` : '';
      const priority = m.priority ? ` (${m.priority})` : '';
      parts.push(`- ${m.content}${tags}${priority}`);
    }
  } else {
    parts.push('*暂无记忆*');
  }
  parts.push('');
  
  // System Prompt
  if (data.systemPrompt) {
    parts.push('## 系统提示词');
    parts.push('');
    parts.push('```');
    parts.push(data.systemPrompt);
    parts.push('```');
  }
  
  return parts.join('\n');
}

export function exportToJSON(personality: Personality): string {
  const data = buildExportData(personality);
  return JSON.stringify(data, null, 2);
}

export function exportToOpenAI(personality: Personality): string {
  const data = buildExportData(personality);
  return data.systemPrompt || 'You are a helpful assistant.';
}

export function exportToClaude(personality: Personality): string {
  const data = buildExportData(personality);
  
  if (data.systemPrompt) {
    return `<system_prompt>\n${data.systemPrompt}\n</system_prompt>`;
  }
  
  return '<system_prompt>\nYou are a helpful assistant.\n</system_prompt>';
}

export function getExportContent(personality: Personality, format: string): { content: string; mimeType: string; extension: string } {
  switch (format) {
    case 'markdown':
      return {
        content: exportToMarkdown(personality),
        mimeType: 'text/markdown',
        extension: 'md',
      };
    case 'json':
      return {
        content: exportToJSON(personality),
        mimeType: 'application/json',
        extension: 'json',
      };
    case 'openai':
      return {
        content: exportToOpenAI(personality),
        mimeType: 'text/plain',
        extension: 'txt',
      };
    case 'claude':
      return {
        content: exportToClaude(personality),
        mimeType: 'text/plain',
        extension: 'txt',
      };
    default:
      throw new Error(`不支持的导出格式: ${format}`);
  }
}
