# Round 06: Trust Fixes — output confinement, target collisions, strict CLI

**Status**: Planning
**Date started**: 2026-09-25
**Date completed**: —
**Release target**: v0.1.1 (fixes only; safe under a2scaffold's `^0.1.0`)

## Goal

Close every known way js-tmpl can write the wrong file, or fail in a way
the user cannot read, without changing any documented behaviour. These are
bugs, not features. The first one is a security fix.

### Evidence (reproduced on `dev` @ `fac1bfd`)

| #   | Input                                                     | Today                                                                            | Class      |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| 1   | `t/${name}/x.txt.hbs`, `view.name = '../escaped'`         | Writes `./escaped/x.txt`, **outside `outDir`**                                   | Security   |
| 2   | `t/${a}/x.txt.hbs` + `t/${b}/x.txt.hbs`, `a = b = 'same'` | Only `out/same/x.txt` = B; A silently overwritten                                | Silent     |
| 3   | `js-tmpl --bogus foo`                                     | Flag and positional ignored                                                      | Silent     |
| 4   | `js-tmpl --env-keys` / `js-tmpl -o`                       | `TypeError` from `args.js` / `resolver.js`                                       | Crash      |
| 5   | Any runtime error                                         | `Error: Error: …` + full stack                                                   | Legibility |
| 6   | `npx js-tmpl` from an installed package                   | `Cannot find module …/node_modules/src/cli/main.js` on Linux (found in Round 05) | Broken     |

Root cause of 6: the bash wrapper resolves `$(dirname "$0")/../src/…`, and
`$0` is the `node_modules/.bin/js-tmpl` symlink, not its target. The CLI has
never worked from an installed package, on any OS; only from the repo.

Root cause of 3–4: [main.js](../../../src/cli/main.js) passes the whole
`process.argv` (node path + script path included) to `parseArgs`; unit tests
pass sliced arrays, so the suite never sees it. `args[++i]` is never checked.

Why these are fixes, not breaking changes: #1 and #2 never produced correct
output, #3–#4 never did what the user asked. Scripts that relied on a
silently ignored typo flag will now fail; that is intended and gets a
CHANGELOG note.

## Plan

- [ ] **Output confinement (#1)**: after `renderPath`, resolve the target
      and throw if `path.relative(outDir, target)` starts with `..` or is
      absolute. The error names the template `relPath`, the rendered path,
      and the variable. Test POSIX and Windows separators (`..\`), absolute
      values, and a value of exactly `..`.
      _Not here:_ rejecting `/` inside a value (`a/b` → nested dirs).
      Tightening that is breaking, so it goes to Round 07.
- [ ] **Target collisions (#2)**: compute every target path before
      rendering any content; throw if two templates map to the same target,
      naming both. Side benefit: collisions are caught before any file is
      written.
- [ ] **Strict CLI (#3–#5)**: `parseArgs(process.argv.slice(2))`; move to
      `node:util` `parseArgs` (`strict: true`), keeping every current flag,
      alias, and the `render` command. Unknown option, missing value,
      unexpected positional, empty `--env-keys` → `UsageError`.
      Exit codes: `0` ok, `1` render/config error, `2` usage error.
      Print `js-tmpl: <message>`; stack only with `--verbose`.
- [ ] **Node `bin` (#6)**: replace the bash wrapper with a Node entry
      (`#!/usr/bin/env node`) that imports and calls `main()` explicitly,
      with the error boundary moved there. The `isDirectRun` check in
      `main.js` cannot see through the bin (argv[1] is the bin path), so
      don't rely on it. Then remove `continue-on-error` from the `cli` job
      in `ci.yml`.
- [ ] Spawn-based CLI test that runs the real binary (covers the argv gap).
- [ ] Docs: README / API.md CLI table (exit codes, `--verbose`); CHANGELOG
      security note for #1.

### Out of Scope

- `${missing}` → throw, engine without config auto-discovery, error codes:
  Round 07 (breaking, v0.2.0).

## Do

[Progress log — update as work proceeds]

## Check

- [ ] Every row of the evidence table behaves as fixed, with a test.
- [ ] All existing tests pass unchanged, except where a row above changes
      behaviour (each noted in Do).
- [ ] `npx js-tmpl --help` works from a packed tarball on ubuntu, macOS and
      Windows CI, and the `cli` job no longer has `continue-on-error`.
- [ ] a2scaffold's test suite passes against a local build (no regression
      for the one known embedder).

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
