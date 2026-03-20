import { Router } from 'express';
import { registerHandler } from './register';
import { validateResource } from '../../middlewares/validateRessource';
import { registerSchema } from './auth.schema';

const authRouter = Router();

authRouter.post('/register',validateResource(registerSchema), registerHandler);

export { authRouter };