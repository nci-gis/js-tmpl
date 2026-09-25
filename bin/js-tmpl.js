#!/usr/bin/env node

// Installed CLI entry. A Node file, not a shell wrapper: npm links it from
// node_modules/.bin on every OS, and imports resolve from this file's real
// location, not from the symlink.
import { run } from '../src/cli/main.js';

process.exitCode = await run(process.argv.slice(2));
