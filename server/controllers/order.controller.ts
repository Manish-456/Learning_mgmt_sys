import { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middleware/catch-async-error';
import ErrorHandler from '../utils/error-handler';
import { IOrder } from '../models/orderModel';
import userModel from '../models/user.model';
import CourseModel from '../models/course.model';
import path from 'path';
import ejs from 'ejs';
import sendMail from '../utils/sendMail';
import NotificationModel from '../models/notificationModel';
import { getAllOrderServices, newOrder } from '../services/order.service';


export const createOrder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courseId, payment_info } = req.body as IOrder;

        const user = await userModel.findById(req.user ?._id);

        const courseExistsInUser = user ?.courses.find((course: any) => course._id.equals(courseId));

        if (courseExistsInUser) return next(new ErrorHandler(400, "You have already purchased this course"));

        const course = await CourseModel.findById(courseId);

        if (!course) return next(new ErrorHandler(404, "Course not found"));

        const data: any = {
            courseId: course._id,
            userId: user ?._id,
            payment_info
         }

         
         const mailData = {
            order: {
                _id: course._id.toString().slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('en-us', {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric"
                })
            }
        };

        const html = await ejs.renderFile(path.join(__dirname, '..', 'mails', 'order-confirmation.ejs'), { order: mailData.order });

        try {
            await sendMail({
                template: 'order-confirmation.ejs',
                data: mailData,
                subject: 'Order Confirmation',
                email: user ?.email as string});



        } catch (error: any) {
            return next(new ErrorHandler(500, error.message))
        }
        
        user ?.courses.push(course ?._id);
        
        await user ?.save();
        
        const notification = await NotificationModel.create({
            userId: user ?._id,
            title: 'New Order',
            message: `You have a new order from ${course ?.name}`
        });
        
        await notification.save();

        course.purchased = course.purchased! + 1; 
        await course.save();

        newOrder(data, res, next);
       

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))

    }
})

export const getAllOrders = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        await getAllOrderServices(res);

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
})