"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const node_path_1 = __importDefault(require("node:path"));
// Load base env then local overrides for dev convenience
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), '.env.local') });
console.log('[VisaAcceptance] server/index.ts starting');
console.log('[VisaAcceptance] process.cwd():', process.cwd());
console.log('[VisaAcceptance] VISA_ACCEPTANCE_MERCHANT_ID:', process.env.VISA_ACCEPTANCE_MERCHANT_ID);
const app_1 = require("./app");
// Use a backend port that avoids Vite's typical 5173-5177 range
const BASE_PORT = process.env.PORT ? Number(process.env.PORT) : 5178;
const MAX_TRIES = 10;
function startServer(port, attempt = 1) {
    const server = app_1.app.listen(port, () => {
        app_1.app.locals = app_1.app.locals || {};
        app_1.app.locals.port = port; // expose bound port to health endpoint
        console.log(`Web UI server listening on http://localhost:${port}`);
    });
    server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE' && attempt < MAX_TRIES) {
            const nextPort = port + 1;
            console.warn(`[VisaAcceptance] Port ${port} in use, retrying on ${nextPort} (attempt ${attempt + 1}/${MAX_TRIES})`);
            startServer(nextPort, attempt + 1);
        }
        else {
            console.error('[VisaAcceptance] Failed to start server:', err);
            process.exit(1);
        }
    });
}
startServer(BASE_PORT);
