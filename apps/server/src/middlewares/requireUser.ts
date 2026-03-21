import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Again, in production, this MUST come from your .env file!
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-local-dev-key';

export const requireUser = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Look for the Bouncer's VIP pass in the headers
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  // 2. Extract just the token (removing the word "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // 3. The Math Check: Did WE sign this token, and is it still unexpired?
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Success! Attach the user's decoded payload to Express's local variables
    // so the next function in line knows exactly who is making the request.
    res.locals.user = decoded;

    // 5. Open the velvet rope
    next();
  } catch (error) {
    // If the token is fake, tampered with, or expired, kick them out!
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }
};


git commit -m "feat(server): add get profile endpoint with user relational data"
git push origin feat/backend-prospect-profile