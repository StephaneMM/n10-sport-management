// Vercel serverless entrypoint. `pnpm build` (see vercel.json) compiles the
// server to dist/ with the project's own tsconfig; this file just hands the
// compiled Express app to Vercel. Every request is rewritten here and routed
// by Express on its original URL.
import { app } from '../dist/server.js';

export default app;
