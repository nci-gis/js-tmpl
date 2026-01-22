# Contributing to js-tmpl

Thank you for your interest in contributing to js-tmpl! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Development Principles

Before contributing, please read [docs/PRINCIPLES.md](docs/PRINCIPLES.md) to understand the project's core philosophy:

1. **Engine First, CLI Second** - The engine is the primary product
2. **Explicit Over Implicit** - No magic defaults or hidden conventions
3. **Deterministic Over Clever** - Same input always produces same output
4. **Separation of Concerns** - Each layer has one responsibility
5. **Composable Over Monolithic** - Small, focused functions
6. **Simple Over Feature-Rich** - Only add complexity when clearly needed

**Key Question:** When evaluating changes, ask: "Does this maintain determinism, explicitness, and separation of concerns?"

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm 10.22.0 (specified in `package.json`)

### Setup

1. **Fork and clone**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/js-tmpl.git
   cd js-tmpl
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Run tests**:

   ```bash
   pnpm test
   ```

4. **Try the examples**:

   ```bash
   cd examples/yaml-templates
   NODE_ENV=production node ../../src/cli/main.js render --values values.yaml
   ls -la dist/
   ```

## Project Structure

```text
src/
├── cli/              # CLI argument parsing and entry point
│   ├── args.js       # Hand-written CLI arg parser
│   └── main.js       # CLI entry point
├── config/           # Configuration resolution
│   ├── defaults.js   # Internal fallback defaults
│   ├── loader.js     # YAML/JSON config loaders
│   ├── resolver.js   # Config precedence resolver
│   └── view.js       # View model builder
├── engine/           # Core rendering engine
│   ├── contentRenderer.js  # Handlebars content rendering
│   ├── partials.js         # Partial registration system
│   ├── pathRenderer.js     # Path placeholder rendering
│   ├── renderDirectory.js  # Main orchestrator
│   └── treeWalker.js       # BFS template tree walker
├── utils/            # Shared utilities
│   ├── fs.js         # Filesystem helpers
│   └── object.js     # Nested object access
└── index.js          # Public API exports
```

### Separation of Concerns

Each layer has **one responsibility only**:

- **Config Layer**: Merge defaults, project config, and CLI args
- **View Layer**: Build render context from values + env
- **Engine Layer**: Discover, render, and write templates
- **Utils Layer**: Shared utilities

**Never mix layer responsibilities.**

## Development Workflow

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

**Requirement:** All PRs must maintain ≥ 99% test coverage.

### Code Style

- ES Modules (not CommonJS)
- Async/await for async operations
- Explicit imports (no default exports except index.js)
- Descriptive variable names over comments
- Pure functions where possible (avoid side effects)

### Testing Guidelines

See [tests/README.md](tests/README.md) for detailed testing documentation.

**Test organization:**

- `tests/unit/` - Unit tests for each module
- `tests/integration/` - Full rendering workflow tests
- `tests/fixtures/` - Test data and fixtures

**Coverage requirements:**

- Line coverage: ≥ 99%
- Branch coverage: ≥ 99%
- Function coverage: 100%

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bugfix
```

### 2. Make Changes

- Follow existing code style
- Maintain separation of concerns
- Write tests for new functionality
- Update documentation if needed

### 3. Run Tests

```bash
pnpm test
```

Ensure all tests pass and coverage remains high.

### 4. Commit Changes

Use clear, descriptive commit messages:

```text
feat: add custom Handlebars helpers registration API
fix: correct path rendering for nested placeholders
docs: update API documentation for resolveConfig
test: add edge case coverage for partials system
```

Commit message format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `chore:` - Build/tooling changes

### 5. Push and Create PR

```bash
git push origin feature/my-feature
```

Open a Pull Request on GitHub with:

- Clear description of changes
- Reference to related issues
- Test results and coverage
- Screenshots/examples if applicable

## Pull Request Guidelines

### PR Checklist

- [ ] Tests pass locally (`pnpm test`)
- [ ] Coverage ≥ 99% maintained
- [ ] Code follows project principles
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear
- [ ] No breaking changes (or clearly documented)
- [ ] Examples still work

### Review Process

1. Automated tests run on GitHub Actions
2. Code review by maintainer
3. Address feedback if requested
4. Merge once approved

## What to Contribute

### Good First Issues

- Documentation improvements
- Additional examples
- Test coverage edge cases
- Bug fixes

### Feature Requests

Before implementing new features:

1. **Open an issue first** to discuss
2. Ensure it aligns with project principles
3. Consider if it belongs in the engine or should be a separate tool

**Remember:** js-tmpl prioritizes simplicity over feature richness.

### Bug Reports

When reporting bugs, include:

- Node version
- js-tmpl version
- Minimal reproduction case
- Expected vs. actual behavior
- Template structure and values file

## Architecture Decisions

When proposing changes that affect architecture:

1. Read [docs/00-Motivation.md](docs/00-Motivation.md) to understand the vision
2. Review [docs/PRINCIPLES.md](docs/PRINCIPLES.md) for decision framework
3. Ensure changes maintain:
   - Determinism (same input → same output)
   - Explicitness (no hidden behavior)
   - Separation of concerns (right layer for the responsibility)

## Release Process

> For maintainers only

js-tmpl uses a **tag-driven release model** with GitHub Actions.

### Release Channels

| Channel | Tag Example      | npm dist-tag | Use Case            |
| ------- | ---------------- | ------------ | ------------------- |
| Stable  | `v1.2.3`         | `latest`     | Production releases |
| Beta    | `v1.2.3-beta.1`  | `beta`       | Testing and preview |
| Alpha   | `v1.2.3-alpha.1` | `alpha`      | Early development   |

### NPM Token Setup

Ensure `NPM_TOKEN` secret is configured in GitHub repository settings:

1. Go to <https://www.npmjs.com/settings/~/tokens>
2. Create new "Automation" token
3. Add to GitHub: Settings → Secrets and variables → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: Your npm token

### Creating a Release

1. Go to GitHub [Actions](https://github.com/nci-gis/js-tmpl/actions) tab
2. Select the **Release** workflow
3. Click **Run workflow**
4. Choose:
   - **Channel:** `stable`, `beta`, or `alpha`
   - **Version bump:** `patch`, `minor`, `major`, or `custom`
   - **Prerelease number:** (for alpha/beta only)
5. Click **Run workflow**

**What Happens:**

The workflow automatically:

1. Runs full test suite (must pass)
2. Bumps version in `package.json`
3. Creates a git tag (e.g., `v1.2.3-beta.1`)
4. Creates a GitHub Release (marked as prerelease for alpha/beta)
5. Triggers automatic npm publish via the **Publish** workflow

### Installing Releases

```bash
# Stable (latest)
npm install js-tmpl

# Beta
npm install js-tmpl@beta

# Alpha
npm install js-tmpl@alpha

# Specific version
npm install js-tmpl@1.2.3-beta.1
```

### Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes, incompatible API changes
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes, backwards compatible

**Pre-1.0.0 Versions:**

During initial development (0.x.y):

- Minor version bumps (0.x.0) may include breaking changes
- Document breaking changes clearly in CHANGELOG.md
- Consider migration path for users

### Post-Release Checklist

- [ ] Verify package appears on <https://www.npmjs.com/package/js-tmpl>
- [ ] Test installation: `npm install js-tmpl@latest`
- [ ] Verify CLI works: `npx js-tmpl --help`
- [ ] Check GitHub Release was created
- [ ] Announce release (if significant)

### Rollback Process

If a published version has critical issues:

#### Option 1: Publish Patch (Recommended)

Fix the issue and run the Release workflow with `patch` version type.

#### Option 2: Deprecate Version (Severe Issues)

```bash
npm deprecate js-tmpl@<version> "Critical bug - use <fixed-version> instead"
```

#### Option 3: Unpublish (Last Resort, ≤72 hours only)

```bash
npm unpublish js-tmpl@<version>
```

Note: Unpublishing is discouraged and only works within 72 hours of publish.

### Branch Strategy

- **`main`** - Production releases, protected branch
- **`dev`** - Integration branch for development
- **feature/*** - Feature branches, merge to `dev` via PR
- **fix/*** - Bug fix branches, merge to `dev` via PR

### Security

- Never commit `NPM_TOKEN` or other secrets
- Rotate npm tokens periodically
- Review changes carefully before production releases
- Enable branch protection on `main` branch

## Questions?

- Open an issue for questions
- Review [docs/](docs/) for detailed documentation
- Check [examples/](examples/) for working code

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
