"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadModule = loadModule;
async function loadModule(path) {
    // Try a few candidate import paths so Vite's dev server can resolve correctly
    const candidates = [path, `${path}.js`, `${path}.mjs`, `${path}/index.js`];
    let lastErr = null;
    let mod = null;
    for (const p of candidates) {
        try {
            // Let the bundler/dev server handle resolution when possible
            mod = await import(p);
            if (mod)
                break;
        }
        catch (e) {
            lastErr = e;
            // try next candidate
        }
    }
    if (!mod) {
        const msg = `Failed to dynamically import module '${path}' (${lastErr})`;
        throw new Error(msg);
    }
    // normalize CommonJS <-> ESM shapes
    if (mod && typeof mod === 'object') {
        const keys = Object.keys(mod);
        if (keys.length === 1 && keys[0] === 'default' && typeof mod.default === 'object') {
            return mod.default;
        }
        return mod;
    }
    return mod;
}
