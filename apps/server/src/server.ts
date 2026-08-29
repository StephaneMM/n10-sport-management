import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { authRouter } from './features/auth/auth.routes';
import { profileRouter } from './features/profile/profile.routes';
import { uploadRouter } from './features/uploads/upload.routes';
import { leadRouter } from './features/leads/lead.routes';

export const app = express();

// How many reverse-proxy hops to trust for req.ip (see config/env). Must be set
// correctly in production or rate limiting keys every request to the proxy IP.
app.set('trust proxy', env.TRUST_PROXY);

// Security and utility middlewares
app.use(helmet());

// Vite usually runs on 5173, Lovable sometimes defaults to 8080. 
  // We allow both for local development, plus the future production URL.
app.use(cors({ 
  origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'], 
  credentials: true, // If decide to use cookies later!
}));

app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'N10 Server is running' });
});

app.use('/api/auth', authRouter);

app.use('/api/profiles', profileRouter);

app.use('/api/uploads', uploadRouter);

app.use('/api/leads', leadRouter);