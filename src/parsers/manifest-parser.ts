import * as path from 'path';
import { parseCSV } from './csv-parser.js';
import type { BMADAgentManifestRow, BMADWorkflowManifestRow, BMADTaskManifestRow } from '../types/bmad.js';

export interface BMADManifests {
  agents: BMADAgentManifestRow[];
  workflows: BMADWorkflowManifestRow[];
  tasks: BMADTaskManifestRow[];
}

export async function parseManifests(bmadDir: string): Promise<BMADManifests> {
  const configDir = path.join(bmadDir, '_config');
  
  const [agents, workflows, tasks] = await Promise.all([
    parseCSV<BMADAgentManifestRow>(path.join(configDir, 'agent-manifest.csv')).catch(() => []),
    parseCSV<BMADWorkflowManifestRow>(path.join(configDir, 'workflow-manifest.csv')).catch(() => []),
    parseCSV<BMADTaskManifestRow>(path.join(configDir, 'task-manifest.csv')).catch(() => [])
  ]);
  
  return { agents, workflows, tasks };
}
