import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { authRouter } from './features/auth/auth.routes';
import { profileRouter } from './features/profile/profile.routes';
import { leadRouter } from './features/leads/lead.routes';
import { apiLimiter } from './middlewares/rateLimit';
import { errorHandler } from './middlewares/errorHandler';

export const app = express();

// How many reverse-proxy hops to trust for req.ip (see config/env). Must be set
// correctly in production or rate limiting keys every request to the proxy IP.
app.set('trust proxy', env.TRUST_PROXY);

// Security and utility middlewares
app.use(helmet());

// Allowed browser origins come from CORS_ORIGINS (see config/env).
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));

// Every endpoint takes small JSON payloads; cap the body so a client can't
// stream megabytes at us.
app.use(express.json({ limit: '16kb' }));

// Health check route (before the /api limiter, so uptime pings never count).
// No server/version banner — nothing for a scanner to fingerprint.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Coarse rate-limit ceiling across the whole API.
app.use('/api', apiLimiter);

app.use('/api/auth', authRouter);

app.use('/api/profiles', profileRouter);

app.use('/api/leads', leadRouter);

// Terminal error handler — keep last.
app.use(errorHandler);