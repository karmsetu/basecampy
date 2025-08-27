import { type Response, type Request, type NextFunction } from "express";
import { ApiResponse } from "../utils/ApiResponse";

export const healthCheck = (req: Request, res: Response) => {
  try {
    res
      .status(200)
      .json(new ApiResponse(200, { message: "server is running" }));
  } catch (error) {}
};
