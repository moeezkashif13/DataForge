import '../load-env';
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

export const AUTH_BASE_PATH = '/api/auth';

// Centralized session & cookie expiration configuration (in seconds)
export const SESSION_EXPIRES_IN_SECONDS =
  Number(process.env.SESSION_EXPIRES_IN_SECONDS) || 60 * 60 * 24 * 7; // 7 days default

export const SESSION_UPDATE_AGE_SECONDS =
  Number(process.env.SESSION_UPDATE_AGE_SECONDS) || 60 * 60 * 24; // 1 day default

// Cookie maxAge in milliseconds
export const SESSION_COOKIE_MAX_AGE_MS = SESSION_EXPIRES_IN_SECONDS * 1000;

export const getSessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_COOKIE_MAX_AGE_MS,
});

export const auth = betterAuth({
  appName: 'DataForge',
  basePath: AUTH_BASE_PATH,
  baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 3000}`,
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map((o) => o.trim())
      : []),
  ],
  secret: process.env.AUTH_SECRET,
  plugins: [bearer()],

  database: new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'dataforge',
  }),

  user: {
    modelName: 'users',
    additionalFields: {
      firstName: {
        type: 'string',
        required: false,
      },
      lastName: {
        type: 'string',
        required: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
  },

  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
});
