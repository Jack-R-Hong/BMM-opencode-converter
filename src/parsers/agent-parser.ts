import type { BmadAgent, BmadAgentPersona, BmadAgentMenuItem, BmadAgentActivation } from '../types/index.js';

interface ParsedFrontmatter {
  name: string;
  description: string;
}

function parseFrontmatter(content: string): { frontmatter: ParsedFrontmatter; body: string } {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!fmMatch) {
    return {
      frontmatter: { name: '', description: '' },
      body: content,
    };
  }

  const fmLines = fmMatch[1].split('\n');
  const fm: ParsedFrontmatter = { name: '', description: '' };
  
  for (const line of fmLines) {
    const match = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'name') fm.name = value;
      if (key === 'description') fm.description = value;
    }
  }

  return { frontmatter: fm, body: fmMatch[2] };
}

function extractXmlContent(body: string): string | null {
  const codeBlockMatch = body.match(/```xml\s*([\s\S]*?)```/);
  return codeBlockMatch ? codeBlockMatch[1].trim() : null;
}

function extractAgentAttributes(xml: string): { id: string; name: string; title: string; icon: string } {
  const agentMatch = xml.match(/<agent\s+([^>]*)>/);
  if (!agentMatch) {
    return { id: '', name: '', title: '', icon: '' };
  }

  const attrs = agentMatch[1];
  const getId = (s: string) => s.match(/id="([^"]*)"/)?.[1] || '';
  const getName = (s: string) => s.match(/name="([^"]*)"/)?.[1] || '';
  const getTitle = (s: string) => s.match(/title="([^"]*)"/)?.[1] || '';
  const getIcon = (s: string) => s.match(/icon="([^"]*)"/)?.[1] || '';

  return {
    id: getId(attrs),
    name: getName(attrs),
    title: getTitle(attrs),
    icon: getIcon(attrs),
  };
}

function extractPersona(xml: string): BmadAgentPersona {
  const personaMatch = xml.match(/<persona>([\s\S]*?)<\/persona>/);
  if (!personaMatch) {
    return { role: '', identity: '', communicationStyle: '', principles: [] };
  }

  const personaXml = personaMatch[1];
  const role = personaXml.match(/<role>([\s\S]*?)<\/role>/)?.[1]?.trim() || '';
  const identity = personaXml.match(/<identity>([\s\S]*?)<\/identity>/)?.[1]?.trim() || '';
  const commStyle = personaXml.match(/<communication_style>([\s\S]*?)<\/communication_style>/)?.[1]?.trim() || '';
  const principlesRaw = personaXml.match(/<principles>([\s\S]*?)<\/principles>/)?.[1]?.trim() || '';
  
  const principles = principlesRaw
    .split(/\s*-\s*/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return { role, identity, communicationStyle: commStyle, principles };
}

function extractActivation(xml: string): BmadAgentActivation {
  const activationMatch = xml.match(/<activation[^>]*>([\s\S]*?)<\/activation>/);
  if (!activationMatch) {
    return { steps: [], rules: [], menuHandlers: {} };
  }

  const activationXml = activationMatch[1];
  
  const steps: string[] = [];
  const stepMatches = activationXml.matchAll(/<step[^>]*>([\s\S]*?)<\/step>/g);
  for (const match of stepMatches) {
    steps.push(match[1].trim());
  }

  const rules: string[] = [];
  const rulesMatch = activationXml.match(/<rules>([\s\S]*?)<\/rules>/);
  if (rulesMatch) {
    const ruleMatches = rulesMatch[1].matchAll(/<r>([\s\S]*?)<\/r>/g);
    for (const match of ruleMatches) {
      rules.push(match[1].trim());
    }
  }

  const menuHandlers: Record<string, string> = {};
  const handlersMatch = activationXml.match(/<menu-handlers>([\s\S]*?)<\/menu-handlers>/);
  if (handlersMatch) {
    const handlerMatches = handlersMatch[1].matchAll(/<handler\s+type="([^"]*)">([\s\S]*?)<\/handler>/g);
    for (const match of handlerMatches) {
      menuHandlers[match[1]] = match[2].trim();
    }
  }

  return { steps, rules, menuHandlers };
}

function extractMenu(xml: string): BmadAgentMenuItem[] {
  const menuMatch = xml.match(/<menu>([\s\S]*?)<\/menu>/);
  if (!menuMatch) return [];

  const items: BmadAgentMenuItem[] = [];
  const itemMatches = menuMatch[1].matchAll(/<item\s+([^>]*)>([^<]*)<\/item>/g);
  
  for (const match of itemMatches) {
    const attrs = match[1];
    const label = match[2].trim();
    
    const cmd = attrs.match(/cmd="([^"]*)"/)?.[1] || '';
    const workflow = attrs.match(/workflow="([^"]*)"/)?.[1];
    const exec = attrs.match(/exec="([^"]*)"/)?.[1];
    const data = attrs.match(/data="([^"]*)"/)?.[1];
    const action = attrs.match(/action="([^"]*)"/)?.[1];

    items.push({ cmd, label, workflow, exec, data, action });
  }

  return items;
}

export function parseAgent(content: string, module: string, path: string): BmadAgent {
  const { frontmatter, body } = parseFrontmatter(content);
  const xml = extractXmlContent(body);
  
  if (!xml) {
    return {
      id: frontmatter.name,
      name: frontmatter.name,
      title: frontmatter.description,
      icon: '',
      module,
      path,
      frontmatter,
      persona: { role: '', identity: '', communicationStyle: '', principles: [] },
      activation: { steps: [], rules: [], menuHandlers: {} },
      menu: [],
      rawContent: content,
    };
  }

  const attrs = extractAgentAttributes(xml);
  const persona = extractPersona(xml);
  const activation = extractActivation(xml);
  const menu = extractMenu(xml);

  return {
    id: attrs.id || frontmatter.name,
    name: attrs.name || frontmatter.name,
    title: attrs.title || frontmatter.description,
    icon: attrs.icon,
    module,
    path,
    frontmatter,
    persona,
    activation,
    menu,
    rawContent: content,
  };
}
