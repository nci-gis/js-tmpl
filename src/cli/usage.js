/** CLI usage text. */
export const USAGE = `Usage: js-tmpl [command] [options]

Commands:
  render                     Render templates (default)

Options:
  -t, --template-dir <dir>   Template directory (default: templates)
  -c, --values <file>        Values file (YAML or JSON) [required]
  -o, --out <dir>            Output directory (default: dist)
  -p, --partials-dir <dir>   Partials directory
  -x, --ext <ext>            Template extension (default: .hbs)
      --config-file <file>   Project config file
      --env-keys <keys>      Comma-separated env var names to expose (default: none)
      --env-prefix <prefix>  Auto-include env vars with this prefix (e.g. JS_TMPL_)
  -h, --help                 Show this help message`;
