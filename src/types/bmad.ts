/**
 * BMAD Type Definitions
 * Based on BMAD-METHOD v6.0.0-Beta.6
 */

// ============================================================================
// Manifest Types
// ============================================================================

export interface BmadModuleInfo {
  name: string;
  version: string;
  installDate: string;
  lastUpdated: string;
  source: 'built-in' | 'external';
  npmPackage: string | null;
  repoUrl: string | null;
}

export interface BmadInstallation {
  version: string;
  installDate: string;
  lastUpdated: string;
}

export interface BmadManifest {
  installation: BmadInstallation;
  modules: BmadModuleInfo[];
  ides: string[];
}

// ============================================================================
// Agent Manifest (CSV)
// ============================================================================

export interface BmadAgentManifestEntry {
  name: string;
  displayName: string;
  title: string;
  icon: string;
  role: string;
  identity: string;
  communicationStyle: string;
  principles: string;
  module: string;
  path: string;
}

// ============================================================================
// Workflow Manifest (CSV)
// ============================================================================

export interface BmadWorkflowManifestEntry {
  name: string;
  description: string;
  module: string;
  path: string;
}

// ============================================================================
// Task Manifest (CSV)
// ============================================================================

export interface BmadTaskManifestEntry {
  name: string;
  displayName: string;
  description: string;
  module: string;
  path: string;
  standalone: string; // "true" or "false"
}

// ============================================================================
// Agent Definition (parsed from .md file)
// ============================================================================

export interface BmadAgentPersona {
  role: string;
  identity: string;
  communicationStyle: string;
  principles: string[];
}

export interface BmadAgentMenuItem {
  cmd: string;
  label: string;
  workflow?: string;
  exec?: string;
  data?: string;
  action?: string;
}

export interface BmadAgentActivation {
  steps: string[];
  rules: string[];
  menuHandlers: Record<string, string>;
}

export interface BmadAgent {
  id: string;
  name: string;
  title: string;
  icon: string;
  module: string;
  path: string;
  frontmatter: {
    name: string;
    description: string;
  };
  persona: BmadAgentPersona;
  activation: BmadAgentActivation;
  menu: BmadAgentMenuItem[];
  rawContent: string;
}

// ============================================================================
// Workflow Definition
// ============================================================================

export interface BmadWorkflowConfig {
  name: string;
  description: string;
  author?: string;
  configSource?: string;
  outputFolder?: string;
  installedPath?: string;
  template?: string;
  instructions?: string;
  standalone?: boolean;
  variables: Record<string, string>;
  dataFiles: Record<string, string>;
}

export interface BmadWorkflowStep {
  n: number;
  goal: string;
  actions: string[];
  asks: string[];
  checks: string[];
  templateOutputs: string[];
}

export interface BmadWorkflow {
  name: string;
  module: string;
  path: string;
  config: BmadWorkflowConfig;
  instructions: string;
  instructionSteps: BmadWorkflowStep[];
  template?: string;
  supportingFiles: Record<string, string>;
}

// ============================================================================
// Task Definition
// ============================================================================

export interface BmadTask {
  name: string;
  displayName: string;
  description: string;
  module: string;
  path: string;
  standalone: boolean;
  content: string;
  isXml: boolean;
}

// ============================================================================
// Module Configuration
// ============================================================================

export interface BmadModuleConfig {
  userName?: string;
  communicationLanguage?: string;
  documentOutputLanguage?: string;
  outputFolder?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// Complete BMAD Module
// ============================================================================

export interface BmadModule {
  name: string;
  version: string;
  config: BmadModuleConfig;
  agents: BmadAgent[];
  workflows: BmadWorkflow[];
  tasks: BmadTask[];
}

// ============================================================================
// Complete BMAD Installation
// ============================================================================

export interface BmadInstallationData {
  manifest: BmadManifest;
  modules: BmadModule[];
  agentManifest: BmadAgentManifestEntry[];
  workflowManifest: BmadWorkflowManifestEntry[];
  taskManifest: BmadTaskManifestEntry[];
}
