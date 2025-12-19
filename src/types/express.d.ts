import "express-serve-static-core";
import { Multer } from "multer";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      role: string;
    }

    interface Request {
      user?: UserPayload;
      file?: Multer.File;        
      files?: Multer.File[];      
       cacheKey?: string;
    }
  }
}

export {};
