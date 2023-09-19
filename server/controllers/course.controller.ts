import { Response, Request, NextFunction } from 'express';
import { CatchAsyncError } from '../middleware/catch-async-error';
import cloudinary from 'cloudinary';
import ErrorHandler from '../utils/error-handler';
import { createCourse } from '../services/course.service';
import CourseModel from '../models/course.model';
import { redis } from '../utils/redis';
import mongoose from 'mongoose';
import ejs from 'ejs';
import path from 'path';
import sendMail from '../utils/sendMail';

// upload course
export const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;

        if (thumbnail) {
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        };
        // create course
        createCourse(data, res, next);
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

// edit course
export const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;

        if (thumbnail) {
            await cloudinary.v2.uploader.destroy(thumbnail.public_id);
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            };
        }

        const courseId = req.params.id;
        const course = await CourseModel.findByIdAndUpdate(courseId, {
            $set: data
        }, {
                new: true
            });

        return res.status(201).json({
            success: true,
            course
        })
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

// Get Single Course
export const getSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params.id;
        const isCacheExist = await redis.get(courseId);

        if (isCacheExist) {

            const course = JSON.parse(isCacheExist);
            return res.status(200).json({
                success: true,
                course
            })
        }

        const course = await CourseModel.findById(req.params.id).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");

        await redis.set(courseId, JSON.stringify(course));
        return res.status(200).json({
            success: true,
            course
        })

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

// Get All Course
export const getAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isCacheExists = await redis.get('all-courses');
        if (isCacheExists) {
            const courses = JSON.parse(isCacheExists);
            return res.status(200).json({
                success: true,
                courses
            })
        }
        const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        await redis.set('all-courses', JSON.stringify(courses));

        return res.status(200).json({
            success: true,
            courses
        })
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

// Get Course Content - Only for valid user.
export const getCourseByUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user.courses;
        const courseId = req.params.id;

        const courseExists = userCourseList.find((course: any) => course._id.toString() === courseId);

        if (!courseExists) {
            return next(new ErrorHandler(404, "You are not elligible to access this course."));
        }

        const course = await CourseModel.findById(courseId);
        const content = course ?.courseData;

        res.status(200).json({
            success: true,
            content
        })
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
});

// Add Questions in course

interface IAddQuestionData {
    question: string;
    courseId: string;
    contentId: string;
}

export const addQuestion = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question, courseId, contentId } = req.body as IAddQuestionData;
        const course = await CourseModel.findById(courseId);


        if (!mongoose.Types.ObjectId.isValid(contentId)) return next(new ErrorHandler(400, `Invalid Content Id`));

        const courseContent = course ?.courseData ?.find(data => data._id.equals(contentId));

        if (!courseContent) return next(new ErrorHandler(400, "Invalid Content Id"));

        // Create a new question Object;
        const newQuestion: any = { user: req.user, question, questionReplies: [] };
        courseContent.questions.push(newQuestion);

        await course ?.save();

        res.status(200).json({
            success: true,
            course
        })

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

// add answer in course question
interface IAddAnswerData {
    courseId : string;
    contentId : string;
    answer : string;
    questionId : string;
}
export const addAnswer = CatchAsyncError(async(req : Request, res : Response, next : NextFunction) => {
    try {
        const {courseId, contentId, answer, questionId} = req.body as IAddAnswerData;

        console.log(req.body);
        
        const course = await CourseModel.findById(courseId);

        if(!mongoose.Types.ObjectId.isValid(contentId)) return next(new ErrorHandler(400, "Invalid Id"));

        const courseContent = course?.courseData.find(data => data._id.equals(contentId));

        if(!courseContent) return next(new ErrorHandler(400, "Invalid ContentId"));

        const questions = courseContent.questions.find(question => question._id.equals(questionId));

        if(!questions) return next(new ErrorHandler(404, "Question not found"));
        // create a new answer to the specific question
        const newQuestion: any = { user: req.user, question : answer, questionReplies: [] };

        questions.questionReplies?.push(newQuestion);

        await course?.save();

        if(req.user._id === questions.user._id){
           //TODO: create a notification

        }else{
            const data = {
                name : questions.user.name,
                title : courseContent.title
            };

            // const html = await ejs.renderFile(path.join(__dirname, '..', 'mails', 'question-reply.ejs'), data);

            try {
                
               await sendMail({
                email : questions.user.email,
                template : 'question-reply.ejs',
                data,
                subject : "Question Reply"
               });

               return res.status(200).json({
                success : true,
                course
               })
            } catch (error : any) {
                return next(new ErrorHandler(500, error.message));
            }
        }
       

    } catch (error : any) {
        return next(new ErrorHandler(500, error.message));
    }
})