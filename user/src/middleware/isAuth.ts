import type { NextFunction, Request, Response } from "express";
import type { IUser } from "../model/user.js";
import jwt, { type JwtPayload } from "jsonwebtoken";


export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

export const isAuth = async(req:AuthenticatedRequest,
  res:Response,
  next:NextFunction
): Promise<void> =>{
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message:"Please Login - No auth header"
      });
      return;
    }
  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(
  token as string,
  process.env.JWT_SECRET_KEY as string
) as JwtPayload | string;

if (typeof decoded === "string" || !decoded.user) {
  res.status(401).json({ message: "Invalid token" });
  return;
}

req.user = decoded.user;
next();

  } catch (error) {
    res.status(401).json({
        message:"Please login - jwt error"
      });
  }
}