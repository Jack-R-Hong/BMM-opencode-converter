# BMAD to OpenCode Converter

Convert [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) modules to [OpenCode](https://opencode.ai) plugins.

## Installation

```bash
npx bmad-opencode-converter --source <bmad-dir> --output <output-dir>
```

Or install globally:

```bash
npm install -g bmad-opencode-converter
bmad-convert --source <bmad-dir> --output <output-dir>
```

## Usage

### Convert BMAD to OpenCode

```bash
# Convert from _bmad directory to current project
npx bmad-opencode-converter --source ./_bmad --output ./ --verbose

# Convert to a specific output directory
npx bmad-opencode-converter -s ./_bmad -o ./my-opencode-project -v
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--source` | `-s` | Path to BMAD `_bmad` directory |
| `--output` | `-o` | Output directory for OpenCode files |
| `--verbose` | `-v` | Show detailed conversion progress |
| `--help` | `-h` | Show help message |

## Conversion Mapping

| BMAD Component | OpenCode Output |
|----------------|-----------------|
| Agent (persona, menu, rules) | `.opencode/agents/*.md` + `.opencode/skills/*/SKILL.md` |
| Workflow (yaml + instructions) | `.opencode/skills/*/SKILL.md` |
| Task (standalone instructions) | `.opencode/skills/*/SKILL.md` |

## Output Structure

After conversion, your project will have:

```
your-project/
├── .opencode/
│   ├── agents/           # OpenCode agent definitions
│   │   ├── bmm-dev.md
│   │   ├── bmm-pm.md
│   │   ├── cis-storyteller.md
│   │   └── ...
│   └── skills/           # OpenCode skill definitions
│       ├── bmad-bmm-dev-story/
│       │   └── SKILL.md
│       ├── bmad-bmm-create-prd/
│       │   └── SKILL.md
│       ├── bmad-cis-storytelling/
│       │   └── SKILL.md
│       └── ...
└── ...
```

---

## After Conversion: Using OpenCode Plugins

### 1. Verify Generated Files

Check that the conversion created the expected files:

```bash
ls .opencode/agents/     # Should list agent .md files
ls .opencode/skills/     # Should list skill directories
```

### 2. Using Converted Agents

Converted BMAD agents are available as OpenCode subagents. You can:

**Switch to an agent** using Tab or your configured `switch_agent` keybind.

**Invoke via @ mention** in your message:
```
@bmm-dev implement the user authentication feature
@cis-storyteller help me craft a product narrative
@bmm-architect review the system design
```

**Available agents include:**
- `bmm-dev` - Developer Agent (Amelia)
- `bmm-pm` - Product Manager (John)
- `bmm-architect` - System Architect (Winston)
- `bmm-analyst` - Business Analyst (Mary)
- `bmm-qa` - QA Engineer (Quinn)
- `cis-storyteller` - Master Storyteller (Sophia)
- `tea-tea` - Test Architect (Murat)
- And more...

### 3. Using Converted Skills

Skills are loaded on-demand. OpenCode agents can invoke them automatically, or you can request them explicitly:

```
Load the bmad-bmm-create-prd skill and help me create a PRD
```

**Workflow skills include:**
- `bmad-bmm-create-prd` - Create Product Requirements Document
- `bmad-bmm-create-architecture` - Design system architecture
- `bmad-bmm-dev-story` - Implement user stories
- `bmad-bmm-code-review` - Adversarial code review
- `bmad-cis-storytelling` - Craft compelling narratives
- `bmad-tea-testarch-automate` - Generate test automation

### 4. Configuring Permissions

Edit `opencode.json` to control agent/skill access:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "skill": {
      "*": "allow",
      "bmad-*": "allow"
    }
  },
  "agent": {
    "bmm-dev": {
      "permission": {
        "bash": "allow",
        "edit": "allow"
      }
    }
  }
}
```

### 5. Customizing Converted Agents

Edit the generated agent files to customize behavior:

```markdown
---
description: "Developer Agent"
mode: subagent
model: anthropic/claude-sonnet-4-20250514  # Add custom model
temperature: 0.2                            # Adjust temperature
tools:
  write: true
  edit: true
  bash: true
---

Your customized prompt here...
```

### 6. Adding to npm Package (Optional)

To distribute as an npm package, add to your `opencode.json`:

```json
{
  "plugin": ["your-bmad-opencode-plugin"]
}
```

---

## Example: Full Workflow

```bash
# 1. Install BMAD to your project
npx bmad-method install

# 2. Convert to OpenCode format
npx bmad-opencode-converter --source ./_bmad --output ./ --verbose

# 3. Start OpenCode
opencode

# 4. Use converted agents
# Type: @bmm-pm help me define the product requirements
```

---

## Conversion Details

### Agent Conversion

Each BMAD agent produces:

1. **OpenCode Agent** (`.opencode/agents/{module}-{name}.md`)
   - Persona as system prompt
   - Mode set to `subagent`
   - Full tool access enabled

2. **OpenCode Skill** (`.opencode/skills/bmad-{module}-{name}/SKILL.md`)
   - Activation steps preserved
   - Menu commands documented
   - Workflow references included

### Workflow Conversion

Each BMAD workflow produces a skill with:
- Step-by-step instructions
- Questions to ask at each step
- Output template (if defined)
- Supporting data file references

### Task Conversion

Each BMAD task produces a skill with:
- Task instructions (cleaned from XML)
- Standalone execution guidance

---

## Troubleshooting

### "No manifest files found"

Ensure you're pointing to the correct `_bmad` directory:
```bash
# Check manifest exists
ls ./_bmad/_config/agent-manifest.csv

# Run with correct path
npx bmad-opencode-converter --source ./_bmad --output ./
```

### Agent names look wrong

Agent IDs are extracted from BMAD paths. Some duplication (e.g., `storyteller-storyteller`) comes from nested directory structures in BMAD.

### Skills not loading

1. Check skill name follows pattern: lowercase alphanumeric with single hyphens
2. Verify `SKILL.md` exists in the skill folder
3. Check permissions in `opencode.json`

---

## Development

```bash
# Clone and install
git clone <repo-url>
cd bmad-opencode-converter
npm install

# Run tests with sample data
npm test

# Build for distribution
npm run build

# Run locally without build
npm run dev -- --source ./_bmad --output ./output --verbose

# Clean output
npm run clean
```

## License

MIT
