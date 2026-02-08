// BMAD Type Definitions

export interface BMADAgentManifestRow {
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
  [key: string]: string;
}

export interface BMADWorkflowManifestRow {
  name: string;
  description: string;
  module: string;
  path: string;
  [key: string]: string;
}

export interface BMADTaskManifestRow {
  name: string;
  displayName: string;
  description: string;
  module: string;
  path: string;
  standalone: string;
  [key: string]: string;
}

export interface BMADAgentFile {
  frontmatter: {
    name: string;
    description: string;
  };
  content: string;
}

export interface BMADWorkflowFile {
  frontmatter: {
    name: string;
    description: string;
  };
  content: string;
}

export interface BMADTaskFile {
  frontmatter: {
    name: string;
    description: string;
  };
  content: string;
}
