/* Minimal in-memory D1 stand-in for unit tests: handlers matched by SQL substring/regex. */
export function fakeDB(handlers = []) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          const handler = handlers.find(h => (typeof h.match === 'string' ? sql.includes(h.match) : h.match.test(sql)));
          const respond = (key, fallback) => {
            if (!handler || handler[key] === undefined) return fallback;
            return typeof handler[key] === 'function' ? handler[key](args, sql) : handler[key];
          };
          return {
            first: async () => respond('first', null),
            all: async () => ({ results: respond('all', []) }),
            run: async () => ({ meta: { changes: respond('run', 1) } })
          };
        }
      };
    },
    batch: async statements => Promise.all(statements.map(statement => statement.run()))
  };
}

export function req(url, headers = {}, body = undefined) {
  const origin = new URL(url).origin;
  return new Request(url, { headers: { Origin: origin, ...headers }, body, method: body ? 'POST' : 'GET' });
}

export const baseEnv = (overrides = {}, db = fakeDB()) => ({
  LOCAL_DEV: 'false',
  SESSION_SECRET: 'a'.repeat(48),
  ADMIN_PASSWORD: 'Str0ng!Password_2026x',
  DB: db,
  ...overrides
});
