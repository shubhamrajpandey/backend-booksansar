import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false, 
            message: "Authorization header is required." });
    }
    const token = authHeader.split(" ")[1];
    if(!token) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ 
            success: false, 
            message: "Unauthorized. No token provided." });
    }
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { id: string; role: string };
		req.user = {id: decoded.id, role: decoded.role};
		next();
	} catch (error) {
        console.error("JWT Verification Error:", error);
        if(error instanceof jwt.TokenExpiredError) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false, 
                message: "Unauthorized. Token expired." });
        }
        if(error instanceof jwt.JsonWebTokenError) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ 
                success: false, 
                message: "Unauthorized. Invalid token." });
        }
        return res.status(StatusCodes.UNAUTHORIZED).json({ 
            success: false, 
            message: "Unauthorized. Invalid token." });
    }
}