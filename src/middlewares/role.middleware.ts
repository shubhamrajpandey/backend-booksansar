import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

export const verifyRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized. User not authenticated.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied. You do not have permission for this action.",
      });
    }

    next();
  };
};
