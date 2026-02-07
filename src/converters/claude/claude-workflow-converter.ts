import type { BmadWorkflow } from '../../types/bmad.js';
import type { ClaudeCodeSkill } from '../../types/claude.js';

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildWorkflowSkillContent(workflow: BmadWorkflow): string {
  const lines: string[] = [];

  lines.push(`# ${workflow.config.name} Workflow`);
  lines.push('');
  lines.push(workflow.config.description);
  lines.push('');

  if (workflow.config.author) {
    lines.push(`**Author:** ${workflow.config.author}`);
    lines.push('');
  }

  lines.push('## How to Use');
  lines.push('');
  lines.push('This skill provides a structured workflow. Follow the steps below:');
  lines.push('');

  if (workflow.instructionSteps.length > 0) {
    lines.push('## Workflow Steps');
    lines.push('');

    for (const step of workflow.instructionSteps) {
      lines.push(`### Step ${step.n}: ${step.goal}`);
      lines.push('');

      if (step.actions.length > 0) {
        lines.push('**Actions:**');
        for (const action of step.actions) {
          lines.push(`- ${action}`);
        }
        lines.push('');
      }

      if (step.asks.length > 0) {
        lines.push('**Questions to ask:**');
        for (const ask of step.asks) {
          lines.push(`- ${ask}`);
        }
        lines.push('');
      }
    }
  } else if (workflow.instructions) {
    lines.push('## Instructions');
    lines.push('');
    lines.push(workflow.instructions);
    lines.push('');
  }

  if (workflow.template) {
    lines.push('## Output Template');
    lines.push('');
    lines.push('Use the following template structure for output:');
    lines.push('');
    lines.push('```markdown');
    lines.push(workflow.template);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n').trim();
}

export function convertClaudeWorkflow(workflow: BmadWorkflow): ClaudeCodeSkill {
  const skillName = toKebabCase(`bmad-${workflow.module}-${workflow.name}`);

  return {
    name: skillName,
    folder: skillName,
    frontmatter: {
      name: skillName,
      description: workflow.config.description,
    },
    content: buildWorkflowSkillContent(workflow),
    sourceModule: workflow.module,
    sourceType: 'workflow',
    sourceName: workflow.name,
  };
}

export function convertClaudeWorkflows(workflows: BmadWorkflow[]): ClaudeCodeSkill[] {
  return workflows.map(convertClaudeWorkflow);
}
