/**
 * Stable error codes. Part of the public API from 0.2.0: match on `code`,
 * never on message text. Errors from Node itself (e.g. `ENOENT` for a missing
 * template directory) keep Node's own `code`.
 */
export const ErrorCodes = Object.freeze({
  // Configuration and values
  CONFIG_NOT_FOUND: 'JSTMPL_CONFIG_NOT_FOUND',
  CONFIG_INVALID_VALUE: 'JSTMPL_CONFIG_INVALID_VALUE',
  VALUES_NOT_FOUND: 'JSTMPL_VALUES_NOT_FOUND',
  VALUES_UNSUPPORTED_FORMAT: 'JSTMPL_VALUES_UNSUPPORTED_FORMAT',
  VALUES_FILE_IN_DIR: 'JSTMPL_VALUES_FILE_IN_DIR',
  // Namespaces (value partials, template partials, view assembly)
  NS_INVALID_SEGMENT: 'JSTMPL_NS_INVALID_SEGMENT',
  NS_DUPLICATE: 'JSTMPL_NS_DUPLICATE',
  NS_SHADOW: 'JSTMPL_NS_SHADOW',
  NS_ROOT_COLLISION: 'JSTMPL_NS_ROOT_COLLISION',
  NS_RESERVED_ENV: 'JSTMPL_NS_RESERVED_ENV',
  // Template paths: ${var}
  PATH_MISSING_VAR: 'JSTMPL_PATH_MISSING_VAR',
  PATH_INVALID_VALUE: 'JSTMPL_PATH_INVALID_VALUE',
  PATH_EMPTY_SEGMENT: 'JSTMPL_PATH_EMPTY_SEGMENT',
  // Template paths: $if{var} / $ifn{var}
  GUARD_MISSING_VAR: 'JSTMPL_GUARD_MISSING_VAR',
  GUARD_MALFORMED: 'JSTMPL_GUARD_MALFORMED',
  GUARD_IN_FILENAME: 'JSTMPL_GUARD_IN_FILENAME',
  // Template content
  TEMPLATE_MISSING_VALUE: 'JSTMPL_TEMPLATE_MISSING_VALUE',
  TEMPLATE_SYNTAX: 'JSTMPL_TEMPLATE_SYNTAX',
  TEMPLATE_RENDER_FAILED: 'JSTMPL_TEMPLATE_RENDER_FAILED',
  // Output
  OUTPUT_OUTSIDE_OUTDIR: 'JSTMPL_OUTPUT_OUTSIDE_OUTDIR',
  OUTPUT_COLLISION: 'JSTMPL_OUTPUT_COLLISION',
  // registerHelpers
  HELPER_NO_INSTANCE: 'JSTMPL_HELPER_NO_INSTANCE',
  HELPER_INVALID_MAP: 'JSTMPL_HELPER_INVALID_MAP',
  HELPER_INVALID_NAME: 'JSTMPL_HELPER_INVALID_NAME',
  HELPER_NOT_FUNCTION: 'JSTMPL_HELPER_NOT_FUNCTION',
  HELPER_ALREADY_REGISTERED: 'JSTMPL_HELPER_ALREADY_REGISTERED',
  // Several of the above at once (planRender collects them)
  MULTIPLE_ERRORS: 'JSTMPL_MULTIPLE_ERRORS',
  // CLI
  CLI_USAGE: 'JSTMPL_CLI_USAGE',
});

const KNOWN = new Set(Object.values(ErrorCodes));

/**
 * Every error js-tmpl raises itself. `code` is one of `ErrorCodes`;
 * `details` carries structured context where the error has it (e.g.
 * `relPath`, `variable`); `cause` is the underlying error, if any.
 */
export class JsTmplError extends Error {
  /**
   * @param {string} code - A value of `ErrorCodes`
   * @param {string} message
   * @param {{ details?: Record<string, unknown>, cause?: unknown }} [options]
   */
  constructor(code, message, { details, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    if (!KNOWN.has(code)) {
      throw new TypeError(`Unknown js-tmpl error code: ${code}`);
    }
    this.name = 'JsTmplError';
    /** @type {string} */
    this.code = code;
    if (details) {
      /** @type {Record<string, unknown>} */
      this.details = details;
    }
  }
}
