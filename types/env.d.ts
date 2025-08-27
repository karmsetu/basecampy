// types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "production" | "test";
    PORT?: string;
    CORS_ORIGIN?: string;
    // Add your other variables here
  }
}
