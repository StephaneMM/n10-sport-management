import { Router, Request, Response } from 'express'
import { registerHandler } from './register';
import { loginHandler } from './login';
import { validateResource } from '../../middlewares/validateRessource';
import { requireUser } from '../../middlewares/requireUser';
import { authLimiter } from '../../middlewares/rateLimit';
import { registerSchema, loginSchema } from './auth.schema';

const authRouter = Router();

authRouter.post('/register', authLimiter, validateResource(registerSchema), registerHandler);

authRouter.post('/login', authLimiter, validateResource(loginSchema), loginHandler);

authRouter.get('/me', requireUser, (req: Request, res: Response) => {
  // If the code reaches here, the Bouncer already verified them!
  // We can safely read their ID and Role from res.locals.user
  const currentUser = res.locals.user;
  
  res.status(200).json({ 
    message: 'Welcome to your private profile!',
    user: currentUser 
  });
});

export { authRouter };
