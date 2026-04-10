# Tools

## Paperclip Skill

Use the `paperclip` skill for all task management and coordination.

## para-memory-files Skill

Use for all memory operations: storing facts, writing daily notes, managing plans.

## Figma MCP

Use the `mcp__claude_ai_Figma__*` tools for reading Figma designs, getting design context, screenshots, metadata, and generating FigJam diagrams. Available tools:
- `get_design_context` — primary tool for design-to-code workflows; returns code, screenshot, and hints
- `get_screenshot` — visual snapshot of a Figma node
- `get_metadata` — file and component metadata
- `get_figjam` — read FigJam boards
- `generate_diagram` — create diagrams in FigJam
- `get_variable_defs` — read design tokens/variables from a Figma file

## Canva MCP

Use the `mcp__claude_ai_Canva__*` tools for creating and managing Canva designs. Available tools:
- `generate_design` / `generate_design_structured` — create new designs from prompts
- `get_design` / `get_design_content` / `get_design_pages` — read existing designs
- `perform_editing_operations` — make edits within a transaction
- `start_editing_transaction` / `commit_editing_transaction` / `cancel_editing_transaction` — transactional editing flow
- `export_design` — export finished designs
- `upload_asset_from_url` — import images into Canva
- `list_brand_kits` — access brand colors, fonts, and logos
- `search_designs` — find existing designs

## Design Tools (External Access)

| Tool | Access Method | Use Case |
|------|--------------|---------|
| **Figma** | Figma MCP | UI/UX design, design systems, developer handoff |
| **FigJam** | Figma MCP `get_figjam` | Collaborative whiteboards, journey maps |
| **Canva** | Canva MCP | Marketing assets, social graphics, brand templates |
| **Adobe Firefly** | Web / Adobe CC | Commercially safe AI image generation |
| **Midjourney** | Web (manual) | Creative ideation and mood boards |
| **Frame.io** | Web (manual) | Video review and approval workflows |

## Web Research

Use `WebFetch` for reading web pages and `WebSearch` (via Agent tool) for researching industry best practices, competitor creative, and design trends.

## Design System Tools (Reference)

These tools are part of the recommended design system workflow but accessed externally:

- **Tokens Studio for Figma** — Figma plugin for design token management and code sync
- **Style Dictionary** — Open-source token transformer (Figma → CSS/iOS/Android)
- **Zeroheight / Supernova** — Living style guide documentation platforms (auto-sync with Figma)
- **Storybook** — Component explorer and documentation for development teams
