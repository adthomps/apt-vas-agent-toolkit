// Inline the Express app in this file to avoid cross-file ESM resolution issues on Vercel
import serverless from 'serverless-http';
import dotenv from 'dotenv';
import path from 'node:path';
import express from 'express';
import cors from 'cors';

// Optional SANDBOX passthrough: resolve SDK from package if installed, otherwise fall back to local source
// eslint-disable-next-line @typescript-eslint/no-var-requires
const req = typeof require !== 'undefined' ? require : undefined as any;
function safeRequire(id: string): any { try { return req ? req(id) : null; } catch { return null; } }
const pkg = safeRequire('@visaacceptance/agent-toolkit');
const local = safeRequire('../../../src/shared/api');
const VisaAcceptanceAPI = (pkg && (pkg.VisaAcceptanceAPI || pkg.default))
	|| (local && (local.VisaAcceptanceAPI || local.default));

// Load env (base then local overrides)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sandboxEnabled = (
	(process.env.VISA_ACCEPTANCE_ENVIRONMENT || '').toUpperCase() === 'SANDBOX'
	&& !!process.env.VISA_ACCEPTANCE_MERCHANT_ID
	&& !!process.env.VISA_ACCEPTANCE_API_KEY_ID
	&& !!process.env.VISA_ACCEPTANCE_SECRET_KEY
	&& String(process.env.VISA_ACCEPTANCE_API_MOCK || '').toLowerCase() !== 'true'
	&& String(process.env.VISA_ACCEPTANCE_API_MOCK || '') !== '1'
);

let visaApi: any = null;
if (sandboxEnabled && typeof VisaAcceptanceAPI === 'function') {
	visaApi = new VisaAcceptanceAPI({
		merchantId: process.env.VISA_ACCEPTANCE_MERCHANT_ID,
		apiKeyId: process.env.VISA_ACCEPTANCE_API_KEY_ID,
		secretKey: process.env.VISA_ACCEPTANCE_SECRET_KEY,
		environment: 'SANDBOX',
	});
}

const app = express();
app.use(cors());
app.use(express.json());

// Run the visaApi with a timeout so serverless functions don't hang for the full platform timeout
async function runVisaApiWithTimeout(method: string, params: any, timeoutMs = 10_000) {
	if (!visaApi || typeof visaApi.run !== 'function') throw new Error('visaApi not available');
	const op = visaApi.run(method, params);
	return await Promise.race([
		op,
		new Promise((_, rej) => setTimeout(() => rej(new Error('Visa API timeout')), timeoutMs)),
	]);
}

// Health
app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

// Minimal endpoints used by UI and smoke tests
app.get('/api/invoices', async (req, res) => {
	if (sandboxEnabled && visaApi) {
		try {
			const limit = Number(req.query.limit ?? 5);
			const offset = Number(req.query.offset ?? 0);
			const statusRaw = typeof req.query.status === 'string' ? String(req.query.status).toUpperCase() : undefined;
			const body = await runVisaApiWithTimeout('list_invoices', { limit, offset, status: statusRaw }, 10_000);
			const parsed = typeof body === 'string' ? JSON.parse(body) : body;
			if (parsed?.invoices && typeof parsed.total !== 'number') parsed.total = parsed.invoices.length;
			return res.json(parsed);
		} catch (e: any) {
			console.error('Error listing invoices', e);
			const isTimeout = /timeout/i.test(String(e?.message || ''));
			return res.status(isTimeout ? 504 : 502).json({ error: true, message: isTimeout ? 'Visa API timed out' : 'Failed to list invoices (SANDBOX)', detail: String(e?.message || e) });
		}
	}
	// Mock minimal
	return res.json({ invoices: [], total: 0 });
});

app.get('/api/payment-links', async (req, res) => {
	if (sandboxEnabled && visaApi) {
		try {
			const limit = Number(req.query.limit ?? 5);
			const offset = Number(req.query.offset ?? 0);
			const statusRaw = typeof req.query.status === 'string' && req.query.status ? String(req.query.status).toUpperCase() : undefined;
			const status = (statusRaw === 'ACTIVE' || statusRaw === 'INACTIVE') ? statusRaw : undefined;
			const body = await runVisaApiWithTimeout('list_payment_links', { limit, offset, status }, 10_000);
			const parsed = typeof body === 'string' ? JSON.parse(body) : body;
			if (parsed?.paymentLinks && typeof parsed.total !== 'number') parsed.total = parsed.paymentLinks.length;
			return res.json(parsed);
		} catch (e: any) {
			console.error('Error listing payment links', e);
			const isTimeout = /timeout/i.test(String(e?.message || ''));
			return res.status(isTimeout ? 504 : 502).json({ error: true, message: isTimeout ? 'Visa API timed out' : 'Failed to list payment links (SANDBOX)', detail: String(e?.message || e) });
		}
	}
	return res.json({ paymentLinks: [], total: 0 });
});

export default serverless(app);
