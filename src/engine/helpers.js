import { ErrorCodes, JsTmplError } from '../errors.js';

/**
 * Bare-identifier rule for helper names: `{{name}}` must parse without
 * bracket notation. Hyphens are allowed (`date-format` is idiomatic).
 */
const HELPER_NAME_RE = /^[a-zA-Z_$][\w$-]*$/;

/**
 * Describe a value's type for error messages (`null` and arrays included).
 *
 * @param {unknown} value
 * @returns {string}
 */
function describeType(value) {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

/**
 * Throw if a single helper entry is invalid or collides on `hbs`.
 *
 * @param {string} name
 * @param {unknown} fn
 * @param {typeof import('handlebars')} hbs
 */
function assertValidHelper(name, fn, hbs) {
  if (!HELPER_NAME_RE.test(name)) {
    throw new JsTmplError(
      ErrorCodes.HELPER_INVALID_NAME,
      `Invalid helper name '${name}' — must start with a letter, underscore, or\n` +
        'dollar sign, and contain only letters, digits, underscores, dollars, or hyphens.\n' +
        'For exotic names, use hbs.registerHelper() directly.',
    );
  }
  if (typeof fn !== 'function') {
    throw new JsTmplError(
      ErrorCodes.HELPER_NOT_FUNCTION,
      `Helper '${name}' must be a function, got ${describeType(fn)}.\n` +
        'Each value in helpersMap must be a callable function.',
    );
  }
  if (Object.hasOwn(hbs.helpers, name)) {
    throw new JsTmplError(
      ErrorCodes.HELPER_ALREADY_REGISTERED,
      `Helper '${name}' is already registered on this Handlebars instance.\n` +
        'To intentionally override a built-in, use hbs.registerHelper() directly.',
    );
  }
}

/**
 * Register custom helpers on a scoped Handlebars instance.
 *
 * Validates every entry before registering any (atomic): a map with one
 * invalid entry registers nothing. Names must be bare identifiers
 * (`/^[a-zA-Z_$][\w$-]*$/`), values must be functions, and a name already
 * registered on `hbs` (built-ins included) throws. Skips silently if
 * `helpersMap` is falsy or empty.
 *
 * Helpers must be pure: same arguments, same result. js-tmpl cannot enforce
 * this; a helper reading the clock, randomness, env, or disk makes output
 * non-deterministic.
 *
 * @param {typeof import('handlebars')} hbs - Handlebars instance to register on
 * @param {Record<string, import('handlebars').HelperDelegate>} [helpersMap] - Helper name → function
 * @returns {void}
 */
export function registerHelpers(hbs, helpersMap) {
  if (!hbs || typeof hbs.registerHelper !== 'function') {
    throw new JsTmplError(
      ErrorCodes.HELPER_NO_INSTANCE,
      'registerHelpers requires a Handlebars instance as its first argument.\n' +
        'Create one with Handlebars.create() and pass it to renderDirectory too.',
    );
  }
  if (!helpersMap) {
    return;
  }
  if (typeof helpersMap !== 'object' || Array.isArray(helpersMap)) {
    throw new JsTmplError(
      ErrorCodes.HELPER_INVALID_MAP,
      `helpersMap must be an object of name → function, got ${describeType(helpersMap)}.\n` +
        'Example: registerHelpers(hbs, { upper: (s) => s.toUpperCase() })',
    );
  }

  const entries = Object.entries(helpersMap);
  for (const [name, fn] of entries) {
    assertValidHelper(name, fn, hbs);
  }
  for (const [name, fn] of entries) {
    hbs.registerHelper(name, fn);
  }
}
