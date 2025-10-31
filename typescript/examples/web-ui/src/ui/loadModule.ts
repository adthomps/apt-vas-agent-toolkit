export async function loadModule<T = any>(path: string): Promise<T> {
  // Try a range of candidate import paths so Vite's dev server can resolve correctly
  // and to tolerate TypeScript (.ts/.tsx) and various module formats in dev/production.
  const hasKnownExt = /\.(?:js|mjs|ts|tsx|cjs)$/i.test(path);
  const base: string[] = [];
  if (hasKnownExt) {
    // If caller already provided an extension, don't append additional extensions.
    base.push(path);
    // Provide a bare-spec fallback (some dev servers rewrite to extensionless internally)
    const bare = path.replace(/\.(?:js|mjs|ts|tsx|cjs)$/i, '');
    if (bare !== path) base.push(bare);
  } else {
    // Prefer explicit extensions first to avoid Vite creating '@fs/.../file?import' 404s.
    base.push(
      `${path}.js`,
      `${path}.mjs`,
      `${path}.ts`,
      `${path}.tsx`,
      `${path}.cjs`,
      `${path}/index.js`,
      `${path}/index.mjs`,
      `${path}/index.ts`,
      path,
    );
  }
  const candidates: string[] = [];
  // 1) Plain specifiers
  candidates.push(...base);
  // 2) Append ?import variants (Vite sometimes uses this for direct FS URLs)
  candidates.push(...base.map(p => `${p}?import`));
  // 3) URL specifiers based on the current file (robust in dev + build)
  try {
    for (const p of base) {
      candidates.push(new URL(p, import.meta.url).href);
      candidates.push(new URL(`${p}?import`, import.meta.url).href);
    }
  } catch {}
  let lastErr: any = null;
  let mod: any = null;
  for (const p of candidates) {
    try {
      // Let the bundler/dev server handle resolution when possible
      mod = await import(p);
      if (mod) break;
    } catch (e) {
      lastErr = e;
      // try next candidate
    }
  }
  if (!mod) {
    // Provide a richer error message that lists attempted candidates to aid debugging in Vite dev mode.
    const tried = candidates.join(', ');
    const msg = `Failed to dynamically import module '${path}'. Tried: ${tried}. Last error: ${String(lastErr)}`;
    // eslint-disable-next-line no-console
    console.warn(msg);
    throw new Error(msg);
  }
  // normalize CommonJS <-> ESM shapes
  if (mod && typeof mod === 'object') {
    const keys = Object.keys(mod);
    if (keys.length === 1 && keys[0] === 'default' && typeof (mod as any).default === 'object') {
      return (mod as any).default as T;
    }
    return mod as T;
  }
  return mod as T;
}
