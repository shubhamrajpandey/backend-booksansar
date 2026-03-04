import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import logger from "../utils/logger";

export const verifyRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.error("Unauthorized. User not authenticated.");
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized. User not authenticated.",
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.error(
        "Access denied. You do not have permission for this action.",
      );
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied. You do not have permission for this action.",
      });
    }

    next();
  };
};
