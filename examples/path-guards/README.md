# Path Guards Example

Demonstrates `$if{var}` / `$ifn{var}` — whole-segment path formulas that
conditionally include or skip files from the rendered output based on
view data.

## What this example shows

- `$if{prod}` / `$ifn{prod}` as **sibling directories** — choose one
  branch per render, the other is pruned before any filesystem descent.
- **Nested guard with a deep variable** (`$if{features.monitoring.enabled}`)
  — multi-level view access works the same as `{{features.monitoring.enabled}}`
  inside templates.
- **Passing formulas collapse to empty segments** — output paths don't
  carry the guard syntax.

## Project structure

```text
path-guards/
├── index.js
├── js-tmpl.config.yaml
├── values.yaml
├── templates/
│   ├── common.yaml.hbs                                      → always written
│   ├── $if{prod}/alerts.yaml.hbs                            → only when prod truthy
│   ├── $ifn{prod}/debug-panel.yaml.hbs                      → only when prod falsy
│   └── $if{features.monitoring.enabled}/dashboard.yaml.hbs  → only when monitoring on
└── templates.partials/
```

## Run it

```bash
node index.js
```

Then change `prod: true` to `prod: false` in [values.yaml](values.yaml)
and re-run — you'll see the output tree swap from `alerts.yaml` to
`debug-panel.yaml`.

Flip `features.monitoring.enabled` to `false` to drop `dashboard.yaml`.

## Output shape — `prod: true`, monitoring on

```text
dist/
├── common.yaml
├── alerts.yaml
└── dashboard.yaml
```

## Output shape — `prod: false`, monitoring off

```text
dist/
├── common.yaml
└── debug-panel.yaml
```

## What's rejected (and why)

- **Guards in filenames** — `folder/$if{a}file.hbs` throws at render time.
  Whole-segment, directories only.
- **Mixed segments** — `$if{a}folder/` throws. Don't put literal content
  alongside a guard in the same segment.
- **Compound logic** — no `else`, `elif`, `and`, `or`, `not`, comparisons.
  Precompute the boolean in values, or split into two files
  (`$if` + `$ifn` pair).
- **Missing variable** — hard error with the template's relative path and
  the variable name. Guards are control flow; typos fail loud.

See [docs/API.md#path-guards--conditional-files](../../docs/API.md#path-guards--conditional-files)
for the full rule set.
