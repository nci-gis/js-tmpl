/**
 * Pure helpers only: same arguments → same result. No clock, randomness,
 * env, or disk access — those would make output non-deterministic.
 */
export const helpers = {
  upper: (s) => String(s).toUpperCase(),
  kebab: (s) => String(s).trim().toLowerCase().replaceAll(/\s+/g, '-'),
  join: (list, sep) => list.join(sep),
  eq: function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  },
};
