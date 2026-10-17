import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { formDiagnosticsLimiter } from '../../middlewares/rateLimit';

const FORM_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'country', 'dateOfBirth', 'nationality',
  'gender', 'sport', 'positions', 'heightCm', 'weightKg', 'verticalJumpCm', 'league',
  'currentClub', 'highlightLinks', 'messageToUs', 'source', 'consentToContact',
  'guardianName', 'guardianEmail', 'guardianPhone', 'guardianRelationship', 'form',
] as const;

const diagnosticEventSchema = z.object({
  event: z.enum([
    'client_validation_failed',
    'turnstile_widget_error',
    'turnstile_token_expired',
    'submission_failed',
  ]),
  fields: z.array(z.object({
    field: z.enum(FORM_FIELDS),
    code: z.string().regex(/^[a-z_]+$/).max(40),
    valueType: z.enum(['undefined', 'string', 'number', 'boolean', 'array', 'object', 'null']),
    valueLength: z.number().int().min(0).max(100_000).optional(),
    itemCount: z.number().int().min(0).max(1_000).optional(),
  }).strict()).max(30).optional().default([]),
  siteKeyConfigured: z.boolean().optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
  failureType: z.enum(['api', 'network']).optional(),
}).strict();

const diagnosticsRouter = Router();

// This endpoint accepts validation metadata only. It deliberately has no field
// for submitted values, emails, URLs, IP addresses, or Turnstile tokens.
diagnosticsRouter.post(
  '/form-validation',
  formDiagnosticsLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = diagnosticEventSchema.parse(req.body);
      console.warn('Lead form client diagnostic', {
        requestId: req.get('x-vercel-id') ?? req.get('x-request-id'),
        event: event.event,
        fields: event.fields,
        siteKeyConfigured: event.siteKeyConfigured,
        serverSecretConfigured: Boolean(env.TURNSTILE_SECRET_KEY),
        httpStatus: event.httpStatus,
        failureType: event.failureType,
      });
      res.status(202).json({ received: true });
    } catch (error) {
      next(error);
    }
  },
);

export { diagnosticsRouter };
