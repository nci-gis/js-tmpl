/**
 * @typedef {object} CliArgs
 * @property {string} [command]
 * @property {string} [templateDir]
 * @property {string} [valuesFile]
 * @property {string} [outDir]
 * @property {string} [partialsDir]
 * @property {string} [configFile]
 * @property {string} [extname]
 * @property {string} [valuesDir]
 * @property {string[]} [envKeys]
 * @property {string} [envPrefix]
 * @property {boolean} [verbose] - CLI only: print stack traces on error
 */

/**
 * @typedef {object} TemplateConfig
 * @property {string} templateDir
 * @property {string} partialsDir
 * @property {string} outDir
 * @property {string} extname
 * @property {Record<string, unknown>} view
 */

/**
 * @typedef {object} TemplateFile
 * @property {string} absPath
 * @property {string} relPath
 */

export {}; //NOSONAR
