import * as path from 'path';
import { parseMarkdown } from '../parsers/markdown-parser.js';
import type { BMADTaskManifestRow } from '../types/bmad.js';
import type { OpenCodeSkill } from '../types/opencode.js';

export async function convertTask(
  manifest: BMADTaskManifestRow,
  bmadDir: string
): Promise<OpenCodeSkill> {
  const relativePath = manifest.path.replace(/^_bmad\//, '');
  const taskPath = path.join(bmadDir, relativePath);
  const parsed = await parseMarkdown(taskPath);
  
  const skillName = createTaskSkillName(manifest);
  
  return {
    name: skillName,
    frontmatter: {
      name: skillName,
      description: manifest.description || parsed.frontmatter.description || manifest.displayName
    },
    content: parsed.content
  };
}

function createTaskSkillName(manifest: BMADTaskManifestRow): string {
  if (manifest.module === 'core') {
    return `bmad-${manifest.name}`;
  }
  return `bmad-${manifest.module}-${manifest.name}`;
}
