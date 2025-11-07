import "express-serve-static-core";

declare global {
	namespace Express {
		interface UserPayload {
			id: string;
			role: string;
		}

		interface Request {
			user?: UserPayload;
		}
	}
}

export {};


