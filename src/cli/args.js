/**
 * Parse CLI arguments.
 *
 * @param {string[]} args
 * @returns {import('../types.js').CliArgs}
 */
export function parseArgs(args) {
  /** @type {import('../types.js').CliArgs} */
  const opts = { command: 'render' };

  let i = 0;
  while (i < args.length) {
    const a = args[i];

    switch (a) {
      case 'render':
        opts.command = 'render';
        break;

      case '-t':
      case '--template-dir':
        opts.templateDir = args[++i];
        break;

      case '-c':
      case '--values':
        opts.valuesFile = args[++i];
        break;

      case '-o':
      case '--out':
        opts.outDir = args[++i];
        break;

      case '-p':
      case '--partials-dir':
        opts.partialsDir = args[++i];
        break;

      case '--config-file':
        opts.configFile = args[++i];
        break;

      case '-x':
      case '--ext':
        opts.extname = args[++i];
        break;
    }
    // next argument:
    i++;
  }

  return opts;
}
