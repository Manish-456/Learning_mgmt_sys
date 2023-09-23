import { Response, Request, NextFunction } from 'express';
import { CatchAsyncError } from '../middleware/catch-async-error';
import cloudinary from 'cloudinary';
import ErrorHandler from '../utils/error-handler';
import { createCourse, getAllCoursesServices } from '../services/course.service';
import CourseModel from '../models/course.model';
import { redis } from '../utils/redis';
import mongoose from 'mongoose';
import sendMail from '../utils/sendMail';
import NotificationModel from '../models/notificationModel';

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

        await redis.set(courseId, JSON.stringify(course), 'EX', 604800);
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
        await NotificationModel.create({
            user: req.user ?._id,
            title: 'New Question added',
            message: `You have a new question in ${courseContent ?.title}`
        });

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
    courseId: string;
    contentId: string;
    answer: string;
    questionId: string;
}
export const addAnswer = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courseId, contentId, answer, questionId } = req.body as IAddAnswerData;

        const course = await CourseModel.findById(courseId);

        if (!mongoose.Types.ObjectId.isValid(contentId)) return next(new ErrorHandler(400, "Invalid Id"));

        const courseContent = course ?.courseData.find(data => data._id.equals(contentId));

        if (!courseContent) return next(new ErrorHandler(400, "Invalid ContentId"));

        const questions = courseContent.questions.find(question => question._id.equals(questionId));

        if (!questions) return next(new ErrorHandler(404, "Question not found"));
        // create a new answer to the specific question
        const newQuestion: any = { user: req.user, question: answer, questionReplies: [] };

        questions.questionReplies ?.push(newQuestion);

        await course ?.save();

        if (req.user._id === questions.user._id) {
            await NotificationModel.create({
                user: req.user ?._id,
                title: 'New Question',
                message: `You have a new question reply in ${course ?.name}`
            });

        } else {
            const data = {
                name: questions.user.name,
                title: courseContent.title
            };
            // const html = await ejs.renderFile(path.join(__dirname, '..', 'mails', 'question-reply.ejs'), data);
            try {

                await sendMail({
                    email: questions.user.email,
                    template: 'question-reply.ejs',
                    data,
                    subject: "Question Reply"
                });

                return res.status(200).json({
                    success: true,
                    course
                })
            } catch (error: any) {
                return next(new ErrorHandler(500, error.message));
            }
        }


    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
});

// add review in course.
interface IAddReviewData {
    review: string;
    rating: number;
};

export const addReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user ?.courses;

        const courseId = req.params.id;

        // check if course is already exists in userCourseList based on jwt.

        const courseExists = userCourseList ?.some((course: any) => course._id.toString() === courseId);

        if (!courseExists) return next(new ErrorHandler(404, "You are not elligible to access this content."))

        const course = await CourseModel.findById(courseId);

        const { review, rating } = req.body as IAddReviewData;

        const newReview: any = {
            user: req.user,
            comment: review,
            rating
        }

        course ?.reviews.push(newReview);
        let avg = 0;

        course ?.reviews.forEach(review => avg += review.rating);

        if (course) {
            course.ratings = avg / course ?.reviews.length;  // 9 / 2
        }


        await course ?.save()
        
         const notification = {
            user: req.user._id,
            title: "New Review Received",
            message: `${req.user ?.name} has given a review in ${course ?.name}.`,
        }

        await NotificationModel.create(notification);


        res.status(200).json({
            success: true,
            course
        })

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

// add reply to review

interface IAddReplyReviewData {
    comment: string;
    courseId: string;
    reviewId: string;
}

export const addReplyToReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { comment, courseId, reviewId } = req.body as IAddReplyReviewData;

        const course = await CourseModel.findById(courseId);
        if (!course) return next(new ErrorHandler(404, 'Course not found'));

        const review = course ?.reviews.find((review: any) => review._id.toString().equals(reviewId));

        if (!review) return next(new ErrorHandler(404, "Review not found"));

        const replyData: any = {
            user: req.user,
            comment
        };
        if (!review.commentReplies) {
            review.commentReplies = []
        }
        review.commentReplies.push(replyData);
        await course.save();

        return res.status(200).json({
            success: true,
            course
        })
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
});

// Get all courses with video contents
export const getAllCoursesWithContents = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        getAllCoursesServices(res);

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
})

// Delete course => Only for Admin
export const deleteCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const course = await CourseModel.findById(id);

        await course ?.deleteOne({ _id: id });
        await redis.del(id);

        return res.status(200).json({
            success: true,
            message: 'Course deleted successfully'
        });

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
})