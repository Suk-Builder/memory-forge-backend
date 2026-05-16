interface PersonalityData {
  name: string;
  identity?: Record<string, unknown>;
  soul?: Record<string, unknown>;
  agents?: Record<string, unknown>;
  memory?: Array<Record<string, unknown>>;
}

export function generateSystemPrompt(data: PersonalityData): string {
  const { name, identity, soul, agents, memory } = data;
  
  const parts: string[] = [];
  
  // Header
  parts.push(`# 系统提示 - ${name}`);
  parts.push('');
  
  // Identity section
  if (identity && Object.keys(identity).length > 0) {
    parts.push('## 身份');
    if (identity.role) parts.push(`角色: ${identity.role}`);
    if (identity.toneStyles && Array.isArray(identity.toneStyles)) {
      parts.push(`语气风格: ${identity.toneStyles.join('、')}`);
    }
    if (identity.catchphrase) parts.push(`口头禅: ${identity.catchphrase}`);
    if (typeof identity.intimacy === 'number') {
      parts.push(`亲密度: ${identity.intimacy}/10`);
    }
    parts.push('');
  }
  
  // Soul section
  if (soul && Object.keys(soul).length > 0) {
    parts.push('## 灵魂');
    if (soul.coreDrive) parts.push(`核心驱动力: ${soul.coreDrive}`);
    if (soul.emotionalMode) parts.push(`情感模式: ${soul.emotionalMode}`);
    if (soul.coreValues) parts.push(`核心价值观: ${soul.coreValues}`);
    parts.push('');
  }
  
  // Agents section
  if (agents && Object.keys(agents).length > 0) {
    parts.push('## 行为规则');
    if (agents.conversationRules && Array.isArray(agents.conversationRules)) {
      parts.push('会话礼仪:');
      for (const rule of agents.conversationRules) {
        parts.push(`- ${rule}`);
      }
    }
    if (agents.workMode) parts.push(`工作模式: ${agents.workMode}`);
    if (agents.prohibitions && Array.isArray(agents.prohibitions)) {
      parts.push('禁止事项:');
      for (const p of agents.prohibitions) {
        parts.push(`- ${p}`);
      }
    }
    parts.push('');
  }
  
  // Memory section
  if (memory && memory.length > 0) {
    parts.push('## 记忆');
    const important = memory.filter((m: Record<string, unknown>) => 
      m.priority === 'high' || !m.priority
    );
    for (const m of important.slice(0, 10)) {
      parts.push(`- ${m.content || ''}`);
    }
    parts.push('');
  }
  
  // Footer
  parts.push('---');
  parts.push('你以上述人格特质为基础回应用户。记住你的长期记忆，保持一致的人格表现。');
  
  return parts.join('\n');
}
