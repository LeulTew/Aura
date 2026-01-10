# AI Agent Rules & Best Practices

> "Do it right or don't do it at all." — 2026 Standards

## 1. Code Quality & Standards

- **Zero `any` Policy**: Never use the `any` type in TypeScript. Find the correct type, define a new interface, or use `unknown` with proper type guards.
- **Strict Typing**: All functions must have return types. All props must be typed.
- **Modern Syntax (2026)**: Use the latest stable features (React Compiler, Server Actions, Python 3.12+ features).
- **Package Manager**: Always use **`pnpm`** (or `bun` if requested). Never `npm`.

## 2. Problem Solving Philosophy

- **Root Cause Analysis**: Never apply a "band-aid" or workaround (e.g., `// @ts-ignore`, high `z-index` hacks, timeout loops).
- **Research First**: diverse problems require diverse solutions. Check official docs for the latest APIs before coding.
- **Deprecation Awareness**: Do not use deprecated libraries or methods (e.g., avoid `create-react-app`, `Page Router`, `deepface`).

## 3. Preservation & Legacy

- **Respect History**: Never delete legacy code marked for reference (e.g., "LEGACY DEEPFACE IMPLEMENTATION"). Comment it out, wrap it in a `deprecated/` folder, or keep it alongside with clear comments.
- **Context Awareness**: Before rewriting a file, understand _why_ it was written that way.

## 4. Architecture & Stack

- **Persistence**: Prefer **Supabase (Postgres + pgvector)** for "forever free" scalable backends over ephemeral local solutions.
- **State Management**: Use **Dexie.js** (IndexedDB) for complex client-side caching/offline states.
- **Cost Efficiency**: Optimize for free-tier constraints (e.g., use lazy loading, edge caching, minimal container sizes).

## 5. User Interaction

- **Proactive Planning**: Plan implementation steps clearly before executing.
- **Transparency**: Explain _why_ a technical choice was made (e.g., "Choosing Supabase over LanceDB because Render Free Tier has ephemeral storage").

---

_These rules are valid as of 2026 and should be followed strictly._
