// Vercel serverless entrypoint. Vercel transpiles this (and the imported app)
// with esbuild; every request is rewritten here and routed by Express on its
// original URL.
import { app } from '../src/server';

export default app;
