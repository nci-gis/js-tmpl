export function buildView(values, env = process.env) {
  return {
    ...values,
    env,
  };
}
