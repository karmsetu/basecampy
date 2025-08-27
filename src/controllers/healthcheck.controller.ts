import { type Response, type Request, type NextFunction } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const healthCheck = asyncHandler((req: Request, res: Response) => {
  res.status(200).json(new ApiResponse(200, { message: "server is running" }));
});
