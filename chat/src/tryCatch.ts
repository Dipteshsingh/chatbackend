import type { Request, Response, NextFunction, RequestHandler } from "express";

const TryCatch = (handler: RequestHandler): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Internal Server Error",
      });
    }
  };
};

export default TryCatch;
