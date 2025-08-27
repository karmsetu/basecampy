import {
  type Response,
  type Request,
  type NextFunction,
  type RequestHandler,
} from "express";

export const asyncHandler = (fn: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};
