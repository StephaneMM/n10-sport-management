import * as Sentry from '@sentry/node';

const dsn =
  process.env.SENTRY_DSN ||
  'https://c05cc7177dd1472adef0635691039615@o4512275615186944.ingest.us.sentry.io/4512279264362496';

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}

