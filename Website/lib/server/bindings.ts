import { env } from 'cloudflare:workers';

export interface AppBindings {
  DB: D1Database;
  BOT_FILES: R2Bucket;
  AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  AUTH_FROM_EMAIL?: string;
  ADMIN_EMAILS?: string;
  AWS_SIMULATION_URL?: string;
  AWS_SIMULATION_KEY?: string;
}

export function bindings(): AppBindings {
  return env as unknown as AppBindings;
}
