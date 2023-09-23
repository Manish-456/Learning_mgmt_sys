import dotenv from 'dotenv';
dotenv.config();
import express, { NextFunction, Request, Response } from 'express';
export const app = express();

import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorHandler } from './middleware/error';
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';
import orderRouter from './routes/order.route';
import notificationRouter from './routes/notification.route';
import analyticsRouter from './routes/analytics.route';
import layoutRouter from './routes/layout.route';

// body-parser
app.use(express.json({ limit: "50mb" }));

// cookie-parser
app.use(cookieParser());

// CORS => Cross Origin Resource Sharing
app.use(cors({
    origin: process.env.ORIGINS
}));

// testing route
app.get('/test', (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
        message: "Test is working",
        success: true
    })
})

const route = process.env.ROUTE as string;

app.use(route,
     userRouter,
      courseRouter,
       orderRouter,
        notificationRouter,
         analyticsRouter,
          layoutRouter);


//? Handling Invalid routes

app.all('*', (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} is not found`) as any;
    err.statusCode = 404;
    next(err)
})

app.use(errorHandler)