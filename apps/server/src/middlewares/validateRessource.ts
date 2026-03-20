import { Request, Response, NextFunction } from 'express';
import { z } from 'zod'; // Import everything under 'z'

// We use z.ZodSchema which covers ALL possible Zod schemas perfectly
export const validateResource = (schema: z.ZodSchema) => 
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      next();
    } catch (e: any) {
      // Safely check if it's a ZodError using the 'z' object
      if (e instanceof z.ZodError) {
        // e.issues is the standard way to extract validation failures in modern Zod
        res.status(400).json({ errors: e.issues });
        return;
      }
      
      // Fallback for non-Zod errors
      res.status(400).json({ error: e.message });
      return;
    }
  };

  // this middleware applies the rules created in the Zod schema from auth.schema.ts to the incoming request, validating the body, query, and params before it reaches the route handler.