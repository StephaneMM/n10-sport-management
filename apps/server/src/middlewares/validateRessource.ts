import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Validates and coerces `req.body` against a Zod schema before the route
 * handler runs. A validation failure is handed to `next()` as a `ZodError`,
 * which the terminal errorHandler turns into a 400 with the issue list.
 *
 * This middleware applies the rules from a feature's `*.schema.ts` to the
 * incoming request.
 */
export const validateResource =
  (schema: z.ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Capture the validated, coerced data from Zod.
      const parsedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body: unknown };

      // Overwrite the raw body with the clean Zod data, so coerced types (like
      // dates) are available in the handler with no extra work.
      //
      // Note: we intentionally do NOT overwrite req.query / req.params. Node
      // generates them from the URL string and Express exposes them as
      // getter-only — assigning throws "Cannot set property query ... which has
      // only a getter". We only validate the body downstream anyway.
      req.body = parsedData.body;

      next();
    } catch (e) {
      next(e);
    }
  };
