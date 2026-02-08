import * as path from 'path';
import * as fs from 'fs/promises';
import { parseMarkdown } from '../parsers/markdown-parser.js';
import type { BMADWorkflowManifestRow } from '../types/bmad.js';
import type { OpenCodeSkill } from '../types/opencode.js';

export async function convertWorkflow(
  manifest: BMADWorkflowManifestRow,
  bmadDir: string
): Promise<OpenCodeSkill> {
  const relativePath = manifest.path.replace(/^_bmad\//, '');
  const workflowPath = path.join(bmadDir, relativePath);
  const workflowDir = path.dirname(workflowPath);
  
  const parsed = await parseMarkdown(workflowPath);
  let content = parsed.content;
  
  // Look for template.md or any *.template.md file
  try {
    const files = await fs.readdir(workflowDir);
    const templateFile = files.find(f => f === 'template.md' || f.endsWith('.template.md'));
    if (templateFile) {
      const template = await fs.readFile(path.join(workflowDir, templateFile), 'utf-8');
      content += '\n\n## Template\n\n' + template;
    }
  } catch {
  }
  
  const stepsDir = path.join(workflowDir, 'steps');
  try {
    const stepFiles = await fs.readdir(stepsDir);
    for (const file of stepFiles.sort()) {
      if (file.match(/^step-\d+.*\.md$/)) {
        const stepContent = await fs.readFile(path.join(stepsDir, file), 'utf-8');
        content += '\n\n' + stepContent;
      }
    }
  } catch {
  }
  
  const skillName = createWorkflowSkillName(manifest);
  
  return {
    name: skillName,
    frontmatter: {
      name: skillName,
      description: manifest.description || parsed.frontmatter.description || manifest.name
    },
    content
  };
}

function createWorkflowSkillName(manifest: BMADWorkflowManifestRow): string {
  if (manifest.module === 'core') {
    return `bmad-${manifest.name}`;
  }
  return `bmad-${manifest.module}-${manifest.name}`;
}
