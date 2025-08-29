// types/express.d.ts

import type { IUser } from "../src/models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser | null;
      cookies: {
        accessToken?: string;
        refreshToken?: string;
        [key: string]: string | undefined; // allow other cookies
      };
    }
  }
}

export {};
