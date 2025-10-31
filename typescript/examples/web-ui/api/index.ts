import serverless from 'serverless-http';
// Note: Vercel's Node/ESM runtime requires explicit .js extension in compiled output
// so we import with .js here to avoid ERR_MODULE_NOT_FOUND at runtime.
import { app } from './app.js';

export default serverless(app);
