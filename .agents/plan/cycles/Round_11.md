# Round 11 — Make planRender, --check and render agree on every error, so --check passing means a render succeeds and changes nothing

**Status**: In Progress
**Date started**: 2026-09-26
**Date completed**: —
**Release target**: v0.2.0 (breaking release; with Rounds 07–08)

## Goal

Close the gaps found reviewing PR #15 (2026-09-26) before 0.2.0 ships.
Phases 1–6 land on `feat/render-plan` and block merging PR #15 (Round 08
stays in Review until then). Phases 7–8 land on `dev` before the release.

### Findings

| ID  | Finding                                                                                                  | Phase |
| --- | -------------------------------------------------------------------------------------------------------- | ----- |
| R2  | Hard link in `outDir` → write changes a file outside it                                                  | 1, 5  |
| R5a | Path error skips the body check of the same template                                                     | 2     |
| A1  | `${name}.hbs` with `name: ''` / `'.'` → target `''` → writes to `outDir` itself (raw `EISDIR`)           | 3     |
| R4  | `a` and `a/b` both planned → `ENOTDIR` after `a` is written; breaks the new "nothing is written" promise | 4     |
| A4  | Portable key misses NFC/NFD (`café` twice is one file on macOS)                                          | 4     |
| A2  | Directory on disk where the plan puts a file → `--check` crashes (raw `EISDIR`), render writes partially | 5     |
| R5b | `comparePlan` skips the same-file check → clean where render throws `OUTPUT_COLLISION`                   | 5     |
| A7  | Check-then-write race (symlink swapped mid-run)                                                          | 1     |
| R3  | Config typo (`outdir:`) or scalar config file silently renders to `dist`                                 | 7     |
| R6  | ROADMAP / SECURITY.md drift for 0.2.0                                                                    | 8     |

## Invariants

- `pnpm verify` green after every phase; golden examples unchanged.
- One error thrown as-is; several → `JSTMPL_MULTIPLE_ERRORS` (Round 08).
- `planRender` never touches `outDir`; `comparePlan` never writes.
- New error conditions get a stable code, documented in `docs/API.md`.
- a2scaffold's `resolveConfig` call (`src/scaffold/index.js:73`) keeps
  working unchanged.

## Phases

### Phase 1 — Write down the filesystem threat model

- **Files:** `SECURITY.md`.
- **Change:** one section that phases 4–5 implement:
  - Trusted: templates, values, config, the invoking user.
  - Not assumed plain: existing contents of `outDir` (links from other
    tools, earlier runs).
  - Guaranteed: no write lands outside the real `outDir`, and no write
    goes through an inode shared with another path.
  - Not defended: another process changing `outDir` during a run (A7).
    Node has no `openat` / `O_NOFOLLOW` for paths. Writes are not
    transactional.
- **Gate:** human approval of the model (policy). Nothing else starts first.

### Phase 2 — Check every template body, even when its path fails

- **Files:** `src/engine/renderDirectory.js`,
  `tests/unit/engine/planRender.test.js`.
- **Change:** `planRender` renders the content of every walked template,
  including those whose target failed or collided. It adds a plan entry
  only when both succeed.
- **Tests:** `${name}.hbs` containing `{{missing}}` →
  `MULTIPLE_ERRORS` with `PATH_MISSING_VAR` + `TEMPLATE_MISSING_VALUE`;
  the losing template of a collision still reports its body error.
- **Gate:** `pnpm verify`.

### Phase 3 — Validate the final target, after the extension is stripped

- **Files:** `src/engine/renderDirectory.js`,
  `src/engine/pathRenderer.js`, tests.
- **Change:**
  - Strip `extname` with `endsWith` + `slice`, not an unescaped `RegExp`
    (`.c++` threw `SyntaxError`).
  - Then reject any `''`, `.` or `..` part of the whole target
    (`PATH_EMPTY_SEGMENT`, naming the rendered target).
  - `assertInside`: a file target must be strictly inside `outDir`.
  - `OUTPUT_OUTSIDE_OUTDIR` says "through a symbolic link" only when a
    link was followed.
- **Tests:** `name` = `''`, `.`, `..` at root and in `x/${name}.hbs`;
  extname `.c++`.
- **Gate:** `pnpm verify`.

### Phase 4 — Reject file-versus-directory conflicts inside the plan

- **Files:** `src/engine/renderDirectory.js` (`planTargets`), tests.
- **Change:**
  - For each target, check its ancestors against the other target keys.
    A hit is `OUTPUT_COLLISION` ("'a' is a file, but 'a/b' needs it as a
    directory"), collected like other collisions.
  - The portable key becomes `normalize('NFC').toLowerCase()` (A4).
- **Tests:** `a` + `a/b`; portable `A` + `a/b`; case-sensitive allows
  `A` + `a/b`; `café` NFC + NFD collide in portable mode.
- **Gate:** `pnpm verify`.

### Phase 5 — Share one disk preflight between write and compare

- **Files:** `src/engine/renderDirectory.js`, `src/errors.js`,
  `docs/API.md`, `tests/unit/engine/planRender.test.js`,
  `tests/integration/cli.test.js`.
- **Change:** an internal `preflight(plan, outDir)` runs before any write
  or comparison and collects:
  - containment (existing `assertInside`);
  - kind conflicts with the disk: a target that exists as a directory, or
    a target ancestor that exists as a file;
  - same-file targets (`sameFile`, now also in `comparePlan`);
  - linked targets: an existing regular file with `nlink > 1` →
    `JSTMPL_OUTPUT_LINKED` (new code), per Phase 1. Refusing is chosen
    over temp-file + rename: it is explicit, keeps file mode and owner,
    and does not silently replace links inside `outDir`.

  `comparePlan` = preflight + compare (no raw `EISDIR`). `writePlan` =
  preflight + write loop. The write loop keeps its per-write same-file
  check, the only way to see case-only collisions on a fresh
  case-insensitive disk, where neither file exists at preflight.

- **Contract:** `--check` exits 0 only if a render would succeed and change
  nothing. When a render would throw, `--check` exits 1 with the same
  codes. Residual: on a fresh case-insensitive disk with
  `targetFs: 'case-sensitive'`, `--check` reports drift (exit 3) and the
  render then throws. Documented.
- **Tests:** directory on disk vs file target (check exit 1 + code; render
  writes nothing); file on disk where the plan needs a directory; hard
  link to an outside file refused and the outside file unchanged;
  hard-linked `Foo` / `foo` → same error from check and render; existing
  symlink tests still pass.
- **Gate:** `pnpm verify`; CI matrix (inode and `nlink` semantics on
  Windows).

### Phase 6 — State the write promise precisely

- **Files:** `src/engine/renderDirectory.js` (JSDoc), `docs/API.md`,
  `README.md`, `.agents/plan/cycles/Round_08.md` (Do log).
- **Change:**
  - Replace "Nothing is written unless the whole plan succeeds" with:
    "Nothing is written if planning or preflight fails. An I/O failure
    while writing (permissions, full disk) can leave earlier files
    written."
  - README "Using js-tmpl in CI": `<outDir>/** -text` in `.gitattributes`
    (CRLF checkouts would show every file as changed), and
    `git status --porcelain <outDir>` after a real render to find stale
    files (`--check` ignores files it does not produce).
- **Gate:** `pnpm verify` (docs check). **PR #15 can merge after this
  phase.**

### Phase 7 — Reject malformed and unknown config

- **Files:** `src/config/resolver.js`, `src/cli/main.js`, `src/types.js`,
  `docs/API.md`, `tests/unit/config/resolver.test.js`,
  `tests/integration/cli.test.js`.
- **Change:**
  - A config file that is not a plain object (scalar, array, null) →
    `CONFIG_INVALID_VALUE`.
  - An unknown key, in the file or in the `resolveConfig` argument →
    `CONFIG_INVALID_VALUE`, with a suggestion on a case-insensitive match
    (`outdir` → `outDir`).
  - Allowed keys: `DEFAULTS` keys + `configFile`. The CLI strips its own
    keys (`command`, `check`, `verbose`) before calling `resolveConfig`.
- **Evidence:** a2scaffold passes only known keys. Breaking for configs
  with stray keys, which is acceptable in 0.2.0 (CHANGELOG).
- **Gate:** `pnpm verify`; a2scaffold suite against the dev build.

### Phase 8 — Reconcile release docs for 0.2.0

- **Files:** `ROADMAP.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/API.md`.
- **Change:**
  - ROADMAP: tick 0.2.0 items; add the Deferred lines below (one line
    each).
  - SECURITY.md: supported versions `0.2.x` (+ `0.1.x` security fixes, if
    that is the decision); link to the threat model.
  - CHANGELOG: breaking list (config validation, NFC portable key, new
    codes `OUTPUT_LINKED`, `TEMPLATE_DIR_LOOP`).
- **Gate:** `pnpm verify`; release per Round 05.

## Deferred (each needs its gate)

- **Windows name rules in `portable`** (`CON`, `aux.txt`, `<>:"|?*`,
  trailing dot or space) → 0.3.x template-tree spec, which must first
  define what "portable" means.
- **EOL normalization in `--check`** → 0.2.x, only if a real CI report
  shows `.gitattributes` is not enough.
- **Stale output detection** → not planned. It needs a manifest, i.e. state
  persistence (out of scope in ROADMAP). Phase 6's recipe covers it.
- **Check-then-write race (A7)** → documented in Phase 1; no code.
- **Type-check gate** (`tsc --noEmit --checkJs` in `pnpm verify`) → before
  the 0.3.x `.d.ts`; may land earlier if cheap.

## Do

- **2026-09-26 — decisions (human):** hard links are refused (not
  replaced); 0.1.x keeps security fixes after 0.2.0. PRs only at merge
  time (no CI-trial PRs): PR #15 is retitled and marked ready after
  Phase 6.
- **Phase 1.** Threat model replaces SECURITY.md "File System Access"
  (a section Round 10 did not touch, so `main` → `dev` merges cleanly).
- **Phase 2** (`79abfa0`). Bodies rendered for every walked template.
- **Phase 3** (`175d71f`). Deviation: `assertInside` stays non-strict. A
  target that does not exist resolves to its nearest existing ancestor,
  often `outDir` itself, so strict would reject every first write. An
  existing directory at the target is caught by Phase 5 instead. The
  "through a symbolic link" message is now always accurate, because `..`
  targets are rejected before containment.
- **Phase 4** (`521dc1c`). Conflict reuses `OUTPUT_COLLISION` (no new code).
- **Phase 5** (`e966148`). Extra code `JSTMPL_OUTPUT_BLOCKED` (target is a
  directory or FIFO, or a parent is a file). Order within preflight:
  blocked before containment, because `lstat` below a file throws raw
  `ENOTDIR`. Inode sharing checked before `nlink`: two targets on one inode
  are a collision (existing test), and a lone linked target is `LINKED`.
  Without the fix, the FIFO test hangs (a write blocks on a FIFO).
- **Phase 6.** The stale-files recipe needs a render from empty: a normal
  render leaves stale files untouched, so `git status` shows nothing
  (checked in a scratch repo).

## Check

- [ ] Each finding above has a regression test that fails on
      `feat/render-plan@afd9c16`.
- [ ] For every fixture, `--check` exit 1 ⇔ `renderDirectory` throws, with
      the same codes.
- [ ] No fixture leaves files in `outDir` after a planning or preflight
      error.
- [ ] a2scaffold prototype (Round 08) still green on the final build.

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
