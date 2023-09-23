import { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middleware/catch-async-error';
import ErrorHandler from '../utils/error-handler';
import LayoutModel from '../models/layout.model';
import cloudinary from 'cloudinary';

// Create layout
export const createLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type } = req.body;
        const isTypeExists = await LayoutModel.findOne({ type });
        if (isTypeExists) {
            return next(new ErrorHandler(400, `${type} already exists`))
        }
        if (type.toLowerCase() === "banner") {
            const { image, title, subtitle } = req.body;
            const myCloud = await cloudinary.v2.uploader.upload(image, { folder: 'Layout' })
            const banner = {
                image: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                },
                title,
                subtitle,
                type: "Banner"
            };

            await LayoutModel.create(
                banner
            );
        }
        if (type.toLowerCase() === "faq") {
            const { faq, type } = req.body;
            const faqItems = await Promise.all(faq.map((faq: any) => ({
                question: faq.question,
                answer: faq.answer
            })))

            await LayoutModel.create({ type, faq: faqItems })
        };

        if (type.toLowerCase() === "categories") {
            const { categories } = req.body;
            const categoryItems = await Promise.all(categories.map((item: any) => ({
                title: item.title
            })))
            await LayoutModel.create({
                type: "Categories",
                categories: categoryItems
            })
        };


        res.status(201).json({
            success: true,
            message: "Layout created Successfully"
        })


    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
});


// edit layout
export const editLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type } = req.body;

        if (type.toLowerCase() === "banner") {
            const bannerData = await LayoutModel.findOne({ type: "Banner" });

            const { image, title, subtitle } = req.body;

            await cloudinary.v2.uploader.destroy(bannerData ?.banner.image.public_id || "");

            const myCloud = await cloudinary.v2.uploader.upload(image, { folder: 'Layout' })
            const banner = {
                image: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                },
                title,
                subtitle,
                type: "Banner"
            };

            await LayoutModel.findByIdAndUpdate(
                bannerData ?.id, { $set: banner }, { new: true }
            );
        }
        if (type.toLowerCase() === "faq") {
            const { faq } = req.body;
            const FaqItem = await LayoutModel.findOne({ type: "FAQ" });
            const faqItems = await Promise.all(faq.map((faq: any) => ({
                question: faq.question,
                answer: faq.answer
            })))

            await LayoutModel.findByIdAndUpdate(FaqItem ?._id, { type: "FAQ", faq: faqItems });
        };

        if (type.toLowerCase() === "categories") {
            const { categories } = req.body;
            const categoriesData = await LayoutModel.findOne({ type: "Categories" });
            const categoryItems = await Promise.all(categories.map((item: any) => ({
                title: item.title
            })))
            await LayoutModel.findByIdAndUpdate(categoriesData?._id ,{
                type: "Categories",
                categories: categoryItems
            })
        };


        res.status(201).json({
            success: true,
            message: "Layout updated Successfully"
        })


    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
});

// get layout by type
export const getLayoutByType = CatchAsyncError(async(req : Request, res : Response, next : NextFunction) => {
    try {
        const {type} = req.body;
        const layout = await LayoutModel.findOne({type});
        return res.status(200).json({
            success : true,
            layout
        })
    } catch (error : any) {
        return next(new ErrorHandler(500, error.message));
    }
})



