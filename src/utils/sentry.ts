import * as Sentry from "@sentry/node";
import {nodeProfilingIntegration} from "@sentry/profiling-node";
import {NODE_ENV, SENTRY_DSN} from "@/config";

Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    integrations: [
        // Add our Profiling integration
        nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
});

export default Sentry;