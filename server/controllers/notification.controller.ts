import { Request, Response, NextFunction } from 'express';
import NotificationModel from '../models/notificationModel';
import ErrorHandler from '../utils/error-handler';
import { CatchAsyncError } from '../middleware/catch-async-error';

// Get All Notifications => only for Admin
export const getNotifications = CatchAsyncError(async (_: Request, res: Response, next: NextFunction) => {
    try {
        const notifications = await NotificationModel.find().sort({
            createdAt: -1
        });

        res.status(200).json({ success: true, notifications })
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

// update notification status = only for Admin
export const updateNotificationStatus = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notification = await NotificationModel.findById(req.params.id);
        if (!notification) {
            return next(new ErrorHandler(404, "Notification not found"));
        } else {
            notification.status = 'read';
        }
        await notification ?.save();

        const notifications = await NotificationModel.find().sort({
            createdAt: -1
        })
        return res.status(200).json({
            success: true,
            notifications
        })
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
})
