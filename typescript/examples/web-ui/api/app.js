import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/invoices', (_req, res) => {
  res.json({ invoices: [], total: 0 });
});

app.get('/api/payment-links', (_req, res) => {
  res.json({ paymentLinks: [], total: 0 });
});

export { app }; 
