import * as Sentry from "@sentry/react";

const dsn =
  import.meta.env.VITE_SENTRY_DSN ||
  "https://507861fe9b821f5066666964b89062a4@o4512275615186944.ingest.us.sentry.io/4512279253549056";

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Tracing
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    tracePropagationTargets: ["localhost", /^\/api/, /^https:\/\/.*\/api/],
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

