
import dotenv from 'dotenv';
import path from 'node:path';
// Load base env then local overrides for dev convenience
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('[VisaAcceptance] server/index.ts starting');
console.log('[VisaAcceptance] process.cwd():', process.cwd());
console.log('[VisaAcceptance] VISA_ACCEPTANCE_MERCHANT_ID:', process.env.VISA_ACCEPTANCE_MERCHANT_ID);

import { app } from './app';

// Use a backend port that avoids Vite's typical 5173-5177 range
const BASE_PORT = process.env.PORT ? Number(process.env.PORT) : 5178;
const MAX_TRIES = 10;

function startServer(port: number, attempt = 1) {
  const server = app.listen(port, () => {
    (app as any).locals = (app as any).locals || {};
    (app as any).locals.port = port; // expose bound port to health endpoint
    console.log(`Web UI server listening on http://localhost:${port}`);
  });
  server.on('error', (err: any) => {
    if (err && (err as any).code === 'EADDRINUSE' && attempt < MAX_TRIES) {
      const nextPort = port + 1;
      console.warn(`[VisaAcceptance] Port ${port} in use, retrying on ${nextPort} (attempt ${attempt + 1}/${MAX_TRIES})`);
      startServer(nextPort, attempt + 1);
    } else {
      console.error('[VisaAcceptance] Failed to start server:', err);
      process.exit(1);
    }
  });
}

startServer(BASE_PORT);
