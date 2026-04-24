import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  databasePath: process.env.DATABASE_PATH ?? "./data/writeright.db",
  languageToolUrl:
    process.env.LANGUAGETOOL_URL ?? "https://api.languagetool.org/v2",
} as const;
