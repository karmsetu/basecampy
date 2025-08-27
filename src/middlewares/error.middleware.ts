// middleware/errorHandler.ts
import { type Request, type Response, type NextFunction } from "express";

// Define shape of your custom error
interface ApiError extends Error {
  statusCode?: number;
  success?: boolean;
  errors?: any[];
  data?: any;
  stack?: string;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Default values
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const success = false; // Always false for errors
  const errors = err.errors || [];

  // Don't expose stack trace in production
  const stack = process.env.NODE_ENV === "production" ? undefined : err.stack;

  // Log the error (optional: use Winston, Bunyan, or console)
  console.error(`[ERROR] ${req.method} ${req.url}`);
  console.error(err);

  // Send JSON response
  return res.status(statusCode).json({
    success,
    message,
    errors,
    stack, // Optional: remove in production
  });
};
