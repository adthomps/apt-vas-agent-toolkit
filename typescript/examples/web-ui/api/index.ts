import serverless from 'serverless-http';
import { app } from '../server/app.ts';

export default serverless(app);
