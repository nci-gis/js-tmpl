---
name: handlebars-helpers
description: >
  Guides implementation and review of Handlebars helper registration logic,
  specifically the registerHelpers(hbs, helpersMap) utility. Use this skill
  when writing, testing, or reviewing code that registers custom helpers on
  a scoped Handlebars instance.
---

## Trigger

This skill activates whenever:

- Implementing or modifying `src/engine/helpers.js`
- Writing or reviewing tests in `tests/unit/engine/helpers.test.js`
- Adding custom helpers to a scoped Handlebars instance
- A user asks about helper registration, helper validation, or helper collision rules
- Debugging template errors related to missing or misconfigured helpers

## Handlebars Helper Types

Helpers registered via `hbs.registerHelper(name, fn)` fall into two categories.

### Simple (Inline) Helpers

Invoked as `{{helperName arg1 arg2 key=value}}`. The function receives positional
arguments followed by an `options` object as the last parameter.

```js
// Registration
hbs.registerHelper('uppercase', (str) => str.toUpperCase());

// Template usage
// {{uppercase name}} → "ALICE"
```

The `options` object (always last param) contains:

| Property       | Purpose                                     |
| -------------- | ------------------------------------------- |
| `options.hash` | Key-value pairs from `key=value` syntax     |
| `options.data` | `@data` variables (e.g., `@root`, `@index`) |

### Block Helpers

Invoked as `{{#helperName}}...{{/helperName}}`. The function receives an
`options` object with additional block-specific properties.

```js
// Registration
hbs.registerHelper('bold', function (options) {
  return '<b>' + options.fn(this) + '</b>';
});

// Template usage
// {{#bold}}Hello{{/bold}} → "<b>Hello</b>"
```

Block-specific `options` properties:

| Property          | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `options.fn`      | Renders the block body with a given context                          |
| `options.inverse` | Renders the `{{else}}` block (noop if absent)                        |
| `options.hash`    | Key-value pairs from the opening tag                                 |
| `options.data`    | `@data` variables; extend via `Handlebars.createFrame(options.data)` |

## Built-in Helpers (Collision-Sensitive)

A fresh `Handlebars.create()` instance registers these 8 helpers as own
properties on `hbs.helpers`:

| Name                 | Type   | Purpose                              |
| -------------------- | ------ | ------------------------------------ |
| `if`                 | Block  | Conditional rendering                |
| `unless`             | Block  | Inverse conditional                  |
| `each`               | Block  | Iterate arrays/objects               |
| `with`               | Block  | Change context scope                 |
| `lookup`             | Inline | Dynamic property lookup              |
| `log`                | Inline | Log to console via Handlebars logger |
| `helperMissing`      | Hook   | Called when helper not found         |
| `blockHelperMissing` | Hook   | Called when block matches a property |

**All 8 names must be treated as collisions** by `registerHelpers`. Users who
intentionally override built-ins must use `hbs.registerHelper()` directly.

### Hooks

- **`helperMissing`** — fires when a mustache/block references a name that is
  neither a registered helper nor a property of the current context. Without
  parameters it is silently ignored; with parameters Handlebars throws.
- **`blockHelperMissing`** — fires when a block expression matches a context
  property rather than a registered helper. Default behavior mimics Mustache
  by executing the block with the resolved property value as context.

Both hooks are themselves registered as helpers and appear in `hbs.helpers`.

## Registration Rules for `registerHelpers(hbs, helpersMap)`

These rules define the contract. They mirror `registerPartials` in philosophy
(validate-then-register, clear errors) but differ in mechanics (synchronous,
caller-supplied map).

### Parameter Contract

| Parameter    | Required | Behavior when falsy/empty                 |
| ------------ | -------- | ----------------------------------------- |
| `hbs`        | Yes      | Throw — cannot register without a target  |
| `helpersMap` | No       | Return silently — optional data, no error |

### Validation Sequence (all checks before any registration)

1. **`hbs` is required** — throw if falsy or not a valid Handlebars instance.
2. **Early return** — if `helpersMap` is falsy, `null`, `undefined`, or an
   empty object (`Object.entries` yields zero entries), return silently.
3. **Iterate with `Object.entries`** — own enumerable string keys only. No
   inherited or prototype keys.
4. **Name validation** — each key must match `/^[a-zA-Z_$][\w$-]*$/`.
   Rejects: empty strings, leading digits, dots, spaces, slashes.
   Accepts: `uppercase`, `date-format`, `is-active`, `$format`, `_private`.
5. **Value validation** — each value must be `typeof === 'function'`. Throw
   with the helper name and actual type received.
6. **Collision detection** — check `name in hbs.helpers`. If the name already
   exists on the instance (built-in or previously registered), throw with
   the helper name and state that it is already registered.
7. **Atomicity** — if any entry fails validation, throw before registering
   ANY helpers. A mixed map of valid + invalid entries results in zero
   registrations.

### Error Message Format

Follow project convention — include context and recovery suggestion:

```js
throw new Error(
  `Helper '${name}' must be a function, got ${typeof value}.\n` +
    'Each value in helpersMap must be a callable function.',
);
```

```js
throw new Error(
  `Helper '${name}' is already registered on this Handlebars instance.\n` +
    'To intentionally override a built-in, use hbs.registerHelper() directly.',
);
```

```js
throw new Error(
  `Invalid helper name '${name}' — must start with a letter, underscore, or\n` +
    'dollar sign, and contain only letters, digits, underscores, dollars, or hyphens.\n' +
    'For exotic names, use hbs.registerHelper() directly.',
);
```

## Decision Table: Common Helper Patterns

| Pattern          | Signature                                | Template Syntax                        | Notes                                      |
| ---------------- | ---------------------------------------- | -------------------------------------- | ------------------------------------------ |
| String transform | `(str) => result`                        | `{{upper name}}`                       | Simplest case; single arg, returns string  |
| Multi-arg        | `(a, b) => result`                       | `{{concat first last}}`                | Positional args before `options`           |
| Hash arguments   | `(options) => options.hash.key`          | `{{config key="val"}}`                 | Use `options.hash` for named params        |
| Block helper     | `function(options) { options.fn(this) }` | `{{#wrap}}...{{/wrap}}`                | Must use `function`, not arrow, for `this` |
| Block with else  | `function(val, options) { ... }`         | `{{#ifEq a b}}...{{else}}...{{/ifEq}}` | Use `options.fn` and `options.inverse`     |
| Block with @data | Uses `Handlebars.createFrame`            | `{{@customVar}}`                       | Inject custom data variables               |
| Safe HTML        | Return `new Handlebars.SafeString(html)` | `{{rawHtml content}}`                  | Bypasses HTML escaping — use carefully     |

**Arrow functions vs `function`**: Arrow functions cannot access `this` (the
template context). Block helpers that need `options.fn(this)` MUST use the
`function` keyword. Simple inline helpers can use arrows.

## Scoping Discipline

This project uses scoped Handlebars instances exclusively. The skill reinforces:

- **Always `Handlebars.create()`** — never register on the global instance.
- **Pass `hbs` as a parameter** — `registerHelpers(hbs, map)` receives the
  instance; it never imports or creates one.
- **Isolation guarantee** — helpers on one instance are invisible to another.
  Tests must verify this.

## Implementation Checklist

Before submitting helper registration code, verify:

- [ ] `hbs` param is validated as required (throws if falsy)
- [ ] `helpersMap` is optional (falsy/empty = silent return, no error)
- [ ] Iteration uses `Object.entries` (own enumerable string keys only)
- [ ] Name regex: `/^[a-zA-Z_$][\w$-]*$/` — rejects empty, dots, spaces, leading digits
- [ ] Value check: `typeof value === 'function'` — error includes name + actual type
- [ ] Collision check: `name in hbs.helpers` — error includes name + recovery hint
- [ ] Atomicity: ALL validation passes before ANY `hbs.registerHelper` call
- [ ] Function is synchronous (no `async`, no I/O)
- [ ] JSDoc with `@param` and `@returns` on the exported function
- [ ] Error messages include context + recovery suggestion
- [ ] Exported from `src/index.js` via `export * from './engine/helpers.js'`

## Test Checklist

Tests in `tests/unit/engine/helpers.test.js` using `node:test` + `node:assert`:

- [ ] Single helper registration + template compilation verifies it works
- [ ] Multiple helpers in one call
- [ ] Helper with positional arguments
- [ ] Block helper with `options.fn`
- [ ] Falsy `helpersMap` (null, undefined) = no-op, no error
- [ ] Empty object `helpersMap` = no-op, no error
- [ ] Non-function value throws with helper name + actual type
- [ ] Falsy/missing `hbs` throws
- [ ] Collision with built-in (`if`, `each`) throws
- [ ] Collision with previously registered helper throws
- [ ] Invalid names throw (empty, leading digit, dots, spaces)
- [ ] Valid names accepted (`date-format`, `is-active`, `$format`, `_private`)
- [ ] Atomicity: mixed valid + invalid = error, none registered
- [ ] Isolation: helpers on scoped instance not on global
- [ ] Isolation: helpers on one scoped instance not visible on another
- [ ] Integration: `registerHelpers` + `renderDirectory` end-to-end
