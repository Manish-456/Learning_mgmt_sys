import {Request, Response, NextFunction} from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { CatchAsyncError } from './catch-async-error';
import ErrorHandler from '../utils/error-handler';
import { redis } from '../utils/redis';

// Authenticated User
export const isAuthenticated = CatchAsyncError(async(req : Request, res : Response, next : NextFunction) => {
    const access_token = req.cookies.access_token;

    if(!access_token) return next(new ErrorHandler(400, "Please login to access the resources"))

    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN!) as JwtPayload;

    if(!decoded) return next(new ErrorHandler(400, "Invalid Access Token"));

    const user = await redis.get(decoded.id);
    req.user = JSON.parse(user as string);

    next();
});

export const authorizedRole = (...roles : string[]) => {
  return (req : Request, res : Response, next : NextFunction) => {
    if(!roles.includes(req.user?.role || '')){
        return next(new ErrorHandler(400,`Role : ${req.user?.role} is not allowed to access this resource`));
    }
    next();
  }
};

