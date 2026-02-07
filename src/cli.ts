#!/usr/bin/env node

import { convert } from './converter.js';
import type { ConversionTarget } from './converter.js';

const VALID_TARGETS: ConversionTarget[] = ['opencode', 'claude', 'agents'];

function parseArgs(args: string[]): {
  source: string;
  output: string;
  target: ConversionTarget;
  verbose: boolean;
} {
  let source = '';
  let output = '';
  let target: ConversionTarget = 'opencode';
  let verbose = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' || arg === '-s') {
      source = args[++i] || '';
    } else if (arg === '--output' || arg === '-o') {
      output = args[++i] || '';
    } else if (arg === '--target' || arg === '-t') {
      const val = args[++i] || '';
      if (!VALID_TARGETS.includes(val as ConversionTarget)) {
        console.error(`Error: Invalid target '${val}'. Must be one of: ${VALID_TARGETS.join(', ')}`);
        process.exit(1);
      }
      target = val as ConversionTarget;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  
  return { source, output, target, verbose };
}

function printHelp(): void {
  console.log(`
BMAD Module Converter

Usage: bmad-convert --source <dir> --output <dir> [options]

Options:
  -s, --source <dir>     Path to BMAD _bmad directory
  -o, --output <dir>     Output directory
  -t, --target <format>  Target format: opencode (default), claude, agents
  -v, --verbose          Enable verbose output
  -h, --help             Show this help message

Targets:
  opencode   Output to .opencode/ (OpenCode agents + skills)
  claude     Output to .claude/ (Claude Code agents + skills)
  agents     Output to .agents/ (Cross-IDE agents + skills)

Examples:
  bmad-convert --source ./_bmad --output ./
  bmad-convert -s ./_bmad -o ./ -t claude
  bmad-convert -s tests/sources/_bmad -o tests/output -t agents -v
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { source, output, target, verbose } = parseArgs(args);
  
  if (!source || !output) {
    console.error('Error: Both --source and --output are required');
    printHelp();
    process.exit(1);
  }
  
  try {
    const result = await convert({
      sourceDir: source,
      outputDir: output,
      target,
      verbose,
    });
    
    if (result.errors.length > 0) {
      console.error('\nErrors:');
      for (const error of result.errors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }
    
    if (!verbose) {
      const formatLabel = target === 'opencode' ? '.opencode/' : target === 'claude' ? '.claude/' : '.agents/';
      console.log(`Converted ${result.agentCount} agents and ${result.skillCount} skills to ${formatLabel} in ${output}`);
    }
  } catch (err) {
    console.error('Conversion failed:', err);
    process.exit(1);
  }
}

main();
