// types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "production" | "test";
    PORT?: string;
    CORS_ORIGIN?: string;
    MONGO_URI?: string;
    ACCESS_TOKEN_SECRET?: string;
    ACCESS_EXPIRY?: `${number}d`;
    REFRESH_TOKEN_SECRET?: string;
    REFRESH_EXPIRY?: `${number}d`;
    // Add your other variables here
  }
}
