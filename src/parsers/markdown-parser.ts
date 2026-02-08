import * as fs from 'fs/promises';

export interface ParsedMarkdown {
  frontmatter: Record<string, string>;
  content: string;
}

export async function parseMarkdown(filePath: string): Promise<ParsedMarkdown> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseMarkdownContent(content);
}

export function parseMarkdownContent(content: string): ParsedMarkdown {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return {
      frontmatter: {},
      content: content.trim()
    };
  }
  
  const frontmatterText = match[1];
  const bodyContent = match[2].trim();
  
  const frontmatter: Record<string, string> = {};
  const lines = frontmatterText.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    frontmatter[key] = value.replace(/^["']|["']$/g, '');
  }
  
  return {
    frontmatter,
    content: bodyContent
  };
}
