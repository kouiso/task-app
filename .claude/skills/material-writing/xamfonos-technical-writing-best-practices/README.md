# Technical Writing Best Practices

A Claude Code skill for writing clear, confident, and technically credible content for developer audiences.

Built from first principles developed through years of developer content work, covering everything from sentence craft to narrative architecture.

## What's Included

- **SKILL.md** — The Claude Code skill definition
- **technical-writing-style-guide.md** — Full reference with all 26 principles, examples, and application guidance

## Installation

### Recommended (clone directly into Claude Code skills directory)

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/Xamfonos/technical-writing-best-practices.git ~/.claude/skills/technical-writing-best-practices
```

### Manual install (skill file only)

```bash
mkdir -p ~/.claude/skills/technical-writing-best-practices
cp SKILL.md ~/.claude/skills/technical-writing-best-practices/
```

Note: The skill references the style guide for deeper context, so the full clone is recommended.

## Usage

In Claude Code, ask Claude directly:

```
Write a technical blog post about our new API using technical writing best practices
Review this tutorial draft for structure and argument quality
Help me rewrite this section, it's too vague and hedged
```

## Capabilities

### Content Creation
- Write blog posts, tutorials, and API docs grounded in proven writing principles
- Apply the narrative arc automatically: problem → pressure → root cause → solution → adoption
- Structure content around a thesis spine so every section earns its place

### Content Review
- Evaluate drafts against all 26 principles
- Apply the full editing checklist across five domains
- Identify and remove the most common anti-patterns

### Argument & Structure
- Build declarative storytelling with earned transitions
- Check for directional movement vs. sideways drift
- Ensure architectural integrity from introduction to conclusion

## The Five Domains

| Domain | What It Covers |
|---|---|
| **Writing Mindset** | Learning posture, authority, conviction, restraint |
| **Structure and Flow** | Thesis spine, narrative arc, transitions, cognitive pacing |
| **Teaching and Explanation** | Decoupled concepts, mental models, layered insight |
| **Sentence Craft** | Signal density, reader compression, parallel logic, example fidelity |
| **Reasoning and Argument** | Declarative storytelling, earned solutions, code-backed authority |

## Core Principle

> "Don't just tell developers what to do; tell them why the tool works the way it does. Understanding beats memorization."

## Version History

- **1.0.0** — Initial release with 26-principle style guide and SKILL.md

## License

MIT
