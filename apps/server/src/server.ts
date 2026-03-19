import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

export const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'N10 Server is running' });
});
