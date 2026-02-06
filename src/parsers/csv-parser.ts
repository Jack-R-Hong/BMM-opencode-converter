import { parse } from 'csv-parse/sync';
import type {
  BmadAgentManifestEntry,
  BmadWorkflowManifestEntry,
  BmadTaskManifestEntry,
} from '../types/index.js';

export function parseAgentManifest(csvContent: string): BmadAgentManifestEntry[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: Record<string, string>) => ({
    name: record.name || '',
    displayName: record.displayName || '',
    title: record.title || '',
    icon: record.icon || '',
    role: record.role || '',
    identity: record.identity || '',
    communicationStyle: record.communicationStyle || '',
    principles: record.principles || '',
    module: record.module || '',
    path: record.path || '',
  }));
}

export function parseWorkflowManifest(csvContent: string): BmadWorkflowManifestEntry[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: Record<string, string>) => ({
    name: record.name || '',
    description: record.description || '',
    module: record.module || '',
    path: record.path || '',
  }));
}

export function parseTaskManifest(csvContent: string): BmadTaskManifestEntry[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: Record<string, string>) => ({
    name: record.name || '',
    displayName: record.displayName || '',
    description: record.description || '',
    module: record.module || '',
    path: record.path || '',
    standalone: record.standalone || 'false',
  }));
}
