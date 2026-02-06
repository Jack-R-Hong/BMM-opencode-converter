import YAML from 'yaml';
import type { BmadManifest, BmadModuleConfig, BmadWorkflowConfig } from '../types/index.js';

export function parseManifestYaml(content: string): BmadManifest {
  const data = YAML.parse(content);
  return {
    installation: {
      version: data.installation?.version || '',
      installDate: data.installation?.installDate || '',
      lastUpdated: data.installation?.lastUpdated || '',
    },
    modules: (data.modules || []).map((m: Record<string, unknown>) => ({
      name: String(m.name || ''),
      version: String(m.version || ''),
      installDate: String(m.installDate || ''),
      lastUpdated: String(m.lastUpdated || ''),
      source: m.source === 'external' ? 'external' : 'built-in',
      npmPackage: m.npmPackage ? String(m.npmPackage) : null,
      repoUrl: m.repoUrl ? String(m.repoUrl) : null,
    })),
    ides: data.ides || [],
  };
}

export function parseModuleConfig(content: string): BmadModuleConfig {
  const data = YAML.parse(content) || {};
  return {
    userName: data.user_name,
    communicationLanguage: data.communication_language,
    documentOutputLanguage: data.document_output_language,
    outputFolder: data.output_folder,
    ...data,
  };
}

export function parseWorkflowConfig(content: string): BmadWorkflowConfig {
  const data = YAML.parse(content) || {};
  
  const variables: Record<string, string> = {};
  const dataFiles: Record<string, string> = {};
  
  const knownKeys = [
    'name', 'description', 'author', 'config_source', 'output_folder',
    'installed_path', 'template', 'instructions', 'standalone',
    'user_name', 'communication_language', 'date', 'default_output_file'
  ];
  
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.includes(key) && typeof value === 'string') {
      if (key.endsWith('_frameworks') || key.endsWith('_types') || key.endsWith('_methods')) {
        dataFiles[key] = value;
      } else {
        variables[key] = value;
      }
    }
  }

  return {
    name: data.name || '',
    description: data.description || '',
    author: data.author,
    configSource: data.config_source,
    outputFolder: data.output_folder,
    installedPath: data.installed_path,
    template: data.template,
    instructions: data.instructions,
    standalone: data.standalone === true,
    variables,
    dataFiles,
  };
}
