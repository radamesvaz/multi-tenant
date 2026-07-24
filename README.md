# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Local AI architecture review

Reviews the current git diff against project guidelines in `.ai/` using a local Ollama model. Requires [Ollama](https://ollama.com/) running locally.

```bash
npm run ai:review              # working tree vs HEAD + untracked
npm run ai:review:staged       # staged changes only
npm run ai:review:dry-run      # print prompt only (no Ollama, no save)
npm run ai:review -- --base main   # whole branch vs main
npm run ai:review -- --help        # all flags
```

Optional env: `OLLAMA_HOST` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `qwen3:8b`).

Guidelines live in `.ai/memory/`; reviews are saved under `.ai/reviews/`.
