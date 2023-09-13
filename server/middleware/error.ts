import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error-handler";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    // wrong mongodb id error
    if (err.name === "CastError") {
        const message = `Resource not found. Invalid : ${err.path}`;
        err = new ErrorHandler(400, message)
    }
    // Duplicate key error
    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} : entered`;
        err = new ErrorHandler(400, message)
    }

    // jwt error
    if (err.name === 'JsonWebTokenError') {
        const message = `Invalid JWT`;
        err = new ErrorHandler(400, message)
    }
    // Token expired
    if (err.name === 'TokenExpiredError') {
        const message = `JWT is expired, try again `;
        err = new ErrorHandler(400, message)
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message
    })
}