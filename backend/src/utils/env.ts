import 'dotenv/config';

const requireValue = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtAccessSecret: requireValue(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
  jwtRefreshSecret: requireValue(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
  clientOrigin: process.env.CLIENT_ORIGIN ?? '*',
};
