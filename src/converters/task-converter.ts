import type { BmadTask } from '../types/bmad.js';
import type { OpenCodeSkill } from '../types/opencode.js';

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanXmlContent(content: string): string {
  return content
    .replace(/<\/?task[^>]*>/g, '')
    .replace(/<\/?objective>/g, '')
    .replace(/<\/?llm[^>]*>/g, '')
    .replace(/<mandate>/g, '- **MANDATE:** ')
    .replace(/<\/mandate>/g, '')
    .replace(/<rule[^>]*>/g, '- ')
    .replace(/<\/rule>/g, '')
    .replace(/<action>/g, '- ')
    .replace(/<\/action>/g, '')
    .replace(/<phase[^>]*>/g, '  - ')
    .replace(/<\/phase>/g, '')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

function buildTaskSkillContent(task: BmadTask): string {
  const lines: string[] = [];
  
  lines.push(`# ${task.displayName}`);
  lines.push('');
  lines.push(task.description);
  lines.push('');
  
  lines.push('## Instructions');
  lines.push('');
  
  if (task.isXml) {
    lines.push(cleanXmlContent(task.content));
  } else {
    lines.push(task.content);
  }
  
  return lines.join('\n').trim();
}

export function convertTask(task: BmadTask): OpenCodeSkill {
  const skillName = toKebabCase(`bmad-${task.module}-task-${task.name}`);
  
  return {
    name: skillName,
    folder: skillName,
    frontmatter: {
      name: skillName,
      description: task.description,
      license: 'MIT',
      compatibility: 'opencode',
      metadata: {
        source: 'bmad-method',
        module: task.module,
        task: task.name,
        standalone: task.standalone ? 'true' : 'false',
      },
    },
    content: buildTaskSkillContent(task),
    sourceModule: task.module,
    sourceType: 'task',
    sourceName: task.name,
  };
}

export function convertTasks(tasks: BmadTask[]): OpenCodeSkill[] {
  return tasks.map(convertTask);
}
