# Value Partials Example

Demonstrates `--values-dir` — composing `view` from multiple structured
files by directory namespace, no merge semantics, hard errors on collision.

## Project structure

```text
value-partials/
├── index.js
├── js-tmpl.config.yaml
├── app.yaml                              → view.project.*
├── values/
│   ├── stages/
│   │   ├── prod.yaml                     → view.stages.prod.*
│   │   └── dev.yaml                      → view.stages.dev.*
│   ├── services/
│   │   └── api.yaml                      → view.services.api.*
│   └── @shared/
│       └── constants.yaml                → view.constants.*   (@-flattened)
└── templates/
    └── summary.yaml.hbs
```

Note the chosen top-level namespace is `stages` rather than `env` — the
`env` namespace is reserved for allowlisted environment variables and
throws if a value partial tries to claim it (collision rule C-3).

## Run it

```bash
node index.js
```

## Composed view

```javascript
{
  project: { name: 'checkout-service', owner: 'platform-team' },
  stages: {
    prod: { replicas: 3, log_level: 'warn' },
    dev:  { replicas: 1, log_level: 'debug' }
  },
  services: {
    api: { port: 8080, image: 'ghcr.io/example/api:latest' }
  },
  constants: { max_retries: 5, timeout_ms: 30000 },
  env: {}
}
```

## What's rejected

- **C-1** — `valuesFile` inside `valuesDir`: hard error at config time.
- **C-2** — `app.yaml` has key `services` and `values/services.yaml` exists:
  hard error naming both sources.
- **C-3** — a top-level `env` namespace in `valuesDir` conflicts with the
  reserved env namespace: hard error.
- **Duplicates** — two files that resolve to the same namespace throw,
  naming both (e.g. `app.yaml` at root and `@shared/app.yaml`).
- **Shadow collisions** — `stages.yaml` at root and `stages/prod.yaml`
  can't coexist. A leaf can't simultaneously be a sub-tree.

See [docs/API.md#value-partials-valuesdir](../../docs/API.md#value-partials-valuesdir) for the full rule set.
