import { Router } from 'express';
import { registerHandler } from './register';

const authRouter = Router();

authRouter.post('/register', registerHandler);

export { authRouter };