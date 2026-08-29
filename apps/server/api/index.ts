// Vercel serverless entrypoint. Every request is rewritten here (see
// vercel.json) and handled by the Express app, which routes on the original URL.
import { app } from '../src/server';

export default app;
