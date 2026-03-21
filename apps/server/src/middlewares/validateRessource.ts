import { Request, Response, NextFunction } from 'express';
import { z } from 'zod'; // Import everything under 'z'

// We use z.ZodSchema which covers ALL possible Zod schemas perfectly
export const validateResource = (schema: z.ZodSchema) => 
  (req: Request, res: Response, next: NextFunction): void => {
  try {
        // 1. Capture the validated, coerced data from Zod!
        const parsedData = schema.parse({
          body: req.body,
          query: req.query,
          params: req.params,
        }) as any // because it's unknown at this point, TypeScript refuses read .body or .query from it. but we will overwrite the original req.body and req.query with the parsedData, so we can safely ignore the type issues here.
        
        // 2. Overwrite the raw request with the clean Zod data
        // that way the coerced types (like dates) are available in the route handler without any extra work!
        req.body = parsedData.body;

        // Note: We intentionally do NOT overwrite req.query and req.params. They are generated directly from the actual URL string by Node.js. Express locks them down as "read-only"
        // req.query = parsedData.query; AND req.params = parsedData.params; TRIGGERS {"error":"Cannot set property query of #<IncomingMessage> which has only a getter"}
        // We only use req.body for validation, so we can skip overwriting req.query and req.params for now. 
        
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