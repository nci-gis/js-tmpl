# Round 06: Trust Fixes — output confinement, target collisions, strict CLI

**Status**: Complete
**Date started**: 2026-09-25
**Date completed**: 2026-09-25
**Release target**: v0.1.1 (fixes only; safe under a2scaffold's `^0.1.0`)

## Goal

Close every known way js-tmpl can write the wrong file, or fail in a way
the user cannot read, without changing any documented behaviour. These are
bugs, not features. The first one is a security fix.

### Evidence (reproduced on `dev` @ `fac1bfd`)

| #   | Input                                                     | Today                                                                                | Class      |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| 1   | `t/${name}/x.txt.hbs`, `view.name = '../escaped'`         | Writes `./escaped/x.txt`, **outside `outDir`**                                       | Security   |
| 2   | `t/${a}/x.txt.hbs` + `t/${b}/x.txt.hbs`, `a = b = 'same'` | Only `out/same/x.txt` = B; A silently overwritten                                    | Silent     |
| 3   | `js-tmpl --bogus foo`                                     | Flag and positional ignored                                                          | Silent     |
| 4   | `js-tmpl --env-keys` / `js-tmpl -o`                       | `TypeError` from `args.js` / `resolver.js`                                           | Crash      |
| 5   | Any runtime error                                         | `Error: Error: …` + full stack                                                       | Legibility |
| 6   | `npx js-tmpl` from an installed package                   | `Cannot find module …/node_modules/src/cli/main.js` on Linux and macOS (Round 05 CI) | Broken     |

Root cause of 6: the bash wrapper resolves `$(dirname "$0")/../src/…`, and
on Linux/macOS `$0` is the `node_modules/.bin/js-tmpl` symlink, not its
target. The CLI has never worked there from an installed package. Windows
passes in CI only because npm's cmd-shim points at the real file and the
runner ships Git Bash; a Windows machine without bash would still fail.

Root cause of 3–4: [main.js](../../../src/cli/main.js) passes the whole
`process.argv` (node path + script path included) to `parseArgs`; unit tests
pass sliced arrays, so the suite never sees it. `args[++i]` is never checked.

Why these are fixes, not breaking changes: #1 and #2 never produced correct
output, #3–#4 never did what the user asked. Scripts that relied on a
silently ignored typo flag will now fail; that is intended and gets a
CHANGELOG note.

## Plan

- [x] **Output confinement (#1)**: after `renderPath`, resolve the target
      and throw if `path.relative(outDir, target)` starts with `..` or is
      absolute. The error names the template `relPath`, the rendered path,
      and the variable. Test POSIX and Windows separators (`..\`), absolute
      values, and a value of exactly `..`.
      _Not here:_ rejecting `/` inside a value (`a/b` → nested dirs).
      Tightening that is breaking, so it goes to Round 07.
- [x] **Target collisions (#2)**: compute every target path before
      rendering any content; throw if two templates map to the same target,
      naming both. Side benefit: collisions are caught before any file is
      written.
- [x] **Strict CLI (#3–#5)**: `parseArgs(process.argv.slice(2))`; move to
      `node:util` `parseArgs` (`strict: true`), keeping every current flag,
      alias, and the `render` command. Unknown option, missing value,
      unexpected positional, empty `--env-keys` → `UsageError`.
      Exit codes: `0` ok, `1` render/config error, `2` usage error.
      Print `js-tmpl: <message>`; stack only with `--verbose`.
- [x] **Node `bin` (#6)**: replace the bash wrapper with a Node entry
      (`#!/usr/bin/env node`) that imports and calls `main()` explicitly,
      with the error boundary moved there. The `isDirectRun` check in
      `main.js` cannot see through the bin (argv[1] is the bin path), so
      don't rely on it. Then remove `continue-on-error` from the `cli` job
      in `ci.yml`.
- [x] Spawn-based CLI test that runs the real binary (covers the argv gap).
- [x] Docs: README / API.md CLI table (exit codes, `--verbose`); CHANGELOG
      security note for #1.

### Out of Scope

- `${missing}` → throw, engine without config auto-discovery, error codes:
  Round 07 (breaking, v0.2.0).

## Do

- **2026-09-25** — Implemented on `fix/trust-fixes`.
  - **#1 / #2** — `renderDirectory` now plans every target before rendering
    any content (`planTargets`): each target must be strictly inside
    `outDir` (`path.relative` first segment `..`, absolute, or equal to
    `outDir` → throw, naming template, rendered path, and the `${…}` vars
    involved), and each target has exactly one template (throw naming
    both). Nothing is written when either fails. Leading-slash values
    (`/abs`) stay inside `outDir` because `path.join` never resets; names
    that only start with dots (`..hidden`) are allowed. 7 tests.
  - **#3–#5** — `src/cli/args.js` on `node:util` `parseArgs` (strict,
    tokens). Unknown option / missing value / option-as-value
    (`-o --values x`) / repeated option (alias-aware) / unknown command /
    extra positional / empty `--env-keys` → `UsageError`. Unset options are
    omitted, so they never override config or defaults. `--verbose` added.
    `main.js` split into `main(argv)` (throws) and `run(argv)` (error
    boundary → `js-tmpl: <message>`, exit 0/1/2, stack only with
    `--verbose`). 10 new `parseArgs` tests; the 24 existing ones pass
    unchanged.
  - **#6** — `bin/js-tmpl` (bash) replaced by `bin/js-tmpl.js` (Node,
    calls `run`). Named `.js` because extensionless ESM entry files are
    only supported from Node 20.10; `package.json#bin` updated,
    `pack:check` requires it. `continue-on-error` removed from the `cli`
    CI job.
  - `tests/integration/cli.test.js` spawns the real bin (and
    `node src/cli/main.js`, used by package scripts): help, usage error
    exit 2 without stack, render error exit 1, `--verbose` stack, a real
    render. Coverage is collected from the child processes: `src/` now
    100 / 100 / 100.
  - Docs: README CLI table (`--verbose`, `-h`, strictness, exit codes);
    API.md Path Rendering rules + two new Common Errors; replaced the stale
    "Missing valuesFile (use --values)" example (that message no longer
    exists since VP-8) with the real "Values file not found".
  - a2scaffold 0.2.0 (`7e117b2`) test suite: 237/237 on published 0.1.0
    and 237/237 with this build installed from the packed tarball.
  - Suite: 393 tests (+22).
  - Noted for Round 07 (not done here, it would be a new error for trees
    that work on Linux today): two templates whose targets differ only by
    case (`README.md` vs `readme.md`) silently collide on macOS/Windows
    file systems.

## Check

- [x] Every row of the evidence table behaves as fixed, with a test.
- [x] All existing tests pass unchanged, except where a row above changes
      behaviour (each noted in Do). No existing test needed changing.
- [x] `npx js-tmpl --help` works from a packed tarball on ubuntu, macOS and
      Windows CI, and the `cli` job no longer has `continue-on-error`
      (PR #12 @ `beb6bce`: all 11 checks green).
- [x] a2scaffold's test suite passes against a local build (no regression
      for the one known embedder): 237/237.

## Act

**Learnings**:

- **Plan before writing.** Computing every target before rendering made
  both checks (confinement, collisions) all-or-nothing for free: a failure
  leaves `outDir` untouched. The same shape is what `planRender` (Round 08)
  will expose.
- **Test the real entry point.** The argv bug and the broken bin both
  lived between `process.argv` and `parseArgs`, which unit tests never
  crossed. One spawn-based test covers that seam, and coverage is still
  collected from the child process.
- **Prefer the platform's parser.** `node:util` `parseArgs` gave unknown
  option, missing value, and option-as-value errors with no new
  dependency; only repeats and positionals needed custom checks.
- **Verify the harness before the result.** The first a2scaffold run
  "failed" 23 tests because the package was swapped in by hand under a
  pnpm layout; installing the tarball properly gave 237/237.

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
