#!/usr/bin/env node

import { convert } from './converter.js';

function parseArgs(args: string[]): { source: string; output: string; verbose: boolean } {
  let source = '';
  let output = '';
  let verbose = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' || arg === '-s') {
      source = args[++i] || '';
    } else if (arg === '--output' || arg === '-o') {
      output = args[++i] || '';
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  
  return { source, output, verbose };
}

function printHelp(): void {
  console.log(`
BMAD to OpenCode Converter

Usage: bmad-convert --source <dir> --output <dir> [options]

Options:
  -s, --source <dir>   Path to BMAD _bmad directory
  -o, --output <dir>   Output directory for OpenCode files
  -v, --verbose        Enable verbose output
  -h, --help           Show this help message

Examples:
  bmad-convert --source ./_bmad --output ./
  bmad-convert -s tests/sources/_bmad -o tests/output -v
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { source, output, verbose } = parseArgs(args);
  
  if (!source || !output) {
    console.error('Error: Both --source and --output are required');
    printHelp();
    process.exit(1);
  }
  
  try {
    const result = await convert({
      sourceDir: source,
      outputDir: output,
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
      console.log(`Converted ${result.agents.length} agents and ${result.skills.length} skills to ${output}`);
    }
  } catch (err) {
    console.error('Conversion failed:', err);
    process.exit(1);
  }
}

main();
