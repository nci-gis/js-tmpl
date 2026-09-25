import Handlebars from 'handlebars';

/**
 * Handlebars `strict: true` checks simple mustaches (`{{var}}`) only. Path
 * expressions used as helper arguments, hash values, sub-expression
 * arguments, and partial contexts are looked up without the check, so
 * `{{#if missing}}` or `{{upper missing}}` silently see `undefined`.
 *
 * This visitor marks those paths strict on the parsed AST, so Handlebars
 * itself throws `"missing" not defined` with a source location. Paths
 * without parts (`this`, `..`) are left alone: they always resolve.
 */
class StrictArguments extends Handlebars.Visitor {
  /** @param {any} node */
  markArguments(node) {
    for (const param of node.params) {
      markStrict(param);
    }
    for (const pair of node.hash?.pairs ?? []) {
      markStrict(pair.value);
    }
  }

  /** @param {any} node */
  MustacheStatement(node) {
    this.markArguments(node);
    return super.MustacheStatement(node);
  }

  /** @param {any} node */
  BlockStatement(node) {
    this.markArguments(node);
    return super.BlockStatement(node);
  }

  /** @param {any} node */
  SubExpression(node) {
    this.markArguments(node);
    return super.SubExpression(node);
  }

  /** @param {any} node */
  PartialStatement(node) {
    this.markArguments(node);
    return super.PartialStatement(node);
  }

  /** @param {any} node */
  PartialBlockStatement(node) {
    this.markArguments(node);
    return super.PartialBlockStatement(node);
  }
}

/** @param {any} node */
function markStrict(node) {
  if (node.type === 'PathExpression' && node.parts.length > 0) {
    node.strict = true;
  }
}

/**
 * Compile a template in strict mode, including helper and block-helper
 * arguments (see StrictArguments). Parse errors are thrown when the returned
 * function is first called, like `hbs.compile`.
 *
 * Known limit (Handlebars itself): block-param paths
 * (`{{#each xs as |x|}}{{x.missing}}`) are never strict-checked.
 *
 * @param {typeof Handlebars} hbs - Scoped Handlebars instance
 * @param {string} source - Template source
 * @returns {HandlebarsTemplateDelegate}
 */
export function compileStrict(hbs, source) {
  /** @type {HandlebarsTemplateDelegate | undefined} */
  let template;
  return (context, options) => {
    if (!template) {
      const ast = hbs.parse(source);
      new StrictArguments().accept(ast);
      template = hbs.compile(ast, { strict: true });
    }
    return template(context, options);
  };
}
