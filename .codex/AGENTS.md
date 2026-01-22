# Codex Agent Instructions

## Project Summary

- js-tmpl is a deterministic file templating engine built on Handlebars.
- ESM only; Node >= 20; package manager is pnpm.
- CLI entry: `bin/js-tmpl` -> `src/cli/main.js`; programmatic API in `src/index.js`.

## Repository Layout

- `src/cli/`: CLI arg parsing and command dispatch.
- `src/config/`: defaults, config loading, view building, precedence rules.
- `src/engine/`: tree walking, path rendering, content rendering, partials.
- `src/utils/`: small fs/object helpers.
- `tests/`: Node test runner suites.

## Commands

- Install deps: `pnpm install`
- Run CLI: `pnpm dev` or `node src/cli/main.js`
- Tests: `pnpm test` (watch: `pnpm test:watch`, coverage: `pnpm test:coverage`)

## Conventions and Guardrails

- Use ESM syntax and include `.js` in import specifiers.
- Preserve deterministic output: avoid time- or random-based behavior.
- Respect config precedence: defaults < project config < CLI args.
- Paths use `${var}` placeholders; file content uses Handlebars templates.
- Update tests/docs when behavior or CLI/config changes.
